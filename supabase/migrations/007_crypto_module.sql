-- ============================================
-- Crypto Module Migration (Hybrid Web3)
-- Overwrites previous manual logic
-- ============================================

-- 1. Cleanup old attempts
drop table if exists public.crypto_assets;
drop table if exists public.crypto_wallets;
drop table if exists public.crypto_asset_context;

-- 2. Wallets Table (Public Addresses)
create table public.crypto_wallets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    address text not null,
    chain_type text not null check (chain_type in ('solana', 'evm')),
    label text,
    created_at timestamptz default now()
);

-- 3. Asset Context Table (Manual Cost Basis)
create table public.crypto_asset_context (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    symbol text not null, -- e.g., 'SOL', 'ETH'
    avg_buy_price numeric not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, symbol)
);

-- 4. RLS Policies
alter table public.crypto_wallets enable row level security;
alter table public.crypto_asset_context enable row level security;

-- Wallets Policies
create policy "Users can view own wallets" on public.crypto_wallets for select using (auth.uid() = user_id);
create policy "Users can insert own wallets" on public.crypto_wallets for insert with check (auth.uid() = user_id);
create policy "Users can delete own wallets" on public.crypto_wallets for delete using (auth.uid() = user_id);

-- Context Policies
create policy "Users can view own contexts" on public.crypto_asset_context for select using (auth.uid() = user_id);
create policy "Users can manage own contexts" on public.crypto_asset_context for all using (auth.uid() = user_id);

-- 5. Updated_at trigger (using standard function if exists, else skip)
-- (Handled by app layer or standard updated_at)
