import fp from 'fastify-plugin'
import * as Sentry from '@sentry/node'
import type { FastifyPluginAsync } from 'fastify'
import { env } from '../config.js'

const sentryPlugin: FastifyPluginAsync = async (fastify) => {
  if (!env.SENTRY_DSN) {
    fastify.log.info('Sentry DSN nao configurado — erro tracking desabilitado')
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Tag diferencia erros da API vs Worker no mesmo DSN (D-29)
    initialScope: {
      tags: { source: 'api' },
    },
    // Nao capturar PII automaticamente
    sendDefaultPii: false,
  })

  // Capturar erros nao tratados com contexto de tenant
  fastify.addHook('onError', async (request, _reply, error) => {
    Sentry.withScope((scope) => {
      if (request.user) {
        scope.setUser({ id: request.user.sub })
        scope.setTag('tenant_id', request.user.tenant_id)
        scope.setTag('role', request.user.role)
      }
      scope.setTag('request_id', request.id)
      Sentry.captureException(error)
    })
  })

  fastify.log.info('Sentry inicializado com tag source=api')
}

export default fp(sentryPlugin, { name: 'sentry' })
