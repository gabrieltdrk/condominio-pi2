alter table if exists profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists car_plate text,
  add column if not exists pets_count integer,
  add column if not exists resident_type text,
  add column if not exists status text;

update profiles p
set email = coalesce(p.email, u.email),
    resident_type = coalesce(p.resident_type, 'PROPRIETARIO'),
    status = coalesce(p.status, 'ATIVO'),
    pets_count = coalesce(p.pets_count, 0)
from auth.users u
where p.id = u.id;

update profiles
set resident_type = coalesce(resident_type, 'PROPRIETARIO'),
    status = coalesce(status, 'ATIVO'),
    pets_count = coalesce(pets_count, 0);

alter table if exists profiles
  alter column email set not null,
  alter column resident_type set default 'PROPRIETARIO',
  alter column status set default 'ATIVO',
  alter column pets_count set default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_resident_type_check_v2'
  ) then
    alter table profiles
      add constraint profiles_resident_type_check_v2
      check (resident_type in ('PROPRIETARIO', 'INQUILINO', 'VISITANTE'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check_v2'
  ) then
    alter table profiles
      add constraint profiles_status_check_v2
      check (status in ('ATIVO', 'INATIVO'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_pets_count_check'
  ) then
    alter table profiles
      add constraint profiles_pets_count_check
      check (pets_count >= 0);
  end if;
end $$;

create unique index if not exists profiles_email_unique_idx
  on profiles (lower(email));

create unique index if not exists condo_apartments_unique_resident_id
  on condo_apartments (resident_id)
  where resident_id is not null;
