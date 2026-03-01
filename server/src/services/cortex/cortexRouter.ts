import path from 'node:path'
import { env, supabase } from '../../config.js'
import { ActionExecutor } from './actionExecutor.js'
import { AdaptivePrompt } from './adaptivePrompt.js'
import { buildClarityContextMarkdown } from './clarityFilter.js'
import { ContinuousLearner } from './continuousLearner.js'
import { GapFiller } from './gapFiller.js'
import { InsightExtractor } from './insightExtractor.js'
import { openaiParser, injectUserContext } from './openaiParser.js'
import { PrefrontalDispatcher } from './prefrontalDispatcher.js'
import { SemanticCache } from './semanticCache.js'
import { SherlockEngine } from './sherlockEngine.js'
import { SovereignProfile } from './sovereignProfile.js'
import { stressAnalyzer } from './stressAnalyzer.js'
import { SubconsciousLedger } from './subconsciousLedger.js'
import { SynapticWeb } from './synapticWeb.js'
import type {
    CryptoHandshakeDraft,
    CortexRawSignalInput,
    CortexRouteResult,
    DailyBriefing,
    DispatcherResult,
    FinanceHandshakeDraft,
    HandshakeResolutionInput,
    LinkHandshakeDraft,
    ModuleHandshakeDraft,
    ProactiveAlert,
    ProactiveAlertInput,
    StoredHandshakeEvent,
    SynapticMemoryInput,
    TodoHandshakeDraft,
} from './types.js'

interface CortexRouterOptions {
    dataDir: string
    reflexThreshold: number
    contextMaxLines: number
}

function normalizeSignalText(rawText: string): string {
    return rawText
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function normalizeLooseToken(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
        const parsed = Number(value.replace(',', '.'))
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function toString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
}

function toIsoDate(value: Date): string {
    return value.toISOString().slice(0, 10)
}

function addDays(base: Date, days: number): Date {
    return new Date(base.getTime() + (days * 24 * 60 * 60 * 1000))
}

function endOfIsoDay(isoDate: string): string {
    return `${isoDate}T23:59:59.999Z`
}

export class CortexRouter {
    private readonly ledger: SubconsciousLedger
    private readonly synapticWeb: SynapticWeb
    private readonly dispatcher: PrefrontalDispatcher
    private readonly semanticCache: SemanticCache
    readonly profile: SovereignProfile
    private readonly insightExtractor: InsightExtractor
    private readonly sherlock: SherlockEngine
    private readonly adaptivePrompt: AdaptivePrompt
    private readonly continuousLearner: ContinuousLearner
    private readonly gapFiller: GapFiller
    private readonly contextMaxLines: number
    private readonly reflexThreshold: number

    constructor(options: CortexRouterOptions) {
        const dataDir = path.resolve(options.dataDir)
        this.ledger = new SubconsciousLedger({
            dbPath: path.join(dataDir, 'subconscious-ledger.sqlite'),
        })
        this.synapticWeb = new SynapticWeb({
            dbUri: path.join(dataDir, 'synaptic-web'),
            tableName: 'synaptic_memories',
        })
        this.dispatcher = new PrefrontalDispatcher({
            reflexThreshold: options.reflexThreshold,
        })
        this.semanticCache = new SemanticCache({
            dbUri: path.join(dataDir, 'semantic-cache'),
        })
        this.profile = new SovereignProfile({ db: this.ledger['db'] })
        this.insightExtractor = new InsightExtractor({
            profile: this.profile,
            synapticWeb: this.synapticWeb,
        })
        this.sherlock = new SherlockEngine({
            profile: this.profile,
            synapticWeb: this.synapticWeb,
        })
        this.adaptivePrompt = new AdaptivePrompt(this.profile, this.ledger)
        this.continuousLearner = new ContinuousLearner({
            profile: this.profile,
            synapticWeb: this.synapticWeb,
            adaptivePrompt: this.adaptivePrompt,
        })
        this.gapFiller = new GapFiller({
            mlxSidecarUrl: env.mlxSidecarUrl,
            synapticWeb: this.synapticWeb,
            ledger: this.ledger,
            profile: this.profile,
        })
        this.contextMaxLines = Math.max(1, options.contextMaxLines)
        this.reflexThreshold = Math.max(0, Math.min(1, options.reflexThreshold))
    }

    // ── Vision Pipeline (Dual-LLM Architecture) ──────────────────
    //
    // SMART CHAT LANE:  Qwen OCR → GapFiller enrich → OpenAI routing → UI
    // MANUAL SCAN LANE: Qwen OCR → GapFiller enrich → direct to UI (zero tokens)

    async isVisionAvailable(): Promise<boolean> {
        return this.gapFiller.isAvailable()
    }

    async routeImageSignal(
        imageBase64: string,
        mimeType: string,
        metadata?: Record<string, unknown>,
        lane: 'smart_chat' | 'manual_scan' = 'smart_chat',
    ): Promise<CortexRouteResult> {
        const { draft, extraction } = await this.gapFiller.processImage(imageBase64, mimeType)

        // ── MANUAL SCAN LANE ───────────────────────────────────────
        // Zero-token sanctuary. Qwen OCR → enrichment → return to UI.
        // OpenAI stays asleep. Human validates via editable UI.
        if (lane === 'manual_scan') {
            const rawSignal = this.ledger.logRawInput({
                signalType: 'ocr',
                channel: 'mlx-vision-manual',
                rawText: extraction.rawText.slice(0, 500),
                normalizedText: normalizeSignalText(extraction.rawText.slice(0, 500)),
                metadata: { ...metadata, source: 'mlx_vision', lane: 'manual_scan' },
            })

            if (draft.merchant || draft.amount) {
                this.ledger.logOcrTrace(rawSignal.id, {
                    merchant: draft.merchant,
                    amount: draft.amount,
                    currency: draft.currency,
                    confidence: draft.confidence,
                })
            }

            return {
                rawSignalId: rawSignal.id,
                strategy: 'tactical_reflex',
                route: 'FinanceModule',
                confidence: draft.confidence,
                reason: [
                    'lane=manual_scan',
                    'openai_bypass=true',
                    `json_extracted=${extraction.jsonExtracted}`,
                    `enriched_merchant=${extraction.enrichedMerchant ?? 'none'}`,
                ],
                strictParametersMet: draft.strictParametersMet,
                retrieval: { synapticHits: extraction.synapticHits, ledgerRows: 0 },
                financeDraft: draft,
                moduleDraft: draft,
                missingFields: [],
                clarificationPrompt: null,
                contextMarkdown: null,
                nextAction: 'ambient_finance_handshake',
            }
        }

        // ── SMART CHAT LANE ────────────────────────────────────────
        // Qwen OCR → enrichment → OpenAI for validation + conversation.
        const syntheticText = [
            extraction.enrichedMerchant ?? extraction.merchant ?? '',
            extraction.total != null ? `${extraction.total}` : '',
            extraction.enrichedCurrency,
            extraction.enrichedCategory,
        ].filter(Boolean).join(' ')

        return this.routeSignal({
            signalType: 'ocr',
            rawText: syntheticText || extraction.rawText.slice(0, 500),
            channel: 'mlx-vision-chat',
            metadata: {
                ...metadata,
                source: 'mlx_vision',
                lane: 'smart_chat',
                visionDraft: draft,
                itemCount: extraction.items.length,
                jsonExtracted: extraction.jsonExtracted,
            },
            ocrTrace: {
                merchant: draft.merchant,
                amount: draft.amount,
                currency: draft.currency,
                confidence: draft.confidence,
                rawPayload: {
                    category: draft.category,
                    description: draft.description,
                    items: extraction.items,
                    date: extraction.date,
                    synapticHits: extraction.synapticHits,
                },
            },
        })
    }

    // ── State Sync (Risk 4 Solution) ───────────────────────────────
    // When the human edits OCR data in the UI and saves, this method
    // is called to correct OpenAI's contextual memory with the final
    // validated values. Qwen has NO state — this only affects OpenAI.
    syncVisionContext(rawSignalId: string, correctedDraft: FinanceHandshakeDraft): void {
        // Update the ledger with corrected data
        this.ledger.logOcrTrace(rawSignalId, {
            merchant: correctedDraft.merchant,
            amount: correctedDraft.amount,
            currency: correctedDraft.currency,
            confidence: 1.0, // Human-validated = max confidence
            rawPayload: {
                category: correctedDraft.category,
                description: correctedDraft.description,
                source: 'human_correction',
                originalSignalId: rawSignalId,
            },
        })

        // Store correction in synaptic memory for future enrichment
        if (correctedDraft.merchant && correctedDraft.merchant !== 'Desconhecido') {
            this.synapticWeb.storeMemory({
                kind: 'recurring_merchant',
                text: `Corrected OCR: ${correctedDraft.merchant} ${correctedDraft.amount ?? ''} ${correctedDraft.currency}`,
                metadata: {
                    merchant: correctedDraft.merchant,
                    amount: correctedDraft.amount,
                    currency: correctedDraft.currency,
                    category: correctedDraft.category,
                    source: 'human_vision_correction',
                },
            }).catch(() => { })
        }
    }

    private async applyFeedbackBias(decision: {
        module: 'FinanceModule' | 'TodoModule' | 'CryptoModule' | 'LinksModule'
        strategy: 'tactical_reflex' | 'semantic_deep_dive'
        confidence: number
        reason: string[]
        strictParametersMet: boolean
        extracted: {
            merchant: string | null
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
    }): Promise<typeof decision> {
        let confidence = decision.confidence
        const reason = [...decision.reason]

        if (decision.module === 'FinanceModule' && decision.extracted.merchant) {
            const merchant = normalizeLooseToken(decision.extracted.merchant)
            if (merchant) {
                const hits = await this.synapticWeb.search(merchant, 8)
                const recurringMerchantMatches = hits.filter((hit) => {
                    if (hit.kind !== 'recurring_merchant') return false
                    const metaMerchant = normalizeLooseToken(String(hit.metadata?.merchant ?? ''))
                    return metaMerchant === merchant
                }).length

                if (recurringMerchantMatches > 0) {
                    const boost = Math.min(0.16, recurringMerchantMatches * 0.03)
                    confidence = Math.min(1, confidence + boost)
                    reason.push(`feedback_recurring_merchant_matches=${recurringMerchantMatches}`)
                    reason.push(`feedback_boost=${boost.toFixed(3)}`)
                }
            }
        }

        const strategy = confidence >= this.reflexThreshold && decision.strictParametersMet
            ? 'tactical_reflex'
            : 'semantic_deep_dive'

        return {
            ...decision,
            confidence,
            strategy,
            reason,
        }
    }

    async routeSignal(input: CortexRawSignalInput): Promise<CortexRouteResult> {
        const normalizedText = normalizeSignalText(input.rawText)
        const rawSignal = this.ledger.logRawInput({
            signalType: input.signalType,
            channel: input.channel ?? null,
            rawText: input.rawText,
            normalizedText,
            metadata: input.metadata,
        })

        if (input.ocrTrace) {
            this.ledger.logOcrTrace(rawSignal.id, input.ocrTrace)
        }

        const dispatcherBaselineDecision = this.dispatcher.evaluate({
            signalType: input.signalType,
            normalizedText,
            ocrTrace: input.ocrTrace,
        })

        // ── Intent Gatekeeper: Conversational Short-Circuit ──────
        // When the PrefrontalDispatcher classifies input as pure
        // conversational/meta-talk (module=OpenAIModule), bypass ALL
        // module-specific logic (feedback bias, missing fields,
        // clarification drafts). Route directly to the NL layer.
        // This prevents execution-bias false positives (PhD Behavioral
        // dominance for chat interactions).
        if (dispatcherBaselineDecision.module === 'OpenAIModule') {
            this.continuousLearner.observe(input.rawText).catch(() => { })
            return {
                rawSignalId: rawSignal.id,
                strategy: 'semantic_deep_dive',
                route: 'OpenAIModule',
                confidence: 0,
                reason: dispatcherBaselineDecision.reason,
                strictParametersMet: false,
                retrieval: { synapticHits: 0, ledgerRows: 0 },
                financeDraft: null,
                moduleDraft: null,
                missingFields: [],
                clarificationPrompt: null,
                contextMarkdown: null,
                nextAction: 'query_openai_with_context',
            }
        }

        const dispatcherDecision = await this.applyFeedbackBias(dispatcherBaselineDecision)

        if (dispatcherDecision.strategy === 'tactical_reflex') {
            const moduleDraft = this.buildModuleDraft(
                dispatcherDecision.module,
                input.rawText,
                normalizedText,
                dispatcherDecision
            )

            // ── Law 2: Sherlock deductions (silent cross-domain) ──
            const userId = (input.metadata?.userId as string) ?? ''
            const deductions = userId
                ? await this.sherlock.deduce(dispatcherDecision.module, moduleDraft, input.rawText, userId)
                : []
            if (deductions.length > 0) {
                await this.sherlock.persistDeductions(deductions)
            }

            // ── Law 1: Dynamic Risk threshold auto-commit ──
            if (userId) {
                const executor = new ActionExecutor({ userId })
                const { autoCommit, riskTier, dynamicThreshold } = executor.shouldAutoCommit(
                    dispatcherDecision.module,
                    moduleDraft,
                    dispatcherDecision.confidence,
                    dispatcherDecision.strictParametersMet,
                )

                if (autoCommit) {
                    const result = await executor.execute(
                        dispatcherDecision.module,
                        moduleDraft,
                        dispatcherDecision.confidence,
                    )

                    // Audit trail: log as auto_committed handshake
                    this.ledger.logHandshake({
                        rawSignalId: rawSignal.id,
                        module: dispatcherDecision.module,
                        status: 'auto_committed',
                        confidence: dispatcherDecision.confidence,
                        payload: {
                            draft: moduleDraft,
                            source: 'action_executor',
                            risk_tier: riskTier,
                            dynamic_threshold: dynamicThreshold,
                            supabase_id: result.supabaseId,
                            deductions: deductions.map((d) => d.summary),
                        },
                    })

                    if (result.executed) {
                        // Store memory for the auto-committed action
                        await this.indexApprovedHandshake(
                            {
                                rawSignalId: rawSignal.id,
                                module: dispatcherDecision.module,
                                status: 'auto_committed',
                                payload: moduleDraft as unknown as Record<string, unknown>,
                            },
                            { id: result.supabaseId ?? rawSignal.id, rawSignalId: rawSignal.id, module: dispatcherDecision.module, status: 'auto_committed', confidence: dispatcherDecision.confidence, payload: {}, createdAt: new Date().toISOString() },
                        )
                    }

                    return {
                        rawSignalId: rawSignal.id,
                        strategy: 'tactical_reflex',
                        route: dispatcherDecision.module,
                        confidence: dispatcherDecision.confidence,
                        reason: [
                            ...dispatcherDecision.reason,
                            `auto_commit=true`,
                            `risk_tier=${riskTier}`,
                            `dynamic_threshold=${dynamicThreshold}`,
                            `executed=${result.executed}`,
                            ...deductions.map((d) => `sherlock:${d.kind}=${d.deductionConfidence.toFixed(2)}`),
                        ],
                        strictParametersMet: dispatcherDecision.strictParametersMet,
                        retrieval: {
                            synapticHits: 0,
                            ledgerRows: 1,
                        },
                        financeDraft: dispatcherDecision.module === 'FinanceModule'
                            ? moduleDraft as FinanceHandshakeDraft
                            : null,
                        moduleDraft,
                        missingFields: [],
                        clarificationPrompt: null,
                        contextMarkdown: null,
                        nextAction: 'auto_committed',
                    }
                }
            }

            // Below dynamic threshold → existing handshake path
            this.ledger.logTaskDraft({
                rawSignalId: rawSignal.id,
                module: dispatcherDecision.module,
                status: 'pending',
                draft: moduleDraft as unknown as Record<string, unknown>,
            })

            this.ledger.logHandshake({
                rawSignalId: rawSignal.id,
                module: dispatcherDecision.module,
                status: 'pending_confirmation',
                confidence: dispatcherDecision.confidence,
                payload: {
                    draft: moduleDraft,
                    source: 'cortex_tactical_reflex',
                    deductions: deductions.map((d) => d.summary),
                },
            })

            const financeDraft = dispatcherDecision.module === 'FinanceModule'
                ? moduleDraft as FinanceHandshakeDraft
                : null

            return {
                rawSignalId: rawSignal.id,
                strategy: dispatcherDecision.strategy,
                route: dispatcherDecision.module,
                confidence: dispatcherDecision.confidence,
                reason: [
                    ...dispatcherDecision.reason,
                    ...deductions.map((d) => `sherlock:${d.kind}=${d.deductionConfidence.toFixed(2)}`),
                ],
                strictParametersMet: dispatcherDecision.strictParametersMet,
                retrieval: {
                    synapticHits: 0,
                    ledgerRows: 1,
                },
                financeDraft,
                moduleDraft,
                missingFields: [],
                clarificationPrompt: null,
                contextMarkdown: null,
                nextAction: this.nextActionForModule(dispatcherDecision.module),
            }
        }

        const queryText = [
            normalizedText,
            dispatcherDecision.extracted.merchant ?? '',
            dispatcherDecision.extracted.todoTitle ?? '',
            dispatcherDecision.extracted.cryptoSymbol ?? '',
            dispatcherDecision.extracted.linkUrl ?? '',
            dispatcherDecision.extracted.linkTitle ?? '',
        ]
            .filter(Boolean)
            .join(' ')
            .trim()

        const synapticHits = await this.synapticWeb.search(queryText, 8)
        const ledgerSnapshot = this.ledger.getRecentGroundTruth({
            rawLimit: 12,
            ocrLimit: 12,
            handshakeLimit: 12,
        })

        const contextMarkdown = buildClarityContextMarkdown({
            signal: rawSignal,
            dispatcher: dispatcherDecision,
            synapticHits,
            ledger: ledgerSnapshot,
            maxLines: this.contextMaxLines,
        })

        const dispatcherMissingFields = this.inferMissingFields(dispatcherDecision.module, dispatcherDecision.extracted)
        const shouldClarifyFromDispatcher = dispatcherDecision.confidence < this.reflexThreshold
            && dispatcherMissingFields.length > 0

        if (shouldClarifyFromDispatcher) {
            const moduleDraft = this.buildModuleDraft(
                dispatcherDecision.module,
                input.rawText,
                normalizedText,
                dispatcherDecision
            )
            this.ledger.logTaskDraft({
                rawSignalId: rawSignal.id,
                module: dispatcherDecision.module,
                status: 'clarifying',
                draft: moduleDraft as unknown as Record<string, unknown>,
            })

            return {
                rawSignalId: rawSignal.id,
                strategy: 'semantic_deep_dive',
                route: dispatcherDecision.module,
                confidence: dispatcherDecision.confidence,
                reason: [
                    ...dispatcherDecision.reason,
                    'next_action=ambient_clarification',
                    `missing_fields=${dispatcherMissingFields.join(',')}`,
                ],
                strictParametersMet: dispatcherDecision.strictParametersMet,
                retrieval: {
                    synapticHits: synapticHits.length,
                    ledgerRows: ledgerSnapshot.rawSignals.length + ledgerSnapshot.ocrTraces.length + ledgerSnapshot.handshakes.length,
                },
                financeDraft: dispatcherDecision.module === 'FinanceModule'
                    ? moduleDraft as FinanceHandshakeDraft
                    : null,
                moduleDraft,
                missingFields: dispatcherMissingFields,
                clarificationPrompt: this.buildClarificationPrompt(dispatcherDecision.module, dispatcherMissingFields, moduleDraft),
                contextMarkdown,
                nextAction: 'ambient_clarification',
            }
        }

        // --- Semantic Cache: lookup before calling OpenAI ---
        const cachedIntent = await this.semanticCache.lookup(
            normalizedText,
            dispatcherDecision.module,
        )
        if (cachedIntent && cachedIntent.module !== 'OpenAIModule') {
            console.log('[CortexRouter] semantic cache hit, skipping OpenAI call')
            // Fire ContinuousLearner on ALL signals (async, non-blocking)
            this.continuousLearner.observe(input.rawText).catch(() => { })
            return this.buildRouteResultFromParsed({
                rawSignalId: rawSignal.id,
                rawText: input.rawText,
                normalizedText,
                parsedIntent: cachedIntent,
                dispatcherDecision,
                synapticHits,
                ledgerSnapshot,
                contextMarkdown,
                extraReason: ['source=semantic_cache'],
            })
        }

        // ── Deckard Empathy: Stress Analysis ──────────────────────
        const stressProfile = stressAnalyzer.analyze(input.rawText)
        const profileContext = stressProfile.overall !== 'calm'
            ? this.adaptivePrompt.getStressAwarePrompt(stressProfile)
            : this.adaptivePrompt.getPrompt()

        const parsedIntent = await openaiParser.parseSemanticIntent({
            rawText: input.rawText,
            normalizedText,
            contextMarkdown: profileContext
                ? injectUserContext(contextMarkdown, profileContext)
                : contextMarkdown,
            dispatcherHint: dispatcherDecision,
        })

        // Store successful parse in semantic cache
        if (parsedIntent && parsedIntent.module !== 'OpenAIModule') {
            this.semanticCache.store(normalizedText, parsedIntent.module, parsedIntent).catch(() => { })
        }

        // Fire ContinuousLearner on ALL signals (async, non-blocking)
        this.continuousLearner.observe(input.rawText).catch(() => { })

        if (parsedIntent && parsedIntent.module !== 'OpenAIModule') {
            const parsedDecision = {
                confidence: parsedIntent.confidence,
                strictParametersMet: parsedIntent.strictParametersMet,
                extracted: parsedIntent.extracted,
            }
            const parsedMissingFields = parsedIntent.missingFields.length > 0
                ? parsedIntent.missingFields
                : this.inferMissingFields(parsedIntent.module, parsedIntent.extracted)
            const moduleDraft = this.buildModuleDraft(
                parsedIntent.module,
                input.rawText,
                normalizedText,
                parsedDecision
            )

            if (parsedIntent.strategy === 'tactical_reflex' && parsedIntent.strictParametersMet) {
                this.ledger.logTaskDraft({
                    rawSignalId: rawSignal.id,
                    module: parsedIntent.module,
                    status: 'pending',
                    draft: moduleDraft as unknown as Record<string, unknown>,
                })
                this.ledger.logHandshake({
                    rawSignalId: rawSignal.id,
                    module: parsedIntent.module,
                    status: 'pending_confirmation',
                    confidence: parsedIntent.confidence,
                    payload: {
                        draft: moduleDraft,
                        source: 'openai_semantic_parser',
                    },
                })

                return {
                    rawSignalId: rawSignal.id,
                    strategy: 'tactical_reflex',
                    route: parsedIntent.module,
                    confidence: parsedIntent.confidence,
                    reason: [
                        ...dispatcherDecision.reason,
                        ...parsedIntent.reason,
                        'source=openai_parser',
                    ],
                    strictParametersMet: parsedIntent.strictParametersMet,
                    retrieval: {
                        synapticHits: synapticHits.length,
                        ledgerRows: ledgerSnapshot.rawSignals.length + ledgerSnapshot.ocrTraces.length + ledgerSnapshot.handshakes.length,
                    },
                    financeDraft: parsedIntent.module === 'FinanceModule'
                        ? moduleDraft as FinanceHandshakeDraft
                        : null,
                    moduleDraft,
                    missingFields: [],
                    clarificationPrompt: null,
                    contextMarkdown,
                    nextAction: this.nextActionForModule(parsedIntent.module),
                }
            }

            if (parsedMissingFields.length > 0) {
                this.ledger.logTaskDraft({
                    rawSignalId: rawSignal.id,
                    module: parsedIntent.module,
                    status: 'clarifying',
                    draft: moduleDraft as unknown as Record<string, unknown>,
                })

                return {
                    rawSignalId: rawSignal.id,
                    strategy: 'semantic_deep_dive',
                    route: parsedIntent.module,
                    confidence: parsedIntent.confidence,
                    reason: [
                        ...dispatcherDecision.reason,
                        ...parsedIntent.reason,
                        'next_action=ambient_clarification',
                    ],
                    strictParametersMet: false,
                    retrieval: {
                        synapticHits: synapticHits.length,
                        ledgerRows: ledgerSnapshot.rawSignals.length + ledgerSnapshot.ocrTraces.length + ledgerSnapshot.handshakes.length,
                    },
                    financeDraft: parsedIntent.module === 'FinanceModule'
                        ? moduleDraft as FinanceHandshakeDraft
                        : null,
                    moduleDraft,
                    missingFields: parsedMissingFields,
                    clarificationPrompt: this.buildClarificationPrompt(parsedIntent.module, parsedMissingFields, moduleDraft),
                    contextMarkdown,
                    nextAction: 'ambient_clarification',
                }
            }
        }

        // ── Safety net: If the dispatcher already had strict parameters met
        // (verb + amount + merchant), do NOT fall through to OpenAI chat.
        // Use the dispatcher's own extraction as a draft — the user gave
        // an explicit command, not a conversation starter.
        if (dispatcherDecision.strictParametersMet && (dispatcherDecision.module as string) !== 'OpenAIModule') {
            const moduleDraft = this.buildModuleDraft(
                dispatcherDecision.module,
                input.rawText,
                normalizedText,
                dispatcherDecision
            )
            this.ledger.logTaskDraft({
                rawSignalId: rawSignal.id,
                module: dispatcherDecision.module,
                status: 'pending',
                draft: moduleDraft as unknown as Record<string, unknown>,
            })
            this.ledger.logHandshake({
                rawSignalId: rawSignal.id,
                module: dispatcherDecision.module,
                status: 'pending_confirmation',
                confidence: dispatcherDecision.confidence,
                payload: {
                    draft: moduleDraft,
                    source: 'dispatcher_strict_fallback',
                },
            })

            return {
                rawSignalId: rawSignal.id,
                strategy: 'semantic_deep_dive',
                route: dispatcherDecision.module,
                confidence: dispatcherDecision.confidence,
                reason: [
                    ...dispatcherDecision.reason,
                    'openai_parser_missed=true',
                    'fallback=dispatcher_strict_parameters',
                ],
                strictParametersMet: true,
                retrieval: {
                    synapticHits: synapticHits.length,
                    ledgerRows: ledgerSnapshot.rawSignals.length + ledgerSnapshot.ocrTraces.length + ledgerSnapshot.handshakes.length,
                },
                financeDraft: dispatcherDecision.module === 'FinanceModule'
                    ? moduleDraft as FinanceHandshakeDraft
                    : null,
                moduleDraft,
                missingFields: [],
                clarificationPrompt: null,
                contextMarkdown,
                nextAction: this.nextActionForModule(dispatcherDecision.module),
            }
        }

        return {
            rawSignalId: rawSignal.id,
            strategy: dispatcherDecision.strategy,
            route: 'OpenAIModule',
            confidence: dispatcherDecision.confidence,
            reason: dispatcherDecision.reason,
            strictParametersMet: dispatcherDecision.strictParametersMet,
            retrieval: {
                synapticHits: synapticHits.length,
                ledgerRows: ledgerSnapshot.rawSignals.length + ledgerSnapshot.ocrTraces.length + ledgerSnapshot.handshakes.length,
            },
            financeDraft: null,
            moduleDraft: null,
            missingFields: [],
            clarificationPrompt: null,
            contextMarkdown,
            nextAction: 'query_openai_with_context',
        }
    }

    private buildRouteResultFromParsed(ctx: {
        rawSignalId: string
        rawText: string
        normalizedText: string
        parsedIntent: import('./openaiParser.js').ParsedSemanticIntent
        dispatcherDecision: import('./types.js').DispatcherDecision
        synapticHits: import('./types.js').SynapticSearchHit[]
        ledgerSnapshot: import('./types.js').LedgerGroundTruthSnapshot
        contextMarkdown: string
        extraReason: string[]
    }): CortexRouteResult {
        const { rawSignalId, rawText, normalizedText, parsedIntent, dispatcherDecision, synapticHits, ledgerSnapshot, contextMarkdown, extraReason } = ctx

        if (parsedIntent.module !== 'OpenAIModule') {
            const moduleDraft = this.buildModuleDraft(
                parsedIntent.module,
                rawText,
                normalizedText,
                {
                    confidence: parsedIntent.confidence,
                    strictParametersMet: parsedIntent.strictParametersMet,
                    extracted: parsedIntent.extracted,
                }
            )

            const missingFields = parsedIntent.missingFields.length > 0
                ? parsedIntent.missingFields
                : this.inferMissingFields(parsedIntent.module, parsedIntent.extracted)

            if (parsedIntent.strategy === 'tactical_reflex' && parsedIntent.strictParametersMet) {
                this.ledger.logTaskDraft({
                    rawSignalId,
                    module: parsedIntent.module,
                    status: 'pending',
                    draft: moduleDraft as unknown as Record<string, unknown>,
                })
                this.ledger.logHandshake({
                    rawSignalId,
                    module: parsedIntent.module,
                    status: 'pending_confirmation',
                    confidence: parsedIntent.confidence,
                    payload: { draft: moduleDraft, source: 'semantic_cache' },
                })

                return {
                    rawSignalId,
                    strategy: 'tactical_reflex',
                    route: parsedIntent.module,
                    confidence: parsedIntent.confidence,
                    reason: [...dispatcherDecision.reason, ...parsedIntent.reason, ...extraReason],
                    strictParametersMet: parsedIntent.strictParametersMet,
                    retrieval: {
                        synapticHits: synapticHits.length,
                        ledgerRows: ledgerSnapshot.rawSignals.length + ledgerSnapshot.ocrTraces.length + ledgerSnapshot.handshakes.length,
                    },
                    financeDraft: parsedIntent.module === 'FinanceModule' ? moduleDraft as FinanceHandshakeDraft : null,
                    moduleDraft,
                    missingFields: [],
                    clarificationPrompt: null,
                    contextMarkdown,
                    nextAction: this.nextActionForModule(parsedIntent.module),
                }
            }

            if (missingFields.length > 0) {
                this.ledger.logTaskDraft({
                    rawSignalId,
                    module: parsedIntent.module,
                    status: 'clarifying',
                    draft: moduleDraft as unknown as Record<string, unknown>,
                })

                return {
                    rawSignalId,
                    strategy: 'semantic_deep_dive',
                    route: parsedIntent.module,
                    confidence: parsedIntent.confidence,
                    reason: [...dispatcherDecision.reason, ...parsedIntent.reason, ...extraReason, 'next_action=ambient_clarification'],
                    strictParametersMet: false,
                    retrieval: {
                        synapticHits: synapticHits.length,
                        ledgerRows: ledgerSnapshot.rawSignals.length + ledgerSnapshot.ocrTraces.length + ledgerSnapshot.handshakes.length,
                    },
                    financeDraft: parsedIntent.module === 'FinanceModule' ? moduleDraft as FinanceHandshakeDraft : null,
                    moduleDraft,
                    missingFields,
                    clarificationPrompt: this.buildClarificationPrompt(parsedIntent.module, missingFields, moduleDraft),
                    contextMarkdown,
                    nextAction: 'ambient_clarification',
                }
            }
        }

        return {
            rawSignalId,
            strategy: dispatcherDecision.strategy,
            route: 'OpenAIModule',
            confidence: dispatcherDecision.confidence,
            reason: [...dispatcherDecision.reason, ...extraReason],
            strictParametersMet: dispatcherDecision.strictParametersMet,
            retrieval: {
                synapticHits: synapticHits.length,
                ledgerRows: ledgerSnapshot.rawSignals.length + ledgerSnapshot.ocrTraces.length + ledgerSnapshot.handshakes.length,
            },
            financeDraft: null,
            moduleDraft: null,
            missingFields: [],
            clarificationPrompt: null,
            contextMarkdown,
            nextAction: 'query_openai_with_context',
        }
    }

    async getTodayBriefing(userId: string, options?: {
        forceRefresh?: boolean
        briefingDate?: string
    }): Promise<DailyBriefing> {
        const now = new Date()
        const briefingDate = options?.briefingDate ?? toIsoDate(now)
        const cached = this.ledger.getDailyBriefing(userId, briefingDate)
        const isCacheValid = cached && cached.expiresAt > now.toISOString()

        if (isCacheValid && !options?.forceRefresh) {
            return cached.payload
        }

        const yesterdayDate = toIsoDate(addDays(now, -1))
        const overdueTasksPromise = supabase
            .from('todos')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .neq('status', 'done')
            .lt('due_date', now.toISOString())

        const yesterdayEntriesPromise = supabase
            .from('financial_entries')
            .select('type, amount')
            .eq('user_id', userId)
            .eq('date', yesterdayDate)

        const [overdueTasksResult, entriesResult] = await Promise.all([
            overdueTasksPromise,
            yesterdayEntriesPromise,
        ])

        if (overdueTasksResult.error) throw overdueTasksResult.error
        if (entriesResult.error) throw entriesResult.error

        const entries = entriesResult.data ?? []
        const yesterdayIncome = entries
            .filter((row) => row.type === 'income')
            .reduce((sum, row) => sum + Number(row.amount), 0)
        const yesterdayExpenses = entries
            .filter((row) => row.type === 'expense' || row.type === 'bill')
            .reduce((sum, row) => sum + Number(row.amount), 0)

        const pendingHandshakes = this.ledger.getPendingHandshakes(64).length
        const overdueTasks = overdueTasksResult.count ?? 0

        const topPriorities: DailyBriefing['topPriorities'] = []
        if (overdueTasks > 0) {
            topPriorities.push({
                title: `Tens ${overdueTasks} tarefas em atraso`,
                description: 'Fecha pelo menos 1 tarefa crítica nas próximas 2 horas.',
                module: 'TodoModule',
                severity: 'high',
            })
        }
        if (pendingHandshakes > 0) {
            topPriorities.push({
                title: `Existem ${pendingHandshakes} handshakes pendentes`,
                description: 'Confirma ou rejeita drafts para manter o ledger limpo.',
                module: 'FinanceModule',
                severity: pendingHandshakes >= 3 ? 'high' : 'medium',
            })
        }
        if (yesterdayExpenses > yesterdayIncome) {
            topPriorities.push({
                title: 'Ontem gastaste acima do que entrou',
                description: 'Revê as 2 maiores saídas e define um corte imediato.',
                module: 'FinanceModule',
                severity: 'medium',
            })
        }

        if (topPriorities.length === 0) {
            topPriorities.push({
                title: 'Sistema está estável',
                description: 'Mantém o ritmo: regista movimentos e fecha tarefas de manutenção.',
                module: 'TodoModule',
                severity: 'low',
            })
        }

        const briefing: DailyBriefing = {
            userId,
            briefingDate,
            generatedAt: now.toISOString(),
            overdueTasks,
            pendingHandshakes,
            yesterday: {
                income: Number(yesterdayIncome.toFixed(2)),
                expenses: Number(yesterdayExpenses.toFixed(2)),
                balance: Number((yesterdayIncome - yesterdayExpenses).toFixed(2)),
            },
            topPriorities,
        }

        this.ledger.putDailyBriefing({
            userId,
            briefingDate,
            generatedAt: briefing.generatedAt,
            expiresAt: endOfIsoDay(briefingDate),
            payload: briefing,
        })

        return briefing
    }

    async refreshTodayBriefingsForAllUsers(briefingDate?: string): Promise<DailyBriefing[]> {
        const users = await this.resolveBriefingUsers()
        const results: DailyBriefing[] = []
        for (const userId of users) {
            const briefing = await this.getTodayBriefing(userId, {
                forceRefresh: true,
                briefingDate,
            })
            results.push(briefing)
        }
        return results
    }

    async refreshProactiveAlertsForAllUsers(): Promise<ProactiveAlert[]> {
        const users = await this.resolveBriefingUsers()
        const alerts: ProactiveAlert[] = []
        for (const userId of users) {
            const created = await this.refreshProactiveAlertsForUser(userId)
            alerts.push(...created)
        }
        return alerts
    }

    async refreshProactiveAlertsForUser(userId: string): Promise<ProactiveAlert[]> {
        const now = new Date()
        const nowIso = now.toISOString()
        const plus24Iso = addDays(now, 1).toISOString()
        const monthStartIso = toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))
        const prevMonthStartIso = toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)))
        const prevMonthEndIso = toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)))
        const currentMonthKey = toIsoDate(now).slice(0, 7)

        const [currentRowsResult, prevRowsResult, upcomingTasksResult] = await Promise.all([
            supabase
                .from('financial_entries')
                .select('category, amount, type, date')
                .eq('user_id', userId)
                .in('type', ['expense', 'bill'])
                .gte('date', monthStartIso)
                .lte('date', toIsoDate(now)),
            supabase
                .from('financial_entries')
                .select('category, amount, type, date')
                .eq('user_id', userId)
                .in('type', ['expense', 'bill'])
                .gte('date', prevMonthStartIso)
                .lte('date', prevMonthEndIso),
            supabase
                .from('todos')
                .select('id, title, due_date, priority')
                .eq('user_id', userId)
                .neq('status', 'done')
                .gte('due_date', nowIso)
                .lte('due_date', plus24Iso),
        ])

        if (currentRowsResult.error) throw currentRowsResult.error
        if (prevRowsResult.error) throw prevRowsResult.error
        if (upcomingTasksResult.error) throw upcomingTasksResult.error

        const currentTotals = new Map<string, number>()
        for (const row of currentRowsResult.data ?? []) {
            const category = String(row.category ?? 'Outros')
            const amount = Number(row.amount) || 0
            currentTotals.set(category, (currentTotals.get(category) ?? 0) + amount)
        }

        const prevTotals = new Map<string, number>()
        for (const row of prevRowsResult.data ?? []) {
            const category = String(row.category ?? 'Outros')
            const amount = Number(row.amount) || 0
            prevTotals.set(category, (prevTotals.get(category) ?? 0) + amount)
        }

        const alertInputs: ProactiveAlertInput[] = []
        for (const [category, currentTotal] of currentTotals) {
            const previousTotal = prevTotals.get(category) ?? 0
            if (previousTotal <= 0) continue
            const usage = currentTotal / previousTotal
            if (usage < 0.9) continue

            alertInputs.push({
                userId,
                kind: 'budget_threshold',
                status: 'pending',
                module: 'FinanceModule',
                title: `Categoria ${category} acima de 90%`,
                message: `Já consumiste ${(usage * 100).toFixed(0)}% do limite implícito desta categoria.`,
                payload: {
                    category,
                    month: currentMonthKey,
                    currentTotal: Number(currentTotal.toFixed(2)),
                    referenceBudget: Number(previousTotal.toFixed(2)),
                    ratio: Number(usage.toFixed(3)),
                },
                expiresAt: endOfIsoDay(toIsoDate(addDays(now, 1))),
                dedupeKey: `budget:${userId}:${currentMonthKey}:${category}`,
            })
        }

        for (const todo of upcomingTasksResult.data ?? []) {
            const due = typeof todo.due_date === 'string' ? todo.due_date : null
            if (!due) continue
            alertInputs.push({
                userId,
                kind: 'deadline_24h',
                status: 'pending',
                module: 'TodoModule',
                title: 'Deadline nas próximas 24h',
                message: `A tarefa "${todo.title}" vence em menos de 24 horas.`,
                payload: {
                    todoId: todo.id,
                    title: todo.title,
                    dueDate: due,
                    priority: todo.priority ?? 'medium',
                },
                expiresAt: due,
                dedupeKey: `deadline:${todo.id}:${due.slice(0, 13)}`,
            })
        }

        return this.ledger.upsertProactiveAlerts(alertInputs)
    }

    consumePendingProactiveAlerts(userId: string, limit = 20): ProactiveAlert[] {
        const pending = this.ledger.listPendingProactiveAlerts(userId, limit)
        if (pending.length > 0) {
            this.ledger.markProactiveAlertsStatus(
                pending.map((alert) => alert.id),
                'delivered'
            )
        }
        return pending
    }

    private async resolveBriefingUsers(): Promise<string[]> {
        const [todoUsersResult, financialUsersResult] = await Promise.all([
            supabase.from('todos').select('user_id'),
            supabase.from('financial_entries').select('user_id'),
        ])

        if (todoUsersResult.error) throw todoUsersResult.error
        if (financialUsersResult.error) throw financialUsersResult.error

        const users = new Set<string>()
        for (const row of todoUsersResult.data ?? []) {
            const userId = toString((row as { user_id?: string }).user_id)
            if (userId) users.add(userId)
        }
        for (const row of financialUsersResult.data ?? []) {
            const userId = toString((row as { user_id?: string }).user_id)
            if (userId) users.add(userId)
        }

        return Array.from(users)
    }

    async recordHandshake(input: HandshakeResolutionInput): Promise<StoredHandshakeEvent> {
        const event = this.ledger.logHandshake({
            rawSignalId: input.rawSignalId,
            module: input.module,
            status: input.status,
            confidence: input.confidence ?? null,
            payload: input.payload ?? {},
        })

        if (input.status === 'approved') {
            await this.indexApprovedHandshake(input, event)
        }

        return event
    }

    private buildFinanceDraft(rawText: string, decision: {
        confidence: number
        strictParametersMet: boolean
        extracted: {
            merchant: string | null
            amount: number | null
            currency: string | null
            keywords: string[]
        }
    }): FinanceHandshakeDraft {
        const merchant = decision.extracted.merchant
        const amount = decision.extracted.amount
        const currency = decision.extracted.currency ?? 'EUR'
        const category = this.inferCategory(decision.extracted.keywords)
        const description = merchant
            ? `${merchant} • sinal financeiro capturado`
            : rawText.slice(0, 96)

        return {
            merchant,
            amount,
            currency,
            category,
            description,
            confidence: decision.confidence,
            strictParametersMet: decision.strictParametersMet,
            walletId: null,
        }
    }

    private buildTodoDraft(rawText: string, normalizedText: string, decision: {
        confidence: number
        strictParametersMet: boolean
        extracted: {
            todoTitle: string | null
            keywords: string[]
        }
    }): TodoHandshakeDraft {
        const title = decision.extracted.todoTitle ?? rawText.slice(0, 180)
        const priority = this.inferTodoPriority(decision.extracted.keywords, normalizedText, title)
        const dueHint = this.inferTodoDueHint(normalizedText)

        return {
            title,
            priority,
            dueHint,
            confidence: decision.confidence,
            strictParametersMet: decision.strictParametersMet,
        }
    }

    private buildCryptoDraft(decision: {
        confidence: number
        strictParametersMet: boolean
        extracted: {
            cryptoAction: 'buy' | 'sell' | 'swap' | 'hold' | null
            cryptoSymbol: string | null
            cryptoAmount: number | null
            cryptoPrice: number | null
            currency: string | null
        }
    }): CryptoHandshakeDraft {
        return {
            action: decision.extracted.cryptoAction ?? 'hold',
            symbol: decision.extracted.cryptoSymbol,
            amount: decision.extracted.cryptoAmount,
            pricePerUnit: decision.extracted.cryptoPrice,
            quoteCurrency: decision.extracted.currency,
            confidence: decision.confidence,
            strictParametersMet: decision.strictParametersMet,
        }
    }

    private buildLinkDraft(rawText: string, decision: {
        confidence: number
        strictParametersMet: boolean
        extracted: {
            linkUrl: string | null
            linkTitle: string | null
            walletHint: string | null
        }
    }): LinkHandshakeDraft {
        const title = decision.extracted.linkTitle ?? 'Link capturado pelo Buggy'
        const description = rawText.slice(0, 220)

        return {
            url: decision.extracted.linkUrl,
            title,
            description,
            confidence: decision.confidence,
            strictParametersMet: decision.strictParametersMet,
        }
    }

    private buildModuleDraft(
        module: 'FinanceModule' | 'TodoModule' | 'CryptoModule' | 'LinksModule',
        rawText: string,
        normalizedText: string,
        decision: {
            confidence: number
            strictParametersMet: boolean
            extracted: {
                merchant: string | null
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
        }
    ): ModuleHandshakeDraft {
        if (module === 'FinanceModule') {
            return this.buildFinanceDraft(rawText, decision)
        }
        if (module === 'TodoModule') {
            return this.buildTodoDraft(rawText, normalizedText, decision)
        }
        if (module === 'CryptoModule') {
            return this.buildCryptoDraft(decision)
        }
        return this.buildLinkDraft(rawText, decision)
    }

    private inferCategory(keywords: string[]): string {
        if (keywords.some((keyword) => ['uber', 'bolt'].includes(keyword))) return 'Transporte'
        if (keywords.some((keyword) => ['supermercado', 'continente', 'pingo doce', 'lidl', 'compra'].includes(keyword))) return 'Alimentação'
        if (keywords.some((keyword) => ['conta', 'fatura'].includes(keyword))) return 'Serviços'
        return 'Outros'
    }

    private inferTodoPriority(keywords: string[], normalizedText: string, title: string): 'low' | 'medium' | 'high' {
        if (keywords.some((keyword) => ['urgente', 'deadline'].includes(keyword))) return 'high'
        if (/\b(hoje|amanha|antes|prazo)\b/i.test(normalizedText)) return 'high'
        if (/\burgente\b/i.test(title)) return 'high'
        if (keywords.some((keyword) => ['prioridade'].includes(keyword))) return 'medium'
        return 'medium'
    }

    private inferTodoDueHint(normalizedText: string): string | null {
        if (/\bhoje\b/i.test(normalizedText)) return 'today'
        if (/\bamanha\b/i.test(normalizedText)) return 'tomorrow'
        if (/\bsemana\b/i.test(normalizedText)) return 'this_week'
        if (/\bdeadline\b|\bprazo\b/i.test(normalizedText)) return 'deadline'
        return null
    }

    private inferMissingFields(module: 'FinanceModule' | 'TodoModule' | 'CryptoModule' | 'LinksModule', extracted: {
        merchant: string | null
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
    }): string[] {
        if (module === 'FinanceModule') {
            const missing: string[] = []
            if (!extracted.merchant) missing.push('merchant')
            if (extracted.amount === null) missing.push('amount')
            return missing
        }

        if (module === 'TodoModule') {
            return extracted.todoTitle ? [] : ['todo_title']
        }

        if (module === 'CryptoModule') {
            const action = extracted.cryptoAction ?? 'hold'
            const missing: string[] = []
            if (!extracted.cryptoSymbol) missing.push('crypto_symbol')
            if ((action === 'buy' || action === 'sell' || action === 'swap') && extracted.cryptoAmount === null) {
                missing.push('crypto_amount')
            }
            if ((action === 'buy' || action === 'sell') && extracted.cryptoPrice === null) {
                missing.push('crypto_price')
            }
            return missing
        }

        return extracted.linkUrl ? [] : ['link_url']
    }

    private buildClarificationPrompt(
        module: 'FinanceModule' | 'TodoModule' | 'CryptoModule' | 'LinksModule',
        missingFields: string[],
        moduleDraft: ModuleHandshakeDraft
    ): string {
        if (module === 'FinanceModule') {
            const financeDraft = moduleDraft as FinanceHandshakeDraft
            if (missingFields.includes('merchant') && missingFields.includes('amount')) {
                return 'Faltou-me o comerciante e o valor. Diz, por exemplo: Continente 45 euros.'
            }
            if (missingFields.includes('merchant')) {
                return `Faltou-me o comerciante desta despesa de ${financeDraft.amount ?? 'valor pendente'} euros. Onde foi?`
            }
            if (missingFields.includes('amount')) {
                return `Faltou-me o valor da despesa em ${financeDraft.merchant ?? 'comerciante pendente'}. Quanto foi?`
            }
        }

        if (module === 'TodoModule') {
            return 'Percebi que queres criar uma tarefa, mas faltou o título. Qual é a ação exata?'
        }

        if (module === 'CryptoModule') {
            if (missingFields.includes('crypto_symbol') && missingFields.includes('crypto_amount')) {
                return 'Faltou-me o ativo e a quantidade. Exemplo: comprar 0.02 BTC.'
            }
            if (missingFields.includes('crypto_symbol')) {
                return 'Qual é o ativo cripto? Exemplo: BTC, ETH ou SOL.'
            }
            if (missingFields.includes('crypto_amount')) {
                return 'Qual é a quantidade da transação cripto?'
            }
            if (missingFields.includes('crypto_price')) {
                return 'Queres indicar o preço por unidade para registo mais preciso?'
            }
        }

        if (module === 'LinksModule') {
            return 'Faltou-me o URL do link. Podes repetir com o endereço completo?'
        }

        return 'Falta um detalhe para concluir este draft. Podes completar o campo em falta?'
    }

    private nextActionForModule(module: 'FinanceModule' | 'TodoModule' | 'CryptoModule' | 'LinksModule'): CortexRouteResult['nextAction'] {
        if (module === 'FinanceModule') return 'ambient_finance_handshake'
        if (module === 'TodoModule') return 'ambient_todo_handshake'
        if (module === 'CryptoModule') return 'ambient_crypto_handshake'
        return 'ambient_links_handshake'
    }

    private async indexApprovedHandshake(input: HandshakeResolutionInput, event: StoredHandshakeEvent): Promise<void> {
        const explicitMemory = input.memory ?? []
        const derivedMemory = this.deriveMemoryFromPayload(input)
        const rawSignal = this.ledger.getRawSignalById(input.rawSignalId)

        const memories: SynapticMemoryInput[] = [
            ...explicitMemory,
            ...derivedMemory,
        ]

        if (rawSignal) {
            memories.push({
                kind: 'past_context',
                text: rawSignal.normalizedText,
                metadata: {
                    raw_signal_id: rawSignal.id,
                    signal_type: rawSignal.signalType,
                    channel: rawSignal.channel,
                    handshake_event_id: event.id,
                },
            })
        }

        for (const memory of memories) {
            if (!memory.text.trim()) continue
            await this.synapticWeb.storeMemory(memory)
        }
    }

    private deriveMemoryFromPayload(input: HandshakeResolutionInput): SynapticMemoryInput[] {
        const payload = input.payload ?? {}
        const merchant = toString(payload.merchant)
        const amount = toNumber(payload.amount)
        const category = toString(payload.category)
        const taskTitle = toString(payload.task_title) ?? toString(payload.taskTitle)
        const taskDone = payload.task_done === true || payload.taskDone === true

        const memories: SynapticMemoryInput[] = []

        if (merchant) {
            memories.push({
                kind: 'recurring_merchant',
                text: [merchant, category ?? '', amount !== null ? `${amount}` : ''].join(' ').trim(),
                metadata: {
                    merchant,
                    amount,
                    category,
                    module: input.module,
                },
            })
        }

        if (taskTitle && taskDone) {
            memories.push({
                kind: 'completed_task',
                text: taskTitle,
                metadata: {
                    module: input.module,
                    status: input.status,
                },
            })
        }

        if (input.module === 'FinanceModule' && (merchant || amount !== null)) {
            memories.push({
                kind: 'ocr_context',
                text: [merchant ?? '', amount !== null ? `${amount}` : '', category ?? ''].join(' ').trim(),
                metadata: {
                    merchant,
                    amount,
                    category,
                },
            })
        }

        return memories
    }
}

export const cortexRouter = new CortexRouter({
    dataDir: env.cortexDataDir,
    reflexThreshold: env.cortexReflexThreshold,
    contextMaxLines: env.cortexContextMaxLines,
})
