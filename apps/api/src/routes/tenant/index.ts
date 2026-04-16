import type { FastifyInstance } from 'fastify'
import { supabaseAsUser } from '../../lib/supabase.js'
import { env } from '../../config.js'

export async function tenantRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/tenant/status
   * Retorna o status de assinatura do tenant, flag de banner de grace period,
   * e a versão atual dos termos para re-gate de consentimento.
   *
   * Phase 7 (D-11): tenant_status + grace_banner
   * Phase 8 (D-07): + termos_versao_atual (consent re-gate comparison)
   *
   * Android integration contract (Plan 04 reference):
   *   const val TERMS_VERSION = "2026-04-16"  // ISO date — update + re-deploy to force re-gate
   *   val storedVersion = dataStore.data.map { it[TERMS_VERSION_KEY] }.firstOrNull()
   *   val serverVersion = api.getTenantStatus().termos_versao_atual
   *   val needsReConsent = storedVersion == null || storedVersion != serverVersion
   */
  app.get('/status', async (req, reply) => {
    const token = req.headers.authorization?.slice(7) ?? ''
    const db = supabaseAsUser(token)

    const { data: escritorio, error } = await db
      .from('escritorios')
      .select('status, grace_banner')
      .eq('id', req.user.tenant_id)
      .single()

    if (error || !escritorio) {
      return reply.code(404).send({
        success: false,
        error: 'Escritório não encontrado',
        code: 'NOT_FOUND',
      })
    }

    return reply.send({
      tenant_status: escritorio.status,
      grace_banner: escritorio.grace_banner ?? false,
      // D-07: versão atual dos termos — app compara com DataStore local para re-gate
      termos_versao_atual: env.TERMS_VERSION,
    })
  })
}
