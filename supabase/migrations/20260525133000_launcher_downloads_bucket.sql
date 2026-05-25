insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'launcher-downloads',
  'launcher-downloads',
  true,
  524288000,
  array[
    'application/octet-stream',
    'application/x-msdownload',
    'application/vnd.microsoft.portable-executable',
    'application/zip'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public launcher downloads" on storage.objects;
create policy "Public launcher downloads"
on storage.objects
for select
using (bucket_id = 'launcher-downloads');

drop policy if exists "Staff can upload launcher downloads" on storage.objects;
create policy "Staff can upload launcher downloads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'launcher-downloads'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'moderator', 'master_web')
  )
);

drop policy if exists "Staff can update launcher downloads" on storage.objects;
create policy "Staff can update launcher downloads"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'launcher-downloads'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'moderator', 'master_web')
  )
)
with check (
  bucket_id = 'launcher-downloads'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'moderator', 'master_web')
  )
);

drop policy if exists "Staff can delete launcher downloads" on storage.objects;
create policy "Staff can delete launcher downloads"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'launcher-downloads'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'moderator', 'master_web')
  )
);
