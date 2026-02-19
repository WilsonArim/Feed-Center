import { Router, type Request, type Response } from 'express'
import { agentAuth } from '../middleware/agentAuth.js'
import { newsQueue } from '../queues/newsQueue.js'
import { supabase } from '../config.js'
import { IngestPayloadSchema, VALID_TOPICS } from '../types/news.js'

const router = Router()

// ═══════════════════════════════════════════════════
// POST /internal/news/ingest (agent-only, queued)
// ═══════════════════════════════════════════════════
router.post('/internal/news/ingest', agentAuth, async (req: Request, res: Response) => {
    // Validate payload
    const parsed = IngestPayloadSchema.safeParse(req.body)
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid payload',
            details: parsed.error.flatten().fieldErrors,
        })
        return
    }

    // Enqueue for async processing
    const job = await newsQueue.add('ingest', parsed.data as Record<string, unknown>, {
        jobId: `news-${Buffer.from(parsed.data.source_url).toString('base64url').slice(0, 32)}`,
    })

    res.status(202).json({
        status: 'queued',
        job_id: job.id,
        message: `News item "${parsed.data.title.slice(0, 50)}..." queued for processing`,
    })
})

// ═══════════════════════════════════════════════════
// GET /news/top — public feed endpoint
// ═══════════════════════════════════════════════════
router.get('/news/top', async (req: Request, res: Response) => {
    const topic = (req.query.topic as string)?.trim()
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)

    // Validate topic if provided
    if (topic && !VALID_TOPICS.includes(topic as typeof VALID_TOPICS[number])) {
        res.status(400).json({
            error: `Invalid topic. Valid: ${VALID_TOPICS.join(', ')}`,
        })
        return
    }

    let query = supabase
        .from('news_items')
        .select('title, summary, source_url, source_name, topic_primary, score, created_at')
        .is('dedup_group_id', null) // Exclude dedup'd items
        .order('score', { ascending: false })
        .limit(limit)

    if (topic) {
        query = query.eq('topic_primary', topic)
    }

    const { data, error } = await query

    if (error) {
        res.status(500).json({ error: error.message })
        return
    }

    res.json({
        topic: topic || 'all',
        count: data?.length || 0,
        items: data || [],
    })
})

// ═══════════════════════════════════════════════════
// GET /news/topics — available topics with counts
// ═══════════════════════════════════════════════════
router.get('/news/topics', async (_req: Request, res: Response) => {
    const { data, error } = await supabase
        .from('news_items')
        .select('topic_primary')
        .is('dedup_group_id', null)

    if (error) {
        res.status(500).json({ error: error.message })
        return
    }

    // Count per topic
    const counts: Record<string, number> = {}
    for (const row of data || []) {
        counts[row.topic_primary] = (counts[row.topic_primary] || 0) + 1
    }

    res.json({ topics: counts })
})

export { router as newsRouter }
