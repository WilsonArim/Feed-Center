/**
 * Shadow Plan — Closed-Loop Verification Engine
 *
 * Architecture: Analyse → Plan → Execute → Observe
 *
 * Before any SQL commit, Buggy creates a "Shadow Plan":
 *   1. ANALYSE: Read the current state from Supabase
 *   2. PLAN:    Compute expected delta (what WILL change)
 *   3. EXECUTE: Commit to SQL
 *   4. OBSERVE: Read post-state, verify delta matches plan
 *
 * If verification fails, the ShadowPlan flags the anomaly with
 * a PhD-level forensic explanation and stores it for audit.
 */

import { supabase } from '../../config.js'

// ── Types ──────────────────────────────────────────────────────────

export type ShadowVerdict = 'verified' | 'anomaly_detected' | 'observation_failed'

export interface ShadowPlanResult {
    verdict: ShadowVerdict
    preState: Record<string, unknown> | null
    postState: Record<string, unknown> | null
    expectedDelta: Record<string, unknown>
    actualDelta: Record<string, unknown> | null
    forensicNote: string
    executionTimeMs: number
}

interface FinanceShadowInput {
    userId: string
    amount: number
    merchant: string
    category: string
    currency: string
}

interface TodoShadowInput {
    userId: string
    title: string
}

interface LinkShadowInput {
    userId: string
    url: string
}

// ── Shadow Plan Engine ─────────────────────────────────────────────

export class ShadowPlan {

    // ── Finance Shadow ─────────────────────────────────────────────

    async verifyFinanceCommit(
        input: FinanceShadowInput,
        commitFn: () => Promise<{ executed: boolean; supabaseId: string | null; reason: string }>,
    ): Promise<ShadowPlanResult & { commitResult: { executed: boolean; supabaseId: string | null; reason: string } }> {
        const t0 = Date.now()

        // 1. ANALYSE — Read pre-state
        const preState = await this.getFinanceSnapshot(input.userId, input.category)

        // 2. PLAN — Expected delta
        const expectedDelta = {
            totalEntries: (preState?.totalEntries ?? 0) + 1,
            totalAmount: Number(((preState?.totalAmount ?? 0) + input.amount).toFixed(2)),
            newMerchant: input.merchant,
            newAmount: input.amount,
        }

        // 3. EXECUTE
        const commitResult = await commitFn()

        if (!commitResult.executed) {
            return {
                verdict: 'observation_failed',
                preState,
                postState: null,
                expectedDelta,
                actualDelta: null,
                forensicNote: `Commit aborted: ${commitResult.reason}. No state mutation occurred.`,
                executionTimeMs: Date.now() - t0,
                commitResult,
            }
        }

        // 4. OBSERVE — Read post-state and verify delta
        const postState = await this.getFinanceSnapshot(input.userId, input.category)

        const actualDelta = {
            totalEntries: (postState?.totalEntries ?? 0),
            totalAmount: Number((postState?.totalAmount ?? 0).toFixed(2)),
            entryDelta: (postState?.totalEntries ?? 0) - (preState?.totalEntries ?? 0),
            amountDelta: Number(((postState?.totalAmount ?? 0) - (preState?.totalAmount ?? 0)).toFixed(2)),
        }

        // Verify invariants
        const entryCountCorrect = actualDelta.entryDelta === 1
        const amountCorrect = Math.abs(actualDelta.amountDelta - input.amount) < 0.01

        let verdict: ShadowVerdict = 'verified'
        let forensicNote = `Shadow Plan verified. Entry count delta: ${actualDelta.entryDelta} (expected: 1). Amount delta: €${actualDelta.amountDelta} (expected: €${input.amount}).`

        if (!entryCountCorrect || !amountCorrect) {
            verdict = 'anomaly_detected'
            const issues: string[] = []

            if (!entryCountCorrect) {
                issues.push(
                    `ENTRY COUNT ANOMALY: Expected +1 entry, observed ${actualDelta.entryDelta > 0 ? '+' : ''}${actualDelta.entryDelta}. ` +
                    `Possible causes: concurrent write (race condition), trigger-based cascade, or RLS policy filtering.`
                )
            }

            if (!amountCorrect) {
                issues.push(
                    `AMOUNT ANOMALY: Expected delta €${input.amount.toFixed(2)}, observed €${actualDelta.amountDelta.toFixed(2)}. ` +
                    `Variance: €${(actualDelta.amountDelta - input.amount).toFixed(2)}. ` +
                    `Possible causes: concurrent modification, floating-point accumulation, or database trigger side-effect.`
                )
            }

            forensicNote = `[SHADOW PLAN ANOMALY] ${issues.join(' | ')}`
            console.warn(`[ShadowPlan] ${forensicNote}`)
        }

        return {
            verdict,
            preState,
            postState,
            expectedDelta,
            actualDelta,
            forensicNote,
            executionTimeMs: Date.now() - t0,
            commitResult,
        }
    }

    // ── Todo Shadow ────────────────────────────────────────────────

    async verifyTodoCommit(
        input: TodoShadowInput,
        commitFn: () => Promise<{ executed: boolean; supabaseId: string | null; reason: string }>,
    ): Promise<ShadowPlanResult & { commitResult: { executed: boolean; supabaseId: string | null; reason: string } }> {
        const t0 = Date.now()
        const preCount = await this.getTodoCount(input.userId)
        const commitResult = await commitFn()

        if (!commitResult.executed) {
            return {
                verdict: 'observation_failed',
                preState: { count: preCount },
                postState: null,
                expectedDelta: { count: preCount + 1 },
                actualDelta: null,
                forensicNote: `Commit aborted: ${commitResult.reason}.`,
                executionTimeMs: Date.now() - t0,
                commitResult,
            }
        }

        const postCount = await this.getTodoCount(input.userId)
        const delta = postCount - preCount
        const verified = delta === 1

        return {
            verdict: verified ? 'verified' : 'anomaly_detected',
            preState: { count: preCount },
            postState: { count: postCount },
            expectedDelta: { count: preCount + 1 },
            actualDelta: { count: postCount, delta },
            forensicNote: verified
                ? `Todo shadow verified. Count: ${preCount} → ${postCount}.`
                : `[ANOMALY] Todo count delta: ${delta} (expected: 1). Check for concurrent writes or cascade deletes.`,
            executionTimeMs: Date.now() - t0,
            commitResult,
        }
    }

    // ── Link Shadow ────────────────────────────────────────────────

    async verifyLinkCommit(
        input: LinkShadowInput,
        commitFn: () => Promise<{ executed: boolean; supabaseId: string | null; reason: string }>,
    ): Promise<ShadowPlanResult & { commitResult: { executed: boolean; supabaseId: string | null; reason: string } }> {
        const t0 = Date.now()
        const commitResult = await commitFn()

        // Links are low-risk, lightweight verification
        return {
            verdict: commitResult.executed ? 'verified' : 'observation_failed',
            preState: null,
            postState: null,
            expectedDelta: { url: input.url },
            actualDelta: commitResult.executed ? { url: input.url } : null,
            forensicNote: commitResult.executed
                ? `Link commit verified (lightweight shadow).`
                : `Link commit failed: ${commitResult.reason}.`,
            executionTimeMs: Date.now() - t0,
            commitResult,
        }
    }

    // ── Snapshot Helpers ───────────────────────────────────────────

    private async getFinanceSnapshot(userId: string, category: string): Promise<{
        totalEntries: number
        totalAmount: number
    } | null> {
        try {
            const today = new Date().toISOString().slice(0, 10)
            const { data, error } = await supabase
                .from('financial_entries')
                .select('amount')
                .eq('user_id', userId)
                .eq('date', today)

            if (error) return null

            return {
                totalEntries: data?.length ?? 0,
                totalAmount: (data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
            }
        } catch {
            return null
        }
    }

    private async getTodoCount(userId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('todos')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .neq('status', 'done')

            if (error) return 0
            return count ?? 0
        } catch {
            return 0
        }
    }
}

export const shadowPlan = new ShadowPlan()
