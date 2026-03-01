import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import type {
    CortexModule,
    CortexReflexModule,
    CortexSignalType,
    DailyBriefingCacheInput,
    ProactiveAlert,
    ProactiveAlertInput,
    ProactiveAlertKind,
    ProactiveAlertStatus,
    HandshakeStatus,
    LedgerGroundTruthSnapshot,
    OcrTraceInput,
    StoredTaskDraft,
    StoredDailyBriefing,
    StoredHandshakeEvent,
    StoredOcrTrace,
    StoredRawSignal,
    TaskDraftStatus,
} from './types.js'

type JsonObject = Record<string, unknown>

interface SubconsciousLedgerOptions {
    dbPath: string
    retentionDays?: number
    pruneIntervalMs?: number
}

function nowIso(): string {
    return new Date().toISOString()
}

function parseJson(value: unknown): JsonObject {
    if (typeof value !== 'string' || !value.trim()) return {}
    try {
        const parsed = JSON.parse(value) as unknown
        return parsed && typeof parsed === 'object' ? parsed as JsonObject : {}
    } catch {
        return {}
    }
}

function stringifyJson(value: JsonObject | undefined): string {
    return JSON.stringify(value ?? {})
}

export class SubconsciousLedger {
    private readonly db: Database.Database
    private readonly retentionDays: number
    private readonly pruneIntervalMs: number
    private lastPruneAt = 0

    constructor(options: SubconsciousLedgerOptions) {
        const dbPath = path.resolve(options.dbPath)
        fs.mkdirSync(path.dirname(dbPath), { recursive: true })
        this.db = new Database(dbPath)
        this.db.pragma('journal_mode = WAL')
        this.db.pragma('synchronous = NORMAL')
        this.retentionDays = Math.max(7, Math.round(options.retentionDays ?? 90))
        this.pruneIntervalMs = Math.max(60_000, Math.round(options.pruneIntervalMs ?? (1000 * 60 * 60 * 6)))
        this.bootstrap()
        this.maybePrune()
    }

    private bootstrap(): void {
        this.db.exec(`
            create table if not exists raw_signals (
                id text primary key,
                signal_type text not null,
                channel text,
                raw_text text not null,
                normalized_text text not null,
                metadata_json text not null default '{}',
                created_at text not null
            );

            create table if not exists ocr_traces (
                id text primary key,
                raw_signal_id text not null,
                merchant text,
                amount real,
                currency text,
                confidence real,
                trace_json text not null default '{}',
                created_at text not null,
                foreign key(raw_signal_id) references raw_signals(id)
            );

            create table if not exists handshake_events (
                id text primary key,
                raw_signal_id text not null,
                module text not null,
                status text not null,
                confidence real,
                payload_json text not null default '{}',
                created_at text not null,
                foreign key(raw_signal_id) references raw_signals(id)
            );

            create table if not exists task_drafts (
                id text primary key,
                raw_signal_id text not null,
                module text not null,
                status text not null,
                draft_json text not null default '{}',
                created_at text not null,
                updated_at text not null,
                foreign key(raw_signal_id) references raw_signals(id)
            );

            create table if not exists daily_briefings (
                user_id text not null,
                briefing_date text not null,
                generated_at text not null,
                expires_at text not null,
                payload_json text not null default '{}',
                primary key (user_id, briefing_date)
            );

            create table if not exists proactive_alerts (
                id text primary key,
                dedupe_key text not null unique,
                user_id text not null,
                kind text not null,
                status text not null,
                module text not null,
                title text not null,
                message text not null,
                payload_json text not null default '{}',
                created_at text not null,
                expires_at text
            );

            create index if not exists idx_raw_signals_created_at
            on raw_signals (created_at desc);

            create index if not exists idx_ocr_traces_created_at
            on ocr_traces (created_at desc);

            create index if not exists idx_ocr_traces_raw_signal_id
            on ocr_traces (raw_signal_id);

            create index if not exists idx_handshake_events_created_at
            on handshake_events (created_at desc);

            create index if not exists idx_handshake_events_raw_signal_id
            on handshake_events (raw_signal_id);

            create index if not exists idx_task_drafts_raw_signal_id
            on task_drafts (raw_signal_id);

            create index if not exists idx_task_drafts_status_created_at
            on task_drafts (status, created_at desc);

            create index if not exists idx_daily_briefings_expires_at
            on daily_briefings (expires_at);

            create index if not exists idx_proactive_alerts_user_status
            on proactive_alerts (user_id, status, created_at desc);

            create index if not exists idx_proactive_alerts_expires_at
            on proactive_alerts (expires_at);
        `)
    }

    private maybePrune(): void {
        const now = Date.now()
        if ((now - this.lastPruneAt) < this.pruneIntervalMs) return
        this.lastPruneAt = now
        this.pruneOldRows(this.retentionDays)
    }

    logRawInput(input: {
        signalType: CortexSignalType
        channel?: string | null
        rawText: string
        normalizedText: string
        metadata?: JsonObject
    }): StoredRawSignal {
        const createdAt = nowIso()
        const id = randomUUID()
        const channel = input.channel?.trim() || null
        const metadataJson = stringifyJson(input.metadata)

        const stmt = this.db.prepare(`
            insert into raw_signals (id, signal_type, channel, raw_text, normalized_text, metadata_json, created_at)
            values (@id, @signal_type, @channel, @raw_text, @normalized_text, @metadata_json, @created_at)
        `)

        stmt.run({
            id,
            signal_type: input.signalType,
            channel,
            raw_text: input.rawText,
            normalized_text: input.normalizedText,
            metadata_json: metadataJson,
            created_at: createdAt,
        })
        this.maybePrune()

        return {
            id,
            signalType: input.signalType,
            channel,
            rawText: input.rawText,
            normalizedText: input.normalizedText,
            metadata: parseJson(metadataJson),
            createdAt,
        }
    }

    logOcrTrace(rawSignalId: string, trace: OcrTraceInput): StoredOcrTrace {
        const id = randomUUID()
        const createdAt = nowIso()

        const row = {
            id,
            raw_signal_id: rawSignalId,
            merchant: trace.merchant?.trim() || null,
            amount: trace.amount ?? null,
            currency: trace.currency?.trim() || null,
            confidence: trace.confidence ?? null,
            trace_json: stringifyJson(trace.rawPayload),
            created_at: createdAt,
        }

        const stmt = this.db.prepare(`
            insert into ocr_traces (id, raw_signal_id, merchant, amount, currency, confidence, trace_json, created_at)
            values (@id, @raw_signal_id, @merchant, @amount, @currency, @confidence, @trace_json, @created_at)
        `)
        stmt.run(row)
        this.maybePrune()

        return {
            id: row.id,
            rawSignalId: row.raw_signal_id,
            merchant: row.merchant,
            amount: row.amount,
            currency: row.currency,
            confidence: row.confidence,
            trace: parseJson(row.trace_json),
            createdAt: row.created_at,
        }
    }

    logHandshake(input: {
        rawSignalId: string
        module: CortexModule
        status: HandshakeStatus
        confidence?: number | null
        payload?: JsonObject
    }): StoredHandshakeEvent {
        const id = randomUUID()
        const createdAt = nowIso()
        const payloadJson = stringifyJson(input.payload)
        const confidence = input.confidence ?? null

        const stmt = this.db.prepare(`
            insert into handshake_events (id, raw_signal_id, module, status, confidence, payload_json, created_at)
            values (@id, @raw_signal_id, @module, @status, @confidence, @payload_json, @created_at)
        `)
        stmt.run({
            id,
            raw_signal_id: input.rawSignalId,
            module: input.module,
            status: input.status,
            confidence,
            payload_json: payloadJson,
            created_at: createdAt,
        })
        this.maybePrune()

        return {
            id,
            rawSignalId: input.rawSignalId,
            module: input.module,
            status: input.status,
            confidence,
            payload: parseJson(payloadJson),
            createdAt,
        }
    }

    logTaskDraft(input: {
        rawSignalId: string
        module: CortexReflexModule
        status?: TaskDraftStatus
        draft: JsonObject
    }): StoredTaskDraft {
        const id = randomUUID()
        const createdAt = nowIso()
        const updatedAt = createdAt
        const status = input.status ?? 'pending'
        const draftJson = stringifyJson(input.draft)

        const stmt = this.db.prepare(`
            insert into task_drafts (id, raw_signal_id, module, status, draft_json, created_at, updated_at)
            values (@id, @raw_signal_id, @module, @status, @draft_json, @created_at, @updated_at)
        `)
        stmt.run({
            id,
            raw_signal_id: input.rawSignalId,
            module: input.module,
            status,
            draft_json: draftJson,
            created_at: createdAt,
            updated_at: updatedAt,
        })
        this.maybePrune()

        return {
            id,
            rawSignalId: input.rawSignalId,
            module: input.module,
            status,
            draft: parseJson(draftJson),
            createdAt,
            updatedAt,
        }
    }

    updateTaskDraftStatus(taskDraftId: string, status: TaskDraftStatus, draft?: JsonObject): StoredTaskDraft | null {
        const updatedAt = nowIso()

        if (draft) {
            const stmt = this.db.prepare(`
                update task_drafts
                set status = @status, draft_json = @draft_json, updated_at = @updated_at
                where id = @id
            `)
            stmt.run({
                id: taskDraftId,
                status,
                draft_json: stringifyJson(draft),
                updated_at: updatedAt,
            })
        } else {
            const stmt = this.db.prepare(`
                update task_drafts
                set status = @status, updated_at = @updated_at
                where id = @id
            `)
            stmt.run({
                id: taskDraftId,
                status,
                updated_at: updatedAt,
            })
        }

        const row = this.db.prepare(`
            select id, raw_signal_id, module, status, draft_json, created_at, updated_at
            from task_drafts
            where id = ?
            limit 1
        `).get(taskDraftId) as {
            id: string
            raw_signal_id: string
            module: CortexReflexModule
            status: TaskDraftStatus
            draft_json: string
            created_at: string
            updated_at: string
        } | undefined

        if (!row) return null
        return {
            id: row.id,
            rawSignalId: row.raw_signal_id,
            module: row.module,
            status: row.status,
            draft: parseJson(row.draft_json),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }
    }

    getPendingHandshakes(limit = 20): StoredHandshakeEvent[] {
        const safeLimit = Math.max(1, Math.min(200, Math.round(limit)))
        const rows = this.db.prepare(`
            select id, raw_signal_id, module, status, confidence, payload_json, created_at
            from handshake_events
            where status = 'pending_confirmation'
            order by created_at desc
            limit ?
        `).all(safeLimit) as Array<{
            id: string
            raw_signal_id: string
            module: CortexModule
            status: HandshakeStatus
            confidence: number | null
            payload_json: string
            created_at: string
        }>

        return rows.map((row) => ({
            id: row.id,
            rawSignalId: row.raw_signal_id,
            module: row.module,
            status: row.status,
            confidence: row.confidence,
            payload: parseJson(row.payload_json),
            createdAt: row.created_at,
        }))
    }

    putDailyBriefing(input: DailyBriefingCacheInput): StoredDailyBriefing {
        const stmt = this.db.prepare(`
            insert into daily_briefings (user_id, briefing_date, generated_at, expires_at, payload_json)
            values (@user_id, @briefing_date, @generated_at, @expires_at, @payload_json)
            on conflict(user_id, briefing_date) do update set
                generated_at = excluded.generated_at,
                expires_at = excluded.expires_at,
                payload_json = excluded.payload_json
        `)
        stmt.run({
            user_id: input.userId,
            briefing_date: input.briefingDate,
            generated_at: input.generatedAt,
            expires_at: input.expiresAt,
            payload_json: stringifyJson(input.payload as unknown as JsonObject),
        })
        this.maybePrune()

        return {
            userId: input.userId,
            briefingDate: input.briefingDate,
            generatedAt: input.generatedAt,
            expiresAt: input.expiresAt,
            payload: input.payload,
        }
    }

    getDailyBriefing(userId: string, briefingDate: string): StoredDailyBriefing | null {
        const row = this.db.prepare(`
            select user_id, briefing_date, generated_at, expires_at, payload_json
            from daily_briefings
            where user_id = ?
              and briefing_date = ?
            limit 1
        `).get(userId, briefingDate) as {
            user_id: string
            briefing_date: string
            generated_at: string
            expires_at: string
            payload_json: string
        } | undefined

        if (!row) return null
        const payload = parseJson(row.payload_json)
        return {
            userId: row.user_id,
            briefingDate: row.briefing_date,
            generatedAt: row.generated_at,
            expiresAt: row.expires_at,
            payload: payload as unknown as StoredDailyBriefing['payload'],
        }
    }

    upsertProactiveAlerts(alerts: ProactiveAlertInput[]): ProactiveAlert[] {
        if (alerts.length === 0) return []

        const rows: ProactiveAlert[] = []
        const now = nowIso()
        const upsert = this.db.prepare(`
            insert into proactive_alerts (
                id,
                dedupe_key,
                user_id,
                kind,
                status,
                module,
                title,
                message,
                payload_json,
                created_at,
                expires_at
            )
            values (
                @id,
                @dedupe_key,
                @user_id,
                @kind,
                @status,
                @module,
                @title,
                @message,
                @payload_json,
                @created_at,
                @expires_at
            )
            on conflict(dedupe_key) do update set
                status = excluded.status,
                module = excluded.module,
                title = excluded.title,
                message = excluded.message,
                payload_json = excluded.payload_json,
                expires_at = excluded.expires_at
        `)
        const selectByKey = this.db.prepare(`
            select id, user_id, kind, status, module, title, message, payload_json, created_at, expires_at
            from proactive_alerts
            where dedupe_key = ?
            limit 1
        `)

        for (const alert of alerts) {
            const id = randomUUID()
            upsert.run({
                id,
                dedupe_key: alert.dedupeKey,
                user_id: alert.userId,
                kind: alert.kind,
                status: alert.status,
                module: alert.module,
                title: alert.title,
                message: alert.message,
                payload_json: stringifyJson(alert.payload),
                created_at: now,
                expires_at: alert.expiresAt ?? null,
            })
            const row = selectByKey.get(alert.dedupeKey) as {
                id: string
                user_id: string
                kind: ProactiveAlertKind
                status: ProactiveAlertStatus
                module: CortexReflexModule
                title: string
                message: string
                payload_json: string
                created_at: string
                expires_at: string | null
            } | undefined
            if (!row) continue
            rows.push({
                id: row.id,
                userId: row.user_id,
                kind: row.kind,
                status: row.status,
                module: row.module,
                title: row.title,
                message: row.message,
                payload: parseJson(row.payload_json),
                createdAt: row.created_at,
                expiresAt: row.expires_at,
            })
        }

        this.maybePrune()
        return rows
    }

    listPendingProactiveAlerts(userId: string, limit = 20): ProactiveAlert[] {
        const safeLimit = Math.max(1, Math.min(200, Math.round(limit)))
        const now = nowIso()
        const rows = this.db.prepare(`
            select id, user_id, kind, status, module, title, message, payload_json, created_at, expires_at
            from proactive_alerts
            where user_id = ?
              and status = 'pending'
              and (expires_at is null or expires_at >= ?)
            order by created_at desc
            limit ?
        `).all(userId, now, safeLimit) as Array<{
            id: string
            user_id: string
            kind: ProactiveAlertKind
            status: ProactiveAlertStatus
            module: CortexReflexModule
            title: string
            message: string
            payload_json: string
            created_at: string
            expires_at: string | null
        }>

        return rows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            kind: row.kind,
            status: row.status,
            module: row.module,
            title: row.title,
            message: row.message,
            payload: parseJson(row.payload_json),
            createdAt: row.created_at,
            expiresAt: row.expires_at,
        }))
    }

    markProactiveAlertsStatus(ids: string[], status: ProactiveAlertStatus): number {
        if (ids.length === 0) return 0
        const stmt = this.db.prepare(`
            update proactive_alerts
            set status = @status
            where id = @id
        `)
        let updated = 0
        for (const id of ids) {
            updated += stmt.run({ id, status }).changes
        }
        return updated
    }

    getRawSignalById(rawSignalId: string): StoredRawSignal | null {
        const stmt = this.db.prepare(`
            select id, signal_type, channel, raw_text, normalized_text, metadata_json, created_at
            from raw_signals
            where id = ?
            limit 1
        `)
        const row = stmt.get(rawSignalId) as {
            id: string
            signal_type: CortexSignalType
            channel: string | null
            raw_text: string
            normalized_text: string
            metadata_json: string
            created_at: string
        } | undefined

        if (!row) return null
        return {
            id: row.id,
            signalType: row.signal_type,
            channel: row.channel,
            rawText: row.raw_text,
            normalizedText: row.normalized_text,
            metadata: parseJson(row.metadata_json),
            createdAt: row.created_at,
        }
    }

    getRecentGroundTruth(options?: {
        rawLimit?: number
        ocrLimit?: number
        handshakeLimit?: number
    }): LedgerGroundTruthSnapshot {
        const rawLimit = Math.max(1, options?.rawLimit ?? 12)
        const ocrLimit = Math.max(1, options?.ocrLimit ?? 12)
        const handshakeLimit = Math.max(1, options?.handshakeLimit ?? 12)

        const rawRows = this.db.prepare(`
            select id, signal_type, channel, raw_text, normalized_text, metadata_json, created_at
            from raw_signals
            order by created_at desc
            limit ?
        `).all(rawLimit) as Array<{
            id: string
            signal_type: CortexSignalType
            channel: string | null
            raw_text: string
            normalized_text: string
            metadata_json: string
            created_at: string
        }>

        const ocrRows = this.db.prepare(`
            select id, raw_signal_id, merchant, amount, currency, confidence, trace_json, created_at
            from ocr_traces
            order by created_at desc
            limit ?
        `).all(ocrLimit) as Array<{
            id: string
            raw_signal_id: string
            merchant: string | null
            amount: number | null
            currency: string | null
            confidence: number | null
            trace_json: string
            created_at: string
        }>

        const handshakeRows = this.db.prepare(`
            select id, raw_signal_id, module, status, confidence, payload_json, created_at
            from handshake_events
            order by created_at desc
            limit ?
        `).all(handshakeLimit) as Array<{
            id: string
            raw_signal_id: string
            module: CortexModule
            status: HandshakeStatus
            confidence: number | null
            payload_json: string
            created_at: string
        }>

        return {
            rawSignals: rawRows.map((row) => ({
                id: row.id,
                signalType: row.signal_type,
                channel: row.channel,
                rawText: row.raw_text,
                normalizedText: row.normalized_text,
                metadata: parseJson(row.metadata_json),
                createdAt: row.created_at,
            })),
            ocrTraces: ocrRows.map((row) => ({
                id: row.id,
                rawSignalId: row.raw_signal_id,
                merchant: row.merchant,
                amount: row.amount,
                currency: row.currency,
                confidence: row.confidence,
                trace: parseJson(row.trace_json),
                createdAt: row.created_at,
            })),
            handshakes: handshakeRows.map((row) => ({
                id: row.id,
                rawSignalId: row.raw_signal_id,
                module: row.module,
                status: row.status,
                confidence: row.confidence,
                payload: parseJson(row.payload_json),
                createdAt: row.created_at,
            })),
        }
    }

    pruneOldRows(retentionDays = this.retentionDays): {
        cutoffIso: string
        deletedTaskDrafts: number
        deletedOcrTraces: number
        deletedHandshakeEvents: number
        deletedRawSignals: number
        deletedDailyBriefings: number
        deletedProactiveAlerts: number
    } {
        const safeRetentionDays = Math.max(7, Math.round(retentionDays))
        const cutoffDate = new Date(Date.now() - (safeRetentionDays * 24 * 60 * 60 * 1000))
        const cutoffIso = cutoffDate.toISOString()
        const now = nowIso()

        const deleteTaskDrafts = this.db.prepare(`
            delete from task_drafts
            where created_at < ?
        `).run(cutoffIso).changes

        const deleteOcrTraces = this.db.prepare(`
            delete from ocr_traces
            where created_at < ?
        `).run(cutoffIso).changes

        const deleteHandshakes = this.db.prepare(`
            delete from handshake_events
            where created_at < ?
        `).run(cutoffIso).changes

        const deleteRawSignals = this.db.prepare(`
            delete from raw_signals
            where created_at < ?
        `).run(cutoffIso).changes

        const deleteBriefings = this.db.prepare(`
            delete from daily_briefings
            where expires_at < ?
               or generated_at < ?
        `).run(now, cutoffIso).changes

        const deleteAlerts = this.db.prepare(`
            delete from proactive_alerts
            where (expires_at is not null and expires_at < ?)
               or created_at < ?
        `).run(now, cutoffIso).changes

        // defensive cleanup in case old rows stayed orphaned from previous schema revisions
        this.db.prepare(`
            delete from ocr_traces
            where raw_signal_id not in (select id from raw_signals)
        `).run()
        this.db.prepare(`
            delete from handshake_events
            where raw_signal_id not in (select id from raw_signals)
        `).run()
        this.db.prepare(`
            delete from task_drafts
            where raw_signal_id not in (select id from raw_signals)
        `).run()

        return {
            cutoffIso,
            deletedTaskDrafts: deleteTaskDrafts,
            deletedOcrTraces: deleteOcrTraces,
            deletedHandshakeEvents: deleteHandshakes,
            deletedRawSignals: deleteRawSignals,
            deletedDailyBriefings: deleteBriefings,
            deletedProactiveAlerts: deleteAlerts,
        }
    }
}
