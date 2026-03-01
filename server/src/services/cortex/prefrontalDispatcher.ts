import type { CortexSignalType, DispatcherDecision, DispatcherResult, OcrTraceInput } from './types.js'

interface DispatcherInput {
    signalType: CortexSignalType
    normalizedText: string
    ocrTrace?: OcrTraceInput | null
}

interface PrefrontalDispatcherOptions {
    reflexThreshold: number
}

type RoutedModule = DispatcherDecision['module']
type CryptoAction = NonNullable<DispatcherDecision['extracted']['cryptoAction']>

interface ModuleEvaluation {
    module: RoutedModule
    confidence: number
    strictParametersMet: boolean
    reason: string[]
    extracted: DispatcherDecision['extracted']
}

const FINANCE_KEYWORDS = [
    'fatura',
    'recibo',
    'talao',
    'despesa',
    'pagamento',
    'conta',
    'supermercado',
    'mercado',
    'compra',
    'uber',
    'continente',
    'lidl',
    'pingo doce',
    'mercearia',
    // meal / food
    'almoco',
    'jantar',
    'pequeno almoco',
    'lanche',
    'restaurante',
    'cafe',
    'pastelaria',
    'padaria',
    'fast food',
    // flowers / gifts
    'flores',
    'florista',
    'ramo',
    'bouquet',
    'prenda',
    'presente',
    // services
    'farmacia',
    'clinica',
    'consultorio',
    'gasolineira',
    'combustivel',
    'estacionamento',
    'portagem',
    'bilhete',
    'ingresso',
    'regista',
    'registar',
    'apontar',
]

const TODO_KEYWORDS = [
    'tarefa',
    'tarefas',
    'lembrete',
    'lembrar',
    'deadline',
    'urgente',
    'prioridade',
    'inbox',
]

const TODO_ACTION_VERBS = [
    'ligar',
    'marcar',
    'enviar',
    'pagar',
    'comprar',
    'cancelar',
    'agendar',
    'resolver',
    'terminar',
    'finalizar',
    'fazer',
    'reuniao',
]

const TODO_TEMPORAL_KEYWORDS = [
    'hoje',
    'amanha',
    'semana',
    'depois',
    'ate',
    'antes',
    'prazo',
    'deadline',
    'urgente',
]

const TODO_FILLER_WORDS = new Set([
    'o',
    'a',
    'os',
    'as',
    'de',
    'da',
    'do',
    'das',
    'dos',
    'um',
    'uma',
    'e',
    'ou',
    'para',
    'pra',
    'que',
    'me',
    'te',
    'nos',
    'na',
    'no',
    'em',
    'por',
    'favor',
    'hoje',
    'amanha',
])

const CRYPTO_KEYWORDS = [
    'bitcoin',
    'btc',
    'eth',
    'ethereum',
    'solana',
    'sol',
    'portfolio',
    'portefolio',
    'dca',
    'cripto',
    'crypto',
    'comprar cripto',
]

const CRYPTO_ACTION_KEYWORDS = [
    'comprar',
    'buy',
    'vender',
    'sell',
    'swap',
    'troca',
    'trocar',
    'dca',
    'rebalancear',
    'rebalance',
]

const LINKS_KEYWORDS = [
    'guarda este link',
    'guarda link',
    'guardar link',
    'bookmark',
    'link',
    'site',
    'site interessante',
    'guardar pagina',
]

const MERCHANT_PATTERNS = [
    /continente/i,
    /pingo\s*doce/i,
    /lidl/i,
    /aldi/i,
    /uber/i,
    /bolt/i,
    /meo/i,
    /vodafone/i,
    /edp/i,
    /amazon/i,
    /ikea/i,
    /decathlon/i,
]

const CRYPTO_SYMBOL_PATTERNS = /\b(BTC|ETH|SOL|USDT|USDC|BNB|XRP|DOGE|ADA|MATIC|AVAX|DOT|LINK)\b/i

const CRYPTO_SYMBOL_BY_NAME: Record<string, string> = {
    bitcoin: 'BTC',
    ethereum: 'ETH',
    solana: 'SOL',
    tether: 'USDT',
    cardano: 'ADA',
    dogecoin: 'DOGE',
    avalanche: 'AVAX',
    polkadot: 'DOT',
    chainlink: 'LINK',
    polygon: 'MATIC',
}

const LINK_URL_PATTERN = /((?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function keywordHits(text: string, keywords: string[]): string[] {
    return keywords.filter((keyword) => text.includes(keyword))
}

function hasKeyword(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword))
}

function parseLooseNumber(value: string): number | null {
    const parsed = Number(value.replace(',', '.'))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function extractAmount(text: string): number | null {
    const euroMatch = text.match(/(\d{1,5}(?:[.,]\d{1,2})?)\s*(€|eur)\b/i)
    if (euroMatch?.[1]) {
        const amount = Number(euroMatch[1].replace(',', '.'))
        return Number.isFinite(amount) ? amount : null
    }

    const plainMatch = text.match(/\b(\d{1,5}(?:[.,]\d{1,2})?)\b/)
    if (!plainMatch?.[1]) return null

    const amount = Number(plainMatch[1].replace(',', '.'))
    return Number.isFinite(amount) ? amount : null
}

// Generic place-type nouns used as fallback merchant extraction
// when no brand name is found in text
const GENERIC_PLACE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /restaurante(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'restaurante' },
    { pattern: /cafe(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'café' },
    { pattern: /pastelaria(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'pastelaria' },
    { pattern: /padaria(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'padaria' },
    { pattern: /florista(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'florista' },
    { pattern: /farmacia(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'farmácia' },
    { pattern: /clinica(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'clínica' },
    { pattern: /mercearia(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'mercearia' },
    { pattern: /supermercado(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'supermercado' },
    { pattern: /ginasio(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'ginásio' },
    { pattern: /cabeleireiro(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'cabeleireiro' },
    { pattern: /gasolineira(?:\s+d[ao]\s+[\w\s]{1,25})?/i, label: 'gasolineira' },
]

// ── Levenshtein Distance (for fuzzy merchant matching) ─────────────

function levenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,       // deletion
                dp[i][j - 1] + 1,       // insertion
                dp[i - 1][j - 1] + cost // substitution
            )
        }
    }
    return dp[m][n]
}

// Canonical merchant names for fuzzy matching (lowercase key → display name)
const KNOWN_MERCHANTS_DICT: Record<string, string> = {
    continente: 'Continente',
    'pingo doce': 'Pingo Doce',
    lidl: 'Lidl',
    aldi: 'Aldi',
    mercadona: 'Mercadona',
    uber: 'Uber',
    bolt: 'Bolt',
    meo: 'MEO',
    vodafone: 'Vodafone',
    edp: 'EDP',
    amazon: 'Amazon',
    ikea: 'IKEA',
    decathlon: 'Decathlon',
    fnac: 'FNAC',
    worten: 'Worten',
    zara: 'Zara',
    primark: 'Primark',
    'burger king': 'Burger King',
    mcdonalds: 'McDonald\'s',
    galp: 'Galp',
    nos: 'NOS',
    'sport zone': 'Sport Zone',
    starbucks: 'Starbucks',
    'el corte ingles': 'El Corte Inglés',
    intermarche: 'Intermarché',
    auchan: 'Auchan',
    'leroy merlin': 'Leroy Merlin',
    mediamarkt: 'MediaMarkt',
    hm: 'H&M',
    bershka: 'Bershka',
    springfield: 'Springfield',
    'wells': 'Wells',
    'pcdiga': 'PCDiga',
}

/**
 * Fuzzy-match a candidate string against known merchants.
 * Returns { canonical, distance } or null if no close match.
 * Max edit distance: 2 for words ≥ 4 chars, 1 for shorter.
 */
function fuzzyMatchMerchant(candidate: string): { canonical: string; distance: number } | null {
    const lower = candidate.toLowerCase().trim()
    if (!lower || lower.length < 2) return null

    // Exact match first
    if (KNOWN_MERCHANTS_DICT[lower]) {
        return { canonical: KNOWN_MERCHANTS_DICT[lower], distance: 0 }
    }

    const maxDist = lower.length >= 4 ? 2 : 1
    let bestMatch: string | null = null
    let bestDist = Infinity

    for (const [key, display] of Object.entries(KNOWN_MERCHANTS_DICT)) {
        // Skip if length difference is too large
        if (Math.abs(key.length - lower.length) > maxDist) continue

        const dist = levenshtein(lower, key)
        if (dist <= maxDist && dist < bestDist) {
            bestDist = dist
            bestMatch = display
        }
    }

    return bestMatch ? { canonical: bestMatch, distance: bestDist } : null
}

export type MerchantMatch = {
    name: string
    matchType: 'exact_brand' | 'generic_place' | 'fuzzy' | 'preposition' | 'ocr_trace'
    fuzzyCanonical?: string
    fuzzyDistance?: number
}

function extractMerchant(text: string, ocrTrace?: OcrTraceInput | null): string | null {
    const result = extractMerchantWithMeta(text, ocrTrace)
    return result?.name ?? null
}

function extractMerchantWithMeta(text: string, ocrTrace?: OcrTraceInput | null): MerchantMatch | null {
    // 1. Try known brand names first (exact regex match)
    for (const pattern of MERCHANT_PATTERNS) {
        const match = text.match(pattern)
        if (match?.[0]) {
            const raw = match[0].trim()
            // Normalize to canonical display name
            const fuzzy = fuzzyMatchMerchant(raw)
            return {
                name: fuzzy?.canonical ?? raw,
                matchType: 'exact_brand',
            }
        }
    }

    // 2. Try generic place-type nouns (e.g. 'restaurante da praça', 'florista')
    const normalized = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    for (const { pattern, label } of GENERIC_PLACE_PATTERNS) {
        const match = normalized.match(pattern)
        if (match?.[0]) {
            return {
                name: match[0].trim() || label,
                matchType: 'generic_place',
            }
        }
    }

    // 3. Extract candidate from prepositions (no/na/ao/à + word(s))
    //    "50€ no sítio novo" → "sítio novo"
    //    "cria despesa na fnad" → "fnad"
    const prepMatch = normalized.match(
        /\b(?:n[oa]s?|a[oa]s?|d[oa]s?|em|para o|para a)\s+([a-z][a-z\s]{1,30}?)(?:\s*$|\s+(?:com|de|por|para|hoje|amanha|ontem|e\s))/
    )
    const prepCandidate = prepMatch?.[1]?.trim()

    if (prepCandidate && prepCandidate.length >= 2) {
        // 3a. Fuzzy match the preposition candidate against known merchants
        const fuzzy = fuzzyMatchMerchant(prepCandidate)

        if (fuzzy && fuzzy.distance === 0) {
            // Exact match via preposition extraction
            return {
                name: fuzzy.canonical,
                matchType: 'exact_brand',
            }
        }

        if (fuzzy && fuzzy.distance > 0) {
            // Fuzzy match — prefix with ~ to signal "did you mean?"
            return {
                name: prepCandidate,
                matchType: 'fuzzy',
                fuzzyCanonical: fuzzy.canonical,
                fuzzyDistance: fuzzy.distance,
            }
        }

        // 3b. Unknown merchant — accept as-is from preposition
        //     Filter out common non-merchant words
        const NOT_MERCHANTS = new Set([
            'casa', 'mim', 'ti', 'ele', 'ela', 'voce', 'nos', 'eles',
            'isso', 'isto', 'aqui', 'ali', 'la', 'agora', 'depois',
            'tudo', 'nada', 'algo', 'muito', 'pouco', 'mais', 'menos',
        ])

        if (!NOT_MERCHANTS.has(prepCandidate)) {
            return {
                name: prepCandidate,
                matchType: 'preposition',
            }
        }
    }

    // 4. Try end-of-string extraction (user often puts merchant last)
    //    "50 euros fnac" or "despesa fnac"
    const words = normalized.split(/\s+/).filter(w => w.length >= 2)
    const lastWord = words[words.length - 1]
    if (lastWord && lastWord.length >= 3) {
        const fuzzy = fuzzyMatchMerchant(lastWord)
        if (fuzzy) {
            return {
                name: fuzzy.distance === 0 ? fuzzy.canonical : lastWord,
                matchType: fuzzy.distance === 0 ? 'exact_brand' : 'fuzzy',
                fuzzyCanonical: fuzzy.distance > 0 ? fuzzy.canonical : undefined,
                fuzzyDistance: fuzzy.distance > 0 ? fuzzy.distance : undefined,
            }
        }
    }

    // 5. Fall back to OCR trace merchant
    if (ocrTrace?.merchant?.trim()) {
        return {
            name: ocrTrace.merchant.trim(),
            matchType: 'ocr_trace',
        }
    }

    return null
}

// ── Wallet / Payment Method Extraction ─────────────────────────────

const WALLET_ALIAS_PATTERNS: Array<{ pattern: RegExp; hint: string }> = [
    { pattern: /\brevolut\b/i, hint: 'revolut' },
    { pattern: /\bmb\s*way\b/i, hint: 'mbway' },
    { pattern: /\bmultibanco\b/i, hint: 'multibanco' },
    { pattern: /\bcartao\s*(de\s*)?debito\b/i, hint: 'debit_card' },
    { pattern: /\bcartao\s*(de\s*)?credito\b/i, hint: 'credit_card' },
    { pattern: /\bcartao\s*(de\s*)?refeicao\b/i, hint: 'meal_card' },
    { pattern: /\b(sodexo|edenred|ticket\s*refeicao)\b/i, hint: 'meal_card' },
    { pattern: /\bdinheiro\b/i, hint: 'cash' },
    { pattern: /\bcash\b/i, hint: 'cash' },
    { pattern: /\bnumerario\b/i, hint: 'cash' },
    { pattern: /\btransferencia\b/i, hint: 'transfer' },
    { pattern: /\bpaypal\b/i, hint: 'paypal' },
    { pattern: /\bwise\b/i, hint: 'wise' },
    { pattern: /\bn26\b/i, hint: 'n26' },
    { pattern: /\bmoey\b/i, hint: 'moey' },
]

function extractWallet(text: string): string | null {
    const normalized = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    for (const { pattern, hint } of WALLET_ALIAS_PATTERNS) {
        if (pattern.test(normalized)) return hint
    }

    // Check for "com o/a [wallet name]" pattern
    const comMatch = normalized.match(/com\s+(?:o|a)\s+(?:meu\s+|minha\s+)?([\w\s]{2,20})(?:\.|,|$)/i)
    if (comMatch?.[1]) {
        const candidate = comMatch[1].trim()
        // Return the raw candidate — cortexRouter will match against user's wallet names
        if (candidate.length >= 2 && candidate.length <= 20) return candidate
    }

    return null
}

function extractTodoTitle(text: string): string | null {
    const collapsed = text.replace(/\s+/g, ' ').trim()
    if (!collapsed) return null

    const withoutPrefix = collapsed
        .replace(/^(lembra(?:[- ]me)?|anota|aponta|nota|preciso|quero)\s+/i, '')
        .trim()

    const normalized = withoutPrefix
        .replace(/\b(tarefa|lembrete)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    const title = normalized || collapsed
    return title.slice(0, 180)
}

function hasActionableTodoText(value: string | null): boolean {
    if (!value) return false

    const tokens = value
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !TODO_FILLER_WORDS.has(token))

    return tokens.length >= 2
}

function inferCryptoAction(text: string): CryptoAction {
    if (/\b(vender|venda|sell)\b/i.test(text)) return 'sell'
    if (/\b(swap|troca|trocar)\b/i.test(text)) return 'swap'
    if (/\b(comprar|buy|dca)\b/i.test(text)) return 'buy'
    return 'hold'
}

function extractCryptoSymbol(text: string): string | null {
    const direct = text.match(CRYPTO_SYMBOL_PATTERNS)?.[1]
    if (direct) return direct.toUpperCase()

    for (const [name, symbol] of Object.entries(CRYPTO_SYMBOL_BY_NAME)) {
        if (text.includes(name)) return symbol
    }

    return null
}

function extractCryptoAmount(text: string, symbol: string | null): number | null {
    if (symbol) {
        const lower = symbol.toLowerCase()
        const before = text.match(new RegExp(`(\\d{1,8}(?:[.,]\\d{1,8})?)\\s*${lower}\\b`, 'i'))?.[1]
        if (before) {
            const parsed = parseLooseNumber(before)
            if (parsed !== null) return parsed
        }

        const after = text.match(new RegExp(`${lower}\\s*(\\d{1,8}(?:[.,]\\d{1,8})?)\\b`, 'i'))?.[1]
        if (after) {
            const parsed = parseLooseNumber(after)
            if (parsed !== null) return parsed
        }
    }

    const fromAction = text.match(/\b(?:comprar|buy|vender|sell|dca)\s+(\d{1,8}(?:[.,]\d{1,8})?)/i)?.[1]
    if (fromAction) {
        const parsed = parseLooseNumber(fromAction)
        if (parsed !== null) return parsed
    }

    return null
}

function extractCryptoPrice(text: string): number | null {
    const priced = text.match(/(?:@|a|por)\s*(\d{1,8}(?:[.,]\d{1,4})?)\s*(€|eur|usd|usdt|\$)\b/i)?.[1]
    if (priced) {
        const parsed = parseLooseNumber(priced)
        if (parsed !== null) return parsed
    }

    const loose = text.match(/@\s*(\d{1,8}(?:[.,]\d{1,4})?)/i)?.[1]
    if (!loose) return null
    return parseLooseNumber(loose)
}

function inferCryptoQuoteCurrency(text: string): string | null {
    if (text.includes('€') || text.includes('eur')) return 'EUR'
    if (/\b(usd|usdt)\b/i.test(text) || text.includes('$')) return 'USD'
    return null
}

function normalizeLinkUrlCandidate(value: string): string | null {
    const trimmed = value
        .replace(/[),.;!?]+$/g, '')
        .trim()

    if (!trimmed) return null

    const normalized = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed.replace(/^www\./i, 'www.')}`

    try {
        const parsed = new URL(normalized)
        if (!parsed.hostname || !parsed.protocol.startsWith('http')) return null
        return parsed.toString()
    } catch {
        return null
    }
}

function extractLinkUrl(text: string): string | null {
    const candidate = text.match(LINK_URL_PATTERN)?.[1]
    if (!candidate) return null
    return normalizeLinkUrlCandidate(candidate)
}

function extractLinkTitle(text: string, url: string | null): string | null {
    if (!text.trim()) return null

    const withoutUrl = url
        ? text.replace(url, ' ')
        : text

    const cleaned = withoutUrl
        .replace(/\b(guarda|guardar|bookmark|link|site|pagina|este|esta)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    if (!cleaned) return null
    return cleaned.slice(0, 180)
}

function chooseBestModule(candidates: ModuleEvaluation[]): ModuleEvaluation {
    let chosen = candidates[0]
    for (const candidate of candidates.slice(1)) {
        if (candidate.confidence > chosen.confidence) {
            chosen = candidate
            continue
        }

        if (candidate.confidence === chosen.confidence && candidate.strictParametersMet && !chosen.strictParametersMet) {
            chosen = candidate
        }
    }
    return chosen
}

export class PrefrontalDispatcher {
    private readonly reflexThreshold: number

    constructor(options: PrefrontalDispatcherOptions) {
        this.reflexThreshold = clamp(options.reflexThreshold, 0, 1)
    }

    private evaluateFinance(input: DispatcherInput): ModuleEvaluation {
        const normalized = input.normalizedText
        const detectedKeywords = keywordHits(normalized, FINANCE_KEYWORDS)
        const amount = extractAmount(normalized) ?? input.ocrTrace?.amount ?? null
        const merchantMatch = extractMerchantWithMeta(normalized, input.ocrTrace)
        const merchant = merchantMatch?.name ?? null
        const currency = normalized.includes('€') || normalized.includes('eur')
            ? 'EUR'
            : (input.ocrTrace?.currency ?? null)

        const hasInvoiceSignal = detectedKeywords.length > 0
        const hasAmountSignal = amount !== null
        const hasMerchantSignal = Boolean(merchant)
        const strictParametersMet = hasInvoiceSignal && hasAmountSignal && hasMerchantSignal

        // Imperative verb detection: explicit action commands are unambiguous orders
        const hasImperativeVerb = /\b(cria|adiciona|regista|insere|anota|mete|poe|coloca|lanca|gasta[r]?|pague[i]?|pago[u]?)\b/i.test(normalized)

        const keywordScore = Math.min(1, detectedKeywords.length / 3)
        const amountScore = hasAmountSignal ? 1 : 0
        const merchantScore = hasMerchantSignal ? 1 : 0
        const ocrBoost = input.signalType === 'ocr' ? 0.08 : 0
        const ocrConfidenceBoost = input.ocrTrace?.confidence ? input.ocrTrace.confidence * 0.12 : 0
        // Hard override: imperative verb + amount + merchant = unambiguous finance command
        const imperativeBoost = hasImperativeVerb && hasAmountSignal ? 0.15 : 0

        const confidence = clamp(
            (keywordScore * 0.42) +
            (amountScore * 0.30) +
            (merchantScore * 0.20) +
            ocrBoost +
            ocrConfidenceBoost +
            imperativeBoost,
            0,
            1
        )

        const reason: string[] = [
            'module=FinanceModule',
            `keyword_hits=${detectedKeywords.length}`,
            `amount_detected=${hasAmountSignal ? 'yes' : 'no'}`,
            `merchant_detected=${hasMerchantSignal ? 'yes' : 'no'}`,
            `imperative_verb=${hasImperativeVerb ? 'yes' : 'no'}`,
            `strict_parameters=${strictParametersMet ? 'yes' : 'no'}`,
            `confidence=${confidence.toFixed(3)}`,
        ]

        if (merchantMatch) {
            reason.push(`merchant_match_type=${merchantMatch.matchType}`)
            if (merchantMatch.matchType === 'fuzzy' && merchantMatch.fuzzyCanonical) {
                reason.push(`did_you_mean=${merchantMatch.fuzzyCanonical}`)
                reason.push(`fuzzy_distance=${merchantMatch.fuzzyDistance}`)
            }
            if (merchantMatch.matchType === 'preposition') {
                reason.push(`unknown_merchant_accepted=${merchantMatch.name}`)
            }
        }

        return {
            module: 'FinanceModule',
            confidence,
            strictParametersMet,
            reason,
            extracted: {
                merchant,
                merchantMeta: merchantMatch ? {
                    matchType: merchantMatch.matchType,
                    fuzzyCanonical: merchantMatch.fuzzyCanonical,
                    fuzzyDistance: merchantMatch.fuzzyDistance,
                } : null,
                amount,
                currency,
                keywords: detectedKeywords,
                todoTitle: null,
                cryptoAction: null,
                cryptoSymbol: null,
                cryptoAmount: null,
                cryptoPrice: null,
                linkUrl: null,
                linkTitle: null,
                walletHint: extractWallet(normalized),
            },
        }
    }

    private evaluateTodo(input: DispatcherInput): ModuleEvaluation {
        const normalized = input.normalizedText
        const detectedKeywords = keywordHits(normalized, TODO_KEYWORDS)
        const hasTodoKeyword = detectedKeywords.length > 0
        const hasActionSignal = hasKeyword(normalized, TODO_ACTION_VERBS)
        const hasTemporalSignal = hasKeyword(normalized, TODO_TEMPORAL_KEYWORDS)
        const todoTitle = extractTodoTitle(normalized)
        const hasActionableText = hasActionableTodoText(todoTitle)
        const strictParametersMet = hasActionableText && (
            hasTodoKeyword ||
            (hasActionSignal && hasTemporalSignal)
        )

        const keywordScore = Math.min(1, detectedKeywords.length / 2)
        const actionScore = hasActionSignal ? 1 : 0
        const temporalScore = hasTemporalSignal ? 1 : 0
        const textScore = hasActionableText ? 1 : 0
        const voiceBoost = input.signalType === 'voice' ? 0.06 : 0

        const confidence = clamp(
            (keywordScore * 0.46) +
            (actionScore * 0.24) +
            (temporalScore * 0.20) +
            (textScore * 0.10) +
            voiceBoost,
            0,
            1
        )

        const reason: string[] = [
            'module=TodoModule',
            `keyword_hits=${detectedKeywords.length}`,
            `action_signal=${hasActionSignal ? 'yes' : 'no'}`,
            `temporal_signal=${hasTemporalSignal ? 'yes' : 'no'}`,
            `strict_parameters=${strictParametersMet ? 'yes' : 'no'}`,
            `confidence=${confidence.toFixed(3)}`,
        ]

        return {
            module: 'TodoModule',
            confidence,
            strictParametersMet,
            reason,
            extracted: {
                merchant: null,
                amount: null,
                currency: null,
                keywords: detectedKeywords,
                todoTitle,
                cryptoAction: null,
                cryptoSymbol: null,
                cryptoAmount: null,
                cryptoPrice: null,
                linkUrl: null,
                linkTitle: null,
                walletHint: null,
            },
        }
    }

    private evaluateCrypto(input: DispatcherInput): ModuleEvaluation {
        const normalized = input.normalizedText
        const detectedKeywords = keywordHits(normalized, CRYPTO_KEYWORDS)
        const hasActionSignal = hasKeyword(normalized, CRYPTO_ACTION_KEYWORDS)
        const symbol = extractCryptoSymbol(normalized)
        const amount = extractCryptoAmount(normalized, symbol)
        const price = extractCryptoPrice(normalized)
        const quoteCurrency = inferCryptoQuoteCurrency(normalized)
        const action = inferCryptoAction(normalized)
        const hasIntentSignal = detectedKeywords.length > 0 || symbol !== null
        const strictParametersMet = hasIntentSignal && (hasActionSignal || symbol !== null)

        const keywordScore = Math.min(1, detectedKeywords.length / 2)
        const symbolScore = symbol ? 1 : 0
        const actionScore = hasActionSignal ? 1 : 0
        const amountScore = amount !== null ? 1 : 0
        const priceScore = price !== null ? 1 : 0
        const voiceBoost = input.signalType === 'voice' ? 0.04 : 0

        const confidence = clamp(
            (keywordScore * 0.34) +
            (symbolScore * 0.26) +
            (actionScore * 0.20) +
            (amountScore * 0.12) +
            (priceScore * 0.08) +
            voiceBoost,
            0,
            1
        )

        const reason: string[] = [
            'module=CryptoModule',
            `keyword_hits=${detectedKeywords.length}`,
            `action_signal=${hasActionSignal ? 'yes' : 'no'}`,
            `symbol_detected=${symbol ? 'yes' : 'no'}`,
            `amount_detected=${amount !== null ? 'yes' : 'no'}`,
            `strict_parameters=${strictParametersMet ? 'yes' : 'no'}`,
            `quote_currency=${quoteCurrency ?? 'null'}`,
            `crypto_action=${action}`,
            `confidence=${confidence.toFixed(3)}`,
        ]

        return {
            module: 'CryptoModule',
            confidence,
            strictParametersMet,
            reason,
            extracted: {
                merchant: null,
                amount: null,
                currency: quoteCurrency,
                keywords: detectedKeywords,
                todoTitle: null,
                cryptoAction: action,
                cryptoSymbol: symbol,
                cryptoAmount: amount,
                cryptoPrice: price,
                linkUrl: null,
                linkTitle: null,
                walletHint: null,
            },
        }
    }

    private evaluateLinks(input: DispatcherInput): ModuleEvaluation {
        const normalized = input.normalizedText
        const detectedKeywords = keywordHits(normalized, LINKS_KEYWORDS)
        const linkUrl = extractLinkUrl(normalized)
        const linkTitle = extractLinkTitle(normalized, linkUrl)
        const hasLinkKeyword = detectedKeywords.length > 0
        const hasLinkIntent = hasLinkKeyword || /\b(link|url|site|bookmark|pagina)\b/i.test(normalized)
        const hasUrlSignal = linkUrl !== null
        const strictParametersMet = hasUrlSignal && hasLinkIntent

        const keywordScore = Math.min(1, detectedKeywords.length / 2)
        const intentScore = hasLinkIntent ? 1 : 0
        const urlScore = hasUrlSignal ? 1 : 0
        const titleScore = linkTitle ? 1 : 0
        const voiceBoost = input.signalType === 'voice' ? 0.03 : 0

        const confidence = clamp(
            (keywordScore * 0.34) +
            (intentScore * 0.18) +
            (urlScore * 0.38) +
            (titleScore * 0.10) +
            voiceBoost,
            0,
            1
        )

        const reason: string[] = [
            'module=LinksModule',
            `keyword_hits=${detectedKeywords.length}`,
            `link_intent=${hasLinkIntent ? 'yes' : 'no'}`,
            `url_detected=${hasUrlSignal ? 'yes' : 'no'}`,
            `strict_parameters=${strictParametersMet ? 'yes' : 'no'}`,
            `confidence=${confidence.toFixed(3)}`,
        ]

        return {
            module: 'LinksModule',
            confidence,
            strictParametersMet,
            reason,
            extracted: {
                merchant: null,
                amount: null,
                currency: null,
                keywords: detectedKeywords,
                todoTitle: null,
                cryptoAction: null,
                cryptoSymbol: null,
                cryptoAmount: null,
                cryptoPrice: null,
                linkUrl,
                linkTitle,
                walletHint: null,
            },
        }
    }

    evaluate(input: DispatcherInput): DispatcherResult {
        // ── INTENT GATEKEEPER ──────────────────────────────────────
        // PhD Behavioral layer: Detect conversational meta-talk and
        // short-circuit to OpenAIModule BEFORE module evaluation.
        // This prevents execution-bias false positives.
        const conversational = this.isConversational(input)
        if (conversational) {
            return {
                module: 'OpenAIModule',
                strategy: 'semantic_deep_dive',
                confidence: 0.0,
                reason: [
                    'intent_gatekeeper=conversational',
                    ...conversational.signals,
                    'action=bypass_module_routing',
                ],
                strictParametersMet: false,
                extracted: {
                    merchant: null,
                    amount: null,
                    currency: null,
                    keywords: [],
                    todoTitle: null,
                    cryptoAction: null,
                    cryptoSymbol: null,
                    cryptoAmount: null,
                    cryptoPrice: null,
                    linkUrl: null,
                    linkTitle: null,
                    walletHint: null,
                },
            }
        }

        const finance = this.evaluateFinance(input)
        const todo = this.evaluateTodo(input)
        const crypto = this.evaluateCrypto(input)
        const links = this.evaluateLinks(input)
        const chosen = chooseBestModule([finance, todo, crypto, links])

        // ── MINIMUM CONFIDENCE GATE ────────────────────────────────
        // If the best module scored below 0.12, no module has a real
        // signal. Route to OpenAI for natural conversation.
        if (chosen.confidence < 0.12) {
            return {
                module: 'OpenAIModule',
                strategy: 'semantic_deep_dive',
                confidence: 0.0,
                reason: [
                    'intent_gatekeeper=low_confidence_fallback',
                    `best_module=${chosen.module}`,
                    `best_confidence=${chosen.confidence.toFixed(3)}`,
                    'action=bypass_module_routing',
                ],
                strictParametersMet: false,
                extracted: chosen.extracted,
            }
        }

        const strategy = chosen.confidence >= this.reflexThreshold && chosen.strictParametersMet
            ? 'tactical_reflex'
            : 'semantic_deep_dive'

        return {
            module: chosen.module,
            strategy,
            confidence: chosen.confidence,
            reason: [
                `selected_module=${chosen.module}`,
                `finance_confidence=${finance.confidence.toFixed(3)}`,
                `todo_confidence=${todo.confidence.toFixed(3)}`,
                `crypto_confidence=${crypto.confidence.toFixed(3)}`,
                `links_confidence=${links.confidence.toFixed(3)}`,
                ...chosen.reason,
                `threshold=${this.reflexThreshold.toFixed(3)}`,
            ],
            strictParametersMet: chosen.strictParametersMet,
            extracted: chosen.extracted,
        }
    }

    // ── Conversational Intent Detection ────────────────────────────

    private isConversational(input: DispatcherInput): { signals: string[] } | null {
        const text = input.normalizedText
        const signals: string[] = []

        // ── PRIORITY: Action Command Override ──────────────────────
        // If the input contains ANY module keyword or action verb,
        // it is NOT conversational — even if it also matches chat patterns.
        // "cria uma despesa de 36€ no continente" MUST route to Finance.
        const ACTION_IMPERATIVE_VERBS = [
            'cria', 'criar', 'adiciona', 'adicionar', 'regista', 'registar',
            'mete', 'meter', 'apontar', 'aponta', 'guarda', 'guardar',
            'anota', 'anotar', 'remove', 'remover', 'apaga', 'apagar',
            'edita', 'editar', 'atualiza', 'atualizar', 'cancela', 'cancelar',
        ]
        const hasActionVerb = ACTION_IMPERATIVE_VERBS.some(v => text.includes(v))
        const hasModuleKeyword = hasKeyword(text, [
            ...FINANCE_KEYWORDS, ...TODO_KEYWORDS, ...TODO_ACTION_VERBS,
            ...CRYPTO_KEYWORDS, ...CRYPTO_ACTION_KEYWORDS, ...LINKS_KEYWORDS,
        ])

        if (hasActionVerb || hasModuleKeyword) {
            return null  // Has action intent → NOT conversational
        }

        // 1. Check for Primary Keys — if ANY exist, this is NOT conversational
        const hasUrl = LINK_URL_PATTERN.test(text)
        const hasAmount = extractAmount(text) !== null
        const hasCryptoSymbol = CRYPTO_SYMBOL_PATTERNS.test(text)
        const hasMerchant = MERCHANT_PATTERNS.some(p => p.test(text))

        if (hasUrl || hasAmount || hasCryptoSymbol || hasMerchant) {
            return null  // Has actionable data → NOT conversational
        }

        // 2. Detect conversational patterns
        const conversationalPatterns = [
            // Greetings
            /^(ola|oi|bom dia|boa tarde|boa noite|hey|hi|hello|e ai)\b/i,
            // Meta-talk (talking TO the system)
            /\b(como (e que )?(te sentes|estas|vai|funciona)|o que (es|fazes)|quem es)\b/i,
            // Testing/probing
            /\b(testar|teste|testing|estas ai|funciona[s]?|ouve[s]?|consegues)\b/i,
            // Emotional/reflective
            /\b(obrigad[oa]|gost[oe]|adoro|parabens|bom trabalho|fixe|brutal|excelente)\b/i,
            // Questions about self/system
            /\b(buggy|symbiote|sistema|cortex|como te chamas|qual e? o teu)\b/i,
            // Casual banter
            /\b(piada|joke|conta[- ]me|fala[- ]me|diz[- ]me algo|opini[ao]o)\b/i,
            // Existential/philosophical
            /\b(sentir|pensar|consciencia|alma|viv[oe]|exist[ei]|sonhar)\b/i,
        ]

        for (const pattern of conversationalPatterns) {
            if (pattern.test(text)) {
                signals.push(`conversational_pattern=${pattern.source.slice(0, 40)}`)
            }
        }

        // 3. Very short messages with no action verbs are likely conversational
        const wordCount = text.trim().split(/\s+/).length
        if (wordCount <= 4 && !hasKeyword(text, [...FINANCE_KEYWORDS, ...TODO_ACTION_VERBS, ...CRYPTO_ACTION_KEYWORDS])) {
            signals.push(`short_message_no_action_verbs_words=${wordCount}`)
        }

        // 4. Questions without module context
        if (/\?$/.test(text.trim()) && !hasKeyword(text, [...FINANCE_KEYWORDS, ...TODO_KEYWORDS, ...CRYPTO_KEYWORDS, ...LINKS_KEYWORDS])) {
            signals.push('question_without_module_context')
        }

        // Threshold: need at least 1 conversational signal
        return signals.length > 0 ? { signals } : null
    }
}
