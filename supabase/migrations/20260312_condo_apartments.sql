create table if not exists condo_apartments (
  id uuid primary key default gen_random_uuid(),
  tower text not null,
  level integer not null,
  number text not null,
  resident_id uuid null references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tower, level, number)
);

insert into condo_apartments (tower, level, number)
select
  tower_name,
  floor_level,
  concat(floor_level::text, apartment_suffix::text)
from (
  values ('Torre A'), ('Torre B')
) as towers(tower_name)
cross join generate_series(1, 7) as floor_level
cross join generate_series(1, 4) as apartment_suffix
on conflict (tower, level, number) do nothing;

alter table condo_apartments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'condo_apartments'
      and policyname = 'select_condo_apartments'
  ) then
    create policy "select_condo_apartments"
      on condo_apartments
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'condo_apartments'
      and policyname = 'update_condo_apartments_admin'
  ) then
    create policy "update_condo_apartments_admin"
      on condo_apartments
      for update
      using (
        exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
      )
      with check (
        exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
      );
  end if;
end $$;
