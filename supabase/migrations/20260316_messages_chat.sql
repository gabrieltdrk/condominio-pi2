create table if not exists messages (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete set null,
  mensagem text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_messages_created_at on messages(created_at desc);
create index if not exists idx_messages_user_id on messages(user_id);

alter table messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'authenticated_can_read_messages'
  ) then
    create policy "authenticated_can_read_messages"
      on messages
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'users_can_insert_own_messages'
  ) then
    create policy "users_can_insert_own_messages"
      on messages
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'users_can_delete_own_messages'
  ) then
    create policy "users_can_delete_own_messages"
      on messages
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
