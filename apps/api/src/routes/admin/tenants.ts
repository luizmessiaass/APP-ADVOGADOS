/**
 * admin/tenants.ts — Super-admin tenant management endpoints.
 *
 * All routes require role === 'super_admin'. Uses supabaseAdmin (service role) to bypass RLS
 * and see all tenants. This is INTENTIONAL — the super_admin role check in each handler
 * is the authorization guard (T-7-10).
 *
 * Routes:
 *   GET  /api/v1/admin/tenants                    — list all tenants
 *   PATCH /api/v1/admin/tenants/:id/status        — change status + cache invalidation
 *   POST  /api/v1/admin/tenants/:id/grace/resolve — resolve grace period manually
 *
 * BILLING-07: suspension is purely a status flag change — no row deletion.
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabaseAdmin } from '../../lib/supabase.js'
import { invalidateTenantStatusCache } from '../../plugins/entitlement.js'
import type { Redis } from 'ioredis'

const VALID_STATUSES = ['pending', 'trial', 'active', 'grace', 'read_only', 'suspended'] as const

const PatchStatusBody = z.object({
  status: z.enum(VALID_STATUSES),
})

export async function adminTenantsRoutes(
  app: FastifyInstance,
  opts: { redis: Redis }
): Promise<void> {
  // GET /api/v1/admin/tenants — list all tenants (super_admin only)
  // T-7-10: supabaseAdmin used deliberately — explicit super_admin check is the authorization guard
  app.get('/tenants', async (request, reply) => {
    if (request.user?.role !== 'super_admin') {
      return reply.code(403).send({
        success: false,
        error: 'Acesso restrito a super_admin.',
        code: 'FORBIDDEN',
      })
    }

    const { data, error } = await supabaseAdmin
      .from('escritorios')
      .select('id, nome, email, status, grace_banner, grace_period_started_at, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      request.log.error({ error: error.message }, 'Erro ao listar tenants')
      return reply.code(500).send({ success: false, error: 'Erro ao listar tenants', code: 'DB_ERROR' })
    }

    return reply.send({ success: true, tenants: data ?? [] })
  })

  // PATCH /api/v1/admin/tenants/:id/status — change tenant status + invalidate cache
  // T-7-11: Zod enum validation rejects invalid status values before DB write
  app.patch('/tenants/:id/status', async (request, reply) => {
    if (request.user?.role !== 'super_admin') {
      return reply.code(403).send({
        success: false,
        error: 'Acesso restrito a super_admin.',
        code: 'FORBIDDEN',
      })
    }

    const { id } = request.params as { id: string }
    const parseResult = PatchStatusBody.safeParse(request.body)
    if (!parseResult.success) {
      return reply.code(400).send({
        success: false,
        error: 'Status invalido.',
        code: 'INVALID_STATUS',
        details: parseResult.error.flatten(),
      })
    }

    const { status } = parseResult.data

    // Log billing_events for audit trail
    const eventId = crypto.randomUUID()
    const { error: eventError } = await supabaseAdmin
      .from('billing_events')
      .insert({
        event_id: eventId,
        event: 'status.manual_change',
        tenant_id: id,
        occurred_at: new Date().toISOString(),
        provider: 'manual',
        metadata: {
          changed_by: request.user.sub,
          new_status: status,
        },
      })

    if (eventError) {
      request.log.warn({ error: eventError.message, tenant_id: id }, 'Erro ao registrar billing_event de mudança manual')
    }

    // Update tenant status
    const { error: updateError } = await supabaseAdmin
      .from('escritorios')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      request.log.error({ error: updateError.message, tenant_id: id }, 'Erro ao atualizar status do tenant')
      return reply.code(500).send({ success: false, error: 'Erro ao atualizar status', code: 'DB_ERROR' })
    }

    // CRITICAL: Invalidate Redis cache to prevent stale entitlement (T-7-04)
    await invalidateTenantStatusCache(opts.redis, id)

    return reply.send({ success: true, tenant_id: id, new_status: status })
  })

  // POST /api/v1/admin/tenants/:id/grace/resolve — manually resolve grace period
  // Used when admin confirms payment outside the automated webhook flow
  app.post('/tenants/:id/grace/resolve', async (request, reply) => {
    if (request.user?.role !== 'super_admin') {
      return reply.code(403).send({
        success: false,
        error: 'Acesso restrito a super_admin.',
        code: 'FORBIDDEN',
      })
    }

    const { id } = request.params as { id: string }

    // Log billing_events as manual payment.succeeded
    const eventId = crypto.randomUUID()
    const { error: eventError } = await supabaseAdmin
      .from('billing_events')
      .insert({
        event_id: eventId,
        event: 'payment.succeeded',
        tenant_id: id,
        occurred_at: new Date().toISOString(),
        provider: 'manual',
        metadata: { resolved_by: request.user.sub },
      })

    if (eventError) {
      request.log.warn({ error: eventError.message, tenant_id: id }, 'Erro ao registrar billing_event de resolucao manual')
    }

    // Resolve grace period — reset to active, clear grace fields
    const { error: updateError } = await supabaseAdmin
      .from('escritorios')
      .update({
        status: 'active',
        grace_period_started_at: null,
        grace_banner: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      request.log.error({ error: updateError.message, tenant_id: id }, 'Erro ao resolver grace period')
      return reply.code(500).send({ success: false, error: 'Erro ao resolver grace period', code: 'DB_ERROR' })
    }

    // CRITICAL: Invalidate Redis cache (T-7-04)
    await invalidateTenantStatusCache(opts.redis, id)

    return reply.send({ success: true })
  })
}
