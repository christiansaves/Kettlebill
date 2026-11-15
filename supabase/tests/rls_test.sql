-- Tests d'isolation : Alice ne doit jamais voir les données de Bob.
\set ON_ERROR_STOP on
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.ca', '{"full_name":"Alice","locale":"fr"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.ca', '{"full_name":"Bob","locale":"en"}');

-- Le déclencheur a créé profil + espace + facturation
select 'profils' t, count(*) from public.profiles
union all select 'espaces', count(*) from public.spaces
union all select 'membres', count(*) from public.space_members
union all select 'facturation', count(*) from public.billing;

set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
insert into public.transactions (space_id, kind, amount_cents, label)
  select id, 'expense', 1234, 'secret de Bob' from public.spaces;
insert into public.deadlines (space_id, title, due_on) select id, 'loyer Bob', current_date from public.spaces;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select 'alice voit espaces' t, count(*) from public.spaces;
select 'alice voit transactions de bob' t, count(*) from public.transactions;
select 'alice voit facturation' t, count(*) from public.billing;
-- Alice ne peut pas écrire dans l'espace de Bob
do $$ begin
  insert into public.transactions (space_id, kind, amount_cents) select id, 'income', 1 from public.spaces s where s.owner_id = '22222222-2222-2222-2222-222222222222';
  raise notice 'insert (devrait être 0 ligne car espace invisible)';
end $$;
-- Alice ne peut pas modifier la facturation
update public.billing set plan = 'family';
select 'plan alice apres update' t, plan from public.billing;
-- Alice ne peut pas s'ajouter à l'espace de Bob
do $$ begin
  begin
    insert into public.space_members (space_id, user_id, role)
      values ((select id from public.spaces limit 1), '11111111-1111-1111-1111-111111111111', 'owner');
    raise notice 'insertion membre : passée (attendu : refus si espace de Bob)';
  exception when others then raise notice 'insertion membre refusée : %', sqlerrm;
  end;
end $$;
-- Espace famille : Alice crée et s'ajoute
insert into public.spaces (name, kind, owner_id) values ('Famille Alice', 'family', '11111111-1111-1111-1111-111111111111');
insert into public.space_members (space_id, user_id, role) select id, '11111111-1111-1111-1111-111111111111', 'owner' from public.spaces where name='Famille Alice';
select 'alice espaces apres creation' t, count(*) from public.spaces;
-- stockage
insert into storage.objects (bucket_id, name) select 'documents', id::text || '/test.pdf' from public.spaces where name='Famille Alice';
select 'objets visibles par alice' t, count(*) from storage.objects;
reset role;
select 'transactions total (admin)' t, count(*) from public.transactions;

-- ── Tests supplémentaires ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
-- Alice tente d'ajouter Bob à son espace famille sans invitation : refusé
do $$ begin
  begin
    insert into public.space_members (space_id, user_id, role)
      select id, '22222222-2222-2222-2222-222222222222', 'member' from public.spaces where name='Famille Alice';
    raise exception 'ÉCHEC : ajout direct d''un membre accepté';
  exception when insufficient_privilege or check_violation then raise notice 'OK : ajout direct refusé';
  end;
end $$;
-- Alice tente d'écrire dans l'espace de Bob en connaissant son identifiant : refusé
reset role;
create temp table bob_space as select id from public.spaces where owner_id='22222222-2222-2222-2222-222222222222';
grant select on bob_space to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  begin
    insert into public.transactions (space_id, kind, amount_cents) select id, 'income', 1 from bob_space;
    raise exception 'ÉCHEC : écriture dans l''espace de Bob acceptée';
  exception when insufficient_privilege or check_violation then raise notice 'OK : écriture chez Bob refusée';
  end;
  begin
    insert into public.space_members (space_id, user_id, role) select id, auth.uid(), 'owner' from bob_space;
    raise exception 'ÉCHEC : intrusion comme propriétaire acceptée';
  exception when insufficient_privilege or check_violation then raise notice 'OK : intrusion refusée';
  end;
end $$;
update public.transactions set label='piraté' where space_id in (select id from bob_space);
delete from public.deadlines where space_id in (select id from bob_space);
reset role;
select 'bob intact' t, count(*) filter (where label='secret de Bob') tx, (select count(*) from public.deadlines) dl from public.transactions;
