begin;

-- Novos campos para anexos e assinatura de quem abre a assembleia
alter table public.polls
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists creator_signature_url text,
  add column if not exists creator_signature_name text;

-- Bucket de armazenamento para documentos e assinaturas de assembleia
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'assembly_files') then
    insert into storage.buckets (id, name, public)
    values ('assembly_files', 'assembly_files', true);
  end if;
end $$;

-- Políticas de leitura/gravação no bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'assembly_files_read_authenticated'
  ) then
    create policy assembly_files_read_authenticated
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'assembly_files');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'assembly_files_insert_authenticated'
  ) then
    create policy assembly_files_insert_authenticated
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'assembly_files');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'assembly_files_update_owner'
  ) then
    create policy assembly_files_update_owner
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'assembly_files' and owner = auth.uid())
    with check (bucket_id = 'assembly_files' and owner = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'assembly_files_delete_owner'
  ) then
    create policy assembly_files_delete_owner
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'assembly_files' and owner = auth.uid());
  end if;
end $$;

commit;
