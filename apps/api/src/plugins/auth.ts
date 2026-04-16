import fp from 'fastify-plugin'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import type { FastifyPluginAsync, FastifyBaseLogger } from 'fastify'
import { env } from '../config.js'

export interface TenantUser {
  sub: string
  tenant_id: string
  role: 'admin_escritorio' | 'advogado' | 'cliente'
}

// JWKS cache: createRemoteJWKSet ja faz cache interno — NAO recriar por request
const JWKS = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
)

declare module 'fastify' {
  interface FastifyRequest {
    user: TenantUser
    tenantLogger: FastifyBaseLogger
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null)
  fastify.decorateRequest('tenantLogger', null)

  fastify.addHook('preHandler', async (request, reply) => {
    // Rotas com skipAuth: true pulam autenticacao (ex: /health)
    if ((request.routeOptions?.config as Record<string, unknown>)?.skipAuth === true) {
      return
    }

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({
        success: false,
        error: 'Token ausente',
        code: 'MISSING_TOKEN',
      })
    }

    try {
      const token = authHeader.slice(7)
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      })

      const appMeta = (payload as JWTPayload & { app_metadata?: Record<string, string> })
        .app_metadata

      if (!appMeta?.tenant_id) {
        return reply.code(403).send({
          success: false,
          error: 'tenant_id ausente no token. Hook Custom Access Token pode nao estar ativo.',
          code: 'NO_TENANT_CONTEXT',
        })
      }

      request.user = {
        sub: payload.sub!,
        tenant_id: appMeta.tenant_id,
        role: appMeta.role as TenantUser['role'],
      }

      // Child logger com contexto de tenant — propagado automaticamente em todos os logs do handler
      request.tenantLogger = request.log.child({
        tenant_id: appMeta.tenant_id,
        user_id: payload.sub,
        request_id: request.id,
      })
    } catch {
      return reply.code(401).send({
        success: false,
        error: 'Token invalido ou expirado',
        code: 'INVALID_TOKEN',
      })
    }
  })
}

export default fp(authPlugin, { name: 'auth' })
