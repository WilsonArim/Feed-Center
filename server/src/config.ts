import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'

// ── Environment ──
function requireEnv(name: string): string {
    const val = process.env[name]
    if (!val) throw new Error(`Missing env: ${name}`)
    return val
}

function numberFromEnv(name: string, fallback: number): number {
    const raw = process.env[name]
    if (!raw) return fallback
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : fallback
}

function intFromEnv(name: string, fallback: number): number {
    const parsed = Math.round(numberFromEnv(name, fallback))
    return parsed > 0 ? parsed : fallback
}

export const env = {
    port: parseInt(process.env.PORT || '3001'),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    openaiKey: requireEnv('OPENAI_API_KEY'),
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    agentToken: requireEnv('AGENT_TOKEN'),
    cortexDataDir: process.env.CORTEX_DATA_DIR
        ? path.resolve(process.env.CORTEX_DATA_DIR)
        : path.resolve(process.cwd(), 'data', 'cortex'),
    cortexReflexThreshold: Math.max(0, Math.min(1, numberFromEnv('CORTEX_REFLEX_THRESHOLD', 0.8))),
    cortexContextMaxLines: intFromEnv('CORTEX_CONTEXT_MAX_LINES', 150),
    briefingCron: process.env.BRIEFING_CRON || '0 4 * * *',
    briefingTimezone: process.env.BRIEFING_CRON_TZ || 'UTC',
    proactiveAlertsCron: process.env.PROACTIVE_ALERTS_CRON || '*/30 * * * *',
    proactiveAlertsTimezone: process.env.PROACTIVE_ALERTS_CRON_TZ || process.env.BRIEFING_CRON_TZ || 'UTC',
    autoCommitThresholdBase: Math.max(0, Math.min(1, numberFromEnv('CORTEX_AUTO_COMMIT_THRESHOLD', 0.92))),
    nightShiftCron: process.env.NIGHT_SHIFT_CRON || '0 4 * * *',
    nightShiftTimezone: process.env.NIGHT_SHIFT_CRON_TZ || process.env.BRIEFING_CRON_TZ || 'Europe/Lisbon',
    mlxSidecarUrl: process.env.MLX_SIDECAR_URL || 'http://localhost:8787',

    // Telegram Sidecar (optional — bot only starts if token is present)
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramUserId: process.env.TELEGRAM_USER_ID || '',
}

// ── Supabase (service role — bypasses RLS) ──
export const supabase = createClient(env.supabaseUrl, env.supabaseKey)
