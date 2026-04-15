import { Worker, type Job } from 'bullmq'
import type Redis from 'ioredis'

export const HEALTH_CHECK_QUEUE = 'health-check'

export interface HealthCheckJobData {
  triggered_at: string
}

// Cria um Worker BullMQ para o health-check queue
// Phase 1: apenas loga que o job foi processado
// Phase 2+: este arquivo sera substituido por datajud-sync.ts
export function createHealthCheckWorker(redis: Redis): Worker<HealthCheckJobData> {
  return new Worker<HealthCheckJobData>(
    HEALTH_CHECK_QUEUE,
    async (job: Job<HealthCheckJobData>) => {
      console.log(`[health-check] Job ${job.id} processado. triggered_at: ${job.data.triggered_at}`)
      // Placeholder — sem logica de negocio em Phase 1
      return { success: true, processed_at: new Date().toISOString() }
    },
    {
      connection: redis,
      // Concorrencia 1 para o placeholder — DataJud worker usara concorrencia maior
      concurrency: 1,
    }
  )
}
