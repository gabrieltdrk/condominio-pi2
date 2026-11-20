-- Adiciona condominio_id à tabela condo_apartments para multi-tenancy
alter table public.condo_apartments
  add column if not exists condominio_id uuid references public.condominios(id) on delete cascade;

create index if not exists condo_apartments_condominio_id_idx on public.condo_apartments (condominio_id);
