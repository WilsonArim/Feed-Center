/**
 * Scoring Service
 *
 * Generates a relevance score (0-1) for a news item based on:
 * 1. Recency (newer = higher)
 * 2. Tag confidence (LLM certainty)
 * 3. Content quality heuristics (length, structure)
 */

const HOUR_MS = 3600_000
const DAY_MS = 86_400_000

interface ScoreInput {
    title: string
    summary: string
    tag_confidence: number
    published_at?: string | null
}

export function scoreNewsItem(input: ScoreInput): number {
    const weights = {
        recency: 0.40,
        confidence: 0.30,
        quality: 0.30,
    }

    // 1. Recency score (exponential decay over 48h)
    const pubTime = input.published_at ? new Date(input.published_at).getTime() : Date.now()
    const ageMs = Math.max(0, Date.now() - pubTime)
    const ageHours = ageMs / HOUR_MS
    const recencyScore = Math.exp(-ageHours / 24) // Half-life ~24h

    // 2. Confidence score (direct from LLM tagger)
    const confidenceScore = input.tag_confidence

    // 3. Quality heuristics
    const qualityFactors: number[] = []

    // Title length (sweet spot: 30-100 chars)
    const titleLen = input.title.length
    qualityFactors.push(titleLen >= 30 && titleLen <= 100 ? 1.0 : titleLen < 10 ? 0.3 : 0.7)

    // Summary length (sweet spot: 100-1000 chars)
    const summaryLen = input.summary.length
    qualityFactors.push(summaryLen >= 100 && summaryLen <= 1000 ? 1.0 : summaryLen < 50 ? 0.2 : 0.6)

    // Has numbers/data (more informative)
    const hasData = /\d+/.test(input.summary)
    qualityFactors.push(hasData ? 0.8 : 0.5)

    const qualityScore = qualityFactors.reduce((a, b) => a + b, 0) / qualityFactors.length

    // Weighted final score
    const score = (
        weights.recency * recencyScore +
        weights.confidence * confidenceScore +
        weights.quality * qualityScore
    )

    return Math.round(score * 1000) / 1000 // 3 decimal places
}
