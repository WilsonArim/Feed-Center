alter table public.user_settings
  drop constraint if exists user_settings_home_page_check;

alter table public.user_settings
  add constraint user_settings_home_page_check
  check (home_page in (
    '/start',
    '/today',
    '/dashboard',
    '/financeiro',
    '/todo',
    '/links',
    '/news',
    '/crypto'
  ));
