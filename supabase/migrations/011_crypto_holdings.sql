-- ============================================
-- Migration 011: Crypto Holdings (Manual Ledger)
-- Replaces live API approach with user-managed holdings
-- ============================================

CREATE TABLE IF NOT EXISTS public.crypto_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    wallet_id UUID REFERENCES crypto_wallets(id) ON DELETE CASCADE,

    -- Type of holding
    type TEXT NOT NULL DEFAULT 'token' CHECK (type IN ('token', 'pool', 'stake', 'lend')),

    -- Token metadata (from CoinGecko search)
    coingecko_id TEXT,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    image TEXT,

    -- Pool metadata (from DexScreener)
    pool_address TEXT,
    pair_label TEXT,
    dex_id TEXT,
    chain_id TEXT,

    -- Position data (user input)
    quantity NUMERIC NOT NULL DEFAULT 0,
    avg_buy_price NUMERIC,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own holdings"
    ON public.crypto_holdings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own holdings"
    ON public.crypto_holdings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own holdings"
    ON public.crypto_holdings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own holdings"
    ON public.crypto_holdings FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_user ON public.crypto_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_wallet ON public.crypto_holdings(wallet_id);
