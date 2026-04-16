import type { FastifyInstance } from 'fastify'
import { supabaseAdmin } from '../../lib/supabase.js'
import { env } from '../../config.js'

export async function tenantStatusRoutes(app: FastifyInstance): Promise<void> {
  app.get('/status', async (request, reply) => {
    const tenantId = request.user.tenant_id

    const { data, error } = await supabaseAdmin
      .from('escritorios')
      .select('status, grace_banner, grace_period_started_at')
      .eq('id', tenantId)
      .single()

    if (error || !data) {
      return reply.code(500).send({
        success: false,
        error: 'Tenant nao encontrado',
        code: 'TENANT_NOT_FOUND',
      })
    }

    let daysUntilSuspension: number | null = null
    if (data.grace_period_started_at) {
      const started = new Date(data.grace_period_started_at).getTime()
      const daysSinceStart = Math.floor((Date.now() - started) / 86_400_000)
      daysUntilSuspension = Math.max(0, 14 - daysSinceStart)
    }

    return reply.send({
      status: data.status,
      grace_banner: data.grace_banner,
      grace_period_started_at: data.grace_period_started_at,
      days_until_suspension: daysUntilSuspension,
      // D-07 Phase 8: versão atual dos termos — Android compara com DataStore para re-gate
      termos_versao_atual: env.TERMS_VERSION,
    })
  })
}
