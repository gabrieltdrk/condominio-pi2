-- Tabela junction para múltiplos moradores por apartamento
create table if not exists public.condo_apartment_residents (
  id            uuid primary key default gen_random_uuid(),
  apartment_id  uuid not null references public.condo_apartments(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (apartment_id, user_id)
);

create index if not exists condo_apt_residents_apartment_idx on public.condo_apartment_residents (apartment_id);
create index if not exists condo_apt_residents_user_idx     on public.condo_apartment_residents (user_id);

alter table public.condo_apartment_residents enable row level security;

drop policy if exists "apt_residents: members can read" on public.condo_apartment_residents;
create policy "apt_residents: members can read"
  on public.condo_apartment_residents for select
  using (
    exists (
      select 1 from public.condo_apartments ca
      join public.usuario_condominio uc on uc.condominio_id = ca.condominio_id
      where ca.id = condo_apartment_residents.apartment_id
        and uc.user_id = auth.uid()
        and uc.active = true
    )
  );

drop policy if exists "apt_residents: admins can insert" on public.condo_apartment_residents;
create policy "apt_residents: admins can insert"
  on public.condo_apartment_residents for insert
  with check (
    exists (
      select 1 from public.condo_apartments ca
      join public.usuario_condominio uc on uc.condominio_id = ca.condominio_id
      where ca.id = condo_apartment_residents.apartment_id
        and uc.user_id = auth.uid()
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

drop policy if exists "apt_residents: admins can delete" on public.condo_apartment_residents;
create policy "apt_residents: admins can delete"
  on public.condo_apartment_residents for delete
  using (
    exists (
      select 1 from public.condo_apartments ca
      join public.usuario_condominio uc on uc.condominio_id = ca.condominio_id
      where ca.id = condo_apartment_residents.apartment_id
        and uc.user_id = auth.uid()
        and uc.active = true
        and uc.role in ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- Migrar dados existentes do campo resident_id para a nova tabela
insert into public.condo_apartment_residents (apartment_id, user_id)
select id, resident_id
from public.condo_apartments
where resident_id is not null
on conflict do nothing;
