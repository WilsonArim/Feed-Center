-- ============================================
-- Wallets + Audit Column Fixes
-- Multi-wallet system + missing cognitive core columns
-- ============================================

-- 1. Wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'bank'
        CHECK (kind IN ('cash', 'bank', 'digital', 'meal_card', 'crypto', 'other')),
    icon TEXT,
    color TEXT,
    is_default BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own wallets"
    ON public.wallets FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- Ensure only one default wallet per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_default
    ON wallets(user_id) WHERE is_default = true;

-- 2. Link financial_entries to wallets
ALTER TABLE public.financial_entries
    ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_wallet
    ON public.financial_entries(wallet_id);

-- 3. Audit column fixes (from cognitive core audit)
ALTER TABLE public.financial_entries
    ADD COLUMN IF NOT EXISTS merchant TEXT,
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

ALTER TABLE public.todos
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

ALTER TABLE public.links
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
