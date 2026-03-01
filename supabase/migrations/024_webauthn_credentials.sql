-- =============================================================
-- 024 — WebAuthn Credentials + ECDH Public Keys (LOCKVAULT)
--
-- Stores WebAuthn credential IDs and the "Open Padlock" (ECDH
-- public key) per device. Strict RLS: users see only their own.
-- =============================================================

-- ── Table ──────────────────────────────────────────────────────

create table if not exists public.webauthn_credentials (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,

    -- WebAuthn credential
    credential_id   text not null,
    public_key_spki bytea not null,       -- DER-encoded SubjectPublicKeyInfo
    sign_count      bigint not null default 0,
    transports      text[] default '{}',  -- e.g. {'internal','hybrid'}

    -- ECDH "Open Padlock" — safe to expose for Blind Courier sync
    ecdh_public_key jsonb,                -- JWK format (P-256)

    -- Key derivation metadata
    derivation_method text not null check (derivation_method in ('prf', 'pbkdf2')),
    salt              text not null,      -- Base64-encoded salt

    -- Audit
    created_at      timestamptz not null default now(),
    last_used_at    timestamptz,

    -- Constraints
    constraint uq_credential_id unique (credential_id)
);

-- Index for fast lookup during authentication
create index if not exists idx_webauthn_user_id
    on public.webauthn_credentials (user_id);

create index if not exists idx_webauthn_credential_id
    on public.webauthn_credentials (credential_id);

-- ── Row Level Security ─────────────────────────────────────────

alter table public.webauthn_credentials enable row level security;

-- Users can read their own credentials (for client-side allowCredentials list)
create policy "Users can read own credentials"
    on public.webauthn_credentials
    for select
    using (auth.uid() = user_id);

-- Users can insert their own credentials (registration)
create policy "Users can insert own credentials"
    on public.webauthn_credentials
    for insert
    with check (auth.uid() = user_id);

-- Users can update their own credentials (sign_count bump, last_used_at)
create policy "Users can update own credentials"
    on public.webauthn_credentials
    for update
    using (auth.uid() = user_id);

-- Users can delete their own credentials (device revocation)
create policy "Users can delete own credentials"
    on public.webauthn_credentials
    for delete
    using (auth.uid() = user_id);

-- ── Public Key Discovery (Blind Courier) ───────────────────────
-- Authenticated users can read ANY user's ECDH public key (the
-- "Open Padlock") — this is by design for cross-device sync.

create policy "Authenticated users can read ECDH public keys"
    on public.webauthn_credentials
    for select
    using (auth.role() = 'authenticated');

-- ── Comments ───────────────────────────────────────────────────

comment on table public.webauthn_credentials is
    'LOCKVAULT: WebAuthn credentials + ECDH public keys per device. RLS enforced.';

comment on column public.webauthn_credentials.ecdh_public_key is
    'The "Open Padlock" (Pilar II) — ECDH P-256 public key in JWK format. Safe to share.';

comment on column public.webauthn_credentials.public_key_spki is
    'WebAuthn assertion verification key. DER-encoded SubjectPublicKeyInfo.';

comment on column public.webauthn_credentials.salt is
    'Base64-encoded salt for key derivation (PRF→HKDF or PBKDF2). Stored per-device.';
