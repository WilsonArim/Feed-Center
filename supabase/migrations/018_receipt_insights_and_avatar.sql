alter table public.financial_entries
  add column if not exists receipt_merchant text,
  add column if not exists receipt_nif text;

create index if not exists idx_financial_entries_receipt_merchant
  on public.financial_entries (user_id, receipt_merchant, date desc);

alter table public.user_settings
  add column if not exists copilot_avatar_url text default '/buggy-mascot.png',
  add column if not exists show_merchant_insights boolean default false;

update public.user_settings
set copilot_avatar_url = '/buggy-mascot.png'
where copilot_avatar_url is null or btrim(copilot_avatar_url) = '';

update public.user_settings
set show_merchant_insights = false
where show_merchant_insights is null;

