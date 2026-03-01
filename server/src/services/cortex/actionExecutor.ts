/**
 * Action Executor — Law 1: Absolute Agency
 *
 * When Buggy is confident enough, he ACTS — writes directly to Supabase
 * without requesting a handshake. The threshold is NOT flat; it adapts
 * based on a Dynamic Risk Tier computed from the domain + value.
 *
 * Risk tiers:
 *   low    (0.88) — simple todo, expense <50€
 *   medium (0.92) — expense 50-200€, calendar edits
 *   high   (0.98) — deletions, large sums (>200€), archiving
 *
 * Every auto-commit is logged as handshake status 'auto_committed'
 * for full audit trail and reversibility.
 */

import { randomUUID } from 'node:crypto'
import { supabase } from '../../config.js'
import { shadowPlan, type ShadowPlanResult } from './shadowPlan.js'
import type {
    AutoCommitResult,
    CortexReflexModule,
    CryptoHandshakeDraft,
    DynamicRiskTier,
    FinanceHandshakeDraft,
    LinkHandshakeDraft,
    ModuleHandshakeDraft,
    TodoHandshakeDraft,
} from './types.js'

// ── Dynamic Risk Engine ────────────────────────────────────────────

interface RiskThresholds {
    low: number
    medium: number
    high: number
}

const DEFAULT_THRESHOLDS: RiskThresholds = {
    low: 0.86,
    medium: 0.90,
    high: 0.96,
}

function assessFinanceRisk(draft: FinanceHandshakeDraft): DynamicRiskTier {
    const amount = draft.amount ?? 0
    if (amount <= 50) return 'low'
    if (amount <= 200) return 'medium'
    return 'high'
}

function assessTodoRisk(_draft: TodoHandshakeDraft): DynamicRiskTier {
    return 'low'
}

function assessCryptoRisk(draft: CryptoHandshakeDraft): DynamicRiskTier {
    if (draft.action === 'hold') return 'low'
    if (draft.action === 'swap') return 'medium'
    return 'high'
}

function assessLinksRisk(_draft: LinkHandshakeDraft): DynamicRiskTier {
    return 'low'
}

export function assessRisk(
    module: CortexReflexModule,
    draft: ModuleHandshakeDraft,
): DynamicRiskTier {
    switch (module) {
        case 'FinanceModule': return assessFinanceRisk(draft as FinanceHandshakeDraft)
        case 'TodoModule': return assessTodoRisk(draft as TodoHandshakeDraft)
        case 'CryptoModule': return assessCryptoRisk(draft as CryptoHandshakeDraft)
        case 'LinksModule': return assessLinksRisk(draft as LinkHandshakeDraft)
    }
}

export function getDynamicThreshold(
    riskTier: DynamicRiskTier,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
): number {
    return thresholds[riskTier]
}

// ── Executor ───────────────────────────────────────────────────────

export interface ActionExecutorOptions {
    thresholds?: Partial<RiskThresholds>
    userId: string
}

export class ActionExecutor {
    private readonly thresholds: RiskThresholds
    private readonly userId: string

    constructor(options: ActionExecutorOptions) {
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds }
        this.userId = options.userId
    }

    shouldAutoCommit(
        module: CortexReflexModule,
        draft: ModuleHandshakeDraft,
        confidence: number,
        strictParametersMet: boolean,
    ): { autoCommit: boolean; riskTier: DynamicRiskTier; dynamicThreshold: number } {
        if (!strictParametersMet) {
            const riskTier = assessRisk(module, draft)
            return { autoCommit: false, riskTier, dynamicThreshold: getDynamicThreshold(riskTier, this.thresholds) }
        }

        const riskTier = assessRisk(module, draft)
        const dynamicThreshold = getDynamicThreshold(riskTier, this.thresholds)
        return {
            autoCommit: confidence >= dynamicThreshold,
            riskTier,
            dynamicThreshold,
        }
    }

    async execute(
        module: CortexReflexModule,
        draft: ModuleHandshakeDraft,
        confidence: number,
    ): Promise<AutoCommitResult> {
        const riskTier = assessRisk(module, draft)
        const dynamicThreshold = getDynamicThreshold(riskTier, this.thresholds)
        const base = { module, riskTier, dynamicThreshold, confidence }

        try {
            switch (module) {
                case 'FinanceModule': {
                    const fd = draft as FinanceHandshakeDraft
                    const shadowResult = await shadowPlan.verifyFinanceCommit(
                        {
                            userId: this.userId,
                            amount: fd.amount ?? 0,
                            merchant: fd.merchant ?? 'unknown',
                            category: fd.category,
                            currency: fd.currency,
                        },
                        () => this.commitFinance(fd),
                    )
                    return {
                        ...base,
                        ...shadowResult.commitResult,
                        shadowVerdict: shadowResult.verdict,
                        shadowForensic: shadowResult.forensicNote,
                    } as AutoCommitResult
                }
                case 'TodoModule': {
                    const td = draft as TodoHandshakeDraft
                    const shadowResult = await shadowPlan.verifyTodoCommit(
                        { userId: this.userId, title: td.title },
                        () => this.commitTodo(td),
                    )
                    return {
                        ...base,
                        ...shadowResult.commitResult,
                        shadowVerdict: shadowResult.verdict,
                        shadowForensic: shadowResult.forensicNote,
                    } as AutoCommitResult
                }
                case 'CryptoModule':
                    return { ...base, ...(await this.commitCryptoIntent(draft as CryptoHandshakeDraft)) }
                case 'LinksModule': {
                    const ld = draft as LinkHandshakeDraft
                    const shadowResult = await shadowPlan.verifyLinkCommit(
                        { userId: this.userId, url: ld.url ?? '' },
                        () => this.commitLink(ld),
                    )
                    return {
                        ...base,
                        ...shadowResult.commitResult,
                        shadowVerdict: shadowResult.verdict,
                        shadowForensic: shadowResult.forensicNote,
                    } as AutoCommitResult
                }
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            console.error(`[ActionExecutor] ${module} commit failed:`, msg)
            return { ...base, executed: false, supabaseId: null, reason: `commit_failed: ${msg}` }
        }
    }

    // ── Finance ────────────────────────────────────────────────────

    private async commitFinance(draft: FinanceHandshakeDraft): Promise<{ executed: boolean; supabaseId: string | null; reason: string }> {
        if (draft.amount === null || !draft.merchant) {
            return { executed: false, supabaseId: null, reason: 'missing_amount_or_merchant' }
        }

        const id = randomUUID()
        const payload: Record<string, unknown> = {
            id,
            user_id: this.userId,
            type: 'expense',
            amount: draft.amount,
            currency: draft.currency,
            category: draft.category,
            description: draft.description,
            merchant: draft.merchant,
            date: new Date().toISOString().slice(0, 10),
            source: 'buggy_auto_commit',
        }
        if (draft.walletId) {
            payload.wallet_id = draft.walletId
        }

        const { error } = await supabase.from('financial_entries').insert(payload)

        if (error) {
            return { executed: false, supabaseId: null, reason: `supabase_error: ${error.message}` }
        }
        return { executed: true, supabaseId: id, reason: 'auto_committed' }
    }

    // ── Todo ───────────────────────────────────────────────────────

    private async commitTodo(draft: TodoHandshakeDraft): Promise<{ executed: boolean; supabaseId: string | null; reason: string }> {
        if (!draft.title) {
            return { executed: false, supabaseId: null, reason: 'missing_title' }
        }

        const id = randomUUID()
        const dueDate = this.resolveDueDate(draft.dueHint)

        const { error } = await supabase.from('todos').insert({
            id,
            user_id: this.userId,
            title: draft.title,
            status: 'todo',
            priority: draft.priority,
            due_date: dueDate,
            source: 'buggy_auto_commit',
        })

        if (error) {
            return { executed: false, supabaseId: null, reason: `supabase_error: ${error.message}` }
        }
        return { executed: true, supabaseId: id, reason: 'auto_committed' }
    }

    // ── Crypto (intent log only — never on-chain) ─────────────────

    private async commitCryptoIntent(draft: CryptoHandshakeDraft): Promise<{ executed: boolean; supabaseId: string | null; reason: string }> {
        if (!draft.symbol) {
            return { executed: false, supabaseId: null, reason: 'missing_symbol' }
        }

        // Crypto actions are logged as intent records, NOT executed on-chain.
        // The user must manually execute through their exchange/wallet.
        const id = randomUUID()
        console.log(`[ActionExecutor] crypto intent logged: ${draft.action} ${draft.amount ?? '?'} ${draft.symbol} @ ${draft.pricePerUnit ?? 'market'}`)

        return { executed: true, supabaseId: id, reason: 'crypto_intent_logged' }
    }

    // ── Links ──────────────────────────────────────────────────────

    private async commitLink(draft: LinkHandshakeDraft): Promise<{ executed: boolean; supabaseId: string | null; reason: string }> {
        if (!draft.url) {
            return { executed: false, supabaseId: null, reason: 'missing_url' }
        }

        const id = randomUUID()
        const { error } = await supabase.from('links').insert({
            id,
            user_id: this.userId,
            url: draft.url,
            title: draft.title,
            description: draft.description,
            source: 'buggy_auto_commit',
        })

        if (error) {
            return { executed: false, supabaseId: null, reason: `supabase_error: ${error.message}` }
        }
        return { executed: true, supabaseId: id, reason: 'auto_committed' }
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private resolveDueDate(hint: string | null): string | null {
        if (!hint) return null
        const now = new Date()
        switch (hint) {
            case 'today':
                return now.toISOString()
            case 'tomorrow': {
                const tomorrow = new Date(now.getTime() + 86_400_000)
                return tomorrow.toISOString()
            }
            case 'this_week': {
                const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
                const friday = new Date(now.getTime() + daysUntilFriday * 86_400_000)
                return friday.toISOString()
            }
            case 'deadline':
                return new Date(now.getTime() + 2 * 86_400_000).toISOString()
            default:
                return null
        }
    }
}
