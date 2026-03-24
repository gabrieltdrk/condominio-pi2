alter table if exists public.deliveries
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-photos',
  'delivery-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "upload_delivery_photos" on storage.objects;
create policy "upload_delivery_photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'delivery-photos' and auth.uid() is not null);

drop policy if exists "read_delivery_photos" on storage.objects;
create policy "read_delivery_photos"
on storage.objects
for select
to public
using (bucket_id = 'delivery-photos');

drop policy if exists "delete_delivery_photos" on storage.objects;
create policy "delete_delivery_photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'delivery-photos' and auth.uid() is not null);
