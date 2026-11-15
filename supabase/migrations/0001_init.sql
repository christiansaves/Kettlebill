-- Kettlebill — schéma initial
-- Toutes les données d'un utilisateur vivent dans un « espace » (personnel, famille ou entreprise).
-- La sécurité repose sur Row Level Security : chaque requête ne voit que les espaces dont on est membre.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  locale text not null default 'fr',
  country text not null default 'CA',
  region text not null default 'QC',
  currency text not null default 'CAD',
  theme text not null default 'system' check (theme in ('system','light','dark')),
  email_reminders boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Espaces et membres
-- ---------------------------------------------------------------------------
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'personal' check (kind in ('personal','family','business')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table public.space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  email text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Est-ce que l'utilisateur courant est membre de cet espace ?
-- SECURITY DEFINER évite la récursion des politiques sur space_members.
create or replace function public.is_member(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.space_members m where m.space_id = sid and m.user_id = auth.uid());
$$;

create or replace function public.is_owner(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.space_members m where m.space_id = sid and m.user_id = auth.uid() and m.role = 'owner');
$$;

-- ---------------------------------------------------------------------------
-- Facturation (écrite seulement par le serveur via le webhook Stripe)
-- ---------------------------------------------------------------------------
create table public.billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','individual','family')),
  status text not null default 'active',
  billing_interval text check (billing_interval in ('month','year')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Données d'un espace
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'CAD',
  category text not null default 'other',
  label text not null default '',
  occurred_on date not null default current_date,
  tax_deductible boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.transactions (space_id, occurred_on desc);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  category text not null,
  monthly_limit_cents bigint not null check (monthly_limit_cents >= 0),
  created_at timestamptz not null default now(),
  unique (space_id, category)
);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null,
  kind text not null default 'bill' check (kind in ('bill','renewal','document','tax','appointment','other')),
  due_on date not null,
  amount_cents bigint,
  recurrence text not null default 'none' check (recurrence in ('none','monthly','quarterly','yearly')),
  remind_days int not null default 7 check (remind_days between 0 and 90),
  notes text not null default '',
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.deadlines (space_id, due_on);

create table public.recurring (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  period text not null default 'monthly' check (period in ('weekly','monthly','yearly')),
  next_charge_on date,
  category text not null default 'subscriptions',
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  category text not null default 'other',
  expires_on date,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  template text not null default 'custom',
  recipient text not null default '',
  subject text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','sent','answered')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fiscal_estimates (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  country text not null,
  region text not null default '',
  tax_year int not null,
  input jsonb not null,
  result jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Données serveur seulement (aucune politique : seul le rôle service y accède)
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now()
);
create index on public.ai_usage (user_id, feature, created_at desc);

create table public.translations (
  locale text not null,
  namespace text not null,
  source_hash text not null,
  messages jsonb not null,
  created_at timestamptz not null default now(),
  primary key (locale, namespace, source_hash)
);

create table public.reminder_log (
  deadline_id uuid not null references public.deadlines(id) on delete cascade,
  due_on date not null,
  sent_at timestamptz not null default now(),
  primary key (deadline_id, due_on)
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_invites enable row level security;
alter table public.billing enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.deadlines enable row level security;
alter table public.recurring enable row level security;
alter table public.documents enable row level security;
alter table public.letters enable row level security;
alter table public.fiscal_estimates enable row level security;
alter table public.ai_usage enable row level security;
alter table public.translations enable row level security;
alter table public.reminder_log enable row level security;
alter table public.stripe_events enable row level security;

create policy "profil: lire le sien" on public.profiles for select using (id = auth.uid());
create policy "profil: modifier le sien" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "espaces: membres et propriétaire lisent" on public.spaces for select using (public.is_member(id) or owner_id = auth.uid());
create policy "espaces: créer le sien" on public.spaces for insert with check (owner_id = auth.uid());
create policy "espaces: propriétaire modifie" on public.spaces for update using (public.is_owner(id));
create policy "espaces: propriétaire supprime" on public.spaces for delete using (public.is_owner(id) and kind <> 'personal');

create policy "membres: voir ceux de ses espaces" on public.space_members for select using (public.is_member(space_id));
-- On ne peut s'ajouter soi-même que comme propriétaire de son propre espace.
-- Les autres membres sont ajoutés par le serveur quand ils acceptent une invitation.
create policy "membres: propriétaire s'ajoute à son espace" on public.space_members for insert
  with check (user_id = auth.uid() and role = 'owner' and exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));
create policy "membres: propriétaire retire ou on quitte" on public.space_members for delete using (public.is_owner(space_id) or user_id = auth.uid());

create policy "invitations: propriétaire gère" on public.space_invites for all using (public.is_owner(space_id)) with check (public.is_owner(space_id));

create policy "facturation: lire la sienne" on public.billing for select using (user_id = auth.uid());

-- Tables d'un espace : mêmes règles pour toutes
do $$
declare t text;
begin
  foreach t in array array['transactions','budgets','deadlines','recurring','documents','letters','fiscal_estimates'] loop
    execute format('create policy "%1$s: membres lisent" on public.%1$I for select using (public.is_member(space_id))', t);
    execute format('create policy "%1$s: membres ajoutent" on public.%1$I for insert with check (public.is_member(space_id))', t);
    execute format('create policy "%1$s: membres modifient" on public.%1$I for update using (public.is_member(space_id)) with check (public.is_member(space_id))', t);
    execute format('create policy "%1$s: membres suppriment" on public.%1$I for delete using (public.is_member(space_id))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Nouvel utilisateur : profil + espace personnel + forfait gratuit
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  insert into public.profiles (id, full_name, locale)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'locale', 'fr'));

  insert into public.spaces (name, kind, owner_id) values ('Personnel', 'personal', new.id) returning id into sid;
  insert into public.space_members (space_id, user_id, role) values (sid, new.id, 'owner');
  insert into public.billing (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Stockage des documents : bucket privé, chemin = <space_id>/<fichier>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 10485760)
on conflict (id) do nothing;

create policy "documents: membres lisent" on storage.objects for select
  using (bucket_id = 'documents' and public.is_member((storage.foldername(name))[1]::uuid));
create policy "documents: membres déposent" on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_member((storage.foldername(name))[1]::uuid));
create policy "documents: membres suppriment" on storage.objects for delete
  using (bucket_id = 'documents' and public.is_member((storage.foldername(name))[1]::uuid));
