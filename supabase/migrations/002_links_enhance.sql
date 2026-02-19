-- ============================================
-- Links Enhancement Migration
-- Adds description, notes, pinned, last_checked
-- ============================================

alter table public.links add column if not exists description text;
alter table public.links add column if not exists notes text;
alter table public.links add column if not exists pinned boolean default false;
alter table public.links add column if not exists last_checked timestamptz;
alter table public.links add column if not exists updated_at timestamptz default now();
