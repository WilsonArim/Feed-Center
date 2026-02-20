import { createClient } from '@supabase/supabase-js'

const env = import.meta.env as Record<string, string | undefined>

const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabaseConfigError = isSupabaseConfigured
    ? null
    : 'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.'

if (!isSupabaseConfigured) {
    console.error(supabaseConfigError)
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    },
)
