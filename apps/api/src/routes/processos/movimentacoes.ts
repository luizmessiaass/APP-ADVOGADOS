/**
 * Route: GET /api/v1/processos/:id/movimentacoes
 * Returns movimentacoes for a processo with AI-translated fields.
 *
 * Security (T-05-01-03):
 * - Fetches processo first; RLS on processos blocks access if cliente_usuario_id doesn't match.
 * - Returns 404 if RLS blocks — client cannot distinguish "not found" from "forbidden".
 * - movimentacoes inherit tenant isolation via their own RLS policy.
 */
import type { FastifyPluginAsync } from 'fastify'
import { supabaseAsUser } from '../../lib/supabase.js'

export const movimentacoesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/processos/:id/movimentacoes
  fastify.get<{ Params: { id: string } }>('/:id/movimentacoes', async (request, reply) => {
    const { id } = request.params
    const token = request.headers.authorization?.slice(7) ?? ''
    const db = supabaseAsUser(token)

    // Verify process access via RLS — returns null if not accessible (404 vs 403)
    // T-05-01-03: RLS on processos blocks clients from accessing other clients' movimentacoes
    const { data: processo } = await db
      .from('processos')
      .select('id')
      .eq('id', id)
      .single()

    if (!processo) {
      return reply.status(404).send({
        success: false,
        error: 'Processo não encontrado',
        code: 'PROCESSO_NOT_FOUND',
      })
    }

    const { data, error } = await db
      .from('movimentacoes')
      .select('id, data_hora, descricao_original, status, explicacao, proxima_data, impacto')
      .eq('processo_id', id)
      .order('data_hora', { ascending: false })

    if (error) {
      request.log.error({ err: error, processoId: id }, 'Erro ao buscar movimentacoes')
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar movimentações',
        code: 'INTERNAL_ERROR',
      })
    }

    return reply.status(200).send({
      success: true,
      data: (data ?? []).map((m: {
        id: string
        data_hora: string
        descricao_original: string
        status: string | null
        explicacao: string | null
        proxima_data: string | null
        impacto: string | null
      }) => ({
        id: m.id,
        data_hora: m.data_hora,
        descricao_original: m.descricao_original,
        status: m.status ?? null,
        explicacao: m.explicacao ?? null,
        proxima_data: m.proxima_data ?? null,
        impacto: m.impacto ?? null,
      })),
    })
  })
}
