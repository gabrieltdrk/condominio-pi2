insert into public.profiles (
  id,
  name,
  email,
  role,
  phone,
  car_plate,
  pets_count,
  resident_type,
  status
)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(coalesce(u.email, ''), '@', 1), 'Morador'),
  u.email,
  case
    when lower(coalesce(u.email, '')) = 'admin@condominio.com' then 'ADMIN'
    else 'MORADOR'
  end,
  null,
  null,
  0,
  'PROPRIETARIO',
  'ATIVO'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    name,
    email,
    role,
    phone,
    car_plate,
    pets_count,
    resident_type,
    status
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'Morador'),
    new.email,
    case
      when lower(coalesce(new.email, '')) = 'admin@condominio.com' then 'ADMIN'
      else 'MORADOR'
    end,
    null,
    null,
    0,
    'PROPRIETARIO',
    'ATIVO'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(public.profiles.name, excluded.name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
