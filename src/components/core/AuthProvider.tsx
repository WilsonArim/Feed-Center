/**
 * AuthProvider — Identity + LOCKVAULT orchestration.
 *
 * Responsibility chain:
 *   1. Supabase Auth → Identity verification (Google OAuth / Magic Link)
 *   2. Post-identity hook → Device key generation (WebAuthn / PBKDF2)
 *   3. Vault unlock → useKeyVaultStore.unlockVault()
 *   4. Session guard → useSessionGuard() armed
 *
 * LOCKVAULT constraint: Google OAuth is ONLY for identity.
 * Crypto keys are ALWAYS generated locally, post-identity.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, supabaseConfigError } from '@/lib/supabase'
import { useKeyVaultStore } from '@/services/crypto/keyVaultStore'
import { useSessionGuard } from '@/services/crypto/sessionGuard'
import type { KeyDerivationMethod } from '@/services/crypto/keyDerivation'

// ── Types ──────────────────────────────────────────────────────────

export type AuthPhase =
    | 'loading'           // Initial session check
    | 'unauthenticated'   // No Supabase session
    | 'identity-verified' // Supabase session exists, vault locked (needs key gen)
    | 'vault-unlocked'    // Fully authenticated — identity + crypto keys ready

interface AuthContextValue {
    user: User | null
    session: Session | null
    phase: AuthPhase
    configError: string | null

    // Identity methods
    signInWithGoogle: () => Promise<{ error: Error | null }>
    sendMagicLink: (email: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>

    // Vault methods (post-identity)
    unlockWithPasskey: (
        masterKey: CryptoKey,
        derivationMethod: KeyDerivationMethod,
        credentialId: string,
        privateKey?: CryptoKey,
    ) => void
    unlockWithFallback: (
        masterKey: CryptoKey,
        credentialId: string,
    ) => void
    lockVault: () => Promise<void>

    // Device registration state
    needsDeviceSetup: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [needsDeviceSetup, setNeedsDeviceSetup] = useState(false)

    const vaultStatus = useKeyVaultStore(s => s.status)
    const vaultUnlock = useKeyVaultStore(s => s.unlockVault)
    const vaultLock = useKeyVaultStore(s => s.lockVault)

    // Arm the session guard — auto-locks vault on idle / background / unload
    useSessionGuard()

    // ── Compute auth phase ─────────────────────────────────────────

    const phase: AuthPhase = loading
        ? 'loading'
        : !user
            ? 'unauthenticated'
            : vaultStatus === 'unlocked'
                ? 'vault-unlocked'
                : 'identity-verified'

    // ── Supabase session lifecycle ─────────────────────────────────

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setLoading(false)
            return
        }

        supabase.auth.getSession()
            .then(({ data: { session: s } }) => {
                setSession(s)
                setUser(s?.user ?? null)
                if (s?.user) setNeedsDeviceSetup(true) // Will be resolved after key check
                setLoading(false)
            })
            .catch((error) => {
                console.error('Failed to initialize Supabase session', error)
                setLoading(false)
            })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
            setSession(s)
            setUser(s?.user ?? null)
            setLoading(false)

            // New sign-in → needs device key setup
            if (event === 'SIGNED_IN' && s?.user) {
                setNeedsDeviceSetup(true)
            }

            // Sign out → ensure vault is locked
            if (event === 'SIGNED_OUT') {
                setNeedsDeviceSetup(false)
                void vaultLock()
            }
        })

        return () => subscription.unsubscribe()
    }, [vaultLock])

    // ── Identity Methods ───────────────────────────────────────────

    const buildMissingConfigError = () =>
        new Error(supabaseConfigError || 'Supabase is not configured.')

    const signInWithGoogle = useCallback(async () => {
        if (!isSupabaseConfigured) return { error: buildMissingConfigError() }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        })
        return { error: error as Error | null }
    }, [])

    const sendMagicLink = useCallback(async (email: string) => {
        if (!isSupabaseConfigured) return { error: buildMissingConfigError() }
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin },
        })
        return { error: error as Error | null }
    }, [])

    const signOut = useCallback(async () => {
        if (!isSupabaseConfigured) return
        await vaultLock()
        await supabase.auth.signOut()
    }, [vaultLock])

    // ── Vault Unlock Methods ───────────────────────────────────────

    const unlockWithPasskey = useCallback((
        masterKey: CryptoKey,
        derivationMethod: KeyDerivationMethod,
        credentialId: string,
        privateKey?: CryptoKey,
    ) => {
        vaultUnlock({ masterKey, derivationMethod, credentialId, privateKey })
        setNeedsDeviceSetup(false)
    }, [vaultUnlock])

    const unlockWithFallback = useCallback((
        masterKey: CryptoKey,
        credentialId: string,
    ) => {
        vaultUnlock({
            masterKey,
            derivationMethod: 'pbkdf2',
            credentialId,
        })
        setNeedsDeviceSetup(false)
    }, [vaultUnlock])

    // ── Render ─────────────────────────────────────────────────────

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                phase,
                configError: supabaseConfigError,
                signInWithGoogle,
                sendMagicLink,
                signOut,
                unlockWithPasskey,
                unlockWithFallback,
                lockVault: vaultLock,
                needsDeviceSetup,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
