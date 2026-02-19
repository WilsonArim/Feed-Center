-- ============================================
-- Migration 012: Crypto Transactions
-- Individual buy/sell/swap records
-- Holdings are computed from transactions
-- ============================================

CREATE TABLE IF NOT EXISTS public.crypto_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    wallet_id UUID REFERENCES crypto_wallets(id) ON DELETE CASCADE,

    -- Operation
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'swap', 'airdrop', 'transfer_in')),

    -- Token metadata (from CoinGecko)
    coingecko_id TEXT,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    image TEXT,
    chain_id TEXT,

    -- Position data
    quantity NUMERIC NOT NULL,
    price_per_unit NUMERIC,
    fee NUMERIC DEFAULT 0,
    fee_token TEXT,
    pair TEXT DEFAULT 'EUR',

    -- Context
    exchange TEXT,
    tx_hash TEXT,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'hash_verified')),
    notes TEXT,

    -- Timestamps
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
    ON public.crypto_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON public.crypto_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON public.crypto_transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
    ON public.crypto_transactions FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crypto_tx_user ON public.crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_wallet ON public.crypto_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_symbol ON public.crypto_transactions(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_date ON public.crypto_transactions(executed_at DESC);
