import { Queue } from 'bullmq'
import type Redis from 'ioredis'

export const GRACE_PERIOD_QUEUE = 'grace-period-check'

export interface GracePeriodJobData {
  triggered_at: string
}

/**
 * Retorna uma instancia BullMQ Queue para o grace-period-check queue.
 * Criada aqui para ser reutilizada pelo scheduler (worker.ts) e pelo consumer.
 */
export function getGracePeriodQueue(redis: Redis): Queue<GracePeriodJobData> {
  return new Queue<GracePeriodJobData>(GRACE_PERIOD_QUEUE, { connection: redis })
}
