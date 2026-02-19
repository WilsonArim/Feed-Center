import { z } from 'zod'

// ── Ingest payload validation ──
export const IngestPayloadSchema = z.object({
    title: z.string().min(1).max(500),
    summary: z.string().min(1).max(5000),
    source_url: z.string().url(),
    source_name: z.string().min(1).max(200),
    topic_hint: z.string().optional(),
    published_at: z.string().datetime().optional(),
})

export type IngestPayload = z.infer<typeof IngestPayloadSchema>

// ── News item as stored in DB ──
export interface NewsItem {
    id: string
    title: string
    summary: string
    source_url: string
    source_name: string
    topic_primary: string
    tags: string[]
    tag_confidence: number
    score: number
    embedding: number[]
    dedup_group_id: string | null
    published_at: string | null
    created_at: string
}

// ── GET /news/top response ──
export interface NewsTopItem {
    title: string
    summary: string
    source_url: string
    source_name: string
    topic_primary: string
    score: number
    created_at: string
}

// ── Valid topics ──
export const VALID_TOPICS = ['AI', 'Crypto', 'Geopolitics', 'Macro', 'Regulation', 'Tech'] as const
export type Topic = typeof VALID_TOPICS[number]
