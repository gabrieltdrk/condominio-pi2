update profiles
set role = 'ADMIN',
    resident_type = coalesce(resident_type, 'PROPRIETARIO'),
    status = coalesce(status, 'ATIVO')
where lower(email) = 'admin@condominio.com';

update profiles p
set email = coalesce(p.email, u.email),
    role = 'ADMIN',
    resident_type = coalesce(p.resident_type, 'PROPRIETARIO'),
    status = coalesce(p.status, 'ATIVO')
from auth.users u
where p.id = u.id
  and lower(u.email) = 'admin@condominio.com';
