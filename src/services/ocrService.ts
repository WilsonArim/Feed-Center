import { inferEntryFromText } from './aiFinancialService'
import type { EntryType } from '../types'
import { normalizeSkuKey } from './receiptSkuService'

export type OCREngine = 'vision' | 'local'

export interface OCRAmount {
    amount: number
    currency: string
}

interface OCRSuggestion {
    type: EntryType
    category: string
    confidence: number
    source: 'heuristic'
}

export interface OCRReceiptItem {
    rawLine: string
    description: string
    quantity: number
    lineTotal: number
    unitPrice: number | null
    skuKey: string
}

export interface OCRResult {
    merchant: string | null
    nif: string | null
    date: string | null
    total: OCRAmount | null
    items: string[]
    receiptItems: OCRReceiptItem[]
    confidence: number
    suggestion: OCRSuggestion | null
    engine: OCREngine
}

interface VisionAnnotateResponse {
    fullTextAnnotation?: {
        text?: string
        pages?: Array<{ confidence?: number }>
    }
    textAnnotations?: Array<{ description?: string }>
    error?: { message?: string }
}

const VISION_API = 'https://vision.googleapis.com/v1/images:annotate'

const KNOWN_MERCHANTS: Array<{ key: string; label: string }> = [
    { key: 'pingo doce', label: 'Pingo Doce' },
    { key: 'continente', label: 'Continente' },
    { key: 'mercadona', label: 'Mercadona' },
    { key: 'lidl', label: 'Lidl' },
    { key: 'aldi', label: 'Aldi' },
    { key: 'galp', label: 'Galp' },
    { key: 'repsol', label: 'Repsol' },
    { key: 'bp', label: 'BP' },
    { key: 'uber', label: 'Uber' },
    { key: 'bolt', label: 'Bolt' },
    { key: 'amazon', label: 'Amazon' },
    { key: 'worten', label: 'Worten' },
    { key: 'fnac', label: 'Fnac' },
]

const IGNORE_MERCHANT_KEYS = [
    'receipt',
    'cash receipt',
    'invoice',
    'fatura',
    'cliente',
    'client',
    'manager',
    'date',
    'data',
    'total',
    'thank you',
    'shopping',
    'barcode',
]

const TOTAL_KEYS = [
    'total',
    'amount due',
    'grand total',
    'valor total',
    'tot.',
    'tot ',
]

function normalizeSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10)
}

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            const content = result.split(',')[1]
            if (!content) {
                reject(new Error('Failed to encode image to base64'))
                return
            }
            resolve(content)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

function parseAmountToken(token: string): number | null {
    const cleaned = token.replace(/[^\d.,-]/g, '')
    if (!cleaned) return null

    const lastDot = cleaned.lastIndexOf('.')
    const lastComma = cleaned.lastIndexOf(',')
    const decimalIndex = Math.max(lastDot, lastComma)

    let normalized = cleaned
    if (decimalIndex >= 0) {
        const intPart = cleaned.slice(0, decimalIndex).replace(/[.,]/g, '')
        const fracPart = cleaned.slice(decimalIndex + 1).replace(/[.,]/g, '')
        normalized = `${intPart}.${fracPart}`
    } else {
        normalized = cleaned.replace(/[.,]/g, '')
    }

    const value = Number(normalized)
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) return null
    return value
}

function parseSimpleNumber(token: string): number | null {
    const value = Number(token.replace(',', '.').replace(/[^\d.]/g, ''))
    if (!Number.isFinite(value) || value <= 0) return null
    return value
}

function extractAmountsFromLine(line: string): number[] {
    const tokens =
        line.match(/(?:€|\$|eur|usd)?\s*[0-9]{1,3}(?:[.,\s][0-9]{3})*(?:[.,][0-9]{2})/gi) ?? []

    const values: number[] = []
    for (const token of tokens) {
        const parsed = parseAmountToken(token)
        if (parsed !== null) values.push(parsed)
    }
    return values
}

function extractDate(rawText: string): string | null {
    const isoMatch = rawText.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
    if (isoMatch?.[1] && isoMatch[2] && isoMatch[3]) {
        const y = Number(isoMatch[1])
        const m = Number(isoMatch[2])
        const d = Number(isoMatch[3])
        if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return `${String(y)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        }
    }

    const dmyMatch = rawText.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/)
    if (dmyMatch?.[1] && dmyMatch[2] && dmyMatch[3]) {
        const d = Number(dmyMatch[1])
        const m = Number(dmyMatch[2])
        const yRaw = Number(dmyMatch[3])
        const y = yRaw < 100 ? 2000 + yRaw : yRaw
        if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return `${String(y)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        }
    }

    return null
}

function extractMerchant(lines: string[]): string | null {
    for (const line of lines) {
        const normalized = normalizeSearch(line)
        for (const merchant of KNOWN_MERCHANTS) {
            if (normalized.includes(merchant.key)) return merchant.label
        }
    }

    const firstLines = lines.slice(0, 8)
    for (const line of firstLines) {
        const normalized = normalizeSearch(line)
        if (!normalized) continue
        if (IGNORE_MERCHANT_KEYS.some((k) => normalized.includes(k))) continue
        if (normalized.includes(':')) continue

        const letters = (line.match(/[A-Za-zÀ-ÿ]/g) ?? []).length
        const digits = (line.match(/\d/g) ?? []).length
        if (letters < 3 || digits > letters) continue

        const sanitized = line.replace(/\s+/g, ' ').trim()
        if (sanitized.length < 3 || sanitized.length > 40) continue
        return sanitized
    }

    return null
}

function validatePortugueseNif(nif: string): boolean {
    if (!/^\d{9}$/.test(nif)) return false
    const digits = nif.split('').map((d) => Number(d))
    if (digits.length !== 9 || digits.some((d) => Number.isNaN(d))) return false

    const checkDigit = digits[8]
    if (checkDigit === undefined) return false
    let total = 0
    for (let i = 0; i < 8; i += 1) {
        const digit = digits[i]
        if (digit === undefined) return false
        total += digit * (9 - i)
    }
    let computed = 11 - (total % 11)
    if (computed >= 10) computed = 0
    return computed === checkDigit
}

function compactDigits(value: string): string {
    return value.replace(/[^\d]/g, '')
}

function extractNif(rawText: string): string | null {
    const normalized = rawText
        .replace(/\r/g, '\n')
        .replace(/\s+/g, ' ')

    const keywordMatch = normalized.match(/(?:nif|contribuinte|vat|tax id)[^\d]{0,10}((?:\d[\s.-]*){9})/i)
    if (keywordMatch?.[1]) {
        const nif = compactDigits(keywordMatch[1])
        if (validatePortugueseNif(nif)) return nif
    }

    const allCandidates = normalized.match(/(?:\d[\s.-]*){9}/g) ?? []
    for (const candidate of allCandidates) {
        const nif = compactDigits(candidate)
        if (validatePortugueseNif(nif)) return nif
    }

    return null
}

function extractTotal(lines: string[]): number | null {
    let bestFromTotalLine: number | null = null

    for (const line of lines) {
        const normalized = normalizeSearch(line)
        const isTotalLine = TOTAL_KEYS.some((key) => normalized.includes(key))
        if (!isTotalLine) continue
        if (normalized.includes('subtotal') || normalized.includes('sub total')) continue

        const amounts = extractAmountsFromLine(line)
        if (amounts.length === 0) continue
        const candidate = amounts[amounts.length - 1]
        if (candidate === undefined) continue

        if (bestFromTotalLine === null || candidate > bestFromTotalLine) {
            bestFromTotalLine = candidate
        }
    }

    if (bestFromTotalLine !== null) return bestFromTotalLine

    let fallback: number | null = null
    for (const line of lines) {
        const amounts = extractAmountsFromLine(line)
        for (const amount of amounts) {
            if (fallback === null || amount > fallback) fallback = amount
        }
    }
    return fallback
}

function extractItems(lines: string[]): string[] {
    const items: string[] = []
    for (const line of lines) {
        const normalized = normalizeSearch(line)
        if (TOTAL_KEYS.some((key) => normalized.includes(key))) continue
        if (normalized.includes('subtotal') || normalized.includes('tax') || normalized.includes('iva')) continue

        const amounts = extractAmountsFromLine(line)
        if (amounts.length === 0) continue

        const cleaned = line
            .replace(/(?:€|\$|eur|usd)?\s*[0-9]{1,3}(?:[.,\s][0-9]{3})*(?:[.,][0-9]{2})/gi, '')
            .replace(/[.:]{2,}/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        if (cleaned.length < 2) continue
        items.push(cleaned)
        if (items.length >= 8) break
    }
    return items
}

function parseQuantityFromLine(line: string): number {
    const xPattern = line.match(/\b(\d+(?:[.,]\d+)?)\s*[x*]\s*/i)
    if (xPattern?.[1]) {
        const parsed = parseSimpleNumber(xPattern[1])
        if (parsed && parsed <= 500) return parsed
    }

    const unitPattern = line.match(/\b(\d+(?:[.,]\d+)?)\s*(un|und|uni)\b/i)
    if (unitPattern?.[1]) {
        const parsed = parseSimpleNumber(unitPattern[1])
        if (parsed && parsed <= 500) return parsed
    }

    return 1
}

function cleanItemDescription(line: string): string {
    return line
        .replace(/(?:€|\$|eur|usd)?\s*[0-9]{1,3}(?:[.,\s][0-9]{3})*(?:[.,][0-9]{2})/gi, ' ')
        .replace(/\b(\d+(?:[.,]\d+)?)\s*[x*]\s*/gi, ' ')
        .replace(/[.:]{2,}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function extractReceiptItems(lines: string[]): OCRReceiptItem[] {
    const parsed: OCRReceiptItem[] = []

    for (const line of lines) {
        const normalized = normalizeSearch(line)
        if (!normalized) continue
        if (TOTAL_KEYS.some((key) => normalized.includes(key))) continue
        if (normalized.includes('subtotal') || normalized.includes('tax') || normalized.includes('iva')) continue
        if (normalized.includes('nif') || normalized.includes('contribuinte')) continue

        const amounts = extractAmountsFromLine(line)
        if (amounts.length === 0) continue

        const lineTotal = amounts[amounts.length - 1]
        if (lineTotal === undefined || lineTotal <= 0) continue

        const description = cleanItemDescription(line)
        const letters = (description.match(/[A-Za-zÀ-ÿ]/g) ?? []).length
        if (description.length < 2 || letters < 2) continue

        const quantity = parseQuantityFromLine(line)
        const unitPriceRaw = quantity > 0 ? lineTotal / quantity : null
        const unitPrice = unitPriceRaw && Number.isFinite(unitPriceRaw)
            ? Number(unitPriceRaw.toFixed(4))
            : null
        const skuKey = normalizeSkuKey(description)

        parsed.push({
            rawLine: line,
            description,
            quantity: Number(quantity.toFixed(3)),
            lineTotal: Number(lineTotal.toFixed(2)),
            unitPrice,
            skuKey,
        })

        if (parsed.length >= 30) break
    }

    return parsed
}

function inferCurrency(rawText: string): string {
    const normalized = normalizeSearch(rawText)
    if (normalized.includes('$') || normalized.includes('usd')) return 'USD'
    return 'EUR'
}

function extractConfidence(response: VisionAnnotateResponse): number {
    const pages = response.fullTextAnnotation?.pages ?? []
    const values = pages
        .map((page) => page.confidence)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

    if (values.length > 0) {
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length
        return Number(avg.toFixed(3))
    }

    if ((response.textAnnotations?.length ?? 0) > 0) return 0.75
    return 0
}

function inferSuggestion(rawText: string, merchant: string | null, items: string[]): OCRSuggestion | null {
    const joinedContext = [
        merchant ?? '',
        ...items,
        rawText,
    ]
        .filter(Boolean)
        .join(' ')

    const suggestion = inferEntryFromText(joinedContext)
    if (!suggestion) return null

    return {
        type: suggestion.type,
        category: suggestion.category,
        confidence: suggestion.confidence,
        source: 'heuristic',
    }
}

function buildResultFromRawText(rawText: string, confidence: number, engine: OCREngine): OCRResult {
    const text = rawText.trim()
    if (!text) throw new Error('Nao foi possivel extrair texto da imagem')

    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    const merchant = extractMerchant(lines)
    const nif = extractNif(text)
    const date = extractDate(text) ?? todayIso()
    const totalAmount = extractTotal(lines)
    const currency = inferCurrency(text)
    const receiptItems = extractReceiptItems(lines)
    const items = receiptItems.length > 0
        ? receiptItems.map((item) => item.description).slice(0, 8)
        : extractItems(lines)
    const suggestion = inferSuggestion(text, merchant, items)

    return {
        merchant,
        nif,
        date,
        total: totalAmount === null ? null : { amount: totalAmount, currency },
        items,
        receiptItems,
        confidence,
        suggestion,
        engine,
    }
}

async function runLocalOcr(file: File): Promise<{ rawText: string; confidence: number }> {
    const Tesseract = await import('tesseract.js')
    const result = await Tesseract.recognize(file, 'eng+por')
    const rawText = result.data.text ?? ''
    const confidenceRaw = result.data.confidence
    const confidence = Number.isFinite(confidenceRaw)
        ? Number(((confidenceRaw as number) / 100).toFixed(3))
        : 0.5

    return { rawText, confidence }
}

export const ocrService = {
    async scanReceipt(file: File): Promise<OCRResult> {
        const key = import.meta.env.VITE_GOOGLE_VISION_KEY as string | undefined

        if (!file.type.startsWith('image/')) {
            throw new Error('OCR suporta apenas imagens neste momento (PNG/JPG/WebP).')
        }

        if (!key) {
            const local = await runLocalOcr(file)
            return buildResultFromRawText(local.rawText, local.confidence, 'local')
        }

        const base64 = await toBase64(file)
        try {
            const response = await fetch(`${VISION_API}?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [
                        {
                            image: { content: base64 },
                            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
                        },
                    ],
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Vision API error ${response.status}: ${errorText}`)
            }

            const payload = (await response.json()) as { responses?: VisionAnnotateResponse[] }
            const ocr = payload.responses?.[0]
            if (!ocr) throw new Error('Vision OCR sem resposta')
            if (ocr.error?.message) throw new Error(ocr.error.message)

            const rawText = ocr.fullTextAnnotation?.text || ocr.textAnnotations?.[0]?.description || ''
            const confidence = extractConfidence(ocr)
            return buildResultFromRawText(rawText, confidence, 'vision')
        } catch (visionError) {
            console.warn('Vision OCR failed, falling back to local Tesseract OCR.', visionError)

            const local = await runLocalOcr(file)
            const result = buildResultFromRawText(local.rawText, local.confidence, 'local')

            if (!result.total && visionError instanceof Error) {
                throw new Error(`OCR local sem total detectado. Erro Vision: ${visionError.message}`)
            }

            return result
        }
    },
}
