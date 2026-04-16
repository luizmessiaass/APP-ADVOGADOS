import type { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { supabaseAdmin, supabaseAsUser } from '../../lib/supabase.js'
import { cancelarJobsDoCliente } from '../../lib/bullmq-cleanup.js'

const ClienteParams = Type.Object({
  clienteId: Type.String({ format: 'uuid' }),
})

export async function clientesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * DELETE /api/v1/clientes/:clienteId
   * Art. 18 LGPD — deleção total com cascade.
   * Roles permitidas: admin_escritorio, advogado (do mesmo tenant via RLS).
   * Returns: 204 on success, 404 if not found, 400 if not a client, 500 on auth error.
   */
  app.delete('/:clienteId', {
    schema: { params: ClienteParams },
  }, async (req, reply) => {
    const { clienteId } = req.params as { clienteId: string }
    const token = req.headers.authorization?.slice(7) ?? ''
    const db = supabaseAsUser(token)

    // Step 1: Verify ownership — RLS guarantees tenant isolation
    const { data: usuario, error: fetchError } = await db
      .from('usuarios')
      .select('id, role_local')
      .eq('id', clienteId)
      .single()

    if (fetchError || !usuario) {
      return reply.code(404).send({
        success: false,
        error: 'Cliente não encontrado',
        code: 'NOT_FOUND',
      })
    }

    if (usuario.role_local !== 'cliente') {
      return reply.code(400).send({
        success: false,
        error: 'Apenas clientes podem ser deletados',
        code: 'INVALID_ROLE',
      })
    }

    // Step 2: Cancel BullMQ jobs (non-fatal — proceed even if partial failure)
    try {
      await cancelarJobsDoCliente(clienteId, token)
    } catch (err) {
      req.tenantLogger?.warn({ err, clienteId }, 'Erro ao cancelar jobs BullMQ — prosseguindo')
    }

    // Step 3: Delete auth user — CASCADE removes all public.* records
    // processos.cliente_usuario_id becomes NULL (ON DELETE SET NULL — INTENTIONAL)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(clienteId)
    if (deleteError) {
      req.tenantLogger?.error(
        { error: deleteError.message, clienteId },
        'Falha ao deletar usuario auth'
      )
      return reply.code(500).send({
        success: false,
        error: 'Erro ao deletar cliente',
        code: 'DELETE_ERROR',
      })
    }

    // T-8-02: Log clienteId only — NEVER log nome or cpf
    req.tenantLogger?.info({ clienteId }, 'Cliente deletado — Art. 18 LGPD compliant')
    return reply.code(204).send()
  })
}
