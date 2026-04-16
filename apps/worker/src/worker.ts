// Entry point do BullMQ Worker — roda como processo Railway separado (D-31)
// NAO importar nada do apps/api aqui — processos separados

import * as Sentry from '@sentry/node'
import pino from 'pino'
import { Worker } from 'bullmq'
import { env } from './config.js'
import { createHealthCheckWorker, HEALTH_CHECK_QUEUE } from './queues/health-check.js'
import { getGracePeriodQueue, GRACE_PERIOD_QUEUE, type GracePeriodJobData } from './queues/grace-period.js'
import { processarGracePeriodCheck } from './workers/grace-period-check.js'
import Redis from 'ioredis'

// Logger do worker
const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV !== 'test' && env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}
  ),
})

// Inicializar Sentry para o worker — tag source=worker (D-29)
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    initialScope: { tags: { source: 'worker' } },
    sendDefaultPii: false,
  })
}

// Cliente Redis para BullMQ — maxRetriesPerRequest: null e' OBRIGATORIO (Pitfall 5, RESEARCH.md)
const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

// Instanciar workers
const healthCheckWorker = createHealthCheckWorker(redisConnection)

// Grace period — cron diario 09:00 BRT (12:00 UTC)
// 0 12 * * * = 09:00 BRT (UTC-3). Brazil abolished BRST summer time in 2019 (Decreto 9.772/2019). UTC offset permanently -03:00.
const gracePeriodQueue = getGracePeriodQueue(redisConnection)
await gracePeriodQueue.upsertJobScheduler(
  'daily-grace-period-check',
  { pattern: '0 12 * * *' },
  { name: 'grace-period-check', data: { triggered_at: new Date().toISOString() } }
)

const gracePeriodWorker = new Worker<GracePeriodJobData>(
  GRACE_PERIOD_QUEUE,
  processarGracePeriodCheck,
  { connection: redisConnection, concurrency: 1 }
)

logger.info(
  { queues: [HEALTH_CHECK_QUEUE, GRACE_PERIOD_QUEUE] },
  '[worker] BullMQ workers iniciados. Aguardando jobs...'
)

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`[worker] Recebeu ${signal}. Encerrando graciosamente...`)
  await healthCheckWorker.close()
  await gracePeriodWorker.close()
  await redisConnection.quit()
  logger.info('[worker] Encerrado.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Capturar erros nao tratados
process.on('uncaughtException', (err) => {
  Sentry.captureException(err)
  logger.error({ err }, '[worker] Erro nao capturado — encerrando')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  Sentry.captureException(reason)
  logger.error({ reason }, '[worker] Promise rejection nao tratada — encerrando')
  process.exit(1)
})
