create extension if not exists pgcrypto;

create table if not exists public.system_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  category text not null default 'SYSTEM',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.visitor_requests (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.profiles (id) on delete cascade,
  apartment_id uuid references public.condo_apartments (id) on delete set null,
  status text not null default 'PENDENTE_CONFIRMACAO' check (status in ('PENDENTE_CONFIRMACAO', 'CONFIRMADO', 'VALIDADO_MORADOR', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELADO')),
  requires_portaria_qr boolean not null default true,
  adults_count integer not null default 1 check (adults_count >= 0),
  children_count integer not null default 0 check (children_count >= 0),
  pets_count integer not null default 0 check (pets_count >= 0),
  expected_check_in timestamptz not null,
  expected_check_out timestamptz not null,
  notes text,
  confirmation_email_sent_at timestamptz,
  principal_confirmed_at timestamptz,
  resident_validated_at timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visitor_requests_window_check check (expected_check_out > expected_check_in)
);

create table if not exists public.visitor_request_guests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.visitor_requests (id) on delete cascade,
  full_name text not null,
  birth_date date not null,
  cpf varchar(11) not null,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists visitor_request_guests_primary_unique
  on public.visitor_request_guests (request_id)
  where is_primary;

create table if not exists public.visitor_flow_tokens (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.visitor_requests (id) on delete cascade,
  guest_id uuid references public.visitor_request_guests (id) on delete cascade,
  purpose text not null check (purpose in ('APPROVAL', 'ACCESS')),
  actor text check (actor in ('resident', 'gatekeeper')),
  token_hash text not null unique,
  expires_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists visitor_requests_resident_idx on public.visitor_requests (resident_id, created_at desc);
create index if not exists visitor_requests_status_idx on public.visitor_requests (status);
create index if not exists visitor_guests_request_idx on public.visitor_request_guests (request_id);
create index if not exists visitor_tokens_request_idx on public.visitor_flow_tokens (request_id, purpose);
create index if not exists system_notifications_user_idx on public.system_notifications (user_id, read, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists visitor_requests_touch_updated_at on public.visitor_requests;
create trigger visitor_requests_touch_updated_at
before update on public.visitor_requests
for each row
execute function public.touch_updated_at();

alter table public.system_notifications enable row level security;
alter table public.visitor_requests enable row level security;
alter table public.visitor_request_guests enable row level security;

grant select, insert, update on public.system_notifications to authenticated;
grant select, insert, update on public.visitor_requests to authenticated;
grant select, insert on public.visitor_request_guests to authenticated;

drop policy if exists "system_notifications_select_own" on public.system_notifications;
create policy "system_notifications_select_own"
on public.system_notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "system_notifications_update_own" on public.system_notifications;
create policy "system_notifications_update_own"
on public.system_notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "visitor_requests_select_access" on public.visitor_requests;
create policy "visitor_requests_select_access"
on public.visitor_requests
for select
to authenticated
using (
  auth.uid() = resident_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
);

drop policy if exists "visitor_requests_insert_resident" on public.visitor_requests;
create policy "visitor_requests_insert_resident"
on public.visitor_requests
for insert
to authenticated
with check (
  auth.uid() = resident_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'MORADOR')
  )
);

drop policy if exists "visitor_requests_update_access" on public.visitor_requests;
create policy "visitor_requests_update_access"
on public.visitor_requests
for update
to authenticated
using (
  auth.uid() = resident_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
)
with check (
  auth.uid() = resident_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
);

drop policy if exists "visitor_guests_select_access" on public.visitor_request_guests;
create policy "visitor_guests_select_access"
on public.visitor_request_guests
for select
to authenticated
using (
  exists (
    select 1
    from public.visitor_requests
    where visitor_requests.id = visitor_request_guests.request_id
      and (
        visitor_requests.resident_id = auth.uid()
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role in ('ADMIN', 'PORTEIRO')
        )
      )
  )
);

drop policy if exists "visitor_guests_insert_access" on public.visitor_request_guests;
create policy "visitor_guests_insert_access"
on public.visitor_request_guests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.visitor_requests
    where visitor_requests.id = visitor_request_guests.request_id
      and visitor_requests.resident_id = auth.uid()
  )
);
