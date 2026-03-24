alter table if exists profiles
  add column if not exists car_plate text,
  add column if not exists pets_count integer;

update profiles
set pets_count = 0
where pets_count is null;
