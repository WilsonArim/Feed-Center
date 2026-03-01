export type CortexSignalType = 'text' | 'voice' | 'ocr'
export type CortexModule = 'FinanceModule' | 'TodoModule' | 'CryptoModule' | 'LinksModule' | 'OpenAIModule'
export type CortexReflexModule = Exclude<CortexModule, 'OpenAIModule'>
export type CortexRouteStrategy = 'tactical_reflex' | 'semantic_deep_dive'
export type HandshakeStatus = 'pending_confirmation' | 'approved' | 'rejected' | 'failed' | 'auto_committed'
export type SynapticMemoryKind = 'completed_task' | 'recurring_merchant' | 'past_context' | 'ocr_context' | 'user_insight' | 'routine_pattern' | 'biographical_event'
export type TaskDraftStatus = 'pending' | 'clarifying' | 'confirmed' | 'discarded'
export type ProactiveAlertKind = 'budget_threshold' | 'deadline_24h' | 'spending_pattern' | 'routine_anomaly' | 'strategic_advantage'
export type ProactiveAlertStatus = 'pending' | 'delivered' | 'dismissed'

export interface OcrTraceInput {
    merchant?: string | null
    amount?: number | null
    currency?: string | null
    confidence?: number | null
    rawPayload?: Record<string, unknown>
}

export interface CortexRawSignalInput {
    signalType: CortexSignalType
    rawText: string
    channel?: string | null
    metadata?: Record<string, unknown>
    ocrTrace?: OcrTraceInput | null
}

export interface StoredRawSignal {
    id: string
    signalType: CortexSignalType
    channel: string | null
    rawText: string
    normalizedText: string
    metadata: Record<string, unknown>
    createdAt: string
}

export interface StoredOcrTrace {
    id: string
    rawSignalId: string
    merchant: string | null
    amount: number | null
    currency: string | null
    confidence: number | null
    trace: Record<string, unknown>
    createdAt: string
}

export interface StoredHandshakeEvent {
    id: string
    rawSignalId: string
    module: CortexModule
    status: HandshakeStatus
    confidence: number | null
    payload: Record<string, unknown>
    createdAt: string
}

export interface LedgerGroundTruthSnapshot {
    rawSignals: StoredRawSignal[]
    ocrTraces: StoredOcrTrace[]
    handshakes: StoredHandshakeEvent[]
}

export interface StoredTaskDraft {
    id: string
    rawSignalId: string
    module: CortexReflexModule
    status: TaskDraftStatus
    draft: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

export interface DailyBriefing {
    userId: string
    briefingDate: string
    generatedAt: string
    overdueTasks: number
    pendingHandshakes: number
    yesterday: {
        income: number
        expenses: number
        balance: number
    }
    topPriorities: Array<{
        title: string
        description: string
        module: CortexReflexModule
        severity: 'high' | 'medium' | 'low'
    }>
}

export interface StoredDailyBriefing {
    userId: string
    briefingDate: string
    generatedAt: string
    expiresAt: string
    payload: DailyBriefing
}

export interface DailyBriefingCacheInput {
    userId: string
    briefingDate: string
    generatedAt: string
    expiresAt: string
    payload: DailyBriefing
}

export interface ProactiveAlert {
    id: string
    userId: string
    kind: ProactiveAlertKind
    status: ProactiveAlertStatus
    module: CortexReflexModule
    title: string
    message: string
    payload: Record<string, unknown>
    createdAt: string
    expiresAt: string | null
}

export interface ProactiveAlertInput {
    userId: string
    kind: ProactiveAlertKind
    status: ProactiveAlertStatus
    module: CortexReflexModule
    title: string
    message: string
    payload?: Record<string, unknown>
    expiresAt?: string | null
    dedupeKey: string
}

export interface SynapticMemoryInput {
    kind: SynapticMemoryKind
    text: string
    metadata?: Record<string, unknown>
}

export interface SynapticSearchHit {
    id: string
    kind: SynapticMemoryKind
    text: string
    metadata: Record<string, unknown>
    createdAt: string
    distance: number
    similarity: number
}

export interface FinanceHandshakeDraft {
    merchant: string | null
    amount: number | null
    currency: string
    category: string
    description: string
    confidence: number
    strictParametersMet: boolean
    walletId: string | null
}

export interface TodoHandshakeDraft {
    title: string
    priority: 'low' | 'medium' | 'high'
    dueHint: string | null
    confidence: number
    strictParametersMet: boolean
}

export interface CryptoHandshakeDraft {
    action: 'buy' | 'sell' | 'swap' | 'hold'
    symbol: string | null
    amount: number | null
    pricePerUnit: number | null
    quoteCurrency: string | null
    confidence: number
    strictParametersMet: boolean
}

export interface LinkHandshakeDraft {
    url: string | null
    title: string
    description: string
    confidence: number
    strictParametersMet: boolean
}

export type ModuleHandshakeDraft =
    | FinanceHandshakeDraft
    | TodoHandshakeDraft
    | CryptoHandshakeDraft
    | LinkHandshakeDraft

export interface DispatcherExtracted {
    merchant: string | null
    merchantMeta?: {
        matchType: 'exact_brand' | 'generic_place' | 'fuzzy' | 'preposition' | 'ocr_trace'
        fuzzyCanonical?: string
        fuzzyDistance?: number
    } | null
    amount: number | null
    currency: string | null
    keywords: string[]
    todoTitle: string | null
    cryptoAction: 'buy' | 'sell' | 'swap' | 'hold' | null
    cryptoSymbol: string | null
    cryptoAmount: number | null
    cryptoPrice: number | null
    linkUrl: string | null
    linkTitle: string | null
    walletHint: string | null
}

export interface DispatcherDecision {
    module: CortexReflexModule
    strategy: CortexRouteStrategy
    confidence: number
    reason: string[]
    strictParametersMet: boolean
    extracted: DispatcherExtracted
}

export interface ConversationalBypass {
    module: 'OpenAIModule'
    strategy: 'semantic_deep_dive'
    confidence: 0
    reason: string[]
    strictParametersMet: false
    extracted: DispatcherExtracted
}

export type DispatcherResult = DispatcherDecision | ConversationalBypass

export interface CortexRouteResult {
    rawSignalId: string
    strategy: CortexRouteStrategy
    route: CortexModule
    confidence: number
    reason: string[]
    strictParametersMet: boolean
    retrieval: {
        synapticHits: number
        ledgerRows: number
    }
    financeDraft: FinanceHandshakeDraft | null
    moduleDraft: ModuleHandshakeDraft | null
    missingFields: string[]
    clarificationPrompt: string | null
    contextMarkdown: string | null
    nextAction:
    | 'ambient_finance_handshake'
    | 'ambient_todo_handshake'
    | 'ambient_crypto_handshake'
    | 'ambient_links_handshake'
    | 'ambient_clarification'
    | 'query_openai_with_context'
    | 'auto_committed'
}

export interface HandshakeResolutionInput {
    rawSignalId: string
    module: CortexModule
    status: HandshakeStatus
    confidence?: number | null
    payload?: Record<string, unknown>
    memory?: SynapticMemoryInput[]
}

// ── Law 1: Absolute Agency ──

export type DynamicRiskTier = 'low' | 'medium' | 'high'

export interface AutoCommitResult {
    executed: boolean
    module: CortexReflexModule
    riskTier: DynamicRiskTier
    dynamicThreshold: number
    confidence: number
    supabaseId: string | null
    reason: string
}

// ── Law 2: Sherlock Protocol ──

export interface SherlockDeduction {
    kind: 'calendar_correlation' | 'financial_prefill' | 'routine_detected' | 'spending_velocity'
    deductionConfidence: number
    summary: string
    mutations: Record<string, unknown>
    memoryToStore: SynapticMemoryInput | null
}
