/**
 * Continuous Learner — Law 4: Organic Evolution (Part 2)
 *
 * Upgraded InsightExtractor. Runs on EVERY signal with tiered extraction:
 *
 *   Tier 1 (every signal)  — local-only: dialect patterns + merchants
 *   Tier 2 (every 3rd)     — gpt-4o-mini: mood/sentiment classification
 *   Tier 3 (every 10th)    — gpt-4o-mini: biographical extraction + intent patterns
 *
 * All tiers write to SovereignProfile. Tier 3 triggers AdaptivePrompt.rebuild().
 */

import OpenAI from 'openai'
import { z } from 'zod'
import { env } from '../../config.js'
import type { AdaptivePrompt } from './adaptivePrompt.js'
import type { SovereignProfile } from './sovereignProfile.js'
import type { SynapticWeb } from './synapticWeb.js'

// ── Tier 1: Local pattern extraction (no API call) ─────────────────

const KNOWN_SLANG: Array<{ pattern: RegExp; slang: string; meaning: string }> = [
    { pattern: /\bbue\b/, slang: 'bué', meaning: 'muito' },
    { pattern: /\bta\b/, slang: 'tá', meaning: 'está' },
    { pattern: /\bbro\b/, slang: 'bro', meaning: 'amigo' },
    { pattern: /\bmano\b/, slang: 'mano', meaning: 'amigo/irmão' },
    { pattern: /\bya\b/, slang: 'ya', meaning: 'sim' },
    { pattern: /\bfixe\b/, slang: 'fixe', meaning: 'bom/legal' },
    { pattern: /\bcena\b/, slang: 'cena', meaning: 'coisa/situação' },
    { pattern: /\bganda\b/, slang: 'ganda', meaning: 'grande' },
    { pattern: /\bbenas\b/, slang: 'benas', meaning: 'ok/tudo bem' },
    { pattern: /\bstora\b/, slang: 'stôra', meaning: 'professora' },
    { pattern: /\bmaluca(gem)?\b/, slang: 'malucagem', meaning: 'loucura' },
    { pattern: /\bchavalo\b/, slang: 'chavalo', meaning: 'rapaz' },
]

const MERCHANT_PATTERNS = [
    /\b(continente|pingo\s*doce|lidl|aldi|mercadona|intermarche)\b/i,
    /\b(uber|bolt|free\s*now|kapten)\b/i,
    /\b(meo|nos|vodafone|nowo)\b/i,
    /\b(edp|galp|repsol|cepsa)\b/i,
    /\b(amazon|ikea|decathlon|primark|zara|worten|fnac)\b/i,
    /\b(mcdonalds|burger\s*king|kfc|pizza\s*hut|telepizza)\b/i,
    /\b(spotify|netflix|hbo|disney|apple|google)\b/i,
]

function extractLocalPatterns(text: string): { slangs: Array<{ slang: string; meaning: string }>; merchants: string[] } {
    const lower = text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const slangs: Array<{ slang: string; meaning: string }> = []
    for (const entry of KNOWN_SLANG) {
        if (entry.pattern.test(lower)) {
            slangs.push({ slang: entry.slang, meaning: entry.meaning })
        }
    }

    const merchants: string[] = []
    for (const pattern of MERCHANT_PATTERNS) {
        const match = text.match(pattern)
        if (match?.[1]) {
            merchants.push(match[1].trim())
        }
    }

    return { slangs, merchants }
}

// ── Tier 2: Sentiment classification ───────────────────────────────

const SentimentSchema = z.object({
    sentiment: z.enum(['positive', 'neutral', 'negative', 'frustrated']),
    score: z.number().min(-1).max(1),
})

async function classifySentiment(client: OpenAI, text: string): Promise<{ sentiment: string; score: number } | null> {
    try {
        const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            max_tokens: 30,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'Classifica o sentimento do texto. Devolve JSON: {"sentiment":"positive|neutral|negative|frustrated","score":float(-1 a 1)}',
                },
                { role: 'user', content: text.slice(0, 300) },
            ],
        })

        const content = completion.choices[0]?.message?.content?.trim()
        if (!content) return null

        const parsed = SentimentSchema.safeParse(JSON.parse(content))
        return parsed.success ? parsed.data : null
    } catch {
        return null
    }
}

// ── Tier 3: Biographical extraction ────────────────────────────────

const BiographicalSchema = z.object({
    dates_mentioned: z.array(z.object({
        label: z.string(),
        date: z.string(),
        type: z.enum(['birthday', 'anniversary', 'recurring']),
    })).max(3).default([]),
    people_referenced: z.array(z.string()).max(5).default([]),
    intent_patterns: z.array(z.string()).max(3).default([]),
})

async function extractBiographical(client: OpenAI, text: string): Promise<z.infer<typeof BiographicalSchema> | null> {
    try {
        const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.1,
            max_tokens: 200,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: [
                        'Extrai informação biográfica do texto. Devolve APENAS JSON:',
                        '- dates_mentioned: [{label, date (MM-DD), type: birthday|anniversary|recurring}]',
                        '- people_referenced: ["nome1", "nome2"]',
                        '- intent_patterns: ["padrão1"] (hábitos ou rotinas implícitas)',
                        'Se não houver informação clara, devolve arrays vazios.',
                    ].join('\n'),
                },
                { role: 'user', content: text.slice(0, 500) },
            ],
        })

        const content = completion.choices[0]?.message?.content?.trim()
        if (!content) return null

        const parsed = BiographicalSchema.safeParse(JSON.parse(content))
        return parsed.success ? parsed.data : null
    } catch {
        return null
    }
}

// ── Main Class ──────────────────────────────────────────────────────

export interface ContinuousLearnerOptions {
    profile: SovereignProfile
    synapticWeb: SynapticWeb
    adaptivePrompt: AdaptivePrompt
}

export class ContinuousLearner {
    private readonly client: OpenAI
    private readonly profile: SovereignProfile
    private readonly synapticWeb: SynapticWeb
    private readonly adaptivePrompt: AdaptivePrompt
    private signalCount = 0

    constructor(options: ContinuousLearnerOptions) {
        this.client = new OpenAI({ apiKey: env.openaiKey })
        this.profile = options.profile
        this.synapticWeb = options.synapticWeb
        this.adaptivePrompt = options.adaptivePrompt
    }

    /**
     * Process a signal through all applicable tiers.
     * Non-blocking — errors are caught and logged, never thrown.
     */
    async observe(rawText: string): Promise<void> {
        if (!rawText || rawText.trim().length < 5) return
        this.signalCount++

        // Tier 1: Always — local only
        this.observeTier1(rawText)

        // Tier 2: Every 3rd signal — sentiment
        if (this.signalCount % 3 === 0) {
            this.observeTier2(rawText).catch(() => { })
        }

        // Tier 3: Every 10th signal — biographical + prompt rebuild
        if (this.signalCount % 10 === 0) {
            this.observeTier3(rawText).catch(() => { })
        }
    }

    // ── Tier 1: Local ──────────────────────────────────────────────

    private observeTier1(rawText: string): void {
        const { slangs, merchants } = extractLocalPatterns(rawText)

        for (const entry of slangs) {
            this.profile.appendToList('dialect_patterns', 'mappings', JSON.stringify(entry), 30)
        }

        for (const merchant of merchants) {
            this.profile.appendToList('common_merchants', 'list', merchant, 50)
        }
    }

    // ── Tier 2: Sentiment ──────────────────────────────────────────

    private async observeTier2(rawText: string): Promise<void> {
        const result = await classifySentiment(this.client, rawText)
        if (!result) return

        // Rolling average of sentiment
        const existing = this.profile.get('mood_baseline')
        const prevAvg = typeof existing?.avg_sentiment === 'number' ? existing.avg_sentiment : 0
        const prevCount = typeof existing?.sample_count === 'number' ? existing.sample_count : 0
        const newCount = prevCount + 1
        const newAvg = (prevAvg * prevCount + result.score) / newCount

        this.profile.set('mood_baseline', {
            avg_sentiment: Number(newAvg.toFixed(4)),
            last_sentiment: result.sentiment,
            last_score: result.score,
            sample_count: newCount,
            last_updated: new Date().toISOString(),
        })
    }

    // ── Tier 3: Biographical + Prompt Rebuild ──────────────────────

    private async observeTier3(rawText: string): Promise<void> {
        const bio = await extractBiographical(this.client, rawText)
        if (!bio) return

        // Store biographical dates
        if (bio.dates_mentioned.length > 0) {
            for (const date of bio.dates_mentioned) {
                this.profile.appendToList('biographical_dates', 'dates', JSON.stringify(date), 20)
            }

            // Also store as memory
            for (const date of bio.dates_mentioned) {
                await this.synapticWeb.storeMemory({
                    kind: 'biographical_event',
                    text: `${date.type}: ${date.label} on ${date.date}`,
                    metadata: {
                        source: 'continuous_learner_tier3',
                        label: date.label,
                        date: date.date,
                        type: date.type,
                    },
                })
            }
        }

        // Store people references
        if (bio.people_referenced.length > 0) {
            for (const person of bio.people_referenced) {
                this.profile.appendToList('known_people', 'names', person, 30)
            }
        }

        // Store intent patterns
        if (bio.intent_patterns.length > 0) {
            for (const pattern of bio.intent_patterns) {
                this.profile.appendToList('observed_intents', 'patterns', pattern, 20)
            }
        }

        // Trigger adaptive prompt rebuild
        this.adaptivePrompt.rebuild()
        console.log('[ContinuousLearner] Tier 3 complete, adaptive prompt rebuilt.')
    }
}
