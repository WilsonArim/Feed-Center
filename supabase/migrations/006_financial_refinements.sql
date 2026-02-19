-- ============================================
-- Financial Entries Refinements (SOTA Refinement)
-- Adds fields for refined "Despesa Fixa" logic
-- ============================================

alter table public.financial_entries
  add column if not exists periodicity text default 'mensal'
    check (periodicity in ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  add column if not exists buggy_alert boolean default false,
  add column if not exists buggy_alert_days integer default 3
    check (buggy_alert_days between 1 and 30);
