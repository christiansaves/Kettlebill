-- Kettlebill — numérisation de reçus : lien entre une transaction et la photo du reçu.
alter table public.transactions
  add column if not exists document_id uuid references public.documents(id) on delete set null;

create index if not exists transactions_document_id_idx on public.transactions (document_id);
