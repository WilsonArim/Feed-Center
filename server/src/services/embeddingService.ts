import OpenAI from 'openai'
import { env } from '../config.js'

const openai = new OpenAI({ apiKey: env.openaiKey })

/**
 * Generate embedding for text using text-embedding-3-small (1536 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Model limit guard
    })
    return res.data[0]!.embedding
}

/**
 * Cosine similarity between two vectors.
 * Used as fallback if pgvector query isn't available.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i]! * b[i]!
        magA += a[i]! * a[i]!
        magB += b[i]! * b[i]!
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}
