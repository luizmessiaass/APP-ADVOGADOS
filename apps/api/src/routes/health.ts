import type { FastifyInstance } from 'fastify'
import { supabaseAdmin } from '../lib/supabase.js'
import { createRedisClient } from '../lib/redis.js'

type CheckStatus = 'ok' | 'error'

interface HealthChecks {
  supabase: CheckStatus
  redis: CheckStatus
  datajud: CheckStatus
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', { config: { skipAuth: true } }, async (_req, reply) => {
    const checks: HealthChecks = {
      supabase: 'error',
      redis: 'error',
      datajud: 'error',
    }

    // Check 1: Supabase — query simples para validar conectividade
    try {
      const { error } = await supabaseAdmin
        .from('escritorios')
        .select('id')
        .limit(1)
      checks.supabase = error ? 'error' : 'ok'
    } catch {
      checks.supabase = 'error'
    }

    // Check 2: Redis — PING
    const redis = createRedisClient()
    try {
      await redis.connect()
      const pong = await redis.ping()
      checks.redis = pong === 'PONG' ? 'ok' : 'error'
    } catch {
      checks.redis = 'error'
    } finally {
      await redis.quit().catch(() => {})
    }

    // Check 3: DataJud — connectivity check com timeout de 3s
    try {
      const res = await fetch('https://api-publica.datajud.cnj.jus.br/', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      })
      // 405 e' esperado para HEAD — significa que o servidor esta respondendo
      checks.datajud = res.ok || res.status === 405 ? 'ok' : 'error'
    } catch {
      checks.datajud = 'error'
    }

    const allOk = Object.values(checks).every((v) => v === 'ok')

    return reply
      .code(allOk ? 200 : 503)
      .send({
        status: allOk ? 'ok' : 'degraded',
        checks,
        timestamp: new Date().toISOString(),
      })
  })
}
