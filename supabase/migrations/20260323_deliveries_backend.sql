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

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.condo_apartments(id) on delete cascade,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  recipient_name text not null,
  carrier text not null,
  tracking_code text,
  description text,
  status text not null default 'RECEBIDA'
    check (status in ('RECEBIDA', 'AVISADA', 'RETIRADA')),
  notes text,
  received_at timestamptz not null default timezone('utc', now()),
  notified_at timestamptz,
  picked_up_at timestamptz,
  picked_up_by_name text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_by_name text not null default 'Portaria',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists deliveries_status_received_idx
  on public.deliveries (status, received_at desc);

create index if not exists deliveries_resident_idx
  on public.deliveries (resident_id, received_at desc);

create index if not exists deliveries_apartment_idx
  on public.deliveries (apartment_id, received_at desc);

create or replace function public.populate_delivery_resident()
returns trigger
language plpgsql
as $$
declare
  apartment_record record;
begin
  select
    a.id,
    a.resident_id,
    p.name as resident_name
  into apartment_record
  from public.condo_apartments a
  left join public.profiles p on p.id = a.resident_id
  where a.id = new.apartment_id;

  if apartment_record.id is null then
    raise exception 'Apartamento nao encontrado.'
      using errcode = '23503';
  end if;

  if apartment_record.resident_id is null then
    raise exception 'O apartamento selecionado nao possui morador vinculado.'
      using errcode = '23514';
  end if;

  new.resident_id = apartment_record.resident_id;
  new.recipient_name = coalesce(nullif(trim(new.recipient_name), ''), apartment_record.resident_name, 'Morador');

  if new.status in ('RECEBIDA', 'AVISADA') then
    new.status = 'AVISADA';
    new.notified_at = coalesce(new.notified_at, timezone('utc', now()));
  end if;

  if new.status = 'RETIRADA' and new.picked_up_at is null then
    new.picked_up_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

create or replace function public.notify_delivery_recipient()
returns trigger
language plpgsql
as $$
begin
  insert into public.system_notifications (
    user_id,
    title,
    message,
    category,
    link
  )
  values (
    new.resident_id,
    'Nova encomenda recebida',
    coalesce(new.description, 'Uma nova encomenda') || ' foi registrada para seu apartamento.',
    'ENCOMENDA',
    '/encomendas'
  );

  return new;
end;
$$;

drop trigger if exists deliveries_touch_updated_at on public.deliveries;
create trigger deliveries_touch_updated_at
before update on public.deliveries
for each row
execute function public.touch_updated_at();

drop trigger if exists deliveries_populate_resident on public.deliveries;
create trigger deliveries_populate_resident
before insert or update of apartment_id, status, recipient_name, picked_up_at
on public.deliveries
for each row
execute function public.populate_delivery_resident();

drop trigger if exists deliveries_notify_recipient on public.deliveries;
create trigger deliveries_notify_recipient
after insert on public.deliveries
for each row
execute function public.notify_delivery_recipient();

alter table public.deliveries enable row level security;

grant select, insert, update, delete on public.deliveries to authenticated;

drop policy if exists "deliveries_select_access" on public.deliveries;
create policy "deliveries_select_access"
on public.deliveries
for select
to authenticated
using (
  resident_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
);

drop policy if exists "deliveries_insert_manage" on public.deliveries;
create policy "deliveries_insert_manage"
on public.deliveries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
);

drop policy if exists "deliveries_update_manage" on public.deliveries;
create policy "deliveries_update_manage"
on public.deliveries
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
);

drop policy if exists "deliveries_delete_manage" on public.deliveries;
create policy "deliveries_delete_manage"
on public.deliveries
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
);

do $$
begin
  begin
    alter publication supabase_realtime add table public.deliveries;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
