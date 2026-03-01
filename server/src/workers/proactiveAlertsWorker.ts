import { Worker, type Job } from 'bullmq'
import { env } from '../config.js'
import {
    PROACTIVE_ALERTS_QUEUE_NAME,
    proactiveAlertsQueue,
    type ProactiveAlertsJobPayload,
} from '../queues/proactiveAlertsQueue.js'
import { cortexRouter } from '../services/cortex/cortexRouter.js'

interface ProactiveAlertsResult {
    alertsGenerated: number
    usersProcessed: number
}

async function processProactiveAlerts(job: Job<ProactiveAlertsJobPayload>): Promise<ProactiveAlertsResult> {
    const userId = job.data.userId?.trim() || null

    if (userId) {
        const alerts = await cortexRouter.refreshProactiveAlertsForUser(userId)
        return {
            alertsGenerated: alerts.length,
            usersProcessed: 1,
        }
    }

    const alerts = await cortexRouter.refreshProactiveAlertsForAllUsers()
    const userIds = new Set(alerts.map((alert) => alert.userId))
    return {
        alertsGenerated: alerts.length,
        usersProcessed: userIds.size,
    }
}

async function ensureProactiveAlertsSchedule(): Promise<void> {
    await proactiveAlertsQueue.add(
        'proactive-alerts',
        { reason: 'scheduled' },
        {
            jobId: 'proactive-alerts@loop',
            repeat: {
                pattern: env.proactiveAlertsCron,
                tz: env.proactiveAlertsTimezone,
            },
        }
    )
}

const worker = new Worker<ProactiveAlertsJobPayload, ProactiveAlertsResult>(
    PROACTIVE_ALERTS_QUEUE_NAME,
    processProactiveAlerts,
    {
        connection: { url: env.redisUrl },
        concurrency: 1,
    }
)

worker.on('ready', () => {
    console.log('🚨 Proactive alerts worker ready')
})

worker.on('completed', (job) => {
    console.log(`🚨 Proactive alerts job ${job.id} completed`)
})

worker.on('failed', (job, error) => {
    console.error(`🚨 Proactive alerts job ${job?.id} failed:`, error.message)
})

void ensureProactiveAlertsSchedule().catch((error) => {
    console.error('🚨 Failed to schedule proactive alerts repeat job:', error)
})

export { worker as proactiveAlertsWorker }
