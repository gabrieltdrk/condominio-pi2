-- finance_entries
create table if not exists public.finance_entries (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominios(id) on delete cascade,
  type           text not null check (type in ('REVENUE', 'EXPENSE')),
  identifier     text not null,
  description    text not null,
  amount         numeric(12, 2) not null,
  reference_date date not null,
  due_date       date,
  counterparty   text not null default '',
  unit           text,
  resident       text,
  category       text not null default '',
  payment_method text not null default '',
  status         text not null default 'Em aberto',
  document_name  text,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists finance_entries_condominio_id_idx on public.finance_entries (condominio_id);
create index if not exists finance_entries_reference_date_idx on public.finance_entries (reference_date desc);

alter table public.finance_entries enable row level security;

drop policy if exists "finance_entries: condominio members can read" on public.finance_entries;
create policy "finance_entries: condominio members can read"
  on public.finance_entries for select
  using (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = finance_entries.condominio_id
        and uc.active = true
    )
  );

drop policy if exists "finance_entries: admins can insert" on public.finance_entries;
create policy "finance_entries: admins can insert"
  on public.finance_entries for insert
  with check (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = finance_entries.condominio_id
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

drop policy if exists "finance_entries: admins can update" on public.finance_entries;
create policy "finance_entries: admins can update"
  on public.finance_entries for update
  using (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = finance_entries.condominio_id
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- finance_bills
create table if not exists public.finance_bills (
  id              uuid primary key default gen_random_uuid(),
  condominio_id   uuid not null references public.condominios(id) on delete cascade,
  entry_id        uuid references public.finance_entries(id) on delete set null,
  bill_code       text not null,
  unit            text not null,
  resident        text not null,
  resident_email  text,
  competence_date date not null,
  issue_date      date not null default current_date,
  due_date        date not null,
  amount          numeric(12, 2) not null,
  instructions    text,
  status          text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
  digitable_line  text,
  barcode         text,
  pdf_url         text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists finance_bills_condominio_id_idx on public.finance_bills (condominio_id);
create index if not exists finance_bills_due_date_idx on public.finance_bills (due_date);
create index if not exists finance_bills_status_idx on public.finance_bills (status);
create index if not exists finance_bills_resident_email_idx on public.finance_bills (resident_email);

alter table public.finance_bills enable row level security;

drop policy if exists "finance_bills: admins can read" on public.finance_bills;
create policy "finance_bills: admins can read"
  on public.finance_bills for select
  using (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = finance_bills.condominio_id
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

drop policy if exists "finance_bills: residents can read own bills" on public.finance_bills;
create policy "finance_bills: residents can read own bills"
  on public.finance_bills for select
  using (
    resident_email = auth.email()
    and exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = finance_bills.condominio_id
        and uc.active = true
    )
  );

drop policy if exists "finance_bills: admins can insert" on public.finance_bills;
create policy "finance_bills: admins can insert"
  on public.finance_bills for insert
  with check (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = finance_bills.condominio_id
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

drop policy if exists "finance_bills: admins can update" on public.finance_bills;
create policy "finance_bills: admins can update"
  on public.finance_bills for update
  using (
    exists (
      select 1 from public.usuario_condominio uc
      where uc.user_id = auth.uid()
        and uc.condominio_id = finance_bills.condominio_id
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );
