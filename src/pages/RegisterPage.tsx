import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Check, X, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/core/AuthProvider'
import { StardustButton } from '@/components/ui/StardustButton'

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: 'Min. 8 caracteres', met: password.length >= 8 },
        { label: 'Letra maiuscula', met: /[A-Z]/.test(password) },
        { label: 'Numero', met: /\d/.test(password) },
        { label: 'Caracter especial', met: /[^A-Za-z0-9]/.test(password) },
    ]

    if (!password) return null

    const metCount = checks.filter(c => c.met).length
    const strengthPercent = (metCount / checks.length) * 100

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-col gap-2"
        >
            {/* Strength bar */}
            <div className="h-1 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${strengthPercent}%` }}
                    className={`h-full rounded-full transition-colors ${
                        metCount <= 1 ? 'bg-[var(--color-danger)]'
                        : metCount <= 2 ? 'bg-[var(--color-warning)]'
                        : metCount <= 3 ? 'bg-[var(--color-accent)]'
                        : 'bg-[var(--color-success)]'
                    }`}
                />
            </div>
            <div className="grid grid-cols-2 gap-1">
                {checks.map((c) => (
                    <div key={c.label} className="flex items-center gap-1.5 text-xs">
                        {c.met ? (
                            <div className="w-3.5 h-3.5 rounded-full bg-[var(--color-success)]/15 flex items-center justify-center">
                                <Check size={10} className="text-[var(--color-success)]" />
                            </div>
                        ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                                <X size={10} className="text-[var(--color-text-muted)]" />
                            </div>
                        )}
                        <span className={c.met ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}>
                            {c.label}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    )
}

export function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const { signUp } = useAuth()

    const canSubmit =
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return
        setError('')
        setLoading(true)

        const { error: err } = await signUp(email, password)
        if (err) {
            setError(err.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-dvh flex items-center justify-center px-4 bg-[var(--color-bg-primary)]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md rounded-3xl p-8 md:p-10 text-center bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.2)]"
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
                        Verifica o teu email
                    </h2>
                    <p className="text-sm mb-6 text-[var(--color-text-secondary)] leading-relaxed">
                        Enviamos um link de confirmacao para <strong className="text-[var(--color-text-primary)]">{email}</strong>.
                        Clica no link para ativar a tua conta.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                            bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
                    >
                        <ArrowRight size={16} />
                        Voltar ao Login
                    </Link>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-dvh flex items-center justify-center px-4 bg-[var(--color-bg-primary)] relative overflow-hidden">
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
                <div className="rounded-3xl p-8 md:p-10 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.2)]">
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                            className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-accent)] shadow-[0_8px_32px_var(--color-secondary)/25]"
                        >
                            <span className="text-white font-black text-lg font-[Orbitron,sans-serif]">FC</span>
                        </motion.div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Criar Conta
                        </h1>
                        <p className="text-sm mt-2 text-[var(--color-text-secondary)]">
                            Junta-te ao Feed-Center
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="register-email" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 ml-1">
                                Email
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    id="register-email"
                                    type="email"
                                    placeholder="nome@exemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all
                                        bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]
                                        placeholder:text-[var(--color-text-muted)]
                                        focus:outline-none focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/10"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="register-password" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 ml-1">
                                Palavra-passe
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    id="register-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Cria uma password forte"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-12 py-3 rounded-xl text-sm transition-all
                                        bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]
                                        placeholder:text-[var(--color-text-muted)]
                                        focus:outline-none focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <PasswordStrength password={password} />

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-sm px-4 py-2.5 rounded-xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20"
                            >
                                {error}
                            </motion.div>
                        )}

                        <StardustButton
                            id="register-submit"
                            type="submit"
                            disabled={loading || !canSubmit}
                            size="md"
                            fullWidth
                            icon={loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                        >
                            {loading ? 'A criar...' : 'Criar Conta'}
                        </StardustButton>
                    </form>

                    <p className="text-center text-sm mt-6 text-[var(--color-text-secondary)]">
                        Ja tens conta?{' '}
                        <Link to="/login" className="font-semibold text-[var(--color-accent)] hover:underline">
                            Entrar
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
