import type { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { supabaseAsUser } from '../../lib/supabase.js'
import { env } from '../../config.js'

const ConsentimentoBody = Type.Object({
  versao_termos: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }), // ISO date: 2026-04-14
})

export async function lgpdRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/lgpd/consentimento — registra opt-in LGPD
  // RLS enforced: usuario so insere o proprio consentimento
  app.post('/consentimento', {
    schema: { body: ConsentimentoBody },
  }, async (req, reply) => {
    const { versao_termos } = req.body as { versao_termos: string }
    const token = req.headers.authorization?.slice(7) ?? ''
    const db = supabaseAsUser(token)

    // ip_origem e user_agent para auditoria ANPD (D-23)
    const ip_origem = req.ip
    const user_agent = req.headers['user-agent'] ?? null

    const { data, error } = await db
      .from('lgpd_consentimentos')
      .insert({
        usuario_id: req.user.sub,
        versao_termos,
        ip_origem,
        user_agent,
      })
      .select('id')
      .single()

    if (error) {
      req.tenantLogger.error({ error: error.message }, 'Erro ao registrar consentimento LGPD')
      return reply.code(500).send({ success: false, error: 'Erro ao registrar consentimento', code: 'CONSENT_ERROR' })
    }

    return reply.code(201).send({
      success: true,
      consentimento_id: data.id,
      privacy_policy_url: env.PRIVACY_POLICY_URL,  // LGPD-06
    })
  })

  // GET /api/v1/lgpd/consentimento — historico do usuario
  // RLS enforced: usuario so ve seus proprios registros
  app.get('/consentimento', async (req, reply) => {
    const token = req.headers.authorization?.slice(7) ?? ''
    const db = supabaseAsUser(token)

    const { data, error } = await db
      .from('lgpd_consentimentos')
      .select('id, versao_termos, consentido_em, revogado_em')
      .eq('usuario_id', req.user.sub)
      .order('consentido_em', { ascending: false })

    if (error) {
      req.tenantLogger.error({ error: error.message }, 'Erro ao buscar consentimentos')
      return reply.code(500).send({ success: false, error: 'Erro ao buscar consentimentos', code: 'FETCH_ERROR' })
    }

    return reply.send({ success: true, consentimentos: data ?? [] })
  })
}
