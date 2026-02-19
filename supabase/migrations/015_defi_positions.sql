-- ============================================
-- Migration 015: DeFi Positions (Ledger DeFi)
-- Personal ledger for Pools, Stake, Borrow/Lend
-- ============================================

CREATE TABLE IF NOT EXISTS public.defi_positions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('pool', 'stake', 'borrow', 'lend')),

    -- DexScreener link & resolved metadata (pool only)
    pool_url        TEXT,
    pair_address    TEXT,
    chain_id        TEXT,
    dex_id          TEXT,
    base_symbol     TEXT,
    quote_symbol    TEXT,
    base_address    TEXT,
    quote_address   TEXT,

    -- Pool-specific: concentrated liquidity
    tick_lower          NUMERIC,
    tick_upper          NUMERIC,
    base_amount         NUMERIC,
    quote_amount        NUMERIC,
    entry_price         NUMERIC,
    initial_value_usd   NUMERIC,

    -- Stake / Borrow / Lend
    token_symbol            TEXT,
    token_amount            NUMERIC,
    token_price_at_entry    NUMERIC,
    apy_at_entry            NUMERIC,

    -- Common
    entry_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes       TEXT,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    closed_at   TIMESTAMPTZ,
    close_value_usd NUMERIC,

    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.defi_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "defi_positions_select" ON public.defi_positions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "defi_positions_insert" ON public.defi_positions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "defi_positions_update" ON public.defi_positions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "defi_positions_delete" ON public.defi_positions
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_defi_positions_user   ON public.defi_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_defi_positions_type   ON public.defi_positions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_defi_positions_status ON public.defi_positions(user_id, status);
