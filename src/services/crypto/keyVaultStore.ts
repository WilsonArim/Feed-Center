/**
 * KeyVaultStore — Ephemeral Zustand store for active cryptographic keys.
 *
 * LOCKVAULT Pilar III (Volatile Memory Hygiene):
 *   - NO persist middleware. Keys exist ONLY in volatile RAM.
 *   - lockVault() explicitly exports raw key bytes and calls zeroize()
 *     BEFORE nullifying CryptoKey references.
 *   - emergencyLock() provides synchronous null-out for beforeunload/pagehide.
 */

import { create } from 'zustand'
import { zeroize } from './secureBuffer'
import type { KeyDerivationMethod } from './keyDerivation'

// ── Types ──────────────────────────────────────────────────────────

export interface UnlockParams {
    masterKey: CryptoKey
    privateKey?: CryptoKey
    derivationMethod: KeyDerivationMethod
    credentialId: string
}

interface VaultState {
    status: 'locked' | 'unlocked'
    masterKey: CryptoKey | null
    /** Unwrapped ECDH private key — lives in RAM only while vault is open */
    privateKey: CryptoKey | null
    derivationMethod: KeyDerivationMethod | null
    credentialId: string | null
    lastActivity: number
}

interface VaultActions {
    unlockVault(params: UnlockParams): void
    /** Async lock — exports and zeroizes raw key bytes before nulling */
    lockVault(): Promise<void>
    /** Sync lock — nulls references immediately (for unload events) */
    emergencyLock(): void
    touchActivity(): void
}

export type VaultStore = VaultState & VaultActions

// ── Internals ──────────────────────────────────────────────────────

const LOCKED_STATE: VaultState = {
    status: 'locked',
    masterKey: null,
    privateKey: null,
    derivationMethod: null,
    credentialId: null,
    lastActivity: 0,
}

/**
 * Export a CryptoKey to raw bytes, zeroize them, then discard.
 * This is the closest we can get to wiping Web Crypto internal buffers —
 * the exported copy is zeroed, and the CryptoKey reference is dropped
 * to let the engine's internal memory become unreachable.
 */
async function exportAndZeroize(
    key: CryptoKey,
    format: 'raw' | 'pkcs8',
): Promise<void> {
    try {
        const exported = await crypto.subtle.exportKey(format, key)
        zeroize(new Uint8Array(exported))
    } catch {
        // Key may be non-extractable or algorithm mismatch — best effort.
        // Still safe: the reference will be nullified afterward.
    }
}

// ── Store ──────────────────────────────────────────────────────────

export const useKeyVaultStore = create<VaultStore>((set, get) => ({
    ...LOCKED_STATE,

    unlockVault({ masterKey, privateKey, derivationMethod, credentialId }) {
        set({
            status: 'unlocked',
            masterKey,
            privateKey: privateKey ?? null,
            derivationMethod,
            credentialId,
            lastActivity: Date.now(),
        })
    },

    async lockVault() {
        const { masterKey, privateKey, status } = get()
        if (status === 'locked') return

        // Phase 1: Export raw key material and zeroize it.
        // Promise.allSettled ensures both are attempted independently.
        const cleanups: Promise<void>[] = []
        if (masterKey) cleanups.push(exportAndZeroize(masterKey, 'raw'))
        if (privateKey) cleanups.push(exportAndZeroize(privateKey, 'pkcs8'))

        try {
            await Promise.allSettled(cleanups)
        } catch {
            // Zeroization failed — still proceed to null references.
        }

        // Phase 2: Null all references — CryptoKey objects become unreachable.
        set({ ...LOCKED_STATE })
    },

    emergencyLock() {
        // Synchronous last-resort for pagehide / beforeunload.
        // Can't run async exportKey here — the process may be terminating.
        // References are nulled; OS reclaims physical memory on tab close.
        set({ ...LOCKED_STATE })
    },

    touchActivity() {
        if (get().status !== 'unlocked') return
        set({ lastActivity: Date.now() })
    },
}))
