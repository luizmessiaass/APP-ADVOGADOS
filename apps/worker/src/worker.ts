// Entry point do BullMQ Worker — roda como processo Railway separado (D-31)
// NAO importar nada do apps/api aqui — processos separados

import * as Sentry from '@sentry/node'
import pino from 'pino'
import { env } from './config.js'
import { createHealthCheckWorker, HEALTH_CHECK_QUEUE } from './queues/health-check.js'
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

logger.info(
  { queue: HEALTH_CHECK_QUEUE },
  '[worker] BullMQ worker iniciado. Aguardando jobs...'
)

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`[worker] Recebeu ${signal}. Encerrando graciosamente...`)
  await healthCheckWorker.close()
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
