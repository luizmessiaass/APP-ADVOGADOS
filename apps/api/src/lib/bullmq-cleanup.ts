import { getDatajudQueue } from '../queues/datajud-queue.js'
import { supabaseAsUser } from './supabase.js'

/**
 * Cancela jobs BullMQ pendentes/atrasados para todos os processos de um cliente.
 * NOTA: Jobs ativos (locked) não podem ser removidos — tratados com try/catch silencioso.
 * O worker encontrará cliente_usuario_id = NULL e pulará side-effects não críticos.
 *
 * IMPORTANTE: jobs usam processoId no payload (não clienteId diretamente).
 * Estratégia: buscar processoIds do cliente no banco, depois filtrar jobs.
 */
export async function cancelarJobsDoCliente(
  clienteId: string,
  token: string
): Promise<void> {
  const db = supabaseAsUser(token)

  // Buscar processoIds vinculados ao cliente
  const { data: processos } = await db
    .from('processos')
    .select('id')
    .eq('cliente_usuario_id', clienteId)

  const processoIds = new Set((processos ?? []).map((p: { id: string }) => p.id))
  if (processoIds.size === 0) return

  const queue = getDatajudQueue()
  const [waiting, delayed] = await Promise.all([
    queue.getWaiting(0, -1),
    queue.getDelayed(0, -1),
  ])

  const jobsAlvo = [...waiting, ...delayed].filter(
    (job) => processoIds.has(job.data?.processoId)
  )

  await Promise.allSettled(
    jobsAlvo.map(async (job) => {
      try {
        await job.remove()
      } catch {
        // Active (locked) job — worker will self-resolve on NULL cliente_usuario_id
      }
    })
  )
}
