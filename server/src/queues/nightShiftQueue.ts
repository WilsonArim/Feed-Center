/**
 * Night Shift Queue — Law 3: Proactive Serendipity
 *
 * BullMQ queue definition for Buggy's 4 AM cognitive analysis loop.
 */

import { Queue } from 'bullmq'
import { env } from '../config.js'

export const NIGHT_SHIFT_QUEUE_NAME = 'cortex:night-shift'

export interface NightShiftJobPayload {
    reason: string
    userId?: string | null
}

export const nightShiftQueue = new Queue<NightShiftJobPayload>(
    NIGHT_SHIFT_QUEUE_NAME,
    { connection: { url: env.redisUrl } },
)
