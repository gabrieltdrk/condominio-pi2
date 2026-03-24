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

create table if not exists public.maintenance_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null default ('MNT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  title text not null,
  asset_name text not null,
  area text not null,
  kind text not null default 'PREVENTIVA',
  category text not null,
  priority text not null,
  status text not null default 'AGENDADA',
  supplier_name text not null,
  technician_name text not null,
  responsible_name text not null,
  scheduled_date date not null,
  scheduled_time time not null,
  maintenance_interval_days integer not null default 90,
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
  add column if not exists title text,
  add column if not exists asset_name text,
  add column if not exists area text,
  add column if not exists kind text not null default 'PREVENTIVA',
  add column if not exists category text,
  add column if not exists priority text,
  add column if not exists status text not null default 'AGENDADA',
  add column if not exists supplier_name text,
  add column if not exists technician_name text,
  add column if not exists responsible_name text,
  add column if not exists scheduled_date date,
  add column if not exists scheduled_time time,
  add column if not exists maintenance_interval_days integer not null default 90,
  add column if not exists estimated_cost numeric(12,2),
  add column if not exists final_cost numeric(12,2),
  add column if not exists approved_by_name text,
  add column if not exists approved_at timestamptz,
  add column if not exists notes text,
  add column if not exists access_notes text,
  add column if not exists check_in_at timestamptz,
  add column if not exists check_out_at timestamptz,
  add column if not exists last_service_at timestamptz,
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists created_by_name text not null default 'Usuario',
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.maintenance_orders
set
  title = coalesce(title, 'Manutencao'),
  asset_name = coalesce(asset_name, 'Ativo'),
  area = coalesce(area, 'Nao informada'),
  category = coalesce(category, 'OUTROS'),
  priority = coalesce(priority, 'MEDIA'),
  supplier_name = coalesce(supplier_name, 'Nao informado'),
  technician_name = coalesce(technician_name, 'Nao informado'),
  responsible_name = coalesce(responsible_name, 'Nao informado'),
  scheduled_date = coalesce(scheduled_date, timezone('utc', now())::date),
  scheduled_time = coalesce(scheduled_time, '09:00'::time),
  created_by_name = coalesce(nullif(trim(created_by_name), ''), 'Usuario')
where
  title is null
  or asset_name is null
  or area is null
  or category is null
  or priority is null
  or supplier_name is null
  or technician_name is null
  or responsible_name is null
  or scheduled_date is null
  or scheduled_time is null
  or created_by_name is null
  or trim(created_by_name) = '';

alter table public.maintenance_orders
  alter column title set not null,
  alter column asset_name set not null,
  alter column area set not null,
  alter column category set not null,
  alter column priority set not null,
  alter column supplier_name set not null,
  alter column technician_name set not null,
  alter column responsible_name set not null,
  alter column scheduled_date set not null,
  alter column scheduled_time set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'maintenance_orders_kind_check'
      and conrelid = 'public.maintenance_orders'::regclass
  ) then
    alter table public.maintenance_orders
      add constraint maintenance_orders_kind_check
      check (kind in ('PREVENTIVA', 'CORRETIVA', 'INSPECAO'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'maintenance_orders_category_check'
      and conrelid = 'public.maintenance_orders'::regclass
  ) then
    alter table public.maintenance_orders
      add constraint maintenance_orders_category_check
      check (category in ('HIDRAULICA', 'ELETRICA', 'ESTRUTURAL', 'ELEVADORES', 'LIMPEZA', 'SEGURANCA', 'JARDINAGEM', 'PINTURA', 'CLIMATIZACAO', 'OUTROS'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'maintenance_orders_priority_check'
      and conrelid = 'public.maintenance_orders'::regclass
  ) then
    alter table public.maintenance_orders
      add constraint maintenance_orders_priority_check
      check (priority in ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'maintenance_orders_status_check'
      and conrelid = 'public.maintenance_orders'::regclass
  ) then
    alter table public.maintenance_orders
      add constraint maintenance_orders_status_check
      check (status in ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA', 'CANCELADA'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'maintenance_orders_maintenance_interval_days_check'
      and conrelid = 'public.maintenance_orders'::regclass
  ) then
    alter table public.maintenance_orders
      add constraint maintenance_orders_maintenance_interval_days_check
      check (maintenance_interval_days > 0);
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

create or replace function public.maintenance_actor_name(actor_id uuid)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(trim((select p.name from public.profiles p where p.id = actor_id)), ''),
    'Sistema'
  );
$$;

create table if not exists public.maintenance_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.maintenance_orders(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'ORDEM_CRIADA',
      'ORDEM_EDITADA',
      'STATUS_ALTERADO',
      'APROVACAO_REGISTRADA',
      'CHECKIN_REGISTRADO',
      'CHECKOUT_REGISTRADO',
      'ANEXO_ADICIONADO',
      'ANEXO_REMOVIDO'
    )
  ),
  title text not null,
  description text,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'Sistema',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists maintenance_order_events_order_idx
  on public.maintenance_order_events (order_id, created_at desc);

create table if not exists public.maintenance_order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.maintenance_orders(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_path text not null,
  mime_type text,
  size_bytes bigint,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_by_name text not null default 'Sistema',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists maintenance_order_attachments_order_idx
  on public.maintenance_order_attachments (order_id, created_at desc);

create or replace function public.append_maintenance_order_event(
  p_order_id uuid,
  p_event_type text,
  p_title text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_actor_user_id uuid default auth.uid()
)
returns void
language plpgsql
as $fn$
declare
  resolved_actor_id uuid := p_actor_user_id;
  resolved_actor_name text := public.maintenance_actor_name(p_actor_user_id);
begin
  insert into public.maintenance_order_events (
    order_id,
    event_type,
    title,
    description,
    actor_user_id,
    actor_name,
    metadata
  )
  values (
    p_order_id,
    p_event_type,
    p_title,
    p_description,
    resolved_actor_id,
    resolved_actor_name,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$fn$;

create or replace function public.validate_maintenance_order_transition()
returns trigger
language plpgsql
as $fn$
begin
  if coalesce(new.maintenance_interval_days, 0) <= 0 then
    raise exception 'O ciclo de manutencao deve ser maior que zero.'
      using errcode = '23514';
  end if;

  if new.check_out_at is not null and new.check_in_at is null then
    raise exception 'Nao e possivel registrar saida sem entrada.'
      using errcode = '23514';
  end if;

  if new.check_in_at is not null and new.check_out_at is not null and new.check_out_at < new.check_in_at then
    raise exception 'A saida nao pode acontecer antes da entrada.'
      using errcode = '23514';
  end if;

  if new.status = 'EM_ANDAMENTO' and new.check_in_at is null then
    raise exception 'Manutencoes em andamento precisam ter entrada registrada.'
      using errcode = '23514';
  end if;

  if new.status = 'CONCLUIDA' and new.check_out_at is null then
    raise exception 'Manutencoes concluidas precisam ter saida registrada.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'CONCLUIDA' and new.status is distinct from old.status then
      raise exception 'Nao e permitido alterar o status de uma manutencao concluida.'
        using errcode = '23514';
    end if;

    if old.status = 'CANCELADA' and new.status is distinct from old.status then
      raise exception 'Nao e permitido alterar o status de uma manutencao cancelada.'
        using errcode = '23514';
    end if;

    if old.status = 'AGENDADA' and new.status not in ('AGENDADA', 'ATRASADA', 'EM_ANDAMENTO', 'CANCELADA') then
      raise exception 'Transicao de status invalida para manutencao agendada.'
        using errcode = '23514';
    end if;

    if old.status = 'ATRASADA' and new.status not in ('ATRASADA', 'AGENDADA', 'EM_ANDAMENTO', 'CANCELADA') then
      raise exception 'Transicao de status invalida para manutencao atrasada.'
        using errcode = '23514';
    end if;

    if old.status = 'EM_ANDAMENTO' and new.status not in ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA') then
      raise exception 'Transicao de status invalida para manutencao em andamento.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$fn$;

create or replace function public.log_maintenance_order_event()
returns trigger
language plpgsql
as $fn$
declare
  actor_id uuid := auth.uid();
  has_edit boolean := false;
begin
  if tg_op = 'INSERT' then
    perform public.append_maintenance_order_event(
      new.id,
      'ORDEM_CRIADA',
      'Ordem criada',
      'Nova manutencao cadastrada para ' || coalesce(new.asset_name, 'ativo') || '.',
      jsonb_build_object(
        'status', new.status,
        'scheduled_date', new.scheduled_date,
        'scheduled_time', new.scheduled_time
      ),
      actor_id
    );
    return new;
  end if;

  has_edit :=
    old.title is distinct from new.title
    or old.asset_name is distinct from new.asset_name
    or old.area is distinct from new.area
    or old.kind is distinct from new.kind
    or old.category is distinct from new.category
    or old.priority is distinct from new.priority
    or old.supplier_name is distinct from new.supplier_name
    or old.technician_name is distinct from new.technician_name
    or old.responsible_name is distinct from new.responsible_name
    or old.scheduled_date is distinct from new.scheduled_date
    or old.scheduled_time is distinct from new.scheduled_time
    or old.maintenance_interval_days is distinct from new.maintenance_interval_days
    or old.estimated_cost is distinct from new.estimated_cost
    or old.final_cost is distinct from new.final_cost
    or old.notes is distinct from new.notes;

  if old.approved_at is distinct from new.approved_at and new.approved_at is not null then
    perform public.append_maintenance_order_event(
      new.id,
      'APROVACAO_REGISTRADA',
      'Aprovacao registrada',
      'A manutencao foi aprovada por ' || coalesce(nullif(trim(new.approved_by_name), ''), 'Responsavel') || '.',
      jsonb_build_object('approved_at', new.approved_at),
      actor_id
    );
  end if;

  if old.check_in_at is distinct from new.check_in_at and new.check_in_at is not null then
    perform public.append_maintenance_order_event(
      new.id,
      'CHECKIN_REGISTRADO',
      'Entrada registrada',
      'Entrada do tecnico registrada com sucesso.',
      jsonb_build_object('check_in_at', new.check_in_at),
      actor_id
    );
  end if;

  if old.check_out_at is distinct from new.check_out_at and new.check_out_at is not null then
    perform public.append_maintenance_order_event(
      new.id,
      'CHECKOUT_REGISTRADO',
      'Saida registrada',
      'Saida do tecnico registrada com sucesso.',
      jsonb_build_object('check_out_at', new.check_out_at),
      actor_id
    );
  end if;

  if old.status is distinct from new.status and new.status = 'CANCELADA' then
    perform public.append_maintenance_order_event(
      new.id,
      'STATUS_ALTERADO',
      'Manutencao cancelada',
      'A ordem foi cancelada.',
      jsonb_build_object('from', old.status, 'to', new.status),
      actor_id
    );
  elsif old.status is distinct from new.status
    and not (
      (new.status = 'EM_ANDAMENTO' and old.check_in_at is distinct from new.check_in_at)
      or (new.status = 'CONCLUIDA' and old.check_out_at is distinct from new.check_out_at)
    ) then
    perform public.append_maintenance_order_event(
      new.id,
      'STATUS_ALTERADO',
      'Status alterado',
      'Status atualizado de ' || old.status || ' para ' || new.status || '.',
      jsonb_build_object('from', old.status, 'to', new.status),
      actor_id
    );
  end if;

  if has_edit then
    perform public.append_maintenance_order_event(
      new.id,
      'ORDEM_EDITADA',
      'Ordem atualizada',
      'Os dados operacionais da manutencao foram atualizados.',
      jsonb_build_object('status', new.status),
      actor_id
    );
  end if;

  return new;
end;
$fn$;

create or replace function public.log_maintenance_attachment_event()
returns trigger
language plpgsql
as $fn$
declare
  actor_id uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    perform public.append_maintenance_order_event(
      new.order_id,
      'ANEXO_ADICIONADO',
      'Evidencia adicionada',
      'Arquivo anexado: ' || new.file_name,
      jsonb_build_object('attachment_id', new.id, 'file_name', new.file_name),
      actor_id
    );
    return new;
  end if;

  perform public.append_maintenance_order_event(
    old.order_id,
    'ANEXO_REMOVIDO',
    'Evidencia removida',
    'Arquivo removido: ' || old.file_name,
    jsonb_build_object('attachment_id', old.id, 'file_name', old.file_name),
    actor_id
  );
  return old;
end;
$fn$;

drop trigger if exists maintenance_orders_touch_updated_at on public.maintenance_orders;
create trigger maintenance_orders_touch_updated_at
before update on public.maintenance_orders
for each row
execute function public.touch_updated_at();

drop trigger if exists maintenance_orders_validate_transition on public.maintenance_orders;
create trigger maintenance_orders_validate_transition
before insert or update on public.maintenance_orders
for each row
execute function public.validate_maintenance_order_transition();

drop trigger if exists maintenance_orders_log_event on public.maintenance_orders;
create trigger maintenance_orders_log_event
after insert or update on public.maintenance_orders
for each row
execute function public.log_maintenance_order_event();

drop trigger if exists maintenance_order_attachments_touch_updated_at on public.maintenance_order_attachments;
create trigger maintenance_order_attachments_touch_updated_at
before update on public.maintenance_order_attachments
for each row
execute function public.touch_updated_at();

drop trigger if exists maintenance_order_attachments_log_event on public.maintenance_order_attachments;
create trigger maintenance_order_attachments_log_event
after insert or delete on public.maintenance_order_attachments
for each row
execute function public.log_maintenance_attachment_event();

alter table public.maintenance_orders enable row level security;
alter table public.maintenance_order_events enable row level security;
alter table public.maintenance_order_attachments enable row level security;

grant select, insert, update, delete on public.maintenance_orders to authenticated;
grant select, insert, update, delete on public.maintenance_order_events to authenticated;
grant select, insert, update, delete on public.maintenance_order_attachments to authenticated;

drop policy if exists "maintenance_orders_select_authenticated" on public.maintenance_orders;
create policy "maintenance_orders_select_authenticated"
on public.maintenance_orders
for select
to authenticated
using (true);

drop policy if exists "maintenance_orders_manage_admin_gatekeeper" on public.maintenance_orders;
create policy "maintenance_orders_manage_admin_gatekeeper"
on public.maintenance_orders
for all
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

drop policy if exists "maintenance_events_select_authenticated" on public.maintenance_order_events;
create policy "maintenance_events_select_authenticated"
on public.maintenance_order_events
for select
to authenticated
using (true);

drop policy if exists "maintenance_events_insert_manage" on public.maintenance_order_events;
create policy "maintenance_events_insert_manage"
on public.maintenance_order_events
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

drop policy if exists "maintenance_attachments_select_authenticated" on public.maintenance_order_attachments;
create policy "maintenance_attachments_select_authenticated"
on public.maintenance_order_attachments
for select
to authenticated
using (true);

drop policy if exists "maintenance_attachments_manage_admin_gatekeeper" on public.maintenance_order_attachments;
create policy "maintenance_attachments_manage_admin_gatekeeper"
on public.maintenance_order_attachments
for all
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

do $$
begin
  begin
    alter publication supabase_realtime add table public.maintenance_orders;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.maintenance_order_events;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.maintenance_order_attachments;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'maintenance-evidence',
  'maintenance-evidence',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "upload_maintenance_evidence" on storage.objects;
create policy "upload_maintenance_evidence"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'maintenance-evidence'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
);

drop policy if exists "read_maintenance_evidence" on storage.objects;
create policy "read_maintenance_evidence"
on storage.objects
for select
to public
using (bucket_id = 'maintenance-evidence');

drop policy if exists "delete_maintenance_evidence" on storage.objects;
create policy "delete_maintenance_evidence"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'maintenance-evidence'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'PORTEIRO')
  )
);
