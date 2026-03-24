alter table if exists profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists car_plate text,
  add column if not exists pets_count integer,
  add column if not exists resident_type text,
  add column if not exists status text;

update profiles p
set email = coalesce(p.email, u.email)
from auth.users u
where p.id = u.id;

update profiles
set resident_type = coalesce(resident_type, 'PROPRIETARIO'),
    status = coalesce(status, 'ATIVO'),
    pets_count = coalesce(pets_count, 0);

alter table if exists profiles
  alter column resident_type set default 'PROPRIETARIO',
  alter column status set default 'ATIVO';

create unique index if not exists condo_apartments_unique_resident_id
  on condo_apartments (resident_id)
  where resident_id is not null;
