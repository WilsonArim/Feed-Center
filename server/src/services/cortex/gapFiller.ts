/**
 * GapFiller — Semantic Enrichment Layer
 *
 * DUAL-LLM ARCHITECTURE: This module is the ENRICHMENT layer.
 * It receives raw VisionOcrDraft from VisionService and enriches it
 * with synaptic memory (LanceDB), merchant recognition, and profile prefs.
 *
 * Pipeline:
 *   VisionService.extractFromImage() → VisionOcrDraft
 *   → GapFiller.enrichDraft() → EnrichedDraft
 *   → GapFiller.buildFinanceDraft() → FinanceHandshakeDraft
 *
 * Does NOT call the MLX sidecar directly. That's VisionService's job.
 */

import type { SynapticWeb } from './synapticWeb.js'
import type { SubconsciousLedger } from './subconsciousLedger.js'
import type { SovereignProfile } from './sovereignProfile.js'
import type { FinanceHandshakeDraft } from './types.js'
import { VisionService, type VisionOcrDraft } from './visionService.js'

// ── Types ──────────────────────────────────────────────────────────

export { type VisionOcrDraft } from './visionService.js'

export interface EnrichedExtraction extends VisionOcrDraft {
    enrichedMerchant: string | null
    enrichedCategory: string
    enrichedCurrency: string
    synapticHits: number
}

interface GapFillerOptions {
    mlxSidecarUrl: string
    synapticWeb: SynapticWeb
    ledger: SubconsciousLedger
    profile: SovereignProfile
}

// ── Constants ──────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
    supermercado: 'Supermercado',
    restaurante: 'Restaurante',
    transportes: 'Transportes',
    saude: 'Saúde',
    saúde: 'Saúde',
    tecnologia: 'Tecnologia',
    servicos: 'Serviços',
    serviços: 'Serviços',
    vestuario: 'Vestuário',
    vestuário: 'Vestuário',
    entretenimento: 'Entretenimento',
    educacao: 'Educação',
    educação: 'Educação',
    outros: 'Outros',
}

const KNOWN_MERCHANTS_CATEGORY: Record<string, string> = {
    'pingo doce': 'Supermercado',
    'continente': 'Supermercado',
    'lidl': 'Supermercado',
    'aldi': 'Supermercado',
    'mercadona': 'Supermercado',
    'minipreço': 'Supermercado',
    'intermarché': 'Supermercado',
    'uber': 'Transportes',
    'bolt': 'Transportes',
    'uber eats': 'Restaurante',
    'glovo': 'Restaurante',
    'mcdonald': 'Restaurante',
    'amazon': 'Tecnologia',
    'ikea': 'Outros',
    'zara': 'Vestuário',
    'worten': 'Tecnologia',
    'fnac': 'Tecnologia',
    'decathlon': 'Vestuário',
    'edp': 'Serviços',
    'meo': 'Serviços',
    'vodafone': 'Serviços',
    'nos': 'Serviços',
}

// ── GapFiller Class ────────────────────────────────────────────────

export class GapFiller {
    readonly visionService: VisionService
    private readonly synapticWeb: SynapticWeb
    private readonly ledger: SubconsciousLedger
    private readonly profile: SovereignProfile

    constructor(options: GapFillerOptions) {
        this.visionService = new VisionService(options.mlxSidecarUrl)
        this.synapticWeb = options.synapticWeb
        this.ledger = options.ledger
        this.profile = options.profile
    }

    /**
     * Is the MLX sidecar available?
     * Delegates to VisionService.
     */
    async isAvailable(): Promise<boolean> {
        return this.visionService.isAvailable()
    }

    /**
     * Enrich a raw VisionOcrDraft with synaptic memory and profile data.
     * Does NOT call the sidecar — only enriches existing OCR output.
     */
    async enrichDraft(draft: VisionOcrDraft): Promise<EnrichedExtraction> {
        let synapticHits = 0
        let enrichedMerchant = draft.merchant
        let enrichedCategory = draft.category
        let enrichedCurrency = draft.currency ?? 'EUR'

        // 1. Try to match merchant from synaptic memory
        if (draft.merchant) {
            try {
                const hits = await this.synapticWeb.search(draft.merchant, 3)
                synapticHits = hits.length

                for (const hit of hits) {
                    if (hit.metadata?.merchant && typeof hit.metadata.merchant === 'string') {
                        enrichedMerchant = hit.metadata.merchant
                        break
                    }
                }
            } catch {
                // Synaptic search is best-effort
            }
        }

        // 2. Infer category from known merchants
        if (!enrichedCategory && enrichedMerchant) {
            const merchantLower = enrichedMerchant.toLowerCase()
            for (const [known, cat] of Object.entries(KNOWN_MERCHANTS_CATEGORY)) {
                if (merchantLower.includes(known)) {
                    enrichedCategory = cat
                    break
                }
            }
        }

        // 3. Normalize category name
        if (enrichedCategory) {
            const normalized = CATEGORY_MAP[enrichedCategory.toLowerCase()]
            if (normalized) enrichedCategory = normalized
        }

        // 4. Default currency from profile
        if (!draft.currency) {
            const prefs = this.profile.get('interaction_preferences')
            if (prefs?.defaultCurrency && typeof prefs.defaultCurrency === 'string') {
                enrichedCurrency = prefs.defaultCurrency
            }
        }

        return {
            ...draft,
            enrichedMerchant,
            enrichedCategory: enrichedCategory ?? 'Outros',
            enrichedCurrency,
            synapticHits,
        }
    }

    /**
     * Build a FinanceHandshakeDraft from enriched extraction data.
     */
    buildFinanceDraft(enriched: EnrichedExtraction): FinanceHandshakeDraft {
        const hasMinimumData = enriched.enrichedMerchant != null && enriched.total != null
        const strictParametersMet = hasMinimumData && enriched.confidence >= 0.8

        return {
            merchant: enriched.enrichedMerchant || 'Desconhecido',
            amount: enriched.total ?? 0,
            currency: enriched.enrichedCurrency,
            category: enriched.enrichedCategory,
            description: this.buildDescription(enriched),
            confidence: enriched.confidence,
            strictParametersMet,
            walletId: null,
        }
    }

    /**
     * Full pipeline: Image → VisionService OCR → Enrich → Draft
     *
     * This is the backwards-compatible entry point that CortexRouter uses.
     * Internally it now delegates OCR to VisionService.
     */
    async processImage(imageBase64: string, mimeType = 'image/png'): Promise<{
        draft: FinanceHandshakeDraft
        extraction: EnrichedExtraction
    }> {
        // Step 1: OCR via VisionService (stateless Qwen call)
        const ocrDraft = await this.visionService.extractFromImage(imageBase64, mimeType)

        // Step 2: Semantic enrichment
        const enriched = await this.enrichDraft(ocrDraft)

        // Step 3: Build handshake draft
        const draft = this.buildFinanceDraft(enriched)

        // Step 4: Store in synaptic memory for future enrichment
        if (enriched.enrichedMerchant) {
            try {
                await this.synapticWeb.storeMemory({
                    kind: 'ocr_context',
                    text: `OCR: ${enriched.enrichedMerchant} ${enriched.total ?? ''} ${enriched.enrichedCurrency}`,
                    metadata: {
                        merchant: enriched.enrichedMerchant,
                        amount: enriched.total,
                        currency: enriched.enrichedCurrency,
                        category: enriched.enrichedCategory,
                        source: 'mlx_vision',
                    },
                })
            } catch {
                // Memory storage is best-effort
            }
        }

        return { draft, extraction: enriched }
    }

    // ── Helpers ────────────────────────────────────────────────────

    private buildDescription(enriched: EnrichedExtraction): string {
        const parts: string[] = []

        if (enriched.items.length > 0) {
            const top3 = enriched.items.slice(0, 3).map((i) => i.name)
            parts.push(top3.join(', '))
            if (enriched.items.length > 3) {
                parts.push(`+${enriched.items.length - 3} itens`)
            }
        }

        if (enriched.date) {
            parts.push(enriched.date)
        }

        return parts.length > 0 ? parts.join(' · ') : 'Extração OCR via visão local'
    }
}
