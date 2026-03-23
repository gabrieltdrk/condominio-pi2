create extension if not exists btree_gist;

grant delete on public.visitor_requests to authenticated;

drop policy if exists "visitor_requests_delete_access" on public.visitor_requests;
create policy "visitor_requests_delete_access"
on public.visitor_requests
for delete
to authenticated
using (
  auth.uid() = resident_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

create or replace function public.prevent_overlapping_visitor_requests()
returns trigger
language plpgsql
as $$
begin
  if new.apartment_id is null then
    return new;
  end if;

  if new.status in ('CANCELADO', 'CHECKED_OUT') then
    return new;
  end if;

  if exists (
    select 1
    from public.visitor_requests existing
    where existing.id <> coalesce(new.id, gen_random_uuid())
      and existing.apartment_id = new.apartment_id
      and existing.status not in ('CANCELADO', 'CHECKED_OUT')
      and tstzrange(existing.expected_check_in, existing.expected_check_out, '[)') && tstzrange(new.expected_check_in, new.expected_check_out, '[)')
  ) then
    raise exception 'Já existe uma visita ativa para esta unidade na janela informada.'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists visitor_requests_prevent_overlap on public.visitor_requests;
create trigger visitor_requests_prevent_overlap
before insert or update of apartment_id, status, expected_check_in, expected_check_out
on public.visitor_requests
for each row
execute function public.prevent_overlapping_visitor_requests();
