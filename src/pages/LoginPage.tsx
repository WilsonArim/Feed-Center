import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/components/core/AuthProvider'
import { StardustButton } from '@/components/ui/StardustButton'

export function LoginPage() {
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
                        Feed-Center
                    </h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Entra na tua central de comando pessoal
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Email */}
                    <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                        <input
                            id="login-email"
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

                    {/* Password */}
                    <div className="relative">
                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                        <input
                            id="login-password"
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

                    {/* Error */}
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

                    {/* Submit */}
                    <StardustButton
                        id="login-submit"
                        type="submit"
                        disabled={loading}
                        size="md"
                        fullWidth
                    >
                        {loading ? 'A entrar...' : '✧ Entrar'}
                    </StardustButton>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ou</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
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
                    Continuar com Google
                </StardustButton>

                {/* Register link */}
                <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-secondary)' }}>
                    Sem conta?{' '}
                    <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--color-accent)' }}>
                        Criar conta
                    </Link>
                </p>
            </motion.div>
        </div>
    )
}
