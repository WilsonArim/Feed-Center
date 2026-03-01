import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Fingerprint, Mail, Check, ShieldCheck, Sparkles, KeyRound,
    Copy, CheckCheck, Smartphone, Monitor, Shield,
} from 'lucide-react'
import { useAuth } from '@/components/core/AuthProvider'
import { StardustButton } from '@/components/ui/StardustButton'
import { useLocaleText } from '@/i18n/useLocaleText'
import { isPasskeyAvailable } from '@/services/crypto/passkeyService'

type RegisterStep =
    | 'identity'          // Step 1: verify identity (Google / Magic Link)
    | 'magic-link-sent'   // Waiting for email verification
    | 'warmup'            // ★ Interstitial: explain what is about to happen
    | 'key-generation'    // Fire navigator.credentials.create() on button click
    | 'fallback'          // No WebAuthn → recovery passphrase
    | 'success'

export function RegisterPage() {
    const { txt } = useLocaleText()
    const { signInWithGoogle, sendMagicLink, phase } = useAuth()

    const [step, setStep] = useState<RegisterStep>('identity')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [passkeySupported, setPasskeySupported] = useState<boolean | null>(null)
    const [passphrase, setPassphrase] = useState('')
    const [passphraseCopied, setPassphraseCopied] = useState(false)

    useEffect(() => {
        isPasskeyAvailable().then(setPasskeySupported)
    }, [])

    const generatePassphrase = useCallback(() => {
        const words = [
            'atlas', 'prism', 'forge', 'nexus', 'vapor', 'drift', 'gleam', 'spark',
            'frost', 'blaze', 'crest', 'pulse', 'shade', 'surge', 'bloom', 'flint',
            'shore', 'ridge', 'grove', 'haven', 'quest', 'realm', 'vault', 'epoch',
        ]
        const selected: string[] = []
        const values = crypto.getRandomValues(new Uint32Array(6))
        for (const val of values) selected.push(words[val % words.length]!)
        return selected.join('-')
    }, [])

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

    const handleStartKeyGen = useCallback(() => {
        if (passkeySupported) {
            setStep('warmup')    // ← always go through warm-up first
        } else {
            setPassphrase(generatePassphrase())
            setStep('fallback')
        }
    }, [passkeySupported, generatePassphrase])

    // After identity verification → navigate to warm-up
    useEffect(() => {
        if (phase === 'identity-verified' && step === 'identity') {
            handleStartKeyGen()
        }
    }, [phase, step, handleStartKeyGen])

    const handleCopyPassphrase = useCallback(() => {
        navigator.clipboard.writeText(passphrase)
        setPassphraseCopied(true)
        setTimeout(() => setPassphraseCopied(false), 2000)
    }, [passphrase])

    // ── Step indicator ─────────────────────────────────────────────
    const stepLabel = {
        identity: txt('Passo 1 de 2: Verificar identidade', 'Step 1 of 2: Verify identity'),
        'magic-link-sent': '',
        warmup: txt('Passo 2 de 2: Preparar chave', 'Step 2 of 2: Prepare key'),
        'key-generation': txt('Passo 2 de 2: Criar chave', 'Step 2 of 2: Create key'),
        fallback: txt('Passo 2 de 2: Frase de recuperação', 'Step 2 of 2: Recovery phrase'),
        success: '',
    }[step]

    return (
        <div className="min-h-dvh flex items-center justify-center px-4 bg-[var(--bg-deep)] relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-[var(--color-secondary)] opacity-[0.04] blur-[120px]" />
                <div className="absolute bottom-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-[var(--color-accent)] opacity-[0.04] blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative w-full max-w-md"
            >
                <div className="rounded-3xl p-8 md:p-10 bg-[var(--bg-modal)] border border-[var(--border-default)] shadow-[var(--shadow-xl)]">

                    {/* Logo + Title */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                            className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-accent)] shadow-[0_8px_32px_var(--color-secondary)/25]"
                        >
                            <ShieldCheck size={24} className="text-white" />
                        </motion.div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            {txt('Criar Conta', 'Create Account')}
                        </h1>
                        <p className="text-sm mt-2 text-[var(--color-text-secondary)]">
                            {txt(
                                'Sem passwords. Criptografia local no teu dispositivo.',
                                'No passwords. Local encryption on your device.',
                            )}
                        </p>
                    </div>

                    {/* Step indicator */}
                    {stepLabel && (
                        <p className="text-xs text-center text-[var(--color-text-muted)] -mt-4 mb-5">
                            {stepLabel}
                        </p>
                    )}

                    <AnimatePresence mode="wait">

                        {/* ── STEP: Identity ──────────────────────────────── */}
                        {step === 'identity' && (
                            <motion.div
                                key="identity"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col gap-4"
                            >
                                <StardustButton
                                    id="register-google"
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

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                                    <span className="text-xs text-[var(--color-text-muted)]">{txt('ou', 'or')}</span>
                                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                        <input
                                            id="register-email"
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
                                        id="register-magic-link"
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
                            </motion.div>
                        )}

                        {/* ── STEP: Magic Link Sent ───────────────────────── */}
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
                                    transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                                    className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[var(--color-accent)]/10"
                                >
                                    <Mail size={28} className="text-[var(--color-accent)]" />
                                </motion.div>
                                <h2 className="text-xl font-bold mb-2 text-[var(--color-text-primary)]">
                                    {txt('Verifica o teu email', 'Check your email')}
                                </h2>
                                <p className="text-sm mb-6 text-[var(--color-text-secondary)] leading-relaxed">
                                    {txt('Enviamos um link para', 'We sent a link to')}{' '}
                                    <strong className="text-[var(--color-text-primary)]">{email}</strong>.
                                    <br />
                                    {txt(
                                        'Após clicar no link, volta aqui para criar a tua chave.',
                                        "After clicking the link, come back here to create your key.",
                                    )}
                                </p>
                                <StardustButton onClick={() => setStep('identity')} variant="ghost" size="sm">
                                    {txt('Voltar', 'Go back')}
                                </StardustButton>
                            </motion.div>
                        )}

                        {/* ── STEP: ★ WARM-UP INTERSTITIAL ────────────────── */}
                        {step === 'warmup' && (
                            <motion.div
                                key="warmup"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col gap-5"
                            >
                                {/* Hero icon */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -10 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                                    className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-secondary)]/20 border border-[var(--color-accent)]/20"
                                >
                                    <Fingerprint size={40} className="text-[var(--color-accent)]" />
                                </motion.div>

                                {/* Headline */}
                                <div className="text-center">
                                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                                        {txt(
                                            'Vamos criar a tua chave invisível.',
                                            "Let's create your invisible key.",
                                        )}
                                    </h2>
                                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                                        {txt(
                                            'O teu dispositivo vai pedir a tua impressão digital, rosto ou o PIN do ecrã para trancar o teu cofre. É 100% seguro e nada sai do teu aparelho.',
                                            'Your device will ask for your fingerprint, face, or screen PIN to lock your vault. It\'s 100% secure and nothing leaves your device.',
                                        )}
                                    </p>
                                </div>

                                {/* How it works — 3 micro-cards */}
                                <div className="flex flex-col gap-2">
                                    {[
                                        {
                                            icon: <Shield size={15} />,
                                            text: txt(
                                                'A chave é criada dentro do teu chip — nunca viaja pela rede.',
                                                'The key is created inside your chip — it never travels over the network.',
                                            ),
                                        },
                                        {
                                            icon: <Fingerprint size={15} />,
                                            text: txt(
                                                'A tua biometria desbloqueia o cofre, mas não é armazenada por nós.',
                                                'Your biometrics unlock the vault but are never stored by us.',
                                            ),
                                        },
                                        {
                                            icon: <Monitor size={15} />,
                                            text: txt(
                                                'Num computador, podes usar o PIN do sistema ou o teu telemóvel.',
                                                'On a desktop, you can use your system PIN or your phone.',
                                            ),
                                        },
                                    ].map(({ icon, text }, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 + i * 0.08 }}
                                            className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]"
                                        >
                                            <span className="mt-0.5 shrink-0 text-[var(--color-accent)]">{icon}</span>
                                            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{text}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Cross-device note */}
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-accent)]/8 border border-[var(--color-accent)]/15">
                                    <Smartphone size={14} className="shrink-0 text-[var(--color-accent)]" />
                                    <p className="text-xs text-[var(--color-accent)] leading-relaxed">
                                        {txt(
                                            'Dica: podes usar o QR code do teu telemóvel para autorizar neste computador.',
                                            'Tip: you can use your phone\'s QR code to authorize on this computer.',
                                        )}
                                    </p>
                                </div>

                                {/* Primary CTA — ONLY this triggers the OS prompt */}
                                <StardustButton
                                    id="register-create-key"
                                    size="lg"
                                    fullWidth
                                    icon={<KeyRound size={18} />}
                                    onClick={() => setStep('key-generation')}
                                >
                                    {txt('Criar Chave Segura', 'Create Secure Key')}
                                </StardustButton>

                                {/* Fallback escape hatch */}
                                <button
                                    onClick={() => {
                                        setPassphrase(generatePassphrase())
                                        setStep('fallback')
                                    }}
                                    className="text-xs text-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
                                >
                                    {txt(
                                        'O meu dispositivo não suporta biometria',
                                        "My device doesn't support biometrics",
                                    )}
                                </button>
                            </motion.div>
                        )}

                        {/* ── STEP: Key Generation (fires WebAuthn) ───────── */}
                        {step === 'key-generation' && (
                            <motion.div
                                key="key-generation"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="text-center py-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                    className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[var(--color-accent)]/10"
                                >
                                    <Fingerprint size={32} className="text-[var(--color-accent)]" />
                                </motion.div>

                                <h2 className="text-lg font-bold mb-2 text-[var(--color-text-primary)]">
                                    {txt('A criar a tua chave…', 'Creating your key…')}
                                </h2>
                                <p className="text-sm mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                                    {txt(
                                        'Autoriza quando o teu sistema pedir. Pode aparecer como uma janela separada.',
                                        'Authorize when your system prompts. It may appear as a separate window.',
                                    )}
                                </p>

                                {/* Pulsing indicator while waiting for the OS prompt */}
                                <motion.div
                                    animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                    className="w-12 h-12 mx-auto rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center"
                                >
                                    <KeyRound size={20} className="text-[var(--color-accent)]" />
                                </motion.div>
                            </motion.div>
                        )}

                        {/* ── STEP: PBKDF2 Fallback ──────────────────────── */}
                        {step === 'fallback' && (
                            <motion.div
                                key="fallback"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="py-2"
                            >
                                <h2 className="text-lg font-bold mb-2 text-center text-[var(--color-text-primary)]">
                                    {txt('Frase de Recuperação', 'Recovery Phrase')}
                                </h2>
                                <p className="text-sm mb-4 text-center text-[var(--color-text-secondary)] leading-relaxed">
                                    {txt(
                                        'Guarda esta frase num local seguro. É a única forma de desbloquear os teus dados neste dispositivo.',
                                        "Save this phrase in a safe place. It's the only way to unlock your data on this device.",
                                    )}
                                </p>

                                <div className="relative rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] p-4 mb-4">
                                    <code className="block text-center text-sm font-mono text-[var(--color-accent)] tracking-wider leading-relaxed break-all select-all">
                                        {passphrase}
                                    </code>
                                    <button
                                        onClick={handleCopyPassphrase}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                                        aria-label={txt('Copiar', 'Copy')}
                                    >
                                        {passphraseCopied
                                            ? <CheckCheck size={14} className="text-[var(--color-success)]" />
                                            : <Copy size={14} className="text-[var(--color-text-muted)]" />
                                        }
                                    </button>
                                </div>

                                <div className="rounded-xl px-4 py-3 mb-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
                                    <p className="text-xs text-[var(--color-warning)] leading-relaxed">
                                        ⚠️ {txt(
                                            'Esta frase NÃO pode ser recuperada. Se a perderes, perdes acesso aos teus dados encriptados.',
                                            'This phrase CANNOT be recovered. If you lose it, you lose access to your encrypted data.',
                                        )}
                                    </p>
                                </div>

                                <StardustButton
                                    id="register-fallback-confirm"
                                    size="lg"
                                    fullWidth
                                    icon={<KeyRound size={18} />}
                                    onClick={() => setStep('success')}
                                >
                                    {txt('Guardei a frase. Continuar.', 'I saved the phrase. Continue.')}
                                </StardustButton>
                            </motion.div>
                        )}

                        {/* ── STEP: Success ───────────────────────────────── */}
                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                                    className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[var(--color-success)]/15"
                                >
                                    <Check size={28} className="text-[var(--color-success)]" />
                                </motion.div>
                                <h2 className="text-xl font-bold mb-2 text-[var(--color-text-primary)]">
                                    {txt('Conta Criada', 'Account Created')}
                                </h2>
                                <p className="text-sm mb-6 text-[var(--color-text-secondary)] leading-relaxed">
                                    {txt(
                                        'As tuas chaves criptográficas foram geradas e o vault está desbloqueado.',
                                        'Your cryptographic keys have been generated and the vault is unlocked.',
                                    )}
                                </p>
                                <Link
                                    to="/"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                                        bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
                                >
                                    <ShieldCheck size={16} />
                                    {txt('Entrar no Feed Center', 'Enter Feed Center')}
                                </Link>
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

                    {step === 'identity' && (
                        <p className="text-center text-sm mt-6 text-[var(--color-text-secondary)]">
                            {txt('Já tens conta?', 'Already have an account?')}{' '}
                            <Link to="/login" className="font-semibold text-[var(--color-accent)] hover:underline">
                                {txt('Entrar', 'Sign in')}
                            </Link>
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
