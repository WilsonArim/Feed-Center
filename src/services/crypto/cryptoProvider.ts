/**
 * CryptoProvider — Zero-Knowledge cryptographic abstraction layer.
 *
 * Implements LOCKVAULT Pilars I, II, V:
 *   Pilar I  — Hardware-bound keys via WebAuthn / Web Crypto
 *   Pilar II — Asymmetric ECDH key pairs for cross-device sync (Open Padlock)
 *   Pilar V  — Polymorphic encryption (key rotation support)
 *
 * All operations use the native Web Crypto API (SubtleCrypto).
 * No third-party crypto libraries — browser-native, hardware-accelerated.
 */

import { zeroize } from './secureBuffer'

// ── Types ──────────────────────────────────────────────────────────

/** AES-256-GCM encrypted envelope */
export interface EncryptedEnvelope {
    /** Base64-encoded ciphertext */
    ciphertext: string
    /** Base64-encoded 12-byte IV (unique per encryption) */
    iv: string
    /** Algorithm identifier for forward-compat */
    alg: 'AES-256-GCM'
}

/** ECDH key pair for asymmetric operations (Pilar II) */
export interface DeviceKeyPair {
    /** The "Open Padlock" — safe to upload to Supabase */
    publicKey: JsonWebKey
    /** Wrapped (encrypted) private key — stays on device */
    wrappedPrivateKey: string
    /** IV used for the private key wrapping */
    wrapIv: string
}

/** Shared secret derived from ECDH for Blind Courier sync */
export interface DerivedSharedSecret {
    /** The derived AES-256-GCM key for encrypting sync payloads */
    key: CryptoKey
    /** Cleanup: zeroize the key material from memory */
    dispose: () => Promise<void>
}

// ── Interface ──────────────────────────────────────────────────────

export interface CryptoProvider {
    // ── Symmetric (AES-256-GCM) ──
    generateKey(): Promise<CryptoKey>
    encrypt(key: CryptoKey, plaintext: Uint8Array): Promise<EncryptedEnvelope>
    decrypt(key: CryptoKey, envelope: EncryptedEnvelope): Promise<Uint8Array>
    deriveKey(password: string, salt: Uint8Array, iterations?: number): Promise<CryptoKey>
    exportKey(key: CryptoKey): Promise<Uint8Array>
    importKey(raw: Uint8Array): Promise<CryptoKey>

    // ── Asymmetric (ECDH P-256 — Pilar II) ──
    generateKeyPair(): Promise<CryptoKeyPair>
    exportPublicKey(keyPair: CryptoKeyPair): Promise<JsonWebKey>
    wrapPrivateKey(keyPair: CryptoKeyPair, wrappingKey: CryptoKey): Promise<{ wrapped: string; iv: string }>
    unwrapPrivateKey(wrapped: string, iv: string, wrappingKey: CryptoKey): Promise<CryptoKey>
    deriveSharedSecret(privateKey: CryptoKey, remotePublicKeyJwk: JsonWebKey): Promise<CryptoKey>

    // ── Hygiene (Pilar III) ──
    zeroize(buffer: Uint8Array): void
    generateSalt(bytes?: number): Uint8Array
}

// ── Helpers ────────────────────────────────────────────────────────

function toBase64(buffer: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]!)
    }
    return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

// ── Implementation ─────────────────────────────────────────────────

const AES_KEY_LENGTH = 256
const AES_IV_LENGTH = 12    // 96 bits per NIST recommendation
const PBKDF2_DEFAULT_ITERATIONS = 600_000
const ECDH_CURVE = 'P-256'
const DERIVED_KEY_LENGTH = 256

class WebCryptoProvider implements CryptoProvider {
    private readonly subtle = crypto.subtle

    // ── Symmetric ──────────────────────────────────────────────────

    async generateKey(): Promise<CryptoKey> {
        return this.subtle.generateKey(
            { name: 'AES-GCM', length: AES_KEY_LENGTH },
            true,  // extractable for wrapping/export
            ['encrypt', 'decrypt'],
        )
    }

    async encrypt(key: CryptoKey, plaintext: Uint8Array): Promise<EncryptedEnvelope> {
        const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH))

        const ciphertextBuffer = await this.subtle.encrypt(
            { name: 'AES-GCM', iv: iv as BufferSource },
            key,
            plaintext as BufferSource,
        )

        return {
            ciphertext: toBase64(new Uint8Array(ciphertextBuffer)),
            iv: toBase64(iv),
            alg: 'AES-256-GCM',
        }
    }

    async decrypt(key: CryptoKey, envelope: EncryptedEnvelope): Promise<Uint8Array> {
        const iv = fromBase64(envelope.iv)
        const ciphertext = fromBase64(envelope.ciphertext)

        const plainBuffer = await this.subtle.decrypt(
            { name: 'AES-GCM', iv: iv as BufferSource },
            key,
            ciphertext as BufferSource,
        )

        return new Uint8Array(plainBuffer)
    }

    async deriveKey(
        password: string,
        salt: Uint8Array,
        iterations = PBKDF2_DEFAULT_ITERATIONS,
    ): Promise<CryptoKey> {
        const encoder = new TextEncoder()
        const keyMaterial = await this.subtle.importKey(
            'raw',
            encoder.encode(password) as BufferSource,
            'PBKDF2',
            false,
            ['deriveKey'],
        )

        return this.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt as BufferSource,
                iterations,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: AES_KEY_LENGTH },
            true,
            ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
        )
    }

    async exportKey(key: CryptoKey): Promise<Uint8Array> {
        const raw = await this.subtle.exportKey('raw', key)
        return new Uint8Array(raw)
    }

    async importKey(raw: Uint8Array): Promise<CryptoKey> {
        return this.subtle.importKey(
            'raw',
            raw as BufferSource,
            { name: 'AES-GCM', length: AES_KEY_LENGTH },
            true,
            ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
        )
    }

    // ── Asymmetric (ECDH — Pilar II: Open Padlock) ─────────────────

    async generateKeyPair(): Promise<CryptoKeyPair> {
        return this.subtle.generateKey(
            { name: 'ECDH', namedCurve: ECDH_CURVE },
            true,  // private key extractable for wrapping
            ['deriveKey', 'deriveBits'],
        ) as Promise<CryptoKeyPair>
    }

    async exportPublicKey(keyPair: CryptoKeyPair): Promise<JsonWebKey> {
        return this.subtle.exportKey('jwk', keyPair.publicKey)
    }

    async wrapPrivateKey(
        keyPair: CryptoKeyPair,
        wrappingKey: CryptoKey,
    ): Promise<{ wrapped: string; iv: string }> {
        const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH))

        // Export private key as raw JWK, then encrypt with device master key
        const privateKeyJwk = await this.subtle.exportKey('jwk', keyPair.privateKey)
        const privateKeyBytes = new TextEncoder().encode(JSON.stringify(privateKeyJwk))

        const ciphertext = await this.subtle.encrypt(
            { name: 'AES-GCM', iv: iv as BufferSource },
            wrappingKey,
            privateKeyBytes as BufferSource,
        )

        // Zeroize the plaintext private key bytes
        zeroize(privateKeyBytes)

        return {
            wrapped: toBase64(new Uint8Array(ciphertext)),
            iv: toBase64(iv),
        }
    }

    async unwrapPrivateKey(
        wrapped: string,
        iv: string,
        wrappingKey: CryptoKey,
    ): Promise<CryptoKey> {
        const ciphertext = fromBase64(wrapped)
        const ivBytes = fromBase64(iv)

        const decrypted = await this.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes as BufferSource },
            wrappingKey,
            ciphertext as BufferSource,
        )

        const jwkBytes = new Uint8Array(decrypted)
        const jwk: JsonWebKey = JSON.parse(new TextDecoder().decode(jwkBytes))

        // Zeroize the decrypted JWK bytes immediately
        zeroize(jwkBytes)

        return this.subtle.importKey(
            'jwk',
            jwk,
            { name: 'ECDH', namedCurve: ECDH_CURVE },
            false,  // imported private key is non-extractable
            ['deriveKey', 'deriveBits'],
        )
    }

    async deriveSharedSecret(
        privateKey: CryptoKey,
        remotePublicKeyJwk: JsonWebKey,
    ): Promise<CryptoKey> {
        const remotePublicKey = await this.subtle.importKey(
            'jwk',
            remotePublicKeyJwk,
            { name: 'ECDH', namedCurve: ECDH_CURVE },
            false,
            [],
        )

        // ECDH key agreement → derive an AES-256-GCM key
        return this.subtle.deriveKey(
            {
                name: 'ECDH',
                public: remotePublicKey,
            },
            privateKey,
            { name: 'AES-GCM', length: DERIVED_KEY_LENGTH },
            false,  // derived key is non-extractable
            ['encrypt', 'decrypt'],
        )
    }

    // ── Hygiene (Pilar III) ────────────────────────────────────────

    zeroize(buffer: Uint8Array): void {
        zeroize(buffer)
    }

    generateSalt(bytes = 32): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(bytes))
    }
}

// ── Factory ────────────────────────────────────────────────────────

let instance: CryptoProvider | null = null

/**
 * Returns the singleton CryptoProvider.
 * Today: WebCryptoProvider (AES-256-GCM + ECDH P-256).
 * Future: swap implementation for PQC (ML-KEM) without changing callers.
 */
export function createCryptoProvider(): CryptoProvider {
    if (!instance) {
        if (typeof crypto === 'undefined' || !crypto.subtle) {
            throw new Error(
                'CryptoProvider: Web Crypto API not available. ' +
                'HTTPS or localhost is required for LOCKVAULT operations.',
            )
        }
        instance = new WebCryptoProvider()
    }
    return instance
}

/**
 * Build a full DeviceKeyPair: generate ECDH, export public key,
 * wrap private key with the device master key.
 *
 * This is the "enrollment" step — called once per device after
 * identity verification (Passkey registration or Google OAuth + key gen).
 */
export async function buildDeviceKeyPair(
    masterKey: CryptoKey,
): Promise<DeviceKeyPair> {
    const provider = createCryptoProvider()
    const keyPair = await provider.generateKeyPair()
    const publicKey = await provider.exportPublicKey(keyPair)
    const { wrapped, iv } = await provider.wrapPrivateKey(keyPair, masterKey)

    return {
        publicKey,
        wrappedPrivateKey: wrapped,
        wrapIv: iv,
    }
}
