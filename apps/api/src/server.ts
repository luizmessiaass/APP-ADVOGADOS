import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
import { env } from './config.js'
import authPlugin from './plugins/auth.js'
import sentryPlugin from './plugins/sentry.js'
import { authRoutes } from './routes/auth/index.js'
import { lgpdRoutes } from './routes/lgpd/index.js'
import { healthRoutes } from './routes/health.js'
import { processosRoutes } from './routes/processos.js'
import { movimentacoesRoutes } from './routes/processos/movimentacoes.js'
import { getDatajudQueue } from './queues/datajud-queue.js'
import { createBullMQRedisClient } from './lib/redis.js'

export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify({
    ...opts,
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      // D-26: Redacao de PII obrigatoria — por construcao, nao por disciplina
      redact: {
        paths: [
          'req.body.cpf',
          'req.body.password',
          'req.body.senha',
          '*.cpf',
          '*.prompt_text',
          '*.senha',
          'req.headers.authorization', // nao logar JWTs completos
        ],
        censor: '[REDACTED]',
      },
      // D-28: Betterstack em producao; pino-pretty em dev
      ...(env.NODE_ENV === 'production' && env.BETTERSTACK_SOURCE_TOKEN
        ? {
            transport: {
              target: '@logtail/pino',
              options: { sourceToken: env.BETTERSTACK_SOURCE_TOKEN },
            },
          }
        : env.NODE_ENV !== 'test'
          ? {
              transport: {
                target: 'pino-pretty',
                options: { colorize: true },
              },
            }
          : {}),
    },
    // Gerar request_id automaticamente para rastreabilidade
    genReqId: () => crypto.randomUUID(),
  })

  // Security headers (D-22 rate limiting — limites altos em Phase 1)
  app.register(helmet)
  app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    // Em producao, usar tenant_id como key para isolamento de rate limit por tenant
    keyGenerator: (req) => {
      return req.user?.tenant_id ?? req.ip
    },
  })

  // Plugins de infraestrutura
  app.register(sentryPlugin)
  app.register(authPlugin)

  // -------------------------------------------------------------------------
  // Bull Board em /admin/queues com guard Bearer token (D-10/D-11/D-12)
  // T-02-19: token de 32 bytes (openssl rand -hex 32) em ADMIN_TOKEN env var
  // T-02-20: admin-only, não exposto externamente sem token forte
  // -------------------------------------------------------------------------
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/admin/queues')) return

    const authHeader = request.headers.authorization ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const adminToken = process.env.ADMIN_TOKEN

    if (!adminToken || token !== adminToken) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      })
    }
  })

  // Registrar Bull Board (D-12 — roteado pelo servico API)
  if (env.NODE_ENV !== 'test') {
    // Apenas inicializa Bull Board fora de testes para evitar conexão Redis desnecessária
    const redis = createBullMQRedisClient()
    const bullBoardAdapter = new FastifyAdapter()

    createBullBoard({
      queues: [new BullMQAdapter(getDatajudQueue(redis))],
      serverAdapter: bullBoardAdapter,
    })

    bullBoardAdapter.setBasePath('/admin/queues')

    app.register(bullBoardAdapter.registerPlugin(), {
      prefix: '/admin/queues',
    })
  }

  // Rota de health publica (sem autenticacao)
  app.get('/', { config: { skipAuth: true } }, async (_req, reply) => {
    return reply.send({ service: 'portaljuridico-api', version: '0.1.0' })
  })

  // Health check publico (sem autenticacao) — Railway health checks
  app.register(healthRoutes)

  // Rotas de autenticacao e LGPD
  app.register(authRoutes, { prefix: '/api/v1/auth' })
  app.register(lgpdRoutes, { prefix: '/api/v1/lgpd' })

  // Rotas de processos (DATAJUD-01, DATAJUD-02, DATAJUD-09)
  app.register(processosRoutes, { prefix: '/api/v1' })

  // Rotas de movimentacoes (Phase 5 — GET /api/v1/processos/:id/movimentacoes)
  app.register(movimentacoesRoutes, { prefix: '/api/v1/processos' })

  return app
}

export async function startServer(): Promise<void> {
  const app = buildApp()

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`Servidor iniciado na porta ${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Entry point quando executado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  startServer()
}
