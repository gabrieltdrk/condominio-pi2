begin;

-- Impedir votos fora da janela ou em assembleias/pautas fechadas
create or replace function public.ensure_poll_is_open_for_voting()
returns trigger
language plpgsql
as $$
declare
  v_poll record;
  v_now timestamptz := timezone('utc', now());
begin
  select id, status, voting_starts_at, voting_ends_at
  into v_poll
  from public.polls
  where id = new.poll_id;

  if not found then
    raise exception 'Pauta não encontrada para voto.' using errcode = '23514';
  end if;

  if v_poll.status <> 'OPEN' then
    raise exception 'Votação já encerrada.' using errcode = 'P0001';
  end if;

  if v_poll.voting_starts_at is not null and v_poll.voting_starts_at > v_now then
    raise exception 'Votação ainda não começou.' using errcode = 'P0001';
  end if;

  if v_poll.voting_ends_at is not null and v_poll.voting_ends_at < v_now then
    raise exception 'Votação já encerrada.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists poll_votes_guard_window on public.poll_votes;
create trigger poll_votes_guard_window
before insert or update on public.poll_votes
for each row
execute function public.ensure_poll_is_open_for_voting();

-- Democratizar criação/edição de assembleias: permitir MORADOR ou ADMIN
drop policy if exists "polls_insert_resident_or_admin" on public.polls;
drop policy if exists "polls_insert_admin_only" on public.polls;
create policy "polls_insert_resident_or_admin"
on public.polls
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'MORADOR')
  )
);

drop policy if exists "polls_update_owner_or_admin_v2" on public.polls;
drop policy if exists "polls_update_admin_only" on public.polls;
create policy "polls_update_owner_or_admin_v2"
on public.polls
for update
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN')
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN')
  )
);

drop policy if exists "polls_delete_owner_or_admin_v2" on public.polls;
drop policy if exists "polls_delete_admin_only" on public.polls;
create policy "polls_delete_owner_or_admin_v2"
on public.polls
for delete
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN')
  )
);

drop policy if exists "poll_options_insert_owner_or_admin" on public.poll_options;
drop policy if exists "poll_options_insert_admin_only" on public.poll_options;
create policy "poll_options_insert_owner_or_admin"
on public.poll_options
for insert
to authenticated
with check (
  exists (
    select 1
    from public.polls
    where polls.id = poll_options.poll_id
      and (
        polls.created_by = auth.uid()
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'ADMIN'
        )
      )
  )
);

-- Refina voto: só permitir se a votação estiver aberta e dentro do horário
drop policy if exists "poll_votes_insert_own_in_window" on public.poll_votes;
drop policy if exists "poll_votes_insert_own" on public.poll_votes;
create policy "poll_votes_insert_own_in_window"
on public.poll_votes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.polls
    where polls.id = poll_votes.poll_id
      and polls.status = 'OPEN'
      and (polls.voting_starts_at is null or polls.voting_starts_at <= timezone('utc', now()))
      and (polls.voting_ends_at is null or polls.voting_ends_at >= timezone('utc', now()))
  )
);

drop policy if exists "poll_votes_update_own_in_window" on public.poll_votes;
drop policy if exists "poll_votes_update_own" on public.poll_votes;
create policy "poll_votes_update_own_in_window"
on public.poll_votes
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.polls
    where polls.id = poll_votes.poll_id
      and polls.status = 'OPEN'
      and (polls.voting_starts_at is null or polls.voting_starts_at <= timezone('utc', now()))
      and (polls.voting_ends_at is null or polls.voting_ends_at >= timezone('utc', now()))
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.polls
    where polls.id = poll_votes.poll_id
      and polls.status = 'OPEN'
      and (polls.voting_starts_at is null or polls.voting_starts_at <= timezone('utc', now()))
      and (polls.voting_ends_at is null or polls.voting_ends_at >= timezone('utc', now()))
  )
);

commit;
