import { Worker, type Job } from 'bullmq'
import { env, supabase } from '../config.js'
import { NEWS_QUEUE_NAME } from '../queues/newsQueue.js'
import { generateEmbedding } from '../services/embeddingService.js'
import { tagNewsItem } from '../services/taggingService.js'
import { scoreNewsItem } from '../services/scoringService.js'
import type { IngestPayload } from '../types/news.js'

const DEDUP_THRESHOLD = 0.90

async function processNewsItem(job: Job<IngestPayload>): Promise<string> {
    const payload = job.data
    console.log(`🔄 Processing: "${payload.title.slice(0, 60)}..."`)

    // ── Step 1: Generate embedding ──
    await job.updateProgress(10)
    const embedding = await generateEmbedding(`${payload.title}\n${payload.summary}`)

    // ── Step 2: Deduplication via pgvector ──
    await job.updateProgress(30)

    const { data: similar } = await supabase.rpc('match_news_embedding', {
        query_embedding: JSON.stringify(embedding),
        similarity_threshold: DEDUP_THRESHOLD,
        match_count: 1,
    })

    if (similar && similar.length > 0) {
        const match = similar[0]
        console.log(`⚡ Duplicate detected: similarity=${match.similarity.toFixed(3)} → grouped with ${match.id}`)

        if (!match.dedup_group_id) {
            await supabase
                .from('news_items')
                .update({ dedup_group_id: match.id })
                .eq('id', match.id)
        }

        return `DEDUP: grouped with ${match.id} (sim=${match.similarity.toFixed(3)})`
    }

    // ── Step 3: LLM Tagging ──
    await job.updateProgress(50)
    const tags = await tagNewsItem(payload.title, payload.summary, payload.topic_hint)
    console.log(`🏷️  Tagged: ${tags.topic_primary} [${tags.tags.join(', ')}] conf=${tags.tag_confidence}`)

    // ── Step 4: Scoring ──
    await job.updateProgress(70)
    const score = scoreNewsItem({
        title: payload.title,
        summary: payload.summary,
        tag_confidence: tags.tag_confidence,
        published_at: payload.published_at,
    })
    console.log(`📊 Score: ${score}`)

    // ── Step 5: Insert into DB ──
    await job.updateProgress(90)
    const { data: inserted, error } = await supabase
        .from('news_items')
        .insert({
            title: payload.title,
            summary: payload.summary,
            source_url: payload.source_url,
            source_name: payload.source_name,
            topic_primary: tags.topic_primary,
            tags: tags.tags,
            tag_confidence: tags.tag_confidence,
            score,
            embedding: JSON.stringify(embedding),
            published_at: payload.published_at || null,
        })
        .select('id')
        .single()

    if (error) {
        if (error.code === '23505') {
            console.log(`⚡ URL already exists: ${payload.source_url}`)
            return `SKIP: URL already exists`
        }
        throw new Error(`DB insert failed: ${error.message}`)
    }

    await job.updateProgress(100)
    console.log(`✅ Inserted: ${inserted.id} | ${tags.topic_primary} | score=${score}`)
    return `OK: ${inserted.id}`
}

// ── Start worker ──
const worker = new Worker(NEWS_QUEUE_NAME, processNewsItem, {
    connection: { url: env.redisUrl },
    concurrency: 2,
})

worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed: ${job.returnvalue}`)
})

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message)
})

worker.on('ready', () => {
    console.log('🚀 News worker ready and listening for jobs')
})

export { worker }
