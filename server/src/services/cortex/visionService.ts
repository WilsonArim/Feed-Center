/**
 * VisionService — Stateless Optical Nerve
 *
 * DUAL-LLM ARCHITECTURE: This service is the ONLY gateway to the
 * MLX Qwen-VL sidecar. It does ONE thing: extract structured JSON
 * from receipt/invoice images via local OCR.
 *
 * Rules:
 *   - Zero state. Fire-and-forget.
 *   - Zero OpenAI dependency. Pure Qwen wrapper.
 *   - Multi-layer JSON extraction fallback (parse → regex → raw).
 *   - Returns typed VisionOcrDraft or throws.
 *
 * Consumers:
 *   - GapFiller (enrichment layer) calls extractFromImage()
 *   - CortexRouter delegates all image processing here
 */

import { env } from '../../config.js'

// ── Types ──────────────────────────────────────────────────────────

export interface VisionOcrDraft {
    merchant: string | null
    total: number | null
    currency: string | null
    date: string | null
    category: string | null
    items: Array<{ name: string; quantity: number; price: number }>
    confidence: number
    rawText: string
    jsonExtracted: boolean
}

export interface VisionHealthStatus {
    available: boolean
    role: string
    model: string
    sidecarUrl: string
}

interface MlxExtractResponse {
    status: string
    extraction: {
        merchant?: string | null
        total?: number | null
        currency?: string | null
        date?: string | null
        category?: string | null
        items?: Array<{ name: string; quantity: number; price: number }>
    } | null
    raw_text: string
    stats: {
        generation_time_s: number
        tokens_per_second: number | null
        peak_memory_gb: number | null
    }
}

interface MlxHealthResponse {
    status: string
    role: string
    model: string
    load_time_s: number
    ready: boolean
}

// ── Constants ──────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 30_000
const HEALTH_TIMEOUT_MS = 3_000

// ── JSON Extraction Fallback Chain ─────────────────────────────────
// Risk 5 Solution: Multi-layer extraction for Qwen "stuttering"
//   Layer 1: Direct JSON.parse
//   Layer 2: Strip markdown fences (```json ... ```)
//   Layer 3: Regex find first { ... } block
//   Layer 4: Return null (caller decides: OpenAI rescue or error toast)

function extractJsonFromRawText(raw: string): Record<string, unknown> | null {
    if (!raw || raw.trim().length === 0) return null

    // Layer 1: Direct parse
    try {
        const parsed = JSON.parse(raw)
        if (typeof parsed === 'object' && parsed !== null) return parsed
    } catch { /* continue */ }

    // Layer 2: Strip markdown fences
    let stripped = raw
    if (stripped.includes('```json')) {
        stripped = stripped.split('```json').pop()?.split('```')[0]?.trim() ?? ''
    } else if (stripped.includes('```')) {
        stripped = stripped.split('```')[1]?.split('```')[0]?.trim() ?? ''
    }
    if (stripped && stripped !== raw) {
        try {
            const parsed = JSON.parse(stripped)
            if (typeof parsed === 'object' && parsed !== null) return parsed
        } catch { /* continue */ }
    }

    // Layer 3: Regex — find the first { ... } block (greedy)
    const braceMatch = raw.match(/\{[\s\S]*\}/)
    if (braceMatch) {
        try {
            const parsed = JSON.parse(braceMatch[0])
            if (typeof parsed === 'object' && parsed !== null) return parsed
        } catch { /* continue */ }
    }

    // Layer 4: All layers exhausted
    return null
}

// ── VisionService Class ────────────────────────────────────────────

export class VisionService {
    private readonly mlxUrl: string

    constructor(sidecarUrl?: string) {
        const url = sidecarUrl ?? env.mlxSidecarUrl ?? 'http://localhost:8787'
        this.mlxUrl = url.replace(/\/$/, '')
    }

    /**
     * Health check — is the MLX sidecar alive and in OCR-only mode?
     */
    async checkHealth(): Promise<VisionHealthStatus> {
        try {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)

            const res = await fetch(`${this.mlxUrl}/health`, {
                signal: controller.signal,
            })
            clearTimeout(timer)

            if (!res.ok) {
                return { available: false, role: 'unknown', model: 'unknown', sidecarUrl: this.mlxUrl }
            }

            const data = (await res.json()) as MlxHealthResponse
            return {
                available: data.ready === true,
                role: data.role ?? 'unknown',
                model: data.model,
                sidecarUrl: this.mlxUrl,
            }
        } catch {
            return { available: false, role: 'unreachable', model: 'unknown', sidecarUrl: this.mlxUrl }
        }
    }

    /**
     * Is the MLX sidecar available?
     */
    async isAvailable(): Promise<boolean> {
        const status = await this.checkHealth()
        return status.available
    }

    /**
     * Extract structured data from an image via the MLX Qwen-VL sidecar.
     *
     * STATELESS: This method has zero memory, zero context, zero conversation.
     * It sends an image, gets JSON, returns it. That's it.
     *
     * Returns VisionOcrDraft with `jsonExtracted: false` if Qwen stuttered
     * and no JSON could be salvaged. The caller (OpenAI or UI) handles it.
     */
    async extractFromImage(imageBase64: string, mimeType = 'image/png'): Promise<VisionOcrDraft> {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

        try {
            const res = await fetch(`${this.mlxUrl}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageBase64,
                    mime_type: mimeType,
                    max_tokens: 1024,
                }),
                signal: controller.signal,
            })
            clearTimeout(timer)

            if (!res.ok) {
                const body = await res.text()
                throw new Error(`MLX sidecar error (${res.status}): ${body.slice(0, 200)}`)
            }

            const data = (await res.json()) as MlxExtractResponse
            return this.parseResponse(data)
        } catch (error) {
            clearTimeout(timer)

            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`MLX sidecar timeout after ${FETCH_TIMEOUT_MS}ms`)
            }
            throw error
        }
    }

    /**
     * Parse the MLX sidecar response with multi-layer JSON fallback.
     * Risk 5 Solution: Never crash on broken JSON. Return what we can.
     */
    private parseResponse(data: MlxExtractResponse): VisionOcrDraft {
        // If the sidecar already parsed JSON successfully
        if (data.extraction) {
            const ext = data.extraction
            return {
                merchant: ext.merchant ?? null,
                total: typeof ext.total === 'number' ? ext.total : null,
                currency: ext.currency ?? null,
                date: ext.date ?? null,
                category: ext.category ?? null,
                items: Array.isArray(ext.items) ? ext.items : [],
                confidence: ext.merchant && ext.total ? 0.88 : 0.65,
                rawText: data.raw_text,
                jsonExtracted: true,
            }
        }

        // Sidecar couldn't parse — try our fallback chain on raw text
        const salvaged = extractJsonFromRawText(data.raw_text)

        if (salvaged) {
            return {
                merchant: typeof salvaged.merchant === 'string' ? salvaged.merchant : null,
                total: typeof salvaged.total === 'number' ? salvaged.total : null,
                currency: typeof salvaged.currency === 'string' ? salvaged.currency : null,
                date: typeof salvaged.date === 'string' ? salvaged.date : null,
                category: typeof salvaged.category === 'string' ? salvaged.category : null,
                items: Array.isArray(salvaged.items) ? salvaged.items as VisionOcrDraft['items'] : [],
                confidence: 0.5, // Salvaged JSON gets reduced confidence
                rawText: data.raw_text,
                jsonExtracted: true,
            }
        }

        // All layers failed — return raw text with jsonExtracted: false
        // Smart Chat Lane: OpenAI will attempt rescue
        // Manual Scan Lane: UI shows red badge + empty editable form
        return {
            merchant: null,
            total: null,
            currency: null,
            date: null,
            category: null,
            items: [],
            confidence: 0.2,
            rawText: data.raw_text,
            jsonExtracted: false,
        }
    }
}
