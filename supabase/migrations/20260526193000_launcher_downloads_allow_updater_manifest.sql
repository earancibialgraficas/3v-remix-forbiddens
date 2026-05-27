update storage.buckets
set allowed_mime_types = array[
  'application/json',
  'application/octet-stream',
  'application/pgp-signature',
  'application/x-signature',
  'application/x-minisign',
  'application/x-msdownload',
  'application/vnd.microsoft.portable-executable',
  'application/zip',
  'text/plain'
]
where id = 'launcher-downloads';
