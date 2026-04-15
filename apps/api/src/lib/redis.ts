import Redis from 'ioredis'
import { env } from '../config.js'

// Cliente Redis para uso geral pela API (health check, cache simples)
// maxRetriesPerRequest: 3 — evita bloquear a API em timeouts de Redis
export function createRedisClient(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  })
}

// Cliente Redis para BullMQ — maxRetriesPerRequest: null e' OBRIGATORIO para BullMQ
// Ver Pitfall 5 no RESEARCH.md
export function createBullMQRedisClient(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}
