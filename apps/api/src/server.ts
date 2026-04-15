import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { env } from './config.js'
import authPlugin from './plugins/auth.js'
import sentryPlugin from './plugins/sentry.js'
import { authRoutes } from './routes/auth/index.js'
import { lgpdRoutes } from './routes/lgpd/index.js'
import { healthRoutes } from './routes/health.js'

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

  // Rota de health publica (sem autenticacao)
  app.get('/', { config: { skipAuth: true } }, async (_req, reply) => {
    return reply.send({ service: 'portaljuridico-api', version: '0.1.0' })
  })

  // Health check publico (sem autenticacao) — Railway health checks
  app.register(healthRoutes)

  // Rotas de autenticacao e LGPD
  app.register(authRoutes, { prefix: '/api/v1/auth' })
  app.register(lgpdRoutes, { prefix: '/api/v1/lgpd' })

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
