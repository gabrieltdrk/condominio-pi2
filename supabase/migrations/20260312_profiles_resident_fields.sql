alter table if exists profiles
  add column if not exists phone text,
  add column if not exists resident_type text,
  add column if not exists status text;

update profiles
set resident_type = coalesce(resident_type, 'PROPRIETARIO'),
    status = coalesce(status, 'ATIVO');

alter table if exists profiles
  alter column resident_type set default 'PROPRIETARIO',
  alter column status set default 'ATIVO';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_resident_type_check'
  ) then
    alter table profiles
      add constraint profiles_resident_type_check
      check (resident_type in ('PROPRIETARIO', 'INQUILINO', 'VISITANTE'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
  ) then
    alter table profiles
      add constraint profiles_status_check
      check (status in ('ATIVO', 'INATIVO'));
  end if;
end $$;
