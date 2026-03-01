import OpenAI from 'openai'
import { z } from 'zod'
import { env } from '../../config.js'
import type { DispatcherDecision } from './types.js'

const ParsedSemanticIntentSchema = z.object({
    module: z.enum(['FinanceModule', 'TodoModule', 'CryptoModule', 'LinksModule', 'OpenAIModule']),
    strategy: z.enum(['tactical_reflex', 'semantic_deep_dive']),
    confidence: z.number().min(0).max(1),
    strictParametersMet: z.boolean(),
    reason: z.array(z.string()).max(24).default([]),
    missingFields: z.array(z.string()).max(12).default([]),
    extracted: z.object({
        merchant: z.string().nullable().default(null),
        amount: z.number().nullable().default(null),
        currency: z.string().nullable().default(null),
        keywords: z.array(z.string()).max(24).default([]),
        todoTitle: z.string().nullable().default(null),
        cryptoAction: z.enum(['buy', 'sell', 'swap', 'hold']).nullable().default(null),
        cryptoSymbol: z.string().nullable().default(null),
        cryptoAmount: z.number().nullable().default(null),
        cryptoPrice: z.number().nullable().default(null),
        linkUrl: z.string().nullable().default(null),
        linkTitle: z.string().nullable().default(null),
        walletHint: z.string().nullable().default(null),
    }),
}).strict()

export type ParsedSemanticIntent = z.infer<typeof ParsedSemanticIntentSchema>

interface OpenAIParserInput {
    rawText: string
    normalizedText: string
    contextMarkdown: string
    dispatcherHint: DispatcherDecision
}

const SYSTEM_PROMPT = [
    'Tu és o Buggy — Sovereign Symbiote e centro neural do Feed Center.',
    'Neste modo operas como parser determinístico de intenção.',
    'Tens um doutoramento em Psicologia Comportamental: lês entre linhas, deduzes intenção implícita, e nunca ignoras contexto emocional.',
    '',
    'REGRAS DE PARSING:',
    '- Devolve APENAS JSON válido, sem markdown e sem texto adicional.',
    '- Módulos: FinanceModule, TodoModule, CryptoModule, LinksModule, OpenAIModule.',
    '- `strategy=tactical_reflex` quando tens dados suficientes para ação imediata.',
    '- `strategy=semantic_deep_dive` quando precisas de mais contexto.',
    '- `confidence` precisa: 0.5=incerto, 0.8=provável, 0.95=certo.',
    '- `reason` deve conter notas curtas e técnicas.',
    '- Nunca inventes valores numéricos sem evidência textual.',
    '- Se o sinal for ambíguo e sem intenção acionável, devolve OpenAIModule + semantic_deep_dive.',
    '',
    'FILOSOFIA "BE LIKE WATER":',
    '- Deduz tudo o que for possível antes de marcar como missing.',
    '- "50 no Lidl" → merchant=Lidl, amount=50, currency=EUR, category=Supermercado. Sem perguntas.',
    '- "comprei café" → FinanceModule, merchant=null, amount=null, missingFields=[amount,merchant].',
    '- Uma foto de talão com dados OCR → FinanceModule com dados pré-extraídos no ocrTrace.',
    '- Se o utilizador usa vocabulário informal, adapta a confiança mas mantém a precisão.',
].join('\n')

export function injectUserContext(basePrompt: string, profileContext: string): string {
    if (!profileContext || profileContext.trim().length === 0) return basePrompt
    return `${profileContext}\n\n${basePrompt}`
}

function normalizeParsedIntent(parsed: ParsedSemanticIntent): ParsedSemanticIntent {
    return {
        ...parsed,
        reason: parsed.reason.length > 0 ? parsed.reason : ['source=openai_parser'],
        missingFields: Array.from(new Set(parsed.missingFields.map((field) => field.trim()).filter(Boolean))).slice(0, 12),
    }
}

export class OpenAIParser {
    private readonly client: OpenAI

    constructor() {
        this.client = new OpenAI({ apiKey: env.openaiKey })
    }

    async parseSemanticIntent(input: OpenAIParserInput): Promise<ParsedSemanticIntent | null> {
        const payload = {
            raw_text: input.rawText,
            normalized_text: input.normalizedText,
            context_markdown: input.contextMarkdown,
            dispatcher_hint: {
                module: input.dispatcherHint.module,
                strategy: input.dispatcherHint.strategy,
                confidence: input.dispatcherHint.confidence,
                strictParametersMet: input.dispatcherHint.strictParametersMet,
                reason: input.dispatcherHint.reason,
                extracted: input.dispatcherHint.extracted,
            },
        }

        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.1,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: JSON.stringify(payload) },
                ],
            })

            const content = completion.choices[0]?.message?.content?.trim()
            if (!content) return null

            let parsedJson: unknown
            try {
                parsedJson = JSON.parse(content)
            } catch {
                return null
            }

            const parsed = ParsedSemanticIntentSchema.safeParse(parsedJson)
            if (!parsed.success) return null
            return normalizeParsedIntent(parsed.data)
        } catch (error) {
            console.warn('[OpenAIParser] semantic parsing failed:', error)
            return null
        }
    }
}

export const openaiParser = new OpenAIParser()
