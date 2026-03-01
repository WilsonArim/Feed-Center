alter table public.financial_automation_events
  add column if not exists ocr_confidence real,
  add column if not exists suggestion_confidence real,
  add column if not exists confidence_gate real,
  add column if not exists requires_edit boolean,
  add column if not exists edited_fields text[] default '{}'::text[],
  add column if not exists ocr_engine text;

alter table public.financial_automation_events
  drop constraint if exists financial_automation_events_action_check;

alter table public.financial_automation_events
  add constraint financial_automation_events_action_check
  check (action in ('automate_recurring', 'undo_automate_recurring', 'ocr_handshake'));

create index if not exists idx_fin_automation_events_user_action_created
  on public.financial_automation_events (user_id, action, created_at desc);
