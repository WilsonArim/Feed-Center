import { Queue } from 'bullmq'
import { env } from '../config.js'

export const BRIEFING_QUEUE_NAME = 'cortex-morning-briefing'

export interface BriefingJobPayload {
    reason: 'scheduled' | 'manual'
    userId?: string
    briefingDate?: string
}

export const briefingQueue = new Queue<BriefingJobPayload>(BRIEFING_QUEUE_NAME, {
    connection: { url: env.redisUrl },
    defaultJobOptions: {
        removeOnComplete: { count: 120 },
        removeOnFail: { count: 80 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
    },
})
