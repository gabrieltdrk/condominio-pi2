create table if not exists public.fornecedores (
  id            uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  nome          text not null,
  cnpj          text,
  categoria     text not null default 'Outros',
  telefone      text,
  email         text,
  notes         text,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists fornecedores_condominio_id_idx on public.fornecedores (condominio_id);

alter table public.fornecedores enable row level security;

drop policy if exists "fornecedores: admins can read" on public.fornecedores;
create policy "fornecedores: admins can read"
  on public.fornecedores for select
  using (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = fornecedores.condominio_id
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

drop policy if exists "fornecedores: admins can insert" on public.fornecedores;
create policy "fornecedores: admins can insert"
  on public.fornecedores for insert
  with check (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = fornecedores.condominio_id
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

drop policy if exists "fornecedores: admins can update" on public.fornecedores;
create policy "fornecedores: admins can update"
  on public.fornecedores for update
  using (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = fornecedores.condominio_id
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

drop policy if exists "fornecedores: admins can delete" on public.fornecedores;
create policy "fornecedores: admins can delete"
  on public.fornecedores for delete
  using (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = fornecedores.condominio_id
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );
