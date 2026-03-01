/**
 * Key Derivation Module — LOCKVAULT Pilar I fallback layer.
 *
 * Two derivation paths to produce the symmetric Master Key:
 *   1. PRF (WebAuthn Level 3) → HKDF-SHA256 → AES-256 Master Key
 *   2. PBKDF2 (recovery passphrase) → AES-256 Master Key
 *
 * The Master Key is the root of the LOCKVAULT hierarchy:
 *   Master Key → wraps ECDH Private Key (Pilar II)
 *   Master Key → encrypts vault entries (Pilar V)
 */

// ── Types ──────────────────────────────────────────────────────────

export type KeyDerivationMethod = 'prf' | 'pbkdf2'

export interface KeyDerivationResult {
    masterKey: CryptoKey
    method: KeyDerivationMethod
    salt: Uint8Array
}

// ── Constants ──────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 600_000
const HKDF_INFO = new TextEncoder().encode('LOCKVAULT-v1-master')
const MASTER_KEY_LENGTH = 256
const DEFAULT_SALT_BYTES = 32

export const DERIVATION_CONSTANTS = {
    PBKDF2_ITERATIONS,
    MASTER_KEY_LENGTH,
    DEFAULT_SALT_BYTES,
} as const

// ── PRF Path (Tier 1 — Hardware-Derived) ───────────────────────────

/**
 * Derive a Master Key from WebAuthn PRF extension output.
 * Uses HKDF-SHA256 with domain-separated info string.
 *
 * PRF output is deterministic per credential + eval input,
 * making it ideal for reproducible, hardware-bound key derivation.
 */
export async function deriveFromPRF(
    prfOutput: ArrayBuffer,
    salt: Uint8Array,
): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        prfOutput,
        'HKDF',
        false,
        ['deriveKey'],
    )

    return crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: salt as BufferSource,
            info: HKDF_INFO as BufferSource,
        },
        keyMaterial,
        { name: 'AES-GCM', length: MASTER_KEY_LENGTH },
        true,
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
    )
}

// ── PBKDF2 Path (Tier 2 — Graceful Degradation) ───────────────────

/**
 * Derive a Master Key from a user-provided recovery passphrase.
 * PBKDF2 with 600,000 iterations + SHA-256.
 *
 * This is the graceful degradation path for devices
 * without WebAuthn PRF support (e.g., Firefox, older browsers).
 */
export async function deriveFromPassphrase(
    passphrase: string,
    salt: Uint8Array,
    iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
    const encoded = new TextEncoder().encode(passphrase)

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoded as BufferSource,
        'PBKDF2',
        false,
        ['deriveKey'],
    )

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: MASTER_KEY_LENGTH },
        true,
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
    )
}

// ── Utilities ──────────────────────────────────────────────────────

/** Generate a cryptographically random salt. */
export function generateSalt(bytes = DEFAULT_SALT_BYTES): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(bytes))
}

/**
 * Detect the best available key derivation method.
 * PRF requires a platform authenticator (Touch ID / Face ID / PIN).
 * Actual PRF support is confirmed only during credential creation.
 */
export async function detectDerivationCapability(): Promise<KeyDerivationMethod> {
    try {
        if (
            typeof window === 'undefined' ||
            typeof PublicKeyCredential === 'undefined'
        ) {
            return 'pbkdf2'
        }
        const hasPlatform =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        return hasPlatform ? 'prf' : 'pbkdf2'
    } catch {
        return 'pbkdf2'
    }
}
