create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.maintenance_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null default ('MNT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  title text not null,
  asset_name text not null,
  area text not null,
  kind text not null default 'PREVENTIVA'
    check (kind in ('PREVENTIVA', 'CORRETIVA', 'INSPECAO')),
  category text not null
    check (category in ('HIDRAULICA', 'ELETRICA', 'ESTRUTURAL', 'ELEVADORES', 'LIMPEZA', 'SEGURANCA', 'JARDINAGEM', 'PINTURA', 'CLIMATIZACAO', 'OUTROS')),
  priority text not null
    check (priority in ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
  status text not null default 'AGENDADA'
    check (status in ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA', 'CANCELADA')),
  supplier_name text not null,
  technician_name text not null,
  responsible_name text not null,
  scheduled_date date not null,
  scheduled_time time not null,
  maintenance_interval_days integer not null default 90
    check (maintenance_interval_days > 0),
  estimated_cost numeric(12,2),
  final_cost numeric(12,2),
  approved_by_name text,
  approved_at timestamptz,
  notes text,
  access_notes text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  last_service_at timestamptz,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_by_name text not null default 'Usuario',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.maintenance_orders
  add column if not exists order_code text not null default ('MNT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  add column if not exists kind text not null default 'PREVENTIVA',
  add column if not exists estimated_cost numeric(12,2),
  add column if not exists final_cost numeric(12,2),
  add column if not exists approved_by_name text,
  add column if not exists approved_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'maintenance_orders_kind_check'
  ) then
    alter table public.maintenance_orders
      add constraint maintenance_orders_kind_check
      check (kind in ('PREVENTIVA', 'CORRETIVA', 'INSPECAO'));
  end if;
end $$;

create unique index if not exists maintenance_orders_order_code_key
  on public.maintenance_orders (order_code);

create index if not exists maintenance_orders_status_idx
  on public.maintenance_orders (status, scheduled_date desc);

create index if not exists maintenance_orders_schedule_idx
  on public.maintenance_orders (scheduled_date desc, scheduled_time desc);

create index if not exists maintenance_orders_created_by_idx
  on public.maintenance_orders (created_by_user_id, created_at desc);

drop trigger if exists maintenance_orders_touch_updated_at on public.maintenance_orders;
create trigger maintenance_orders_touch_updated_at
before update on public.maintenance_orders
for each row
execute function public.touch_updated_at();

alter table public.maintenance_orders enable row level security;

grant select on public.maintenance_orders to authenticated;
grant insert, update, delete on public.maintenance_orders to authenticated;

drop policy if exists "maintenance_orders_select_authenticated" on public.maintenance_orders;
create policy "maintenance_orders_select_authenticated"
on public.maintenance_orders
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "maintenance_orders_insert_manage" on public.maintenance_orders;
create policy "maintenance_orders_insert_manage"
on public.maintenance_orders
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
);

drop policy if exists "maintenance_orders_update_manage" on public.maintenance_orders;
create policy "maintenance_orders_update_manage"
on public.maintenance_orders
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

drop policy if exists "maintenance_orders_delete_manage" on public.maintenance_orders;
create policy "maintenance_orders_delete_manage"
on public.maintenance_orders
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
