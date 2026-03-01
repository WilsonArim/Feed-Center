/**
 * Sherlock Engine — Law 2: Silent Deduction
 *
 * Cross-domain correlator that runs synchronously on every signal,
 * BEFORE the auto-commit decision. Buggy never asks for context he
 * can deduce from the graph of finances, tasks, calendar, and habits.
 *
 * Deductions:
 *   1. Calendar correlation — expense "flowers" near spouse's anniversary
 *   2. Financial prefill     — todo "pagar renda" → historical avg amount
 *   3. Routine detection     — same merchant ≥3 times at regular intervals
 *   4. Spending velocity     — 7d rolling avg vs 30d avg → anomaly alert
 *
 * Each deduction scored with confidence. Only ≥0.6 persisted.
 */

import { supabase } from '../../config.js'
import type { SovereignProfile } from './sovereignProfile.js'
import type { SynapticWeb } from './synapticWeb.js'
import type {
    CortexReflexModule,
    FinanceHandshakeDraft,
    ModuleHandshakeDraft,
    SherlockDeduction,
    SynapticMemoryInput,
    TodoHandshakeDraft,
} from './types.js'

const MIN_DEDUCTION_CONFIDENCE = 0.6
const CALENDAR_PROXIMITY_DAYS = 7
const ROUTINE_MIN_OCCURRENCES = 3
const VELOCITY_ALERT_RATIO = 1.5

// ── Biographical date check ────────────────────────────────────────

interface BiographicalDate {
    label: string
    date: string       // MM-DD format
    type: 'birthday' | 'anniversary' | 'recurring'
}

function parseBiographicalDates(profile: SovereignProfile): BiographicalDate[] {
    const data = profile.get('biographical_dates')
    if (!data?.dates || !Array.isArray(data.dates)) return []
    return (data.dates as BiographicalDate[]).filter(
        (d) => d.label && d.date && d.type,
    )
}

function isDateWithinProximity(targetMMDD: string, proximityDays: number): boolean {
    const now = new Date()
    const year = now.getFullYear()

    const [mm, dd] = targetMMDD.split('-').map(Number)
    if (!mm || !dd) return false

    const target = new Date(year, mm - 1, dd)
    const diff = Math.abs(target.getTime() - now.getTime())
    const daysDiff = diff / (1000 * 60 * 60 * 24)

    return daysDiff <= proximityDays
}

// ── Gift/occasion keywords ─────────────────────────────────────────

const GIFT_KEYWORDS = [
    'flores', 'flowers', 'prenda', 'presente', 'gift',
    'joias', 'jewelry', 'perfume', 'roupa', 'jantar',
    'restaurante', 'viagem', 'hotel', 'spa',
]

function hasGiftSignal(text: string): boolean {
    const lower = text.toLowerCase()
    return GIFT_KEYWORDS.some((kw) => lower.includes(kw))
}

// ── Financial keywords in todo ─────────────────────────────────────

const FINANCIAL_INTENT_KEYWORDS = [
    'pagar', 'pay', 'comprar', 'buy', 'renovar', 'renew',
    'transferir', 'transfer', 'depositar', 'deposit',
    'subscrever', 'subscribe', 'cancelar fatura',
]

function hasFinancialIntent(text: string): boolean {
    const lower = text.toLowerCase()
    return FINANCIAL_INTENT_KEYWORDS.some((kw) => lower.includes(kw))
}

// ── Main Engine ────────────────────────────────────────────────────

export interface SherlockEngineOptions {
    profile: SovereignProfile
    synapticWeb: SynapticWeb
}

export class SherlockEngine {
    private readonly profile: SovereignProfile
    private readonly synapticWeb: SynapticWeb

    constructor(options: SherlockEngineOptions) {
        this.profile = options.profile
        this.synapticWeb = options.synapticWeb
    }

    /**
     * Run all deductions for a signal. Called BEFORE auto-commit decision.
     * Returns deductions sorted by confidence (highest first).
     */
    async deduce(
        module: CortexReflexModule,
        draft: ModuleHandshakeDraft,
        rawText: string,
        userId: string,
    ): Promise<SherlockDeduction[]> {
        const deductions: SherlockDeduction[] = []

        // 1. Calendar correlation (Finance only)
        if (module === 'FinanceModule') {
            const calDed = this.deduceCalendarCorrelation(draft as FinanceHandshakeDraft, rawText)
            if (calDed) deductions.push(calDed)
        }

        // 2. Financial prefill (Todo only)
        if (module === 'TodoModule') {
            const finDed = await this.deduceFinancialPrefill(draft as TodoHandshakeDraft, userId)
            if (finDed) deductions.push(finDed)
        }

        // 3. Routine detection (Finance only — merchants)
        if (module === 'FinanceModule') {
            const routineDed = await this.deduceRoutine(draft as FinanceHandshakeDraft)
            if (routineDed) deductions.push(routineDed)
        }

        // 4. Spending velocity (Finance only)
        if (module === 'FinanceModule') {
            const velDed = await this.deduceSpendingVelocity(userId)
            if (velDed) deductions.push(velDed)
        }

        return deductions
            .filter((d) => d.deductionConfidence >= MIN_DEDUCTION_CONFIDENCE)
            .sort((a, b) => b.deductionConfidence - a.deductionConfidence)
    }

    /**
     * Persist valid deductions — store memories in SynapticWeb.
     */
    async persistDeductions(deductions: SherlockDeduction[]): Promise<void> {
        for (const ded of deductions) {
            if (ded.memoryToStore) {
                await this.synapticWeb.storeMemory(ded.memoryToStore)
            }
        }
    }

    // ── 1. Calendar Correlation ────────────────────────────────────

    private deduceCalendarCorrelation(
        draft: FinanceHandshakeDraft,
        rawText: string,
    ): SherlockDeduction | null {
        if (!hasGiftSignal(rawText) && !hasGiftSignal(draft.description ?? '')) {
            return null
        }

        const dates = parseBiographicalDates(this.profile)
        if (dates.length === 0) return null

        for (const bd of dates) {
            if (isDateWithinProximity(bd.date, CALENDAR_PROXIMITY_DAYS)) {
                const memory: SynapticMemoryInput = {
                    kind: 'biographical_event',
                    text: `gift_purchase_near_${bd.type}: ${bd.label} (${bd.date}). Merchant: ${draft.merchant ?? 'unknown'}. Amount: ${draft.amount ?? '?'}€`,
                    metadata: {
                        source: 'sherlock_calendar_correlation',
                        biographical_label: bd.label,
                        biographical_type: bd.type,
                        merchant: draft.merchant,
                        amount: draft.amount,
                    },
                }

                return {
                    kind: 'calendar_correlation',
                    deductionConfidence: 0.78,
                    summary: `Despesa possivelmente ligada a ${bd.type}: ${bd.label} (${bd.date}).`,
                    mutations: { context: `${bd.type}_gift`, biographical_ref: bd.label },
                    memoryToStore: memory,
                }
            }
        }

        return null
    }

    // ── 2. Financial Prefill ───────────────────────────────────────

    private async deduceFinancialPrefill(
        draft: TodoHandshakeDraft,
        userId: string,
    ): Promise<SherlockDeduction | null> {
        if (!draft.title || !hasFinancialIntent(draft.title)) return null

        // Extract merchant-like words from the todo title
        const titleWords = draft.title
            .toLowerCase()
            .replace(/\b(pagar|pay|comprar|buy|renovar|renew)\b/gi, '')
            .trim()

        if (!titleWords || titleWords.length < 3) return null

        // Search past financial entries for this merchant/description
        const { data } = await supabase
            .from('financial_entries')
            .select('amount, merchant, category')
            .eq('user_id', userId)
            .or(`merchant.ilike.%${titleWords}%,description.ilike.%${titleWords}%`)
            .order('date', { ascending: false })
            .limit(10)

        if (!data || data.length === 0) return null

        const amounts = data.map((r) => Number(r.amount)).filter(Number.isFinite)
        if (amounts.length === 0) return null

        const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
        const lastMerchant = data[0]?.merchant ?? titleWords
        const lastCategory = data[0]?.category ?? 'Outros'
        const confidence = Math.min(0.90, 0.6 + amounts.length * 0.05)

        return {
            kind: 'financial_prefill',
            deductionConfidence: confidence,
            summary: `Histórico sugere ~${avgAmount.toFixed(2)}€ para "${titleWords}" (${amounts.length} ocorrências).`,
            mutations: {
                suggested_amount: Number(avgAmount.toFixed(2)),
                suggested_merchant: lastMerchant,
                suggested_category: lastCategory,
                historical_count: amounts.length,
            },
            memoryToStore: null,
        }
    }

    // ── 3. Routine Detection ───────────────────────────────────────

    private async deduceRoutine(
        draft: FinanceHandshakeDraft,
    ): Promise<SherlockDeduction | null> {
        if (!draft.merchant) return null

        const merchant = draft.merchant.toLowerCase()
        const hits = await this.synapticWeb.search(merchant, 20)
        const merchantHits = hits.filter((hit) => {
            if (hit.kind !== 'recurring_merchant') return false
            const metaMerchant = String(hit.metadata?.merchant ?? '').toLowerCase()
            return metaMerchant === merchant
        })

        if (merchantHits.length < ROUTINE_MIN_OCCURRENCES) return null

        // Compute average interval between occurrences
        const timestamps = merchantHits
            .map((h) => new Date(h.createdAt).getTime())
            .sort((a, b) => a - b)

        const intervals: number[] = []
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push((timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24))
        }

        if (intervals.length === 0) return null

        const avgPeriod = intervals.reduce((s, v) => s + v, 0) / intervals.length
        const periodDays = Math.round(avgPeriod)

        // Store routine pattern in profile
        this.profile.mergePreferences('routine_patterns', {
            [merchant]: {
                period_days: periodDays,
                last_occurrence: new Date().toISOString(),
                count: merchantHits.length + 1,
            },
        })

        const memory: SynapticMemoryInput = {
            kind: 'routine_pattern',
            text: `routine: ${merchant} every ~${periodDays}d (${merchantHits.length + 1} occurrences)`,
            metadata: {
                source: 'sherlock_routine_detection',
                merchant,
                period_days: periodDays,
                occurrences: merchantHits.length + 1,
            },
        }

        return {
            kind: 'routine_detected',
            deductionConfidence: Math.min(0.92, 0.65 + merchantHits.length * 0.04),
            summary: `${draft.merchant} é uma rotina (~${periodDays} dias entre visitas, ${merchantHits.length + 1} ocorrências).`,
            mutations: { is_routine: true, period_days: periodDays },
            memoryToStore: memory,
        }
    }

    // ── 4. Spending Velocity ───────────────────────────────────────

    private async deduceSpendingVelocity(userId: string): Promise<SherlockDeduction | null> {
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10)
        const todayStr = now.toISOString().slice(0, 10)

        const [recentResult, monthResult] = await Promise.all([
            supabase
                .from('financial_entries')
                .select('amount')
                .eq('user_id', userId)
                .in('type', ['expense', 'bill'])
                .gte('date', sevenDaysAgo)
                .lte('date', todayStr),
            supabase
                .from('financial_entries')
                .select('amount')
                .eq('user_id', userId)
                .in('type', ['expense', 'bill'])
                .gte('date', thirtyDaysAgo)
                .lte('date', todayStr),
        ])

        if (recentResult.error || monthResult.error) return null

        const recent7d = (recentResult.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
        const month30d = (monthResult.data ?? []).reduce((s, r) => s + Number(r.amount), 0)

        if (month30d <= 0) return null

        const avgDaily7d = recent7d / 7
        const avgDaily30d = month30d / 30
        const ratio = avgDaily7d / avgDaily30d

        if (ratio < VELOCITY_ALERT_RATIO) return null

        return {
            kind: 'spending_velocity',
            deductionConfidence: Math.min(0.88, 0.60 + (ratio - VELOCITY_ALERT_RATIO) * 0.15),
            summary: `Velocidade de gasto: ${ratio.toFixed(1)}x acima da média mensal (7d: ${avgDaily7d.toFixed(0)}€/dia vs 30d: ${avgDaily30d.toFixed(0)}€/dia).`,
            mutations: {
                velocity_ratio: Number(ratio.toFixed(2)),
                avg_daily_7d: Number(avgDaily7d.toFixed(2)),
                avg_daily_30d: Number(avgDaily30d.toFixed(2)),
            },
            memoryToStore: null,
        }
    }
}
