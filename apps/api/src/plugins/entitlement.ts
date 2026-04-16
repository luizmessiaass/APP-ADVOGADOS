import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import type { Redis } from 'ioredis'
import { supabaseAdmin } from '../lib/supabase.js'

const CACHE_TTL_SECONDS = 30

export const ENTITLEMENT_SKIP_ROUTES = new Set([
  '/health',
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/webhooks/billing',
  '/api/v1/tenant/status',
])

/**
 * Invalidates the Redis-cached tenant status for a given tenant.
 * Must be called after any admin status change to avoid stale entitlement decisions.
 * T-7-04: 30s TTL + explicit invalidation on status change.
 */
export async function invalidateTenantStatusCache(redis: Redis, tenantId: string): Promise<void> {
  await redis.del(`tenant:status:${tenantId}`)
}

/**
 * Entitlement plugin — gates all protected endpoints based on tenant subscription status.
 *
 * Trust boundaries:
 * - T-7-04: Redis cache may be stale up to 30s — invalidate explicitly on status changes
 * - T-7-05: Fail CLOSED on Redis/DB error — unknown status is treated as suspended
 * - T-7-06: super_admin still goes through entitlement — no bypass for admin role
 */
const entitlementPlugin: FastifyPluginAsync<{ redis: Redis }> = async (fastify, opts) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Strip query string before route matching
    const url = request.url.split('?')[0]

    // Skip routes bypass entitlement entirely (public endpoints)
    if (ENTITLEMENT_SKIP_ROUTES.has(url)) return

    // Defense-in-depth: if auth plugin already rejected the request, tenant_id will be absent.
    // Do not block here — auth plugin handles 401/403 upstream.
    if (!request.user?.tenant_id) return

    const tenantId = request.user.tenant_id
    const cacheKey = `tenant:status:${tenantId}`

    let status: string

    // Try cache first (30s TTL)
    const cached = await opts.redis.get(cacheKey)

    if (cached) {
      status = cached
    } else {
      // Cache miss — query DB
      const { data, error } = await supabaseAdmin
        .from('escritorios')
        .select('status')
        .eq('id', tenantId)
        .single()

      if (error || !data) {
        // T-7-05: Fail CLOSED — DB error or missing row treated as suspended.
        // This prevents a DB outage from granting access to suspended tenants.
        status = 'suspended'
      } else {
        status = data.status
      }

      // Cache the resolved status (even 'suspended') for TTL seconds
      await opts.redis.setex(cacheKey, CACHE_TTL_SECONDS, status)
    }

    // Suspended tenants are blocked on ALL methods
    if (status === 'suspended') {
      return reply.code(402).send({
        error: 'subscription_required',
        tenant_status: 'suspended',
        message: 'Assinatura suspensa. Entre em contato com o Portal Juridico.',
      })
    }

    // Read-only tenants are blocked only on write methods
    if (status === 'read_only') {
      const method = request.method.toUpperCase()
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return reply.code(402).send({
          error: 'subscription_required',
          tenant_status: 'read_only',
          message: 'Conta em modo leitura. Regularize a assinatura para retomar operacoes de escrita.',
        })
      }
    }

    // pending, trial, active, grace — pass through unconditionally
  })
}

export default fp(entitlementPlugin, { name: 'entitlement', dependencies: ['auth'] })
