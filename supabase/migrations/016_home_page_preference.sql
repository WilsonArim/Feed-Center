alter table public.user_settings
  add column if not exists home_page text default '/start';

update public.user_settings
set home_page = '/start'
where home_page is null;

alter table public.user_settings
  drop constraint if exists user_settings_home_page_check;

alter table public.user_settings
  add constraint user_settings_home_page_check
  check (home_page in (
    '/start',
    '/dashboard',
    '/financeiro',
    '/todo',
    '/links',
    '/news',
    '/crypto'
  ));
