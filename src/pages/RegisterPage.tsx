import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Check, X } from 'lucide-react'
import { useAuth } from '@/components/core/AuthProvider'
import { StardustButton } from '@/components/ui/StardustButton'

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: 'Mín. 8 caracteres', met: password.length >= 8 },
        { label: 'Letra maiúscula', met: /[A-Z]/.test(password) },
        { label: 'Número', met: /\d/.test(password) },
        { label: 'Carácter especial', met: /[^A-Za-z0-9]/.test(password) },
    ]

    if (!password) return null

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-col gap-1"
        >
            {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                    {c.met ? (
                        <Check size={14} style={{ color: 'var(--color-success)' }} />
                    ) : (
                        <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                    )}
                    <span style={{ color: c.met ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {c.label}
                    </span>
                </div>
            ))}
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
            <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: 'var(--color-bg-primary)' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass w-full max-w-md rounded-[var(--radius-xl)] p-8 text-center"
                    style={{ boxShadow: 'var(--shadow-lg)' }}
                >
                    <div
                        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'var(--color-success)' }}
                    >
                        <Check size={32} color="#fff" />
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        Verifica o teu email
                    </h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                        Enviámos um link de confirmação para <strong>{email}</strong>. Clica no link para ativar a tua conta.
                    </p>
                    <Link
                        to="/login"
                        className="inline-block px-6 py-3 rounded-[var(--radius-md)] text-sm font-semibold"
                        style={{ background: 'var(--color-accent)', color: '#fff' }}
                    >
                        Voltar ao Login
                    </Link>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: 'var(--color-bg-primary)' }}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="glass w-full max-w-md rounded-[var(--radius-xl)] p-8"
                style={{ boxShadow: 'var(--shadow-lg)' }}
            >
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                        Criar Conta
                    </h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Junta-te ao Feed-Center
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                        <input
                            id="register-email"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 rounded-[var(--radius-md)] text-sm transition-colors"
                            style={{
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-border)',
                            }}
                        />
                    </div>

                    <div className="relative">
                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                        <input
                            id="register-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Palavra-passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full pl-10 pr-12 py-3 rounded-[var(--radius-md)] text-sm transition-colors"
                            style={{
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-border)',
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                            style={{ color: 'var(--color-text-muted)' }}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <PasswordStrength password={password} />

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-sm px-3 py-2 rounded-[var(--radius-md)]"
                            style={{ background: 'var(--color-danger)', color: '#fff' }}
                        >
                            {error}
                        </motion.p>
                    )}

                    <StardustButton
                        id="register-submit"
                        type="submit"
                        disabled={loading || !canSubmit}
                        size="md"
                        fullWidth
                    >
                        {loading ? 'A criar...' : '✧ Criar Conta'}
                    </StardustButton>
                </form>

                <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-secondary)' }}>
                    Já tens conta?{' '}
                    <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--color-accent)' }}>
                        Entrar
                    </Link>
                </p>
            </motion.div>
        </div>
    )
}
