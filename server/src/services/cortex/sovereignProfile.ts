/**
 * Sovereign Profile — Local-only user identity and preferences
 *
 * Lives in the same SQLite as SubconsciousLedger. Data NEVER leaves the machine.
 * Stores dialect patterns, accent info, common merchants, and interaction preferences.
 */

import Database from 'better-sqlite3'

export interface SovereignProfileOptions {
    db: Database.Database
}

export class SovereignProfile {
    private readonly db: Database.Database

    constructor(options: SovereignProfileOptions) {
        this.db = options.db
        this.bootstrap()
    }

    private bootstrap(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_profile (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                key     TEXT NOT NULL UNIQUE,
                value   TEXT NOT NULL DEFAULT '{}',
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `)
    }

    get(key: string): Record<string, unknown> | null {
        const row = this.db.prepare(
            'SELECT value FROM user_profile WHERE key = ?'
        ).get(key) as { value: string } | undefined

        if (!row) return null
        try {
            return JSON.parse(row.value) as Record<string, unknown>
        } catch {
            return null
        }
    }

    getString(key: string): string | null {
        const data = this.get(key)
        if (!data || typeof data.value !== 'string') return null
        return data.value
    }

    set(key: string, value: Record<string, unknown> | string): void {
        const json = typeof value === 'string'
            ? JSON.stringify({ value })
            : JSON.stringify(value)

        this.db.prepare(`
            INSERT INTO user_profile (key, value, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
        `).run(key, json)
    }

    getAll(): Record<string, Record<string, unknown>> {
        const rows = this.db.prepare(
            'SELECT key, value FROM user_profile ORDER BY key'
        ).all() as Array<{ key: string; value: string }>

        const result: Record<string, Record<string, unknown>> = {}
        for (const row of rows) {
            try {
                result[row.key] = JSON.parse(row.value) as Record<string, unknown>
            } catch {
                result[row.key] = {}
            }
        }
        return result
    }

    mergePreferences(key: string, partial: Record<string, unknown>): void {
        const existing = this.get(key) ?? {}
        const merged = { ...existing, ...partial }
        this.set(key, merged)
    }

    appendToList(key: string, listField: string, item: string, maxItems = 50): void {
        const existing = this.get(key) ?? {}
        const list = Array.isArray(existing[listField])
            ? (existing[listField] as string[])
            : []

        if (!list.includes(item)) {
            list.push(item)
            if (list.length > maxItems) list.shift()
        }

        this.set(key, { ...existing, [listField]: list })
    }

    buildSystemPromptContext(): string {
        const lines: string[] = []

        const accent = this.get('regional_accent')
        if (accent?.region) {
            lines.push(`Região do utilizador: ${String(accent.region)}.`)
        }
        if (accent?.dialect_notes) {
            lines.push(`Notas de sotaque: ${String(accent.dialect_notes)}.`)
        }

        const prefs = this.get('interaction_preferences')
        if (prefs?.language) {
            lines.push(`Idioma preferido: ${String(prefs.language)}.`)
        }

        const merchants = this.get('common_merchants')
        if (merchants?.list && Array.isArray(merchants.list) && merchants.list.length > 0) {
            lines.push(`Comerciantes frequentes: ${(merchants.list as string[]).slice(0, 10).join(', ')}.`)
        }

        const patterns = this.get('dialect_patterns')
        if (patterns?.mappings && Array.isArray(patterns.mappings) && patterns.mappings.length > 0) {
            const mapped = (patterns.mappings as Array<{ slang: string; meaning: string }>)
                .slice(0, 8)
                .map((m) => `"${m.slang}" → ${m.meaning}`)
                .join('; ')
            lines.push(`Gíria conhecida: ${mapped}.`)
        }

        const bioDates = this.get('biographical_dates')
        if (bioDates?.dates && Array.isArray(bioDates.dates) && bioDates.dates.length > 0) {
            const formatted = (bioDates.dates as Array<{ label: string; date: string; type: string }>)
                .slice(0, 8)
                .map((d) => `${d.label} (${d.type}: ${d.date})`)
                .join('; ')
            lines.push(`Datas biográficas: ${formatted}.`)
        }

        const routines = this.get('routine_patterns')
        if (routines && typeof routines === 'object') {
            const entries = Object.entries(routines).filter(
                ([key]) => key !== 'value',
            )
            if (entries.length > 0) {
                const formatted = entries.slice(0, 6).map(
                    ([merchant, data]) => {
                        const d = data as { period_days?: number; count?: number }
                        return `${merchant} (~${d.period_days ?? '?'}d, ${d.count ?? '?'}x)`
                    },
                ).join('; ')
                lines.push(`Rotinas detectadas: ${formatted}.`)
            }
        }

        const mood = this.get('mood_baseline')
        if (mood?.avg_sentiment !== undefined) {
            const sentiment = Number(mood.avg_sentiment)
            if (Number.isFinite(sentiment)) {
                const label = sentiment > 0.3 ? 'positivo' : sentiment < -0.3 ? 'negativo' : 'neutro'
                lines.push(`Humor habitual: ${label} (${sentiment.toFixed(2)}).`)
            }
        }

        return lines.length > 0
            ? `\n--- PERFIL DO UTILIZADOR (LOCAL) ---\n${lines.join('\n')}\n---`
            : ''
    }
}
