export type CortexRouteStrategy = 'tactical_reflex' | 'semantic_deep_dive'
export type CortexModuleRoute = 'FinanceModule' | 'TodoModule' | 'CryptoModule' | 'LinksModule' | 'OpenAIModule'
export type CortexReflexModule = Exclude<CortexModuleRoute, 'OpenAIModule'>

export interface CortexFinanceDraft {
    merchant: string | null
    amount: number | null
    currency: string
    category: string
    description: string
    confidence: number
    strictParametersMet: boolean
}

export interface CortexTodoDraft {
    title: string
    priority: 'low' | 'medium' | 'high'
    dueHint: string | null
    confidence: number
    strictParametersMet: boolean
}

export interface CortexCryptoDraft {
    action: 'buy' | 'sell' | 'swap' | 'hold'
    symbol: string | null
    amount: number | null
    pricePerUnit: number | null
    quoteCurrency: string | null
    confidence: number
    strictParametersMet: boolean
}

export interface CortexLinkDraft {
    url: string | null
    title: string
    description: string
    confidence: number
    strictParametersMet: boolean
}

export type CortexModuleDraft =
    | CortexFinanceDraft
    | CortexTodoDraft
    | CortexCryptoDraft
    | CortexLinkDraft

export interface CortexDailyBriefing {
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

export interface CortexProactiveAlert {
    id: string
    userId: string
    kind: 'budget_threshold' | 'deadline_24h'
    status: 'pending' | 'delivered' | 'dismissed'
    module: CortexReflexModule
    title: string
    message: string
    payload: Record<string, unknown>
    createdAt: string
    expiresAt: string | null
}

export interface CortexRouteDecision {
    rawSignalId: string
    strategy: CortexRouteStrategy
    route: CortexModuleRoute
    confidence: number
    reason: string[]
    strictParametersMet: boolean
    retrieval: {
        synapticHits: number
        ledgerRows: number
    }
    financeDraft: CortexFinanceDraft | null
    moduleDraft: CortexModuleDraft | null
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
}

// ── Dual-LLM Vision Lane Type ─────────────────────────────────────
export type CortexVisionLane = 'smart_chat' | 'manual_scan'

// ── Vision Loading State Events (Risk 2: Double Latency solution) ─
export const CORTEX_VISION_SCANNING_EVENT = 'fc:cortex:vision-scanning'
export const CORTEX_VISION_ANALYZING_EVENT = 'fc:cortex:vision-analyzing'
export const CORTEX_VISION_READY_EVENT = 'fc:cortex:vision-ready'
export const CORTEX_VISION_ERROR_EVENT = 'fc:cortex:vision-error'

export type CortexInputSource = 'text' | 'voice' | 'image'

export interface CortexModuleReflexDetail {
    rawSignalId: string
    source: CortexInputSource
    route: CortexReflexModule
    signalText: string
    confidence: number
    reason: string[]
    financeDraft: CortexFinanceDraft | null
    moduleDraft: CortexModuleDraft | null
    missingFields: string[]
    clarificationPrompt: string | null
}

export type CortexFinanceReflexDetail = CortexModuleReflexDetail & {
    route: 'FinanceModule'
    financeDraft: CortexFinanceDraft
    moduleDraft: CortexFinanceDraft
}

export type CortexTodoReflexDetail = CortexModuleReflexDetail & {
    route: 'TodoModule'
    moduleDraft: CortexTodoDraft | null
}

export type CortexCryptoReflexDetail = CortexModuleReflexDetail & {
    route: 'CryptoModule'
    moduleDraft: CortexCryptoDraft | null
}

export type CortexLinksReflexDetail = CortexModuleReflexDetail & {
    route: 'LinksModule'
    moduleDraft: CortexLinkDraft | null
}

export const CORTEX_FINANCE_REFLEX_EVENT = 'fc:cortex:finance-reflex'
export const CORTEX_TODO_REFLEX_EVENT = 'fc:cortex:todo-reflex'
export const CORTEX_CRYPTO_REFLEX_EVENT = 'fc:cortex:crypto-reflex'
export const CORTEX_LINKS_REFLEX_EVENT = 'fc:cortex:links-reflex'

export const CORTEX_FINANCE_READY_EVENT = 'fc:cortex:finance-ready'
export const CORTEX_TODO_READY_EVENT = 'fc:cortex:todo-ready'
export const CORTEX_CRYPTO_READY_EVENT = 'fc:cortex:crypto-ready'
export const CORTEX_LINKS_READY_EVENT = 'fc:cortex:links-ready'

interface ModuleBinding {
    routePath: string
    reflexEvent: string
    readyEvent: string
}

const MODULE_BINDINGS: Record<CortexReflexModule, ModuleBinding> = {
    FinanceModule: {
        routePath: '/financeiro',
        reflexEvent: CORTEX_FINANCE_REFLEX_EVENT,
        readyEvent: CORTEX_FINANCE_READY_EVENT,
    },
    TodoModule: {
        routePath: '/todo',
        reflexEvent: CORTEX_TODO_REFLEX_EVENT,
        readyEvent: CORTEX_TODO_READY_EVENT,
    },
    CryptoModule: {
        routePath: '/crypto',
        reflexEvent: CORTEX_CRYPTO_REFLEX_EVENT,
        readyEvent: CORTEX_CRYPTO_READY_EVENT,
    },
    LinksModule: {
        routePath: '/links',
        reflexEvent: CORTEX_LINKS_REFLEX_EVENT,
        readyEvent: CORTEX_LINKS_READY_EVENT,
    },
}

const rawApiBase = (
    import.meta.env.VITE_CORTEX_API_BASE?.trim()
    || import.meta.env.VITE_NEWS_API_BASE?.trim()
)

const fallbackBase = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3001'
    : null

const API_BASE = (rawApiBase || fallbackBase)?.replace(/\/$/, '') ?? null
const AGENT_TOKEN = import.meta.env.VITE_AGENT_TOKEN?.trim()

const stagedReflexesByModule: Record<CortexReflexModule, CortexModuleReflexDetail[]> = {
    FinanceModule: [],
    TodoModule: [],
    CryptoModule: [],
    LinksModule: [],
}

let warnedMissingBase = false

function warnMissingApiBase() {
    if (warnedMissingBase) return
    warnedMissingBase = true
    console.warn(
        'Cortex API base is not configured. Set VITE_CORTEX_API_BASE (or VITE_NEWS_API_BASE) to enable symbiote dispatch.',
    )
}

function resolveRoutePath() {
    return AGENT_TOKEN ? '/internal/cortex/route' : '/cortex/route'
}

function resolveHandshakePath() {
    return AGENT_TOKEN ? '/internal/cortex/handshake' : '/cortex/handshake'
}

function resolveBriefingPath() {
    return AGENT_TOKEN ? '/internal/cortex/briefing/today' : '/cortex/briefing/today'
}

function resolveAlertsPath() {
    return AGENT_TOKEN ? '/internal/cortex/alerts/pending' : '/cortex/alerts/pending'
}

function resolveVisionPath() {
    return AGENT_TOKEN ? '/internal/cortex/vision' : '/cortex/vision'
}

function resolveVisionSyncPath() {
    return AGENT_TOKEN ? '/internal/cortex/sync-vision-context' : '/cortex/sync-vision-context'
}

function buildHeaders(): HeadersInit {
    if (!AGENT_TOKEN) {
        return { 'Content-Type': 'application/json' }
    }
    return {
        'Content-Type': 'application/json',
        'x-agent-token': AGENT_TOKEN,
    }
}

function isReflexModule(route: CortexModuleRoute): route is CortexReflexModule {
    return route !== 'OpenAIModule'
}

function getModuleBinding(module: CortexReflexModule): ModuleBinding {
    return MODULE_BINDINGS[module]
}

function resolveFinanceDraftFromDecision(decision: CortexRouteDecision): CortexFinanceDraft | null {
    if (decision.route !== 'FinanceModule') return null
    if (decision.financeDraft) return decision.financeDraft
    return (decision.moduleDraft ?? null) as CortexFinanceDraft | null
}

function asFinanceReflex(detail: CortexModuleReflexDetail): CortexFinanceReflexDetail {
    return detail as CortexFinanceReflexDetail
}

function isOnRoute(pathname: string, module: CortexReflexModule): boolean {
    const path = getModuleBinding(module).routePath
    return pathname === path || pathname.startsWith(`${path}/`)
}

export const cortexBridgeService = {
    isAvailable(): boolean {
        return Boolean(API_BASE)
    },

    isReflexModule,

    getModulePath(module: CortexReflexModule): string {
        return getModuleBinding(module).routePath
    },

    isModuleRouteActive(module: CortexReflexModule, pathname: string): boolean {
        return isOnRoute(pathname, module)
    },

    buildModuleReflex(decision: CortexRouteDecision, signalText: string, source: CortexInputSource): CortexModuleReflexDetail | null {
        if (!isReflexModule(decision.route)) return null

        const financeDraft = resolveFinanceDraftFromDecision(decision)

        return {
            rawSignalId: decision.rawSignalId,
            source,
            route: decision.route,
            signalText,
            confidence: decision.confidence,
            reason: decision.reason,
            financeDraft,
            moduleDraft: decision.moduleDraft,
            missingFields: decision.missingFields ?? [],
            clarificationPrompt: decision.clarificationPrompt ?? null,
        }
    },

    async resolveHandshake(opts: {
        rawSignalId: string
        module: CortexReflexModule
        status: 'approved' | 'rejected'
        confidence?: number
        payload?: Record<string, unknown>
    }): Promise<void> {
        if (!API_BASE) {
            warnMissingApiBase()
            return
        }

        try {
            const response = await fetch(`${API_BASE}${resolveHandshakePath()}`, {
                method: 'POST',
                headers: buildHeaders(),
                body: JSON.stringify({
                    raw_signal_id: opts.rawSignalId,
                    module: opts.module,
                    status: opts.status,
                    confidence: opts.confidence ?? null,
                    payload: opts.payload ?? {},
                }),
            })

            if (!response.ok) {
                console.warn('[cortexBridge] resolveHandshake failed:', response.status)
            }
        } catch {
            // Handshake resolution is best-effort — don't crash the UI
        }
    },

    async chat(userMessage: string): Promise<string> {
        if (!API_BASE) {
            warnMissingApiBase()
            throw new Error('Cortex API base is not configured.')
        }

        const chatPath = AGENT_TOKEN ? '/internal/cortex/chat' : '/cortex/chat'

        const response = await fetch(`${API_BASE}${chatPath}`, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: 'Tu és o Buggy, o Sovereign Symbiote do Feed Center. Responde de forma concisa em PT-PT. Não uses AI-speak. Sê direto e humano.',
                    },
                    { role: 'user', content: userMessage },
                ],
                temperature: 0.5,
                max_tokens: 300,
            }),
        })

        if (!response.ok) {
            throw new Error(`Chat failed (${response.status})`)
        }

        const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
        return data.choices?.[0]?.message?.content?.trim() ?? 'Estou aqui. O que precisas?'
    },

    async routeSignal(rawText: string, source: CortexInputSource): Promise<CortexRouteDecision> {
        if (!API_BASE) {
            warnMissingApiBase()
            throw new Error('Cortex API base is not configured.')
        }

        try {
            const response = await fetch(`${API_BASE}${resolveRoutePath()}`, {
                method: 'POST',
                headers: buildHeaders(),
                body: JSON.stringify({
                    signal_type: source === 'voice' ? 'voice' : 'text',
                    raw_text: rawText,
                    channel: 'holographic-symbiote',
                    metadata: {
                        source,
                        layer: 'phase-5.1',
                    },
                }),
            })

            if (!response.ok) {
                const body = await response.text()
                throw new Error(`Cortex route failed (${response.status}): ${body.slice(0, 180)}`)
            }

            const payload = await response.json() as { status: string; decision: CortexRouteDecision }
            if (!payload?.decision?.route) {
                throw new Error('Cortex route returned an invalid decision payload.')
            }

            return payload.decision
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error)
            throw new Error(`Cortex route network failure: ${reason}`)
        }
    },

    // ── Dual-LLM: Lane-Aware Vision Routing ────────────────────
    //
    // smart_chat:  Qwen OCR → OpenAI validation → editable UI (uses tokens)
    // manual_scan: Qwen OCR → editable UI directly  (zero tokens)
    async routeImage(
        file: File,
        lane: CortexVisionLane = 'smart_chat',
        metadata?: Record<string, unknown>,
    ): Promise<CortexRouteDecision> {
        if (!API_BASE) {
            warnMissingApiBase()
            throw new Error('Cortex API base is not configured.')
        }

        // Risk 2: Emit scanning event for progressive UI feedback
        this.emitVisionState('scanning')

        const formData = new FormData()
        formData.append('image', file)
        formData.append('lane', lane)
        if (metadata) {
            formData.append('metadata', JSON.stringify(metadata))
        }

        const headers: HeadersInit = {}
        if (AGENT_TOKEN) {
            headers['x-agent-token'] = AGENT_TOKEN
        }

        try {
            const response = await fetch(`${API_BASE}${resolveVisionPath()}`, {
                method: 'POST',
                headers,
                body: formData,
            })

            if (!response.ok) {
                const body = await response.text()
                this.emitVisionState('error')
                throw new Error(`Cortex vision failed (${response.status}): ${body.slice(0, 180)}`)
            }

            const payload = await response.json() as { status: string; lane: string; decision: CortexRouteDecision }
            if (!payload?.decision?.route) {
                this.emitVisionState('error')
                throw new Error('Cortex vision returned an invalid decision payload.')
            }

            // Risk 2: Emit ready event
            this.emitVisionState('ready')
            return payload.decision
        } catch (error) {
            this.emitVisionState('error')
            const reason = error instanceof Error ? error.message : String(error)
            throw new Error(`Cortex vision network failure: ${reason}`)
        }
    },

    // ── Dual-LLM: State Sync (Risk 4 Solution) ─────────────────
    // After human edits OCR draft and confirms, send corrected data
    // to the server so OpenAI's memory is updated.
    async syncVisionContext(
        rawSignalId: string,
        correctedDraft: Partial<CortexFinanceDraft>,
    ): Promise<void> {
        if (!API_BASE) return

        try {
            const response = await fetch(`${API_BASE}${resolveVisionSyncPath()}`, {
                method: 'POST',
                headers: buildHeaders(),
                body: JSON.stringify({
                    raw_signal_id: rawSignalId,
                    corrected_draft: correctedDraft,
                }),
            })

            if (!response.ok) {
                console.warn('[cortexBridge] sync-vision-context failed:', response.status)
            }
        } catch {
            // Sync is best-effort — don't crash the UI
        }
    },

    // ── Vision Loading State Emitter (Risk 2) ──────────────────
    emitVisionState(state: 'scanning' | 'analyzing' | 'ready' | 'error'): void {
        if (typeof window === 'undefined') return
        const eventMap = {
            scanning: CORTEX_VISION_SCANNING_EVENT,
            analyzing: CORTEX_VISION_ANALYZING_EVENT,
            ready: CORTEX_VISION_READY_EVENT,
            error: CORTEX_VISION_ERROR_EVENT,
        }
        window.dispatchEvent(new Event(eventMap[state]))
    },

    async checkVisionStatus(): Promise<{ available: boolean; sidecar: string }> {
        if (!API_BASE) return { available: false, sidecar: '' }

        try {
            const response = await fetch(`${API_BASE}/cortex/vision/status`, {
                method: 'GET',
                headers: buildHeaders(),
            })
            if (!response.ok) return { available: false, sidecar: '' }
            const data = await response.json() as { status: string; vision: { available: boolean; sidecar: string } }
            return data.vision ?? { available: false, sidecar: '' }
        } catch {
            return { available: false, sidecar: '' }
        }
    },

    async getTodayBriefing(userId: string, options?: {
        forceRefresh?: boolean
        briefingDate?: string
    }): Promise<CortexDailyBriefing> {
        if (!API_BASE) {
            warnMissingApiBase()
            throw new Error('Cortex API base is not configured.')
        }
        const params = new URLSearchParams({
            user_id: userId,
        })
        if (options?.forceRefresh) params.set('force_refresh', 'true')
        if (options?.briefingDate) params.set('briefing_date', options.briefingDate)

        const response = await fetch(`${API_BASE}${resolveBriefingPath()}?${params.toString()}`, {
            method: 'GET',
            headers: buildHeaders(),
        })
        if (!response.ok) {
            const body = await response.text()
            throw new Error(`Cortex briefing failed (${response.status}): ${body.slice(0, 180)}`)
        }

        const payload = await response.json() as { status: string; briefing: CortexDailyBriefing }
        if (!payload?.briefing?.briefingDate) {
            throw new Error('Cortex briefing returned invalid payload.')
        }
        return payload.briefing
    },

    async consumePendingAlerts(userId: string, options?: {
        refreshFirst?: boolean
        limit?: number
    }): Promise<CortexProactiveAlert[]> {
        if (!API_BASE) {
            warnMissingApiBase()
            throw new Error('Cortex API base is not configured.')
        }
        const params = new URLSearchParams({
            user_id: userId,
            limit: `${Math.max(1, Math.min(100, Math.round(options?.limit ?? 20)))}`,
        })
        if (options?.refreshFirst) params.set('refresh_first', 'true')

        const response = await fetch(`${API_BASE}${resolveAlertsPath()}?${params.toString()}`, {
            method: 'GET',
            headers: buildHeaders(),
        })
        if (!response.ok) {
            const body = await response.text()
            throw new Error(`Cortex alerts failed (${response.status}): ${body.slice(0, 180)}`)
        }

        const payload = await response.json() as { status: string; alerts: CortexProactiveAlert[] }
        return Array.isArray(payload?.alerts) ? payload.alerts : []
    },

    alertToModuleReflex(alert: CortexProactiveAlert, source: CortexInputSource = 'text'): CortexModuleReflexDetail {
        const rawAmount = Number(alert.payload.currentTotal ?? 0)
        const safeAmount = Number.isFinite(rawAmount) ? rawAmount : null
        const defaultModuleDraft: CortexModuleDraft | null = alert.module === 'TodoModule'
            ? {
                title: String(alert.payload.title ?? alert.title),
                priority: 'high',
                dueHint: 'deadline',
                confidence: 0.72,
                strictParametersMet: true,
            } as CortexTodoDraft
            : {
                merchant: String(alert.payload.category ?? 'Orçamento'),
                amount: safeAmount,
                currency: 'EUR',
                category: String(alert.payload.category ?? 'Outros'),
                description: alert.message,
                confidence: 0.72,
                strictParametersMet: true,
            } as CortexFinanceDraft

        const financeDraft = alert.module === 'FinanceModule'
            ? defaultModuleDraft as CortexFinanceDraft
            : null

        return {
            rawSignalId: `alert-${alert.id}`,
            source,
            route: alert.module,
            signalText: `${alert.title}. ${alert.message}`.trim(),
            confidence: 0.72,
            reason: [
                'source=proactive_alert_worker',
                `alert_kind=${alert.kind}`,
            ],
            financeDraft,
            moduleDraft: defaultModuleDraft,
            missingFields: [],
            clarificationPrompt: null,
        }
    },

    emitModuleReflex(detail: CortexModuleReflexDetail): void {
        if (typeof window === 'undefined') return
        const binding = getModuleBinding(detail.route)
        window.dispatchEvent(new CustomEvent<CortexModuleReflexDetail>(binding.reflexEvent, { detail }))
    },

    stageModuleReflex(detail: CortexModuleReflexDetail): void {
        stagedReflexesByModule[detail.route].push(detail)
    },

    consumeStagedModuleReflexes(module: CortexReflexModule): CortexModuleReflexDetail[] {
        const bucket = stagedReflexesByModule[module]
        if (bucket.length === 0) return []
        const queued = [...bucket]
        bucket.length = 0
        return queued
    },

    flushStagedModuleReflexes(module: CortexReflexModule): number {
        const queued = this.consumeStagedModuleReflexes(module)
        for (const detail of queued) {
            this.emitModuleReflex(detail)
        }
        return queued.length
    },

    announceModuleReady(module: CortexReflexModule): void {
        if (typeof window === 'undefined') return
        const binding = getModuleBinding(module)
        window.dispatchEvent(new Event(binding.readyEvent))
    },

    waitForModuleReady(module: CortexReflexModule, timeoutMs = 2600): Promise<boolean> {
        if (typeof window === 'undefined') return Promise.resolve(false)
        const binding = getModuleBinding(module)

        return new Promise((resolve) => {
            let settled = false

            const cleanup = (timer: number) => {
                window.clearTimeout(timer)
                window.removeEventListener(binding.readyEvent, onReady as EventListener)
            }

            const onReady = () => {
                if (settled) return
                settled = true
                cleanup(timer)
                resolve(true)
            }

            const timer = window.setTimeout(() => {
                if (settled) return
                settled = true
                cleanup(timer)
                resolve(false)
            }, timeoutMs)

            window.addEventListener(binding.readyEvent, onReady as EventListener, { once: true })
        })
    },

    emitFinanceReflex(detail: CortexFinanceReflexDetail): void {
        this.emitModuleReflex(detail)
    },

    stageFinanceReflex(detail: CortexFinanceReflexDetail): void {
        this.stageModuleReflex(detail)
    },

    consumeStagedFinanceReflexes(): CortexFinanceReflexDetail[] {
        return this.consumeStagedModuleReflexes('FinanceModule').map(asFinanceReflex)
    },

    flushStagedFinanceReflexes(): number {
        return this.flushStagedModuleReflexes('FinanceModule')
    },

    announceFinanceReady(): void {
        this.announceModuleReady('FinanceModule')
    },

    waitForFinanceReady(timeoutMs = 2600): Promise<boolean> {
        return this.waitForModuleReady('FinanceModule', timeoutMs)
    },
}
