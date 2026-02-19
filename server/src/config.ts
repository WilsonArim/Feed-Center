import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// ── Environment ──
function requireEnv(name: string): string {
    const val = process.env[name]
    if (!val) throw new Error(`Missing env: ${name}`)
    return val
}

export const env = {
    port: parseInt(process.env.PORT || '3001'),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    openaiKey: requireEnv('OPENAI_API_KEY'),
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    agentToken: requireEnv('AGENT_TOKEN'),
}

// ── Supabase (service role — bypasses RLS) ──
export const supabase = createClient(env.supabaseUrl, env.supabaseKey)
