// Worker processor para o cron job diario de grace period (BILLING-06)
// Processa todos os tenants em status 'grace' ou 'read_only' e aplica as transicoes de estado.
// Executa 1x/dia via BullMQ upsertJobScheduler — ver worker.ts

import type { Job } from 'bullmq'
import pino from 'pino'
import { Resend } from 'resend'
import { env } from '../config.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { gracePeriodStateTransition } from '../services/grace-period.js'
import type { GracePeriodJobData } from '../queues/grace-period.js'

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
})

// Instanciar Resend com chave validada pelo env module — NUNCA hardcodear (T-7-18)
const resend = new Resend(env.RESEND_API_KEY)

// Templates de email inline para v1 — sem sistema de templates externo
const EMAIL_TEMPLATES = {
  day_0: {
    subject: 'Pagamento pendente — regularize em 14 dias',
    html: `
      <p>Seu escritório tem <strong>14 dias</strong> para regularizar o pagamento antes da suspensão.</p>
      <p>Após esse prazo, as funcionalidades de escrita serão desativadas e, em seguida, a conta será suspensa.</p>
      <p>Seus dados estão preservados durante todo o período.</p>
      <p>Em caso de dúvidas, entre em contato com o suporte.</p>
    `,
  },
  day_7: {
    subject: '7 dias restantes — funcionalidades de escrita desativadas',
    html: `
      <p>Seu escritório está em <strong>modo leitura</strong>.</p>
      <p>Restam <strong>7 dias</strong> para regularizar o pagamento antes da suspensão completa.</p>
      <p>Regularize agora para retomar todas as funcionalidades.</p>
    `,
  },
  day_14: {
    subject: 'Conta suspensa — dados preservados',
    html: `
      <p>Sua conta foi <strong>suspensa</strong>.</p>
      <p>Seus dados estão preservados. Entre em contato com o Portal Jurídico para reativar.</p>
    `,
  },
} as const

type EmailTemplate = keyof typeof EMAIL_TEMPLATES

/**
 * Envia email transacional via Resend para o admin do escritorio.
 * Falha de email nao bloqueia a transicao de status (T-7-17 — accept risk).
 */
async function sendGracePeriodEmail(
  tenantId: string,
  template: EmailTemplate
): Promise<void> {
  // Buscar email do admin do escritorio
  const { data: adminUser, error } = await supabaseAdmin
    .from('usuarios')
    .select('email')
    .eq('tenant_id', tenantId)
    .eq('role_local', 'admin_escritorio')
    .limit(1)
    .single()

  if (error || !adminUser?.email) {
    logger.warn(
      { tenant_id: tenantId, error },
      '[grace-period] Admin email nao encontrado — email nao enviado'
    )
    return
  }

  const tpl = EMAIL_TEMPLATES[template]
  const { error: sendError } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: adminUser.email,
    subject: tpl.subject,
    html: tpl.html,
  })

  if (sendError) {
    logger.error(
      { tenant_id: tenantId, template, error: sendError },
      '[grace-period] Falha ao enviar email via Resend — status ja atualizado, retry amanha'
    )
  } else {
    logger.info(
      { tenant_id: tenantId, template },
      '[grace-period] Email enviado via Resend'
    )
  }
}

/**
 * Verifica se um email de transicao ja foi enviado para este tenant neste stage.
 * Idempotencia: billing_events com event='grace.advanced' e payload->>'stage'=stage_key.
 */
async function alreadySentEmail(tenantId: string, stageKey: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('billing_events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event', 'grace.advanced')
    .eq('provider', 'system')
    .filter('payload->>stage', 'eq', stageKey)
    .limit(1)

  if (error) {
    logger.warn(
      { tenant_id: tenantId, stageKey, error },
      '[grace-period] Erro ao verificar idempotencia — prosseguindo com envio'
    )
    return false
  }

  return (data?.length ?? 0) > 0
}

/**
 * Loga evento de transicao no billing_events para idempotencia e audit trail.
 */
async function logBillingEvent(
  tenantId: string,
  daysSinceStart: number,
  stage: string
): Promise<void> {
  const eventId = `${tenantId}:grace:${stage}:${Date.now()}`
  const { error } = await supabaseAdmin.from('billing_events').insert({
    tenant_id: tenantId,
    event: 'grace.advanced',
    event_id: eventId,
    provider: 'system',
    occurred_at: new Date().toISOString(),
    payload: { days_since_start: daysSinceStart, stage },
  })

  if (error) {
    logger.warn(
      { tenant_id: tenantId, stage, error },
      '[grace-period] Falha ao logar billing_event'
    )
  }
}

/**
 * Processador principal do cron job de grace period.
 * Chamado pelo BullMQ Worker uma vez por dia (ver worker.ts — 0 12 * * * UTC).
 */
export async function processarGracePeriodCheck(
  job: Job<GracePeriodJobData>
): Promise<void> {
  logger.info(
    { triggered_at: job.data.triggered_at },
    '[grace-period] Iniciando verificacao diaria de tenants'
  )

  // Buscar todos os tenants em estado que requer monitoramento
  const { data: tenants, error: queryError } = await supabaseAdmin
    .from('escritorios')
    .select('id, nome, status, grace_banner, grace_period_started_at')
    .in('status', ['grace', 'read_only'])

  if (queryError) {
    logger.error(
      { error: queryError },
      '[grace-period] Erro ao buscar tenants — abortando job'
    )
    throw queryError
  }

  if (!tenants || tenants.length === 0) {
    logger.info('[grace-period] Nenhum tenant em grace/read_only — job encerrado')
    return
  }

  logger.info(
    { count: tenants.length },
    '[grace-period] Processando tenants em grace/read_only'
  )

  const now = Date.now()

  for (const tenant of tenants) {
    try {
      const gracePeriodStartedAt = tenant.grace_period_started_at
        ? new Date(tenant.grace_period_started_at).getTime()
        : now

      const daysSinceStart = Math.floor((now - gracePeriodStartedAt) / 86_400_000)

      const actions = gracePeriodStateTransition({
        status: tenant.status,
        graceBanner: tenant.grace_banner ?? false,
        gracePeriodStartedAt: tenant.grace_period_started_at ?? null,
        daysSinceStart,
      })

      if (actions.length === 0) {
        logger.debug(
          { tenant_id: tenant.id, status: tenant.status, daysSinceStart },
          '[grace-period] Nenhuma acao necessaria (idempotente)'
        )
        continue
      }

      logger.info(
        { tenant_id: tenant.id, old_status: tenant.status, actions, daysSinceStart },
        '[grace-period] Transicao aplicada'
      )

      for (const action of actions) {
        if (action.type === 'set_status') {
          const { error } = await supabaseAdmin
            .from('escritorios')
            .update({ status: action.value, updated_at: new Date().toISOString() })
            .eq('id', tenant.id)

          if (error) {
            logger.error(
              { tenant_id: tenant.id, action, error },
              '[grace-period] Falha ao atualizar status'
            )
          }
        }

        if (action.type === 'set_grace_banner') {
          const { error } = await supabaseAdmin
            .from('escritorios')
            .update({ grace_banner: action.value, updated_at: new Date().toISOString() })
            .eq('id', tenant.id)

          if (error) {
            logger.error(
              { tenant_id: tenant.id, action, error },
              '[grace-period] Falha ao atualizar grace_banner'
            )
          }
        }

        if (action.type === 'send_email') {
          const stageKey = `day_${daysSinceStart}`
          // Idempotencia: verifica se email ja foi enviado para este stage
          const alreadySent = await alreadySentEmail(tenant.id, stageKey)

          if (alreadySent) {
            logger.info(
              { tenant_id: tenant.id, stageKey },
              '[grace-period] Email ja enviado para este stage — ignorando (idempotente)'
            )
            continue
          }

          await logBillingEvent(tenant.id, daysSinceStart, stageKey)
          await sendGracePeriodEmail(tenant.id, action.template)
        }
      }
    } catch (tenantError) {
      // Falha em um tenant nao deve parar o processamento dos demais (BILLING-06)
      logger.error(
        { tenant_id: tenant.id, error: tenantError },
        '[grace-period] Erro ao processar tenant — continuando com proximo'
      )
    }
  }

  logger.info('[grace-period] Verificacao diaria concluida')
}
