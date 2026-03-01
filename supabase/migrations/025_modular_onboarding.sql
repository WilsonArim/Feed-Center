-- ============================================
-- Modular Onboarding
-- Adds module preferences and onboarding state
-- ============================================

ALTER TABLE public.user_settings
    ADD COLUMN IF NOT EXISTS active_modules jsonb
        DEFAULT '["finance","tasks","links","crypto","news"]'::jsonb,
    ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
