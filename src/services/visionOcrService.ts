/**
 * Vision OCR Service
 *
 * Uses Google Cloud Vision API to extract text from transaction screenshots.
 * Parses key fields (amounts, dates, tick ranges, token symbols) for DeFi position import.
 *
 * Strategy: Client-side call (requires VITE_GOOGLE_VISION_KEY).
 * If privacy is a concern, move to a Supabase Edge Function proxy.
 */

import type { VisionOcrResult } from '@/types'

const VISION_API = 'https://vision.googleapis.com/v1/images:annotate'

export function isVisionAvailable(): boolean {
    return !!import.meta.env.VITE_GOOGLE_VISION_KEY
}

/**
 * Send an image to Google Vision API and extract text.
 */
export async function extractTextFromImage(file: File): Promise<VisionOcrResult> {
    const key = import.meta.env.VITE_GOOGLE_VISION_KEY
    if (!key) throw new Error('Google Vision API key not configured')

    // Convert file to base64
    const base64 = await fileToBase64(file)

    const body = {
        requests: [{
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        }],
    }

    const res = await fetch(`${VISION_API}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Vision API error: ${res.status} — ${errText}`)
    }

    const data = await res.json()
    const annotation = data.responses?.[0]?.fullTextAnnotation
    const rawText = annotation?.text ?? ''
    const confidence = data.responses?.[0]?.textAnnotations?.[0]?.confidence ?? 0

    const fields = parseDefiFields(rawText)

    return { fields, rawText, confidence }
}

/**
 * Parse DeFi-relevant fields from OCR raw text.
 * Looks for patterns: amounts, dates, tick ranges, APY, token symbols.
 */
function parseDefiFields(text: string): Record<string, string> {
    const fields: Record<string, string> = {}

    // Token amounts: "1,234.56 SOL" or "SOL 1234.56"
    const amountMatch = text.match(/([\d,]+\.?\d*)\s*(SOL|ETH|USDC|USDT|BTC|[A-Z]{2,8})/i)
    if (amountMatch && amountMatch[1] && amountMatch[2]) {
        fields.amount = amountMatch[1].replace(/,/g, '')
        fields.token = amountMatch[2].toUpperCase()
    }

    // Price: "$123.45" or "Price: 123.45"
    const priceMatch = text.match(/(?:Price|Preço|USD)[:\s]*\$?([\d,]+\.?\d*)/i)
        ?? text.match(/\$([\d,]+\.?\d+)/)
    if (priceMatch && priceMatch[1]) {
        fields.price = priceMatch[1].replace(/,/g, '')
    }

    // Tick range: "Min: 0.00123" and "Max: 0.00456"
    const minMatch = text.match(/(?:Min|Lower|Tick\s*Lower)[:\s]*([\d.]+)/i)
    const maxMatch = text.match(/(?:Max|Upper|Tick\s*Upper)[:\s]*([\d.]+)/i)
    if (minMatch?.[1]) fields.tickLower = minMatch[1]
    if (maxMatch?.[1]) fields.tickUpper = maxMatch[1]

    // APY: "APY: 12.5%" or "23.4% APY"
    const apyMatch = text.match(/(?:APY|APR)[:\s]*([\d.]+)%?/i)
        ?? text.match(/([\d.]+)%\s*(?:APY|APR)/i)
    if (apyMatch?.[1]) fields.apy = apyMatch[1]

    // Date: "2024-01-15" or "15/01/2024" or "Jan 15, 2024"
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/)
        ?? text.match(/(\d{2}\/\d{2}\/\d{4})/)
    if (dateMatch?.[1]) fields.date = dateMatch[1]

    // Pool pair: "SOL/USDC" or "ETH-USDT"
    const pairMatch = text.match(/([A-Z]{2,8})\s*[\/\-]\s*([A-Z]{2,8})/i)
    if (pairMatch?.[1] && pairMatch[2]) {
        fields.baseSymbol = pairMatch[1].toUpperCase()
        fields.quoteSymbol = pairMatch[2].toUpperCase()
    }

    return fields
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            // Strip data URL prefix: "data:image/png;base64,..."
            const base64 = result.split(',')[1] ?? ''
            resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

