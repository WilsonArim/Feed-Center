import { Worker, type Job } from 'bullmq'
import { env } from '../config.js'
import { BRIEFING_QUEUE_NAME, briefingQueue, type BriefingJobPayload } from '../queues/briefingQueue.js'
import { cortexRouter } from '../services/cortex/cortexRouter.js'

interface MorningBriefingResult {
    usersProcessed: number
    generated: number
}

async function processMorningBriefing(job: Job<BriefingJobPayload>): Promise<MorningBriefingResult> {
    const userId = job.data.userId?.trim() || null
    const briefingDate = job.data.briefingDate?.trim() || undefined

    if (userId) {
        await cortexRouter.getTodayBriefing(userId, {
            forceRefresh: true,
            briefingDate,
        })
        return { usersProcessed: 1, generated: 1 }
    }

    const briefings = await cortexRouter.refreshTodayBriefingsForAllUsers(briefingDate)
    return {
        usersProcessed: briefings.length,
        generated: briefings.length,
    }
}

async function ensureMorningSchedule(): Promise<void> {
    await briefingQueue.add(
        'daily-briefing',
        { reason: 'scheduled' },
        {
            jobId: 'daily-briefing@04',
            repeat: {
                pattern: env.briefingCron,
                tz: env.briefingTimezone,
            },
        }
    )
}

const worker = new Worker<BriefingJobPayload, MorningBriefingResult>(
    BRIEFING_QUEUE_NAME,
    processMorningBriefing,
    {
        connection: { url: env.redisUrl },
        concurrency: 1,
    }
)

worker.on('ready', () => {
    console.log('🌅 Morning briefing worker ready')
})

worker.on('completed', (job) => {
    console.log(`🌅 Morning briefing job ${job.id} completed`)
})

worker.on('failed', (job, error) => {
    console.error(`🌅 Morning briefing job ${job?.id} failed:`, error.message)
})

void ensureMorningSchedule().catch((error) => {
    console.error('🌅 Failed to schedule morning briefing repeat job:', error)
})

export { worker as morningBriefingWorker }
