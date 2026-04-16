import { Queue } from 'bullmq'
import type Redis from 'ioredis'

export const GRACE_PERIOD_QUEUE = 'grace-period-check'

export interface GracePeriodJobData {
  triggered_at: string
}

export function getGracePeriodQueue(redis: Redis): Queue<GracePeriodJobData> {
  return new Queue<GracePeriodJobData>(GRACE_PERIOD_QUEUE, { connection: redis })
}
