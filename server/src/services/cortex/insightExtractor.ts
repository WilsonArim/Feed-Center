/**
 * Insight Extractor — Autonomous preference learning from transcripts
 *
 * Silently asks OpenAI to extract dialect patterns, common merchants,
 * and slang mappings from raw voice transcripts. Results feed into
 * SovereignProfile + SynapticWeb for progressive user adaptation.
 *
 * Throttled: fires once every N voice signals to avoid API waste.
 */

import OpenAI from 'openai'
import { z } from 'zod'
import { env } from '../../config.js'
import type { SovereignProfile } from './sovereignProfile.js'
import type { SynapticWeb } from './synapticWeb.js'

const EXTRACTION_PROMPT = [
    'Analisa a transcrição de voz abaixo e extrai insights sobre o utilizador.',
    'Devolve APENAS JSON válido, sem markdown.',
    'Campos a extrair:',
    '- dialect_patterns: array de {slang: string, meaning: string} (gíria → significado)',
    '- common_merchants: array de strings (nomes de lojas/empresas mencionados)',
    '- regional_hints: {region: string | null, dialect_notes: string | null}',
    'Se não houver insights claros, devolve arrays vazios e nulls.',
    'Máximo: 5 dialect_patterns, 5 merchants.',
].join('\n')

const InsightSchema = z.object({
    dialect_patterns: z.array(z.object({
        slang: z.string(),
        meaning: z.string(),
    })).max(5).default([]),
    common_merchants: z.array(z.string()).max(5).default([]),
    regional_hints: z.object({
        region: z.string().nullable().default(null),
        dialect_notes: z.string().nullable().default(null),
    }).default({ region: null, dialect_notes: null }),
})

type ExtractedInsights = z.infer<typeof InsightSchema>

export interface InsightExtractorOptions {
    profile: SovereignProfile
    synapticWeb: SynapticWeb
    throttleEveryN?: number
}

export class InsightExtractor {
    private readonly client: OpenAI
    private readonly profile: SovereignProfile
    private readonly synapticWeb: SynapticWeb
    private readonly throttleEveryN: number
    private signalCount = 0

    constructor(options: InsightExtractorOptions) {
        this.client = new OpenAI({ apiKey: env.openaiKey })
        this.profile = options.profile
        this.synapticWeb = options.synapticWeb
        this.throttleEveryN = options.throttleEveryN ?? 5
    }

    shouldExtract(): boolean {
        this.signalCount++
        return this.signalCount % this.throttleEveryN === 0
    }

    async extractFromTranscript(rawText: string): Promise<void> {
        if (!rawText || rawText.trim().length < 10) return

        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.2,
                max_tokens: 300,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: EXTRACTION_PROMPT },
                    { role: 'user', content: rawText },
                ],
            })

            const content = completion.choices[0]?.message?.content?.trim()
            if (!content) return

            let parsed: unknown
            try {
                parsed = JSON.parse(content)
            } catch {
                console.warn('[InsightExtractor] invalid JSON from OpenAI')
                return
            }

            const result = InsightSchema.safeParse(parsed)
            if (!result.success) {
                console.warn('[InsightExtractor] schema validation failed:', result.error.message)
                return
            }

            await this.persistInsights(result.data)
            console.log('[InsightExtractor] insights extracted and persisted')
        } catch (error) {
            console.warn('[InsightExtractor] extraction failed:', error)
        }
    }

    private async persistInsights(insights: ExtractedInsights): Promise<void> {
        for (const pattern of insights.dialect_patterns) {
            this.profile.appendToList('dialect_patterns', 'mappings', JSON.stringify(pattern), 30)
        }

        for (const merchant of insights.common_merchants) {
            this.profile.appendToList('common_merchants', 'list', merchant, 50)
        }

        const { region, dialect_notes } = insights.regional_hints
        if (region || dialect_notes) {
            this.profile.mergePreferences('regional_accent', {
                ...(region ? { region } : {}),
                ...(dialect_notes ? { dialect_notes } : {}),
            })
        }

        const insightSummary = [
            ...insights.dialect_patterns.map((p) => `gíria: ${p.slang} → ${p.meaning}`),
            ...insights.common_merchants.map((m) => `merchant: ${m}`),
            region ? `região: ${region}` : '',
        ].filter(Boolean).join('; ')

        if (insightSummary) {
            await this.synapticWeb.storeMemory({
                kind: 'user_insight',
                text: insightSummary,
                metadata: {
                    source: 'insight_extractor',
                    patterns_count: insights.dialect_patterns.length,
                    merchants_count: insights.common_merchants.length,
                },
            })
        }
    }
}
