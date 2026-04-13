begin;

alter table public.polls
  add column if not exists assembly_type text not null default 'ORDINARIA',
  add column if not exists meeting_mode text not null default 'DIGITAL',
  add column if not exists scope text not null default 'GERAL',
  add column if not exists status text not null default 'OPEN',
  add column if not exists meeting_at timestamptz,
  add column if not exists voting_starts_at timestamptz not null default timezone('utc', now()),
  add column if not exists voting_ends_at timestamptz,
  add column if not exists quorum_min_percent integer not null default 50,
  add column if not exists approval_min_percent integer not null default 50,
  add column if not exists allow_comments boolean not null default true,
  add column if not exists minutes_summary text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'polls_assembly_type_check'
  ) then
    alter table public.polls
      add constraint polls_assembly_type_check
      check (assembly_type in ('ORDINARIA', 'EXTRAORDINARIA'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'polls_meeting_mode_check'
  ) then
    alter table public.polls
      add constraint polls_meeting_mode_check
      check (meeting_mode in ('DIGITAL', 'HIBRIDA', 'PRESENCIAL'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'polls_scope_check'
  ) then
    alter table public.polls
      add constraint polls_scope_check
      check (scope in ('GERAL', 'ADMINISTRATIVO', 'EMERGENCIAL'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'polls_status_check'
  ) then
    alter table public.polls
      add constraint polls_status_check
      check (status in ('DRAFT', 'OPEN', 'CLOSED'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'polls_quorum_min_percent_check'
  ) then
    alter table public.polls
      add constraint polls_quorum_min_percent_check
      check (quorum_min_percent between 0 and 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'polls_approval_min_percent_check'
  ) then
    alter table public.polls
      add constraint polls_approval_min_percent_check
      check (approval_min_percent between 0 and 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'polls_voting_window_check'
  ) then
    alter table public.polls
      add constraint polls_voting_window_check
      check (voting_ends_at is null or voting_ends_at >= voting_starts_at);
  end if;
end $$;

create index if not exists polls_status_idx on public.polls (status);
create index if not exists polls_voting_starts_at_idx on public.polls (voting_starts_at desc);
create index if not exists polls_voting_ends_at_idx on public.polls (voting_ends_at desc);

drop policy if exists "polls_insert_authenticated" on public.polls;
create policy "polls_insert_admin_only"
on public.polls
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

drop policy if exists "polls_update_owner_or_admin" on public.polls;
create policy "polls_update_admin_only"
on public.polls
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

drop policy if exists "polls_delete_owner_or_admin" on public.polls;
create policy "polls_delete_admin_only"
on public.polls
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

drop policy if exists "poll_options_insert_poll_owner" on public.poll_options;
create policy "poll_options_insert_admin_only"
on public.poll_options
for insert
to authenticated
with check (
  exists (
    select 1
    from public.polls
    join public.profiles on profiles.id = auth.uid()
    where polls.id = poll_options.poll_id
      and polls.created_by = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

commit;
