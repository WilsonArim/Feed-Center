create table if not exists public.financial_automation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.financial_entries(id) on delete cascade,
  action text not null check (action in ('automate_recurring', 'undo_automate_recurring')),
  trigger_source text not null default 'today-page',
  reason text,
  entry_label text,
  previous_type text,
  previous_is_recurring boolean,
  previous_periodicity text,
  previous_recurring_day integer,
  previous_buggy_alert boolean,
  previous_buggy_alert_days integer,
  new_type text,
  new_is_recurring boolean,
  new_periodicity text,
  new_recurring_day integer,
  new_buggy_alert boolean,
  new_buggy_alert_days integer,
  target_event_id uuid references public.financial_automation_events(id) on delete set null,
  reverted_at timestamptz,
  reverted_by_event_id uuid references public.financial_automation_events(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.financial_automation_events enable row level security;

drop policy if exists "Users can CRUD own financial automation events" on public.financial_automation_events;
create policy "Users can CRUD own financial automation events"
  on public.financial_automation_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_fin_automation_events_user_created
  on public.financial_automation_events (user_id, created_at desc);

create index if not exists idx_fin_automation_events_user_entry_created
  on public.financial_automation_events (user_id, entry_id, created_at desc);

create index if not exists idx_fin_automation_events_target
  on public.financial_automation_events (target_event_id);
