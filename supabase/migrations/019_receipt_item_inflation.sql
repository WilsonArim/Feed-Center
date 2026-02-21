create table if not exists public.financial_receipt_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.financial_entries(id) on delete cascade,
  purchased_at date not null,
  merchant text,
  receipt_nif text,
  item_name text not null,
  sku_key text not null,
  quantity numeric(10,3) not null default 1 check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  unit_price numeric(12,4),
  raw_line text,
  confidence_score real,
  created_at timestamptz default now()
);

alter table public.financial_receipt_items enable row level security;

drop policy if exists "Users can CRUD own receipt items" on public.financial_receipt_items;
create policy "Users can CRUD own receipt items"
  on public.financial_receipt_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_financial_receipt_items_user_date
  on public.financial_receipt_items (user_id, purchased_at desc);

create index if not exists idx_financial_receipt_items_user_sku_date
  on public.financial_receipt_items (user_id, sku_key, purchased_at desc);

create index if not exists idx_financial_receipt_items_user_merchant_date
  on public.financial_receipt_items (user_id, merchant, purchased_at desc);

