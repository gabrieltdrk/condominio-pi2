do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('ADMIN', 'MORADOR', 'PORTEIRO'));
  end if;
end $$;

update public.profiles
set role = 'MORADOR'
where role is null;

create table if not exists public.system_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  category text not null default 'SISTEMA',
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists system_notifications_user_created_idx
  on public.system_notifications (user_id, created_at desc);

create table if not exists public.visitor_requests (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.profiles(id) on delete cascade,
  apartment_id uuid references public.condo_apartments(id) on delete set null,
  status text not null default 'PENDENTE_CONFIRMACAO',
  requires_portaria_qr boolean not null default true,
  adults_count integer not null default 1,
  children_count integer not null default 0,
  pets_count integer not null default 0,
  expected_check_in timestamptz not null,
  expected_check_out timestamptz not null,
  notes text,
  confirmation_email_sent_at timestamptz,
  principal_confirmed_at timestamptz,
  resident_validated_at timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint visitor_requests_status_check check (
    status in ('PENDENTE_CONFIRMACAO', 'CONFIRMADO', 'VALIDADO_MORADOR', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELADO')
  ),
  constraint visitor_requests_counts_check check (
    adults_count >= 0 and children_count >= 0 and pets_count >= 0
  ),
  constraint visitor_requests_checkin_window check (expected_check_out > expected_check_in)
);

create index if not exists visitor_requests_resident_created_idx
  on public.visitor_requests (resident_id, created_at desc);

create index if not exists visitor_requests_status_checkin_idx
  on public.visitor_requests (status, expected_check_in);

create table if not exists public.visitor_request_guests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.visitor_requests(id) on delete cascade,
  full_name text not null,
  birth_date date not null,
  cpf text not null,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint visitor_request_guests_cpf_digits_check check (char_length(regexp_replace(cpf, '\D', '', 'g')) = 11)
);

create unique index if not exists visitor_request_primary_guest_unique_idx
  on public.visitor_request_guests (request_id)
  where is_primary;

create index if not exists visitor_request_guests_request_idx
  on public.visitor_request_guests (request_id, created_at);

create table if not exists public.visitor_tokens (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.visitor_requests(id) on delete cascade,
  guest_id uuid not null references public.visitor_request_guests(id) on delete cascade,
  token_type text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint visitor_tokens_type_check check (token_type in ('CONFIRMATION', 'ACCESS'))
);

create index if not exists visitor_tokens_lookup_idx
  on public.visitor_tokens (request_id, token_type, expires_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_visitor_requests_updated_at on public.visitor_requests;

create trigger trg_visitor_requests_updated_at
before update on public.visitor_requests
for each row execute function public.set_updated_at();

alter table public.system_notifications enable row level security;
alter table public.visitor_requests enable row level security;
alter table public.visitor_request_guests enable row level security;
alter table public.visitor_tokens enable row level security;

drop policy if exists system_notifications_select_own on public.system_notifications;
create policy system_notifications_select_own
on public.system_notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists system_notifications_update_own on public.system_notifications;
create policy system_notifications_update_own
on public.system_notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists system_notifications_delete_own on public.system_notifications;
create policy system_notifications_delete_own
on public.system_notifications
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists visitor_requests_select_access on public.visitor_requests;
create policy visitor_requests_select_access
on public.visitor_requests
for select
to authenticated
using (
  resident_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('ADMIN', 'PORTEIRO')
  )
);

drop policy if exists visitor_requests_insert_resident on public.visitor_requests;
create policy visitor_requests_insert_resident
on public.visitor_requests
for insert
to authenticated
with check (
  resident_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('ADMIN', 'MORADOR')
  )
);

drop policy if exists visitor_requests_update_access on public.visitor_requests;
create policy visitor_requests_update_access
on public.visitor_requests
for update
to authenticated
using (
  resident_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('ADMIN', 'PORTEIRO')
  )
)
with check (
  resident_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('ADMIN', 'PORTEIRO')
  )
);

drop policy if exists visitor_requests_delete_owner on public.visitor_requests;
create policy visitor_requests_delete_owner
on public.visitor_requests
for delete
to authenticated
using (
  resident_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  )
);

drop policy if exists visitor_request_guests_select_access on public.visitor_request_guests;
create policy visitor_request_guests_select_access
on public.visitor_request_guests
for select
to authenticated
using (
  exists (
    select 1
    from public.visitor_requests vr
    where vr.id = visitor_request_guests.request_id
      and (
        vr.resident_id = auth.uid()
        or exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and role in ('ADMIN', 'PORTEIRO')
        )
      )
  )
);

drop policy if exists visitor_request_guests_insert_owner on public.visitor_request_guests;
create policy visitor_request_guests_insert_owner
on public.visitor_request_guests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.visitor_requests vr
    where vr.id = visitor_request_guests.request_id
      and vr.resident_id = auth.uid()
  )
);

drop policy if exists visitor_request_guests_update_owner on public.visitor_request_guests;
create policy visitor_request_guests_update_owner
on public.visitor_request_guests
for update
to authenticated
using (
  exists (
    select 1
    from public.visitor_requests vr
    where vr.id = visitor_request_guests.request_id
      and vr.resident_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.visitor_requests vr
    where vr.id = visitor_request_guests.request_id
      and vr.resident_id = auth.uid()
  )
);

drop policy if exists visitor_request_guests_delete_owner on public.visitor_request_guests;
create policy visitor_request_guests_delete_owner
on public.visitor_request_guests
for delete
to authenticated
using (
  exists (
    select 1
    from public.visitor_requests vr
    where vr.id = visitor_request_guests.request_id
      and vr.resident_id = auth.uid()
  )
);
