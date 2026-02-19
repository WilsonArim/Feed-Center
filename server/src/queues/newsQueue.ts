import { Queue } from 'bullmq'
import { env } from '../config.js'
import type { IngestPayload } from '../types/news.js'

export const NEWS_QUEUE_NAME = 'news-ingest'

export const newsQueue = new Queue(NEWS_QUEUE_NAME, {
    connection: { url: env.redisUrl },
    defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
    },
})

console.log('📰 News ingest queue ready')
