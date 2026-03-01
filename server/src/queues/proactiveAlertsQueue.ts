import { Queue } from 'bullmq'
import { env } from '../config.js'

export const PROACTIVE_ALERTS_QUEUE_NAME = 'cortex-proactive-alerts'

export interface ProactiveAlertsJobPayload {
    reason: 'scheduled' | 'manual'
    userId?: string
}

export const proactiveAlertsQueue = new Queue<ProactiveAlertsJobPayload>(PROACTIVE_ALERTS_QUEUE_NAME, {
    connection: { url: env.redisUrl },
    defaultJobOptions: {
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 120 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
    },
})
