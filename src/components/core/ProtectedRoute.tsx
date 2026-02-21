import { Navigate } from 'react-router'
import { useAuth } from './AuthProvider'
import { useLocaleText } from '@/i18n/useLocaleText'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { txt } = useLocaleText()
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-dvh">
                <div
                    className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin"
                    role="status"
                    aria-label={txt('A carregar', 'Loading')}
                />
            </div>
        )
    }

    if (!user) return <Navigate to="/login" replace />

    return <>{children}</>
}
