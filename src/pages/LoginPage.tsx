import { useState, useCallback, useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Fingerprint, Mail, ShieldCheck, KeyRound, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/core/AuthProvider'
import { StardustButton } from '@/components/ui/StardustButton'
import { useLocaleText } from '@/i18n/useLocaleText'
import { isPasskeyAvailable } from '@/services/crypto/passkeyService'

type LoginStep = 'identity' | 'magic-link-sent' | 'device-setup'

/**
 * Check if there is an existing wrapped private key in IndexedDB for this device.
 * Returns true if the user has already generated a key pair on this device.
 */
async function hasLocalCredential(): Promise<boolean> {
    try {
        // Check IndexedDB for existing wrapped key
        const dbs = await indexedDB.databases()
        const vaultDb = dbs.find(db => db.name === 'feed-center-vault' || db.name === 'keyVault')
        if (!vaultDb?.name) return false

        return new Promise((resolve) => {
            const req = indexedDB.open(vaultDb.name!)
            req.onerror = () => resolve(false)
            req.onsuccess = () => {
                const db = req.result
                try {
                    const tx = db.transaction('keys', 'readonly')
                    const store = tx.objectStore('keys')
                    const countReq = store.count()
                    countReq.onsuccess = () => resolve(countReq.result > 0)
                    countReq.onerror = () => resolve(false)
                } catch {
                    resolve(false)
                } finally {
                    db.close()
                }
            }
        })
    } catch {
        return false
    }
}

export function LoginPage() {
    const { txt } = useLocaleText()
    const { signInWithGoogle, sendMagicLink, phase } = useAuth()
    const navigate = useNavigate()

    const [step, setStep] = useState<LoginStep>('identity')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [passkeySupported, setPasskeySupported] = useState<boolean | null>(null)
    const [hasLocalKey, setHasLocalKey] = useState<boolean | null>(null)

    // Check passkey support and local credential existence on mount
    useEffect(() => {
        isPasskeyAvailable().then(setPasskeySupported)
        hasLocalCredential().then(setHasLocalKey)
    }, [])

    // Navigate when fully authenticated — inside useEffect, not render body
    useEffect(() => {
        if (phase === 'vault-unlocked') {
            navigate('/', { replace: true })
        }
    }, [phase, navigate])

    // When identity is verified via magic link but no local key exists,
    // route to device setup instead of showing "Unlock Vault"
    useEffect(() => {
        if (phase === 'identity-verified' && hasLocalKey === false) {
            setStep('device-setup')
        }
    }, [phase, hasLocalKey])

    const handleGoogle = useCallback(async () => {
        setError('')
        setLoading(true)
        const { error: err } = await signInWithGoogle()
        if (err) { setError(err.message); setLoading(false) }
    }, [signInWithGoogle])

    const handleMagicLink = useCallback(async () => {
        if (!email) return
        setError('')
        setLoading(true)
        const { error: err } = await sendMagicLink(email)
        if (err) {
            setError(err.message)
            setLoading(false)
        } else {
            setStep('magic-link-sent')
            setLoading(false)
        }
    }, [email, sendMagicLink])

    // Show loading screen while auth is initializing (captures magic link hash)
    if (phase === 'loading') {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-[var(--bg-deep)]">
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"
                        role="status"
                        aria-label={txt('A verificar identidade...', 'Verifying identity...')}
                    />
                    <p className="text-sm text-[var(--text-secondary)]">
                        {txt('A verificar identidade...', 'Verifying identity...')}
                    </p>
                </div>
            </div>
        )
    }

    // Show biometric button ONLY if passkey is supported AND local key exists
    const showBiometricUnlock = passkeySupported !== false && hasLocalKey === true

    return (
        <div className="min-h-dvh flex items-center justify-center px-4 bg-[var(--bg-deep)] relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full bg-[var(--color-accent)] opacity-[0.04] blur-[120px]" />
                <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] rounded-full bg-[var(--color-secondary)] opacity-[0.04] blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                className="relative w-full max-w-md"
            >
                <div className="rounded-3xl p-8 md:p-10 bg-[var(--bg-modal)] border border-[var(--border-default)] shadow-[var(--shadow-xl)]">

                    {/* Logo + Title */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring' as const, stiffness: 300, damping: 20 }}
                            className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-secondary)] shadow-[0_8px_32px_var(--color-accent)/25]"
                        >
                            <ShieldCheck size={24} className="text-white" />
                        </motion.div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            {txt('Bem-vindo de volta', 'Welcome back')}
                        </h1>
                        <p className="text-sm mt-2 text-[var(--color-text-secondary)]">
                            {txt(
                                'Sem passwords. Só tu e o teu dispositivo.',
                                'No passwords. Just you and your device.',
                            )}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {/* ── Step: Identity Verification ─────────────────── */}
                        {step === 'identity' && (
                            <motion.div
                                key="identity"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col gap-4"
                            >
                                {/* Primary CTA: Biometric — ONLY if local key exists */}
                                {showBiometricUnlock && (
                                    <StardustButton
                                        id="login-passkey"
                                        onClick={() => setStep('device-setup')}
                                        size="lg"
                                        fullWidth
                                        icon={<Fingerprint size={20} />}
                                    >
                                        {txt('Entrar com Biometria', 'Sign in with Biometrics')}
                                    </StardustButton>
                                )}

                                {/* Divider */}
                                <div className="flex items-center gap-4 my-2">
                                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                                    <span className="text-xs text-[var(--color-text-muted)] font-medium">
                                        {showBiometricUnlock
                                            ? txt('ou verifica a tua identidade', 'or verify your identity')
                                            : txt('verifica a tua identidade', 'verify your identity')
                                        }
                                    </span>
                                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                                </div>

                                {/* Google OAuth — identity only */}
                                <StardustButton
                                    id="login-google"
                                    onClick={handleGoogle}
                                    variant="ghost"
                                    size="md"
                                    fullWidth
                                    isLoading={loading}
                                    icon={
                                        <svg width="18" height="18" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                    }
                                >
                                    {txt('Continuar com Google', 'Continue with Google')}
                                </StardustButton>

                                {/* Magic Link — identity only */}
                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                        <input
                                            id="login-email"
                                            type="email"
                                            placeholder={txt('nome@exemplo.com', 'name@example.com')}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all
                                                bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]
                                                placeholder:text-[var(--color-text-muted)]
                                                focus:outline-none focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/10"
                                        />
                                    </div>
                                    <StardustButton
                                        id="login-magic-link"
                                        onClick={handleMagicLink}
                                        variant="outline"
                                        size="md"
                                        fullWidth
                                        disabled={!email}
                                        isLoading={loading}
                                        icon={<Sparkles size={16} />}
                                    >
                                        {txt('Enviar Magic Link', 'Send Magic Link')}
                                    </StardustButton>
                                </div>

                                {/* Security note */}
                                <p className="text-center text-[10px] mt-2 text-[var(--color-text-muted)] leading-relaxed">
                                    <ShieldCheck size={10} className="inline mr-1 -mt-px" />
                                    {txt(
                                        'Zero-Knowledge: as tuas chaves criptográficas são geradas localmente no teu dispositivo.',
                                        'Zero-Knowledge: your cryptographic keys are generated locally on your device.',
                                    )}
                                </p>
                            </motion.div>
                        )}

                        {/* ── Step: Magic Link Sent ───────────────────────── */}
                        {step === 'magic-link-sent' && (
                            <motion.div
                                key="magic-link-sent"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1, type: 'spring' as const, stiffness: 300 }}
                                    className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[var(--color-accent)]/10"
                                >
                                    <Mail size={28} className="text-[var(--color-accent)]" />
                                </motion.div>
                                <h2 className="text-xl font-bold mb-2 text-[var(--color-text-primary)]">
                                    {txt('Verifica o teu email', 'Check your email')}
                                </h2>
                                <p className="text-sm mb-6 text-[var(--color-text-secondary)] leading-relaxed">
                                    {txt('Enviamos um link mágico para', 'We sent a magic link to')}{' '}
                                    <strong className="text-[var(--color-text-primary)]">{email}</strong>.
                                    <br />
                                    {txt(
                                        'Clica no link para verificar a tua identidade.',
                                        'Click the link to verify your identity.',
                                    )}
                                </p>
                                <StardustButton
                                    id="login-back"
                                    onClick={() => setStep('identity')}
                                    variant="ghost"
                                    size="sm"
                                >
                                    {txt('Voltar', 'Go back')}
                                </StardustButton>
                            </motion.div>
                        )}

                        {/* ── Step: Device Setup (post-identity) ──────────── */}
                        {step === 'device-setup' && (
                            <motion.div
                                key="device-setup"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="text-center py-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1, type: 'spring' as const }}
                                    className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[var(--color-accent)]/10"
                                >
                                    {hasLocalKey
                                        ? <Fingerprint size={32} className="text-[var(--color-accent)]" />
                                        : <KeyRound size={32} className="text-[var(--color-accent)]" />
                                    }
                                </motion.div>
                                <h2 className="text-lg font-bold mb-2 text-[var(--color-text-primary)]">
                                    {hasLocalKey
                                        ? txt('Desbloquear Vault', 'Unlock Vault')
                                        : txt('Configurar Dispositivo', 'Device Setup')
                                    }
                                </h2>
                                <p className="text-sm mb-6 text-[var(--color-text-secondary)] leading-relaxed">
                                    {hasLocalKey
                                        ? txt(
                                            'O teu navegador vai pedir verificação biométrica. Usa Touch ID, Face ID, ou o PIN do dispositivo.',
                                            'Your browser will prompt for biometric verification. Use Touch ID, Face ID, or your device PIN.',
                                        )
                                        : txt(
                                            'Identidade verificada! Agora vamos gerar as tuas chaves criptográficas neste dispositivo.',
                                            'Identity verified! Now let\'s generate your cryptographic keys on this device.',
                                        )
                                    }
                                </p>
                                <div className="flex flex-col gap-2">
                                    <StardustButton
                                        id="login-biometric-confirm"
                                        size="lg"
                                        fullWidth
                                        icon={hasLocalKey ? <Fingerprint size={18} /> : <KeyRound size={18} />}
                                    >
                                        {hasLocalKey
                                            ? txt('Desbloquear Vault', 'Unlock Vault')
                                            : txt('Gerar Chaves', 'Generate Keys')
                                        }
                                    </StardustButton>
                                    <StardustButton
                                        id="login-back-to-identity"
                                        onClick={() => setStep('identity')}
                                        variant="ghost"
                                        size="sm"
                                    >
                                        {txt('Voltar', 'Go back')}
                                    </StardustButton>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-sm px-4 py-2.5 mt-4 rounded-xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Register link */}
                    <p className="text-center text-sm mt-6 text-[var(--color-text-secondary)]">
                        {txt('Sem conta?', 'No account?')}{' '}
                        <Link to="/register" className="font-semibold text-[var(--color-accent)] hover:underline">
                            {txt('Criar conta', 'Create account')}
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
