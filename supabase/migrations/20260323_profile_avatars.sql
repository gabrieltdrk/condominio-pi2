alter table if exists public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "upload_profile_avatars" on storage.objects;
create policy "upload_profile_avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "read_profile_avatars" on storage.objects;
create policy "read_profile_avatars"
on storage.objects
for select
to public
using (bucket_id = 'profile-avatars');

drop policy if exists "delete_profile_avatars" on storage.objects;
create policy "delete_profile_avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
