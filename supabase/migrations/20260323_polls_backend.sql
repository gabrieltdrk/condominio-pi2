create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_by_name text not null default 'Morador',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  position integer not null check (position > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (poll_id, position)
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (poll_id, user_id)
);

create table if not exists public.poll_comments (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_by_name text not null default 'Morador',
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists polls_created_at_idx on public.polls (created_at desc);
create index if not exists poll_options_poll_id_idx on public.poll_options (poll_id, position);
create index if not exists poll_votes_poll_id_idx on public.poll_votes (poll_id);
create index if not exists poll_votes_option_id_idx on public.poll_votes (option_id);
create index if not exists poll_comments_poll_id_idx on public.poll_comments (poll_id, created_at asc);

drop trigger if exists polls_touch_updated_at on public.polls;
create trigger polls_touch_updated_at
before update on public.polls
for each row
execute function public.touch_updated_at();

create or replace function public.ensure_poll_vote_matches_option()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.poll_options
    where poll_options.id = new.option_id
      and poll_options.poll_id = new.poll_id
  ) then
    raise exception 'A opcao informada nao pertence a esta enquete.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists poll_votes_validate_option on public.poll_votes;
create trigger poll_votes_validate_option
before insert or update on public.poll_votes
for each row
execute function public.ensure_poll_vote_matches_option();

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.poll_comments enable row level security;

grant select, insert, update, delete on public.polls to authenticated;
grant select, insert on public.poll_options to authenticated;
grant select, insert, update, delete on public.poll_votes to authenticated;
grant select, insert, update, delete on public.poll_comments to authenticated;

drop policy if exists "polls_select_authenticated" on public.polls;
create policy "polls_select_authenticated"
on public.polls
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "polls_insert_authenticated" on public.polls;
create policy "polls_insert_authenticated"
on public.polls
for insert
to authenticated
with check (
  created_by = auth.uid()
);

drop policy if exists "polls_update_owner_or_admin" on public.polls;
create policy "polls_update_owner_or_admin"
on public.polls
for update
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

drop policy if exists "polls_delete_owner_or_admin" on public.polls;
create policy "polls_delete_owner_or_admin"
on public.polls
for delete
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

drop policy if exists "poll_options_select_authenticated" on public.poll_options;
create policy "poll_options_select_authenticated"
on public.poll_options
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "poll_options_insert_poll_owner" on public.poll_options;
create policy "poll_options_insert_poll_owner"
on public.poll_options
for insert
to authenticated
with check (
  exists (
    select 1
    from public.polls
    where polls.id = poll_options.poll_id
      and polls.created_by = auth.uid()
  )
);

drop policy if exists "poll_votes_select_authenticated" on public.poll_votes;
create policy "poll_votes_select_authenticated"
on public.poll_votes
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "poll_votes_insert_own" on public.poll_votes;
create policy "poll_votes_insert_own"
on public.poll_votes
for insert
to authenticated
with check (
  user_id = auth.uid()
);

drop policy if exists "poll_votes_update_own" on public.poll_votes;
create policy "poll_votes_update_own"
on public.poll_votes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "poll_votes_delete_own_or_admin" on public.poll_votes;
create policy "poll_votes_delete_own_or_admin"
on public.poll_votes
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

drop policy if exists "poll_comments_select_authenticated" on public.poll_comments;
create policy "poll_comments_select_authenticated"
on public.poll_comments
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "poll_comments_insert_own" on public.poll_comments;
create policy "poll_comments_insert_own"
on public.poll_comments
for insert
to authenticated
with check (
  created_by = auth.uid()
);

drop policy if exists "poll_comments_update_own_or_admin" on public.poll_comments;
create policy "poll_comments_update_own_or_admin"
on public.poll_comments
for update
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

drop policy if exists "poll_comments_delete_own_or_admin" on public.poll_comments;
create policy "poll_comments_delete_own_or_admin"
on public.poll_comments
for delete
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

do $$
begin
  begin
    alter publication supabase_realtime add table public.polls;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.poll_options;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.poll_votes;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.poll_comments;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
