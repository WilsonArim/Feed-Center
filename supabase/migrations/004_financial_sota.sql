-- 004_financial_sota.sql
-- SOTA upgrade: Pockets system + AI metadata columns

-- 1. Pockets / Envelopes table
create table if not exists public.financial_pockets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  budget_limit numeric(12,2),
  current_balance numeric(12,2) default 0,
  icon text default '📁',
  color text default '#3b82f6',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.financial_pockets enable row level security;

create policy "Users manage own pockets"
  on public.financial_pockets for all
  using (auth.uid() = user_id);

create index idx_pockets_user on public.financial_pockets(user_id);

-- 2. Add SOTA columns to financial_entries
alter table public.financial_entries
  add column if not exists pocket_id uuid references public.financial_pockets(id) on delete set null,
  add column if not exists ai_suggested_category boolean default false,
  add column if not exists confidence_score real;

-- 3. Index for pocket lookups
create index if not exists idx_entries_pocket on public.financial_entries(pocket_id);
