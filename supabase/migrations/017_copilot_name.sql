alter table public.user_settings
  add column if not exists copilot_name text default 'Buggy';

update public.user_settings
set copilot_name = 'Buggy'
where copilot_name is null or btrim(copilot_name) = '';

alter table public.user_settings
  drop constraint if exists user_settings_copilot_name_length_check;

alter table public.user_settings
  add constraint user_settings_copilot_name_length_check
  check (char_length(copilot_name) between 1 and 32);

