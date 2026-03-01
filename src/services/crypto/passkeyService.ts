/**
 * PasskeyService — WebAuthn Passkey registration and authentication.
 *
 * LOCKVAULT Pilar I (Hardware-Bound Keys):
 *   - Passkeys bound to device TPM / Secure Enclave
 *   - PRF extension derives deterministic key material → Master Key
 *   - Master Key wraps/unwraps ECDH Private Key (Pilar II)
 *
 * Flow:
 *   Register → WebAuthn Create + PRF → HKDF → Master Key → buildDeviceKeyPair
 *                                                         → Upload Public Key (Blind Courier)
 *   Auth    → WebAuthn Get + PRF → HKDF → Master Key → Unlock Vault
 *
 * Constraint: "Farmer Test" — zero password fields.
 * The OS biometric prompt (Touch ID / Face ID / Screen Lock) is the only UX.
 */

import { buildDeviceKeyPair } from './cryptoProvider'
import type { DeviceKeyPair } from './cryptoProvider'
import { deriveFromPRF, deriveFromPassphrase, generateSalt } from './keyDerivation'
import type { KeyDerivationMethod } from './keyDerivation'

// ── WebAuthn PRF Extension Types (not yet in DOM lib) ──────────────

interface PRFValues {
    first: BufferSource
    second?: BufferSource
}

interface PRFExtensionInput {
    eval?: PRFValues
    evalByCredential?: Record<string, PRFValues>
}

interface PRFExtensionOutput {
    enabled?: boolean
    results?: {
        first: ArrayBuffer
        second?: ArrayBuffer
    }
}

interface ExtensionsWithPRF extends AuthenticationExtensionsClientInputs {
    prf?: PRFExtensionInput
}

interface ExtensionsOutputWithPRF extends AuthenticationExtensionsClientOutputs {
    prf?: PRFExtensionOutput
}

// ── Configuration ──────────────────────────────────────────────────

/** Consistent PRF eval salt — same value for register + auth */
const PRF_EVAL_SALT = new TextEncoder().encode('LOCKVAULT-prf-v1')

/** Relying Party configuration */
export interface PasskeyConfig {
    rpId: string       // e.g. "localhost" or "feedcenter.app"
    rpName: string     // e.g. "Feed Center"
}

/**
 * Server communication abstraction.
 * Decouples WebAuthn ceremony from HTTP transport.
 * Implemented by the actual auth routes (Component 4).
 */
export interface ChallengeProvider {
    createRegistrationChallenge(userId: string): Promise<{
        challenge: ArrayBuffer
        excludeCredentials: { id: ArrayBuffer; type: 'public-key' }[]
    }>
    verifyRegistration(response: {
        credentialId: string
        attestationObject: ArrayBuffer
        clientDataJSON: ArrayBuffer
        publicKeyJwk: JsonWebKey
    }): Promise<{ verified: boolean }>
    createAuthenticationChallenge(): Promise<{
        challenge: ArrayBuffer
        allowCredentials: { id: ArrayBuffer; type: 'public-key' }[]
    }>
    verifyAuthentication(response: {
        credentialId: string
        authenticatorData: ArrayBuffer
        clientDataJSON: ArrayBuffer
        signature: ArrayBuffer
    }): Promise<{ verified: boolean; userId: string }>
}

// ── Result Types ───────────────────────────────────────────────────

export interface PasskeyRegistrationResult {
    credentialId: string
    masterKey: CryptoKey
    deviceKeyPair: DeviceKeyPair
    derivationMethod: KeyDerivationMethod
    /** Base64 salt — must be persisted for future auth derivations */
    salt: string
}

export interface PasskeyAuthResult {
    masterKey: CryptoKey
    userId: string
    derivationMethod: KeyDerivationMethod
}

// ── Error ──────────────────────────────────────────────────────────

export type PasskeyErrorCode =
    | 'NOT_SUPPORTED'
    | 'REGISTRATION_CANCELLED'
    | 'AUTH_CANCELLED'
    | 'PRF_UNAVAILABLE'
    | 'VERIFICATION_FAILED'
    | 'AUTH_FAILED'

export class PasskeyError extends Error {
    constructor(
        public readonly code: PasskeyErrorCode,
        message: string,
    ) {
        super(message)
        this.name = 'PasskeyError'
    }
}

// ── Detection ──────────────────────────────────────────────────────

export async function isPasskeyAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    if (typeof PublicKeyCredential === 'undefined') return false
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch {
        return false
    }
}

// ── Helpers ────────────────────────────────────────────────────────

function toBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]!)
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

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

// ── Registration ───────────────────────────────────────────────────

/**
 * Register a new Passkey with PRF extension.
 * If PRF is available → derives master key from hardware (invisible UX).
 * If PRF unavailable → throws PRF_UNAVAILABLE so caller can fall back to PBKDF2.
 *
 * On success: builds ECDH key pair and uploads public key to server
 * via ChallengeProvider (Blind Courier prep — Pilar II).
 */
export async function registerPasskey(
    userId: string,
    username: string,
    config: PasskeyConfig,
    challengeProvider: ChallengeProvider,
): Promise<PasskeyRegistrationResult> {
    if (!(await isPasskeyAvailable())) {
        throw new PasskeyError('NOT_SUPPORTED', 'Platform authenticator not available')
    }

    const { challenge, excludeCredentials } =
        await challengeProvider.createRegistrationChallenge(userId)

    const salt = generateSalt()

    const credential = await navigator.credentials.create({
        publicKey: {
            rp: { id: config.rpId, name: config.rpName },
            user: {
                id: new TextEncoder().encode(userId) as BufferSource,
                name: username,
                displayName: username,
            },
            challenge: challenge as BufferSource,
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' },    // ES256 (P-256)
                { alg: -257, type: 'public-key' },   // RS256 fallback
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'required',
                requireResidentKey: true,
            },
            timeout: 60_000,
            excludeCredentials,
            extensions: {
                prf: { eval: { first: PRF_EVAL_SALT as BufferSource } },
            } as ExtensionsWithPRF,
        },
    }) as PublicKeyCredential | null

    if (!credential) {
        throw new PasskeyError('REGISTRATION_CANCELLED', 'User cancelled passkey registration')
    }

    const response = credential.response as AuthenticatorAttestationResponse
    const credentialId = toBase64Url(credential.rawId)

    // Check PRF extension result
    const extensions = credential.getClientExtensionResults() as ExtensionsOutputWithPRF
    const prfResult = extensions.prf

    if (!prfResult?.results?.first) {
        throw new PasskeyError(
            'PRF_UNAVAILABLE',
            'WebAuthn PRF extension not supported. Use PBKDF2 fallback.',
        )
    }

    // Tier 1: PRF → HKDF → Master Key (hardware-derived, invisible UX)
    const masterKey = await deriveFromPRF(prfResult.results.first, salt)

    // Build ECDH key pair — Master Key wraps the private key (Pilar II)
    const deviceKeyPair = await buildDeviceKeyPair(masterKey)

    // Verify with server + upload ECDH public key (Blind Courier prep)
    const { verified } = await challengeProvider.verifyRegistration({
        credentialId,
        attestationObject: response.attestationObject,
        clientDataJSON: response.clientDataJSON,
        publicKeyJwk: deviceKeyPair.publicKey,
    })

    if (!verified) {
        throw new PasskeyError('VERIFICATION_FAILED', 'Server rejected passkey registration')
    }

    return {
        credentialId,
        masterKey,
        deviceKeyPair,
        derivationMethod: 'prf',
        salt: toBase64(salt),
    }
}

// ── Authentication ─────────────────────────────────────────────────

/**
 * Authenticate with an existing Passkey + PRF.
 * Derives the same Master Key as registration (deterministic PRF output).
 * The Master Key unlocks the vault by unwrapping the ECDH private key.
 */
export async function authenticatePasskey(
    config: PasskeyConfig,
    challengeProvider: ChallengeProvider,
    storedSalt: string,
): Promise<PasskeyAuthResult> {
    const { challenge, allowCredentials } =
        await challengeProvider.createAuthenticationChallenge()

    const credential = await navigator.credentials.get({
        publicKey: {
            challenge: challenge as BufferSource,
            rpId: config.rpId,
            allowCredentials,
            userVerification: 'required',
            timeout: 60_000,
            extensions: {
                prf: { eval: { first: PRF_EVAL_SALT as BufferSource } },
            } as ExtensionsWithPRF,
        },
    }) as PublicKeyCredential | null

    if (!credential) {
        throw new PasskeyError('AUTH_CANCELLED', 'User cancelled passkey authentication')
    }

    const response = credential.response as AuthenticatorAssertionResponse
    const credentialId = toBase64Url(credential.rawId)

    // Verify assertion with server
    const { verified, userId } = await challengeProvider.verifyAuthentication({
        credentialId,
        authenticatorData: response.authenticatorData,
        clientDataJSON: response.clientDataJSON,
        signature: response.signature,
    })

    if (!verified) {
        throw new PasskeyError('AUTH_FAILED', 'Server rejected passkey authentication')
    }

    // Derive Master Key from PRF output
    const extensions = credential.getClientExtensionResults() as ExtensionsOutputWithPRF
    const prfResult = extensions.prf

    if (!prfResult?.results?.first) {
        throw new PasskeyError(
            'PRF_UNAVAILABLE',
            'PRF not available during authentication. Vault cannot be unlocked.',
        )
    }

    const salt = fromBase64(storedSalt)
    const masterKey = await deriveFromPRF(prfResult.results.first, salt)

    return { masterKey, userId, derivationMethod: 'prf' }
}

// ── PBKDF2 Fallback Registration ───────────────────────────────────

/**
 * Fallback registration for devices without WebAuthn/PRF.
 * Uses a recovery passphrase → PBKDF2 → Master Key.
 *
 * The passphrase is the ONLY input — no password fields in the traditional sense.
 * It's shown once during setup and must be saved by the user.
 */
export async function registerWithFallback(
    userId: string,
    passphrase: string,
    challengeProvider: ChallengeProvider,
): Promise<PasskeyRegistrationResult> {
    const salt = generateSalt()
    const masterKey = await deriveFromPassphrase(passphrase, salt)
    const deviceKeyPair = await buildDeviceKeyPair(masterKey)

    // Upload ECDH public key — same Blind Courier prep as Passkey path
    const { verified } = await challengeProvider.verifyRegistration({
        credentialId: `pbkdf2-${userId}-${Date.now()}`,
        attestationObject: new ArrayBuffer(0),
        clientDataJSON: new ArrayBuffer(0),
        publicKeyJwk: deviceKeyPair.publicKey,
    })

    if (!verified) {
        throw new PasskeyError('VERIFICATION_FAILED', 'Server rejected device registration')
    }

    return {
        credentialId: `pbkdf2-${userId}`,
        masterKey,
        deviceKeyPair,
        derivationMethod: 'pbkdf2',
        salt: toBase64(salt),
    }
}

/**
 * Fallback authentication — re-derive Master Key from passphrase.
 */
export async function authenticateWithFallback(
    passphrase: string,
    storedSalt: string,
): Promise<Omit<PasskeyAuthResult, 'userId'>> {
    const salt = fromBase64(storedSalt)
    const masterKey = await deriveFromPassphrase(passphrase, salt)
    return { masterKey, derivationMethod: 'pbkdf2' }
}
