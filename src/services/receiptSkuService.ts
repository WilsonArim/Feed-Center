const STOPWORDS = new Set([
    'x',
    'un',
    'und',
    'uni',
    'unid',
    'emb',
    'cx',
    'pack',
    'pct',
    'iva',
    'promo',
    'promocao',
    'promocaoo',
    'desc',
    'desconto',
    'art',
    'ref',
    'codigo',
    'cod',
    'item',
    'prod',
    'produto',
])

function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s.,/-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function normalizeMeasureToken(value: number, unit: string): string | null {
    if (!Number.isFinite(value) || value <= 0) return null

    const normalizedUnit = unit.toLowerCase()
    if (normalizedUnit === 'kg') return `${Math.round(value * 1000)}g`
    if (normalizedUnit === 'g' || normalizedUnit === 'gr') return `${Math.round(value)}g`
    if (normalizedUnit === 'l' || normalizedUnit === 'lt') return `${Math.round(value * 1000)}ml`
    if (normalizedUnit === 'cl') return `${Math.round(value * 10)}ml`
    if (normalizedUnit === 'ml') return `${Math.round(value)}ml`
    if (normalizedUnit === 'un' || normalizedUnit === 'und' || normalizedUnit === 'uni') return `${Math.round(value)}un`
    return null
}

function extractMeasureHints(text: string): string[] {
    const matches = [...text.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(kg|g|gr|l|lt|cl|ml|un|und|uni)\b/gi)]
    const hints: string[] = []
    for (const match of matches) {
        const rawValue = match[1]
        const rawUnit = match[2]
        if (!rawValue || !rawUnit) continue
        const value = Number(rawValue.replace(',', '.'))
        const token = normalizeMeasureToken(value, rawUnit)
        if (token) hints.push(token)
    }
    return [...new Set(hints)].slice(0, 2)
}

export function normalizeSkuKey(description: string): string {
    const normalized = normalizeText(description)
    if (!normalized) return 'item-desconhecido'

    const measureHints = extractMeasureHints(normalized)
    const textWithoutMeasures = normalized.replace(/\b\d+(?:[.,]\d+)?\s*(kg|g|gr|l|lt|cl|ml|un|und|uni)\b/gi, ' ')
    const tokens = textWithoutMeasures
        .split(' ')
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => token.length >= 2)
        .filter((token) => !STOPWORDS.has(token))
        .filter((token) => !/^\d+$/.test(token))

    const canonicalTokens = tokens.slice(0, 4)
    if (canonicalTokens.length === 0 && measureHints.length === 0) {
        return 'item-desconhecido'
    }

    const key = [...canonicalTokens, ...measureHints].join('-')
    return key.slice(0, 96)
}

