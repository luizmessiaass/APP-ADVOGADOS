/**
 * Rotas de processos jurídicos.
 * (DATAJUD-01, DATAJUD-02, DATAJUD-09, D-07/D-08/D-09, D-19/D-21)
 *
 * Endpoints:
 * GET  /api/v1/processos            — listar processos do usuário autenticado (Phase 5)
 * GET  /api/v1/processos/:id        — dados do processo com staleness flag + telefone_whatsapp
 * POST /api/v1/processos            — cadastrar processo (valida CNJ, agenda sync)
 * POST /api/v1/processos/:id/sync   — disparar sync manual (202 Accepted)
 */
import type { FastifyPluginAsync } from 'fastify'
import { assertCNJValido, CNJInvalidoError, extrairCodigoTribunal } from '../datajud/cnj-validator.js'
import { resolverTribunal } from '../datajud/tribunal-map.js'
import { agendarSyncProcesso } from '../workers/scheduler.js'
import { getDatajudQueue } from '../queues/datajud-queue.js'
import { supabaseAsUser } from '../lib/supabase.js'
import { createRedisClient } from '../lib/redis.js'
import type { Tier } from '../workers/scheduler.js'

// Staleness threshold: 72 horas em ms (D-07)
const STALENESS_THRESHOLD_MS = 72 * 60 * 60 * 1000

/**
 * Calcula se o processo está desatualizado com base na última sincronização.
 * - null → nunca sincronizou → desatualizado: false (badge "Nunca sincronizado", não "Desatualizado")
 * - > 72h → desatualizado: true (badge laranja/vermelho na UI)
 * - <= 72h → desatualizado: false
 */
function calcularDesatualizado(ultimaSincronizacao: string | null): boolean {
  if (!ultimaSincronizacao) return false // Nunca sincronizou — badge diferente
  return Date.now() - new Date(ultimaSincronizacao).getTime() > STALENESS_THRESHOLD_MS
}

export const processosRoutes: FastifyPluginAsync = async (fastify) => {
  // -------------------------------------------------------------------------
  // GET /api/v1/processos — listar processos do usuário autenticado
  // Phase 5 (APP-02): RLS enforces cliente_usuario_id = auth.uid() for clients
  // Returns latest movimentacao.status for each processo (UI status badge)
  // -------------------------------------------------------------------------
  fastify.get('/processos', async (request, reply) => {
    const token = request.headers.authorization?.slice(7) ?? ''
    const db = supabaseAsUser(token)

    const { data, error } = await db
      .from('processos')
      .select(`
        id,
        numero_cnj,
        tribunal,
        ultima_sincronizacao,
        sincronizado,
        movimentacoes ( status, data_hora )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      request.log.error({ err: error }, 'Erro ao listar processos')
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar processos',
        code: 'INTERNAL_ERROR',
      })
    }

    type MovimentacaoRow = { status: string | null; data_hora: string }
    type ProcessoRow = {
      id: string
      numero_cnj: string
      tribunal: string
      ultima_sincronizacao: string | null
      sincronizado: boolean
      movimentacoes: MovimentacaoRow[]
    }

    const mapped = (data as ProcessoRow[]).map((p) => ({
      id: p.id,
      numero_cnj: p.numero_cnj,
      tribunal: p.tribunal,
      ultima_sincronizacao: p.ultima_sincronizacao,
      desatualizado: calcularDesatualizado(p.ultima_sincronizacao),
      // Latest movimentacao status (most recent by data_hora)
      status: (p.movimentacoes ?? [])
        .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
        [0]?.status ?? null,
    }))

    return reply.status(200).send({ success: true, data: mapped })
  })

  // -------------------------------------------------------------------------
  // GET /api/v1/processos/:id — buscar processo por ID (dados em cache)
  // DATAJUD-09: inclui campo desatualizado: true/false (D-07/D-08)
  // Phase 5: enriquecido com telefone_whatsapp do escritório (JOIN escritorios)
  // -------------------------------------------------------------------------
  fastify.get<{ Params: { id: string } }>('/processos/:id', async (request, reply) => {
    const { id } = request.params
    const tenantId = request.user.tenant_id
    const token = request.headers.authorization?.slice(7) ?? ''
    const db = supabaseAsUser(token)

    const { data, error } = await db
      .from('processos')
      .select(`
        id,
        numero_cnj,
        tribunal,
        tier_refresh,
        ultima_sincronizacao,
        sincronizado,
        created_at,
        updated_at,
        escritorios ( telefone_whatsapp )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      return reply.status(404).send({
        success: false,
        error: 'Processo não encontrado',
        code: 'PROCESSO_NOT_FOUND',
      })
    }

    const desatualizado = calcularDesatualizado(
      (data as { ultima_sincronizacao: string | null }).ultima_sincronizacao
    )

    type ProcessoDetalhe = {
      id: string
      numero_cnj: string
      tribunal: string
      tier_refresh: string
      ultima_sincronizacao: string | null
      sincronizado: boolean
      created_at: string
      updated_at: string
      escritorios: { telefone_whatsapp: string | null } | null
    }

    const p = data as ProcessoDetalhe

    return reply.status(200).send({
      success: true,
      data: {
        id: p.id,
        numero_cnj: p.numero_cnj,
        tribunal: p.tribunal,
        tier_refresh: p.tier_refresh,
        ultima_sincronizacao: p.ultima_sincronizacao,
        sincronizado: p.sincronizado,
        desatualizado, // D-08: flag para UI mostrar badge (DATAJUD-09)
        telefone_whatsapp: p.escritorios?.telefone_whatsapp ?? null, // Phase 5: WhatsApp contact
        created_at: p.created_at,
        updated_at: p.updated_at,
      },
    })
  })

  // -------------------------------------------------------------------------
  // POST /api/v1/processos — cadastrar novo processo
  // DATAJUD-01: validação CNJ antes de qualquer I/O
  // -------------------------------------------------------------------------
  fastify.post<{ Body: { numero_cnj: string; cliente_usuario_id?: string } }>('/processos', {
    schema: {
      body: {
        type: 'object',
        required: ['numero_cnj'],
        properties: {
          numero_cnj: { type: 'string' },
          cliente_usuario_id: { type: 'string', format: 'uuid' }, // optional — assign process to a client user
        },
      },
    },
  }, async (request, reply) => {
    const { numero_cnj, cliente_usuario_id } = request.body
    const tenantId = request.user.tenant_id
    const token = request.headers.authorization?.slice(7) ?? ''

    // DATAJUD-01: validar CNJ antes de qualquer I/O (T-02-18)
    try {
      assertCNJValido(numero_cnj)
    } catch (err) {
      if (err instanceof CNJInvalidoError) {
        return reply.status(422).send({
          success: false,
          error: err.message,
          code: err.code, // 'INVALID_CNJ'
        })
      }
      throw err
    }

    // Resolver tribunal a partir do código J.TT do CNJ (DATAJUD-02)
    let tribunal: string
    try {
      const codigoJT = extrairCodigoTribunal(numero_cnj)
      tribunal = resolverTribunal(codigoJT)
    } catch {
      return reply.status(422).send({
        success: false,
        error: 'Tribunal não suportado para o número CNJ informado',
        code: 'TRIBUNAL_NOT_SUPPORTED',
      })
    }

    // Inserir processo (RLS garante isolamento de tenant — T-02-17)
    const db = supabaseAsUser(token)
    const { data, error } = await db
      .from('processos')
      .insert({
        tenant_id: tenantId,
        numero_cnj,
        tribunal,
        tier_refresh: 'cold', // começa como cold — sem movimentações conhecidas
        sincronizado: false,
        // Phase 5: optional — assign process to a specific client user
        ...(cliente_usuario_id ? { cliente_usuario_id } : {}),
      })
      .select('id, numero_cnj, tribunal, tier_refresh, created_at')
      .single()

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        // unique violation — processo já cadastrado
        return reply.status(409).send({
          success: false,
          error: 'Processo já cadastrado para este escritório',
          code: 'PROCESSO_ALREADY_EXISTS',
        })
      }
      request.log.error({ err: error, tenantId }, 'Erro ao criar processo')
      return reply.status(500).send({
        success: false,
        error: 'Erro interno ao cadastrar processo',
        code: 'INTERNAL_ERROR',
      })
    }

    // Agendar primeiro sync — tier 'cold' para processo recém-cadastrado
    // Inicializa Redis inline para evitar acoplamento com o processo de inicialização do servidor
    try {
      const redis = createRedisClient()
      const queue = getDatajudQueue(redis)
      await agendarSyncProcesso(
        queue,
        (data as { id: string }).id,
        numero_cnj,
        tenantId,
        'cold'
      )
    } catch (err) {
      // Falha no agendamento não deve bloquear criação do processo
      request.log.error({ err, processoId: (data as { id: string }).id }, 'Falha ao agendar sync inicial')
    }

    return reply.status(201).send({ success: true, data })
  })

  // -------------------------------------------------------------------------
  // POST /api/v1/processos/:id/sync — disparar sync manual
  // Retorna 202 Accepted (não aguarda conclusão do sync)
  // T-02-21: idempotente via upsertJobScheduler — sem storm de jobs
  // -------------------------------------------------------------------------
  fastify.post<{ Params: { id: string } }>('/processos/:id/sync', async (request, reply) => {
    const { id } = request.params
    const tenantId = request.user.tenant_id
    const token = request.headers.authorization?.slice(7) ?? ''
    const db = supabaseAsUser(token)

    // Verificar que o processo existe e pertence ao tenant (RLS)
    const { data, error } = await db
      .from('processos')
      .select('id, numero_cnj, tier_refresh')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      return reply.status(404).send({
        success: false,
        error: 'Processo não encontrado',
        code: 'PROCESSO_NOT_FOUND',
      })
    }

    try {
      const redis = createRedisClient()
      const queue = getDatajudQueue(redis)
      await agendarSyncProcesso(
        queue,
        (data as { id: string }).id,
        (data as { numero_cnj: string }).numero_cnj,
        tenantId,
        (data as { tier_refresh: string }).tier_refresh as Tier
      )
    } catch (err) {
      request.log.error({ err, processoId: id }, 'Falha ao agendar sync manual')
      return reply.status(500).send({
        success: false,
        error: 'Erro ao agendar sincronização',
        code: 'SYNC_SCHEDULE_ERROR',
      })
    }

    return reply.status(202).send({
      success: true,
      message: 'Sincronização agendada',
    })
  })
}
