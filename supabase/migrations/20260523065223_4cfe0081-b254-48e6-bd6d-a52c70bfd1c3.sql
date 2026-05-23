DELETE FROM public.user_drive_games a
USING public.user_drive_games b
WHERE a.user_id = b.user_id
  AND a.id <> b.id
  AND a.console_type = b.console_type
  AND lower(regexp_replace(a.file_name, '\.[^.]+$', '')) = lower(regexp_replace(b.file_name, '\.[^.]+$', ''))
  AND lower(split_part(a.file_name, '.', array_length(string_to_array(a.file_name, '.'), 1))) IN ('bin','cue')
  AND lower(split_part(b.file_name, '.', array_length(string_to_array(b.file_name, '.'), 1))) = 'chd';