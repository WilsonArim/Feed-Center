import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, supabaseConfigError } from '@/lib/supabase'

interface AuthContextValue {
    user: User | null
    session: Session | null
    loading: boolean
    configError: string | null
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>
    signInWithGoogle: () => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setLoading(false)
            return
        }

        supabase.auth.getSession()
            .then(({ data: { session: s } }) => {
                setSession(s)
                setUser(s?.user ?? null)
                setLoading(false)
            })
            .catch((error) => {
                console.error('Failed to initialize Supabase session', error)
                setLoading(false)
            })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s)
            setUser(s?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const buildMissingConfigError = () =>
        new Error(supabaseConfigError || 'Supabase is not configured.')

    const signIn = async (email: string, password: string) => {
        if (!isSupabaseConfigured) return { error: buildMissingConfigError() }
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error as Error | null }
    }

    const signUp = async (email: string, password: string) => {
        if (!isSupabaseConfigured) return { error: buildMissingConfigError() }
        const { error } = await supabase.auth.signUp({ email, password })
        return { error: error as Error | null }
    }

    const signInWithGoogle = async () => {
        if (!isSupabaseConfigured) return { error: buildMissingConfigError() }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        })
        return { error: error as Error | null }
    }

    const signOut = async () => {
        if (!isSupabaseConfigured) return
        await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider
            value={{ user, session, loading, configError: supabaseConfigError, signIn, signUp, signInWithGoogle, signOut }}
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
