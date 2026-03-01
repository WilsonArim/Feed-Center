import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { SubconsciousLedger } from '../subconsciousLedger.js'

const tempDirs: string[] = []

function createLedgerFixture() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-cortex-ledger-'))
    tempDirs.push(tempDir)
    const dbPath = path.join(tempDir, 'subconscious-ledger.sqlite')
    const ledger = new SubconsciousLedger({
        dbPath,
        pruneIntervalMs: Number.MAX_SAFE_INTEGER,
    })
    return { ledger, dbPath }
}

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

describe('SubconsciousLedger', () => {
    it('stores task drafts and updates status lifecycle', () => {
        const { ledger } = createLedgerFixture()
        const signal = ledger.logRawInput({
            signalType: 'voice',
            rawText: 'lembra-me de ligar ao seguro',
            normalizedText: 'lembra me de ligar ao seguro',
        })

        const draft = ledger.logTaskDraft({
            rawSignalId: signal.id,
            module: 'TodoModule',
            draft: {
                title: 'ligar ao seguro',
                priority: 'high',
            },
        })

        assert.equal(draft.status, 'pending')
        assert.equal(draft.module, 'TodoModule')
        assert.equal(draft.rawSignalId, signal.id)
        assert.equal(draft.draft.title, 'ligar ao seguro')

        const updated = ledger.updateTaskDraftStatus(draft.id, 'confirmed', {
            title: 'ligar ao seguro da carrinha',
            priority: 'high',
        })

        assert.ok(updated)
        assert.equal(updated?.status, 'confirmed')
        assert.equal(updated?.draft.title, 'ligar ao seguro da carrinha')
    })

    it('returns only pending handshakes for briefing collection', () => {
        const { ledger } = createLedgerFixture()
        const signal = ledger.logRawInput({
            signalType: 'text',
            rawText: 'fatura continente 45 eur',
            normalizedText: 'fatura continente 45 eur',
        })

        ledger.logHandshake({
            rawSignalId: signal.id,
            module: 'FinanceModule',
            status: 'approved',
            confidence: 0.92,
            payload: { amount: 45 },
        })
        const pending = ledger.logHandshake({
            rawSignalId: signal.id,
            module: 'FinanceModule',
            status: 'pending_confirmation',
            confidence: 0.84,
            payload: { amount: 45, merchant: 'continente' },
        })

        const pendingRows = ledger.getPendingHandshakes(8)
        assert.equal(pendingRows.length, 1)
        assert.equal(pendingRows[0]?.id, pending.id)
        assert.equal(pendingRows[0]?.status, 'pending_confirmation')
    })

    it('prunes old rows across cortex tables with TTL retention', () => {
        const { ledger, dbPath } = createLedgerFixture()

        const signal = ledger.logRawInput({
            signalType: 'ocr',
            rawText: 'recibo pingo doce',
            normalizedText: 'recibo pingo doce',
        })

        ledger.logOcrTrace(signal.id, {
            merchant: 'Pingo Doce',
            amount: 23.40,
            currency: 'EUR',
            confidence: 0.91,
        })
        ledger.logHandshake({
            rawSignalId: signal.id,
            module: 'FinanceModule',
            status: 'pending_confirmation',
            confidence: 0.8,
            payload: { amount: 23.4 },
        })
        ledger.logTaskDraft({
            rawSignalId: signal.id,
            module: 'FinanceModule',
            draft: { merchant: 'Pingo Doce', amount: 23.4 },
        })

        const oldIso = new Date(Date.now() - (120 * 24 * 60 * 60 * 1000)).toISOString()
        const db = new Database(dbPath)
        db.prepare(`update raw_signals set created_at = ?`).run(oldIso)
        db.prepare(`update ocr_traces set created_at = ?`).run(oldIso)
        db.prepare(`update handshake_events set created_at = ?`).run(oldIso)
        db.prepare(`update task_drafts set created_at = ?, updated_at = ?`).run(oldIso, oldIso)
        db.close()

        const pruned = ledger.pruneOldRows(90)
        assert.equal(pruned.deletedRawSignals, 1)
        assert.equal(pruned.deletedOcrTraces, 1)
        assert.equal(pruned.deletedHandshakeEvents, 1)
        assert.equal(pruned.deletedTaskDrafts, 1)

        const snapshot = ledger.getRecentGroundTruth({
            rawLimit: 8,
            ocrLimit: 8,
            handshakeLimit: 8,
        })
        assert.equal(snapshot.rawSignals.length, 0)
        assert.equal(snapshot.ocrTraces.length, 0)
        assert.equal(snapshot.handshakes.length, 0)
    })

    it('stores and retrieves daily briefing cache', () => {
        const { ledger } = createLedgerFixture()
        const generatedAt = new Date().toISOString()
        const briefingDate = generatedAt.slice(0, 10)
        const expiresAt = `${briefingDate}T23:59:59.999Z`

        ledger.putDailyBriefing({
            userId: 'user-1',
            briefingDate,
            generatedAt,
            expiresAt,
            payload: {
                userId: 'user-1',
                briefingDate,
                generatedAt,
                overdueTasks: 2,
                pendingHandshakes: 1,
                yesterday: { income: 120, expenses: 80, balance: 40 },
                topPriorities: [
                    {
                        title: 'Fechar tarefas críticas',
                        description: 'Resolver 1 tarefa urgente',
                        module: 'TodoModule',
                        severity: 'high',
                    },
                ],
            },
        })

        const cached = ledger.getDailyBriefing('user-1', briefingDate)
        assert.ok(cached)
        assert.equal(cached?.payload.overdueTasks, 2)
        assert.equal(cached?.payload.topPriorities[0]?.module, 'TodoModule')
    })

    it('upserts proactive alerts and marks them as delivered', () => {
        const { ledger } = createLedgerFixture()

        const stored = ledger.upsertProactiveAlerts([
            {
                userId: 'user-2',
                kind: 'deadline_24h',
                status: 'pending',
                module: 'TodoModule',
                title: 'Deadline nas próximas 24h',
                message: 'A tarefa vence hoje à noite.',
                payload: { todoId: 'todo-1' },
                expiresAt: null,
                dedupeKey: 'deadline:user-2:todo-1',
            },
        ])
        assert.equal(stored.length, 1)

        const pending = ledger.listPendingProactiveAlerts('user-2', 8)
        assert.equal(pending.length, 1)
        assert.equal(pending[0]?.kind, 'deadline_24h')

        const changed = ledger.markProactiveAlertsStatus([pending[0]!.id], 'delivered')
        assert.equal(changed, 1)

        const after = ledger.listPendingProactiveAlerts('user-2', 8)
        assert.equal(after.length, 0)
    })
})
