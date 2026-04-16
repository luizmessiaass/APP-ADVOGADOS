/**
 * billing.ts — POST /api/webhooks/billing
 *
 * Provider-agnostic webhook receiver for billing events (payment.failed / payment.succeeded).
 *
 * Security mitigations:
 *   T-7-08: X-Webhook-Secret validated via crypto.timingSafeEqual (constant-time comparison)
 *   T-7-09: Idempotent event log — INSERT INTO billing_events ON CONFLICT (event_id) DO NOTHING
 *
 * The route has skipAuth: true (server-to-server, no JWT).
 * Auth is exclusively the shared secret in X-Webhook-Secret header.
 */

import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '../../lib/supabase.js'
import { invalidateTenantStatusCache } from '../../plugins/entitlement.js'
import { env } from '../../config.js'
import type { Redis } from 'ioredis'

const BillingWebhookPayloadSchema = z.object({
  event: z.enum(['payment.failed', 'payment.succeeded']),
  tenant_id: z.string().uuid(),
  event_id: z.string().min(1),
  occurred_at: z.string(),
  provider: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function webhookBillingRoutes(app: FastifyInstance, opts: { redis: Redis }): Promise<void> {
  app.post(
    '/billing',
    { config: { skipAuth: true } },
    async (request, reply) => {
      // T-7-08: Validate X-Webhook-Secret using constant-time comparison to prevent timing attacks
      const incomingSecret = request.headers['x-webhook-secret'] ?? ''
      const expectedSecret = env.BILLING_WEBHOOK_SECRET

      // If secret is empty or missing, reject immediately
      if (!incomingSecret || !expectedSecret) {
        return reply.code(401).send({
          error: 'unauthorized',
          code: 'INVALID_WEBHOOK_SECRET',
        })
      }

      let secretsMatch = false
      try {
        const incomingBuf = Buffer.from(String(incomingSecret))
        const expectedBuf = Buffer.from(expectedSecret)
        // timingSafeEqual requires same-length buffers — pad to same length
        if (incomingBuf.length === expectedBuf.length) {
          secretsMatch = timingSafeEqual(incomingBuf, expectedBuf)
        }
      } catch {
        secretsMatch = false
      }

      if (!secretsMatch) {
        return reply.code(401).send({
          error: 'unauthorized',
          code: 'INVALID_WEBHOOK_SECRET',
        })
      }

      // Validate payload
      const parseResult = BillingWebhookPayloadSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'invalid_payload',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.flatten(),
        })
      }

      const { event, tenant_id, event_id, occurred_at, provider, metadata } = parseResult.data

      // T-7-09: Idempotent insert — ON CONFLICT (event_id) DO NOTHING
      // If RETURNING is empty, the event was already processed (duplicate)
      const { data: insertedRows, error: insertError } = await supabaseAdmin
        .from('billing_events')
        .insert({
          event_id,
          event,
          tenant_id,
          occurred_at,
          provider: provider ?? 'unknown',
          metadata: metadata ?? {},
        })
        .select('id')

      if (insertError) {
        request.log.error({ error: insertError.message, event_id }, 'Erro ao inserir billing_event')
        return reply.code(500).send({ error: 'internal_error', code: 'DB_ERROR' })
      }

      // Empty RETURNING = duplicate event — idempotent response
      if (!insertedRows || insertedRows.length === 0) {
        return reply.code(200).send({ status: 'already_processed' })
      }

      // Process event
      if (event === 'payment.failed') {
        // Only transition to grace if not already in grace/read_only/suspended
        const { error: updateError } = await supabaseAdmin
          .from('escritorios')
          .update({
            status: 'grace',
            grace_period_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenant_id)
          .not('status', 'in', '("grace","read_only","suspended")')

        if (updateError) {
          request.log.error({ error: updateError.message, tenant_id }, 'Erro ao atualizar status para grace')
        }
      } else if (event === 'payment.succeeded') {
        // Resolve grace period — reset to active, clear grace fields
        const { error: updateError } = await supabaseAdmin
          .from('escritorios')
          .update({
            status: 'active',
            grace_period_started_at: null,
            grace_banner: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenant_id)

        if (updateError) {
          request.log.error({ error: updateError.message, tenant_id }, 'Erro ao resolver grace period')
        }
      }

      // Always invalidate Redis cache after status change
      await invalidateTenantStatusCache(opts.redis, tenant_id)

      return reply.code(200).send({ status: 'processed' })
    }
  )
}
