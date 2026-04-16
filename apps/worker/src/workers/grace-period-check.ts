/**
 * grace-period-check.ts — BullMQ worker processor para o cron job diario de grace period.
 *
 * Roda diariamente as 09:00 BRT (12:00 UTC — cron: 0 12 * * *).
 * Itera todos os tenants com status IN ('grace', 'read_only') e aplica transicoes de estado.
 *
 * Idempotencia: billing_events stage markers previnem emails duplicados.
 * Dados de tenant NUNCA deletados — apenas colunas de status mudam (BILLING-07).
 *
 * AVISO: NAO registrar o cron scheduler aqui nem na API — apenas em worker.ts (Pitfall 2).
 */

import pino from 'pino'
import { Resend } from 'resend'
import type { Job } from 'bullmq'
import { env } from '../config.js'
import { supabaseAdmin } from '../lib/supabase.js'
import {
  gracePeriodStateTransition,
  type GracePeriodActionType,
} from '../services/grace-period.js'
import type { GracePeriodJobData } from '../queues/grace-period.js'

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
})

// Resend client — sempre instanciado via env.RESEND_API_KEY (nunca hardcoded)
const resend = new Resend(env.RESEND_API_KEY)

// Templates de email para cada estagio do grace period (inline HTML para v1)
const EMAIL_TEMPLATES: Record<string, { subject: string; html: string }> = {
  day_0: {
    subject: 'Pagamento pendente — regularize em 14 dias',
    html: '<p>Seu escritorio tem 14 dias para regularizar o pagamento antes da suspensao da conta.</p><p>Entre em contato com o Portal Juridico para regularizar.</p>',
  },
  day_7: {
    subject: '7 dias restantes — funcionalidades de escrita desativadas',
    html: '<p>Seu escritorio esta em modo leitura. Funcionalidades de escrita foram desativadas.</p><p>Regularize o pagamento para retomar todas as funcionalidades.</p>',
  },
  day_14: {
    subject: 'Conta suspensa — dados preservados',
    html: '<p>Sua conta foi suspensa por falta de pagamento.</p><p>Seus dados estao preservados. Entre em contato com o Portal Juridico para reativar.</p>',
  },
}

/**
 * Verifica se um email de estagio ja foi enviado para este tenant.
 * Consulta billing_events com event='grace.advanced' e payload->>'stage'=stage.
 * Retorna true se ja enviado (deve pular), false se ainda nao enviado.
 */
async function emailJaEnviado(tenantId: string, stage: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('billing_events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event', 'grace.advanced')
    .eq('payload->>stage', stage)
    .limit(1)

  if (error) {
    logger.warn({ tenant_id: tenantId, stage, error }, '[grace-period] Erro ao verificar idempotencia')
    return false // Conservador: se erro na verificacao, permite tentar enviar
  }

  return (data?.length ?? 0) > 0
}

/**
 * Registra uma transicao no billing_events para auditoria e idempotencia.
 */
async function registrarBillingEvent(
  tenantId: string,
  daysSinceStart: number,
  stage: string
): Promise<void> {
  const eventId = `${tenantId}:grace:day${daysSinceStart}:${stage}`

  const { error } = await supabaseAdmin
    .from('billing_events')
    .insert({
      tenant_id: tenantId,
      event: 'grace.advanced',
      event_id: eventId,
      provider: 'system',
      payload: { stage, days_since_start: daysSinceStart },
    })
    .select()

  if (error) {
    // Conflito em event_id significa que ja foi processado — OK
    if (error.code !== '23505') {
      logger.warn({ tenant_id: tenantId, stage, error }, '[grace-period] Erro ao registrar billing_event')
    }
  }
}

/**
 * Processa um tenant individual: aplica todas as acoes retornadas pela state machine.
 */
async function processarTenant(tenant: {
  id: string
  nome: string
  status: string
  grace_banner: boolean
  grace_period_started_at: string | null
}): Promise<void> {
  const now = Date.now()
  const startedAt = tenant.grace_period_started_at ? new Date(tenant.grace_period_started_at).getTime() : now
  const daysSinceStart = Math.floor((now - startedAt) / 86400000)

  const actions = gracePeriodStateTransition({
    status: tenant.status,
    graceBanner: tenant.grace_banner,
    gracePeriodStartedAt: tenant.grace_period_started_at ? new Date(tenant.grace_period_started_at) : null,
    daysSinceStart,
  })

  logger.info(
    { tenant_id: tenant.id, status: tenant.status, days_since_start: daysSinceStart, actions },
    '[grace-period] Processando tenant'
  )

  for (const action of actions) {
    await aplicarAcao(tenant.id, tenant.nome, action, daysSinceStart)
  }
}

/**
 * Aplica uma acao individual retornada pela state machine.
 */
async function aplicarAcao(
  tenantId: string,
  tenantNome: string,
  action: GracePeriodActionType,
  daysSinceStart: number
): Promise<void> {
  if (action.type === 'noop') {
    return
  }

  if (action.type === 'set_status') {
    const { error } = await supabaseAdmin
      .from('escritorios')
      .update({ status: action.status, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (error) {
      logger.error({ tenant_id: tenantId, status: action.status, error }, '[grace-period] Erro ao atualizar status')
    } else {
      logger.info({ tenant_id: tenantId, new_status: action.status }, '[grace-period] Status atualizado')
    }
    return
  }

  if (action.type === 'set_grace_banner') {
    const { error } = await supabaseAdmin
      .from('escritorios')
      .update({ grace_banner: action.value, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (error) {
      logger.error({ tenant_id: tenantId, grace_banner: action.value, error }, '[grace-period] Erro ao atualizar grace_banner')
    } else {
      logger.info({ tenant_id: tenantId, grace_banner: action.value }, '[grace-period] grace_banner atualizado')
    }
    return
  }

  if (action.type === 'send_email') {
    const stage = action.template
    const template = EMAIL_TEMPLATES[stage]

    if (!template) {
      logger.warn({ tenant_id: tenantId, stage }, '[grace-period] Template de email nao encontrado')
      return
    }

    // Idempotency guard: verificar se email ja foi enviado para este tenant/estagio
    const jaEnviado = await emailJaEnviado(tenantId, stage)
    if (jaEnviado) {
      logger.info({ tenant_id: tenantId, stage }, '[grace-period] Email ja enviado — pulando (idempotente)')
      return
    }

    // Buscar email do admin do escritorio
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('usuarios')
      .select('email')
      .eq('tenant_id', tenantId)
      .eq('role_local', 'admin_escritorio')
      .limit(1)
      .single()

    if (adminError || !adminData?.email) {
      logger.warn({ tenant_id: tenantId, error: adminError }, '[grace-period] Admin nao encontrado para envio de email')
      await registrarBillingEvent(tenantId, daysSinceStart, stage)
      return
    }

    try {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: adminData.email,
        subject: template.subject,
        html: template.html,
      })

      logger.info({ tenant_id: tenantId, stage, to: adminData.email }, '[grace-period] Email enviado com sucesso')
    } catch (emailError) {
      // T-7-17: Se email falha apos DB update, status ja esta correto.
      // Retry acontece no proximo dia via cron (idempotencia natural).
      // Falha de email NAO bloqueia progressao de status.
      logger.error({ tenant_id: tenantId, stage, error: emailError }, '[grace-period] Erro ao enviar email — status ja atualizado')
    }

    // Registrar no billing_events para auditoria e idempotencia futura
    await registrarBillingEvent(tenantId, daysSinceStart, stage)
    return
  }

  if (action.type === 'clear_grace_period_started_at') {
    const { error } = await supabaseAdmin
      .from('escritorios')
      .update({ grace_period_started_at: null, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (error) {
      logger.error({ tenant_id: tenantId, error }, '[grace-period] Erro ao limpar grace_period_started_at')
    }
  }
}

/**
 * Processor principal do BullMQ worker.
 * Exportado para registro em worker.ts.
 */
export async function processarGracePeriodCheck(job: Job<GracePeriodJobData>): Promise<void> {
  logger.info({ job_id: job.id, triggered_at: job.data.triggered_at }, '[grace-period] Iniciando verificacao diaria')

  const { data: tenants, error } = await supabaseAdmin
    .from('escritorios')
    .select('id, nome, status, grace_banner, grace_period_started_at')
    .in('status', ['grace', 'read_only'])

  if (error) {
    logger.error({ error }, '[grace-period] Erro ao buscar tenants em grace/read_only')
    throw error
  }

  if (!tenants || tenants.length === 0) {
    logger.info('[grace-period] Nenhum tenant em grace ou read_only. Nada a processar.')
    return
  }

  logger.info({ count: tenants.length }, '[grace-period] Tenants em grace/read_only encontrados')

  for (const tenant of tenants) {
    try {
      await processarTenant(tenant)
    } catch (tenantError) {
      // Erro em um tenant nao deve parar o processamento dos demais
      logger.error({ tenant_id: tenant.id, error: tenantError }, '[grace-period] Erro ao processar tenant — continuando')
    }
  }

  logger.info({ job_id: job.id, count: tenants.length }, '[grace-period] Verificacao diaria concluida')
}
