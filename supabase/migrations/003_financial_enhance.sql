-- ============================================
-- Financial Entries Enhancement
-- Run in Supabase SQL Editor
-- ============================================

alter table public.financial_entries
  add column if not exists subcategory text,
  add column if not exists payment_method text default 'cash'
    check (payment_method in ('cash', 'cartao', 'mbway', 'transferencia', 'outro')),
  add column if not exists is_recurring boolean default false,
  add column if not exists recurring_day integer check (recurring_day between 1 and 31),
  add column if not exists receipt_url text,
  add column if not exists updated_at timestamptz default now();

-- Index for dashboard queries (entries by user + date range)
create index if not exists idx_financial_entries_user_date
  on public.financial_entries (user_id, date desc);
