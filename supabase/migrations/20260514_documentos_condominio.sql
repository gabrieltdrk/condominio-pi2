create table if not exists condominio_documentos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid references condominios(id) on delete cascade,
  nome text not null,
  tipo text not null,
  descricao text,
  data_validade date,
  arquivo_url text,
  arquivo_nome text,
  arquivo_tamanho bigint,
  criado_por uuid references profiles(id),
  renovado_de uuid references condominio_documentos(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table condominio_documentos enable row level security;

create policy "Membros podem ler documentos" on condominio_documentos
  for select using (
    condominio_id in (
      select condominio_id from usuario_condominio where user_id = auth.uid()
    )
  );

create policy "Admin pode gerenciar documentos" on condominio_documentos
  for all using (
    exists (
      select 1 from usuario_condominio
      where user_id = auth.uid()
      and condominio_id = condominio_documentos.condominio_id
      and role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- MANUAL: Create a Supabase Storage bucket named 'documentos-condominio' with private access
-- and allow authenticated users to upload/read objects in their condominio_id/ prefix.
