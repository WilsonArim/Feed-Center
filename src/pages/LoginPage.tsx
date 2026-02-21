import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/core/AuthProvider'
import { StardustButton } from '@/components/ui/StardustButton'
import { useLocaleText } from '@/i18n/useLocaleText'

export function LoginPage() {
    const { txt } = useLocaleText()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn, signInWithGoogle } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error: err } = await signIn(email, password)
        if (err) {
            setError(err.message)
            setLoading(false)
        } else {
            navigate('/', { replace: true })
        }
    }

    const handleGoogle = async () => {
        const { error: err } = await signInWithGoogle()
        if (err) setError(err.message)
    }

    return (
        <div className="min-h-dvh flex items-center justify-center px-4 bg-[var(--bg-deep)] relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full bg-[var(--color-accent)] opacity-[0.04] blur-[120px]" />
                <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] rounded-full bg-[var(--color-secondary)] opacity-[0.04] blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative w-full max-w-md"
            >
                {/* Card */}
                <div className="rounded-3xl p-8 md:p-10 bg-[var(--bg-modal)] border border-[var(--border-default)] shadow-[var(--shadow-xl)]">
                    {/* Logo + Title */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                            className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-secondary)] shadow-[0_8px_32px_var(--color-accent)/25]"
                        >
                            <span className="text-white font-black text-lg font-[Orbitron,sans-serif]">FC</span>
                        </motion.div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            {txt('Bem-vindo de volta', 'Welcome back')}
                        </h1>
                        <p className="text-sm mt-2 text-[var(--color-text-secondary)]">
                            {txt('Entra na tua central de comando pessoal', 'Enter your personal command center')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Email */}
                        <div>
                            <label htmlFor="login-email" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 ml-1">
                                {txt('Email', 'Email')}
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder={txt('nome@exemplo.com', 'name@example.com')}
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

                        {/* Password */}
                        <div>
                            <label htmlFor="login-password" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 ml-1">
                                {txt('Palavra-passe', 'Password')}
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={txt('A tua password', 'Your password')}
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
                                    aria-label={showPassword ? txt('Ocultar palavra-passe', 'Hide password') : txt('Mostrar palavra-passe', 'Show password')}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-sm px-4 py-2.5 rounded-xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20"
                            >
                                {error}
                            </motion.div>
                        )}

                        {/* Submit */}
                        <StardustButton
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            size="md"
                            fullWidth
                            icon={loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                        >
                            {loading ? txt('A entrar...', 'Signing in...') : txt('Entrar', 'Sign in')}
                        </StardustButton>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-[var(--color-border)]" />
                        <span className="text-xs text-[var(--color-text-muted)] font-medium">{txt('ou', 'or')}</span>
                        <div className="flex-1 h-px bg-[var(--color-border)]" />
                    </div>

                    {/* Google */}
                    <StardustButton
                        id="login-google"
                        onClick={handleGoogle}
                        variant="ghost"
                        size="md"
                        fullWidth
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
