// DUPLICADO INTENCIONAL de apps/api/src/services/billing/grace-period.ts
// Worker e API rodam como processos separados — imports cross-process sao invalidos.
// Qualquer alteracao na logica de transicao DEVE ser replicada em ambos os arquivos.

export type TenantStatus = 'active' | 'grace' | 'read_only' | 'suspended'

export type GracePeriodActionType =
  | { type: 'set_status'; value: TenantStatus }
  | { type: 'set_grace_banner'; value: boolean }
  | { type: 'send_email'; template: 'day_0' | 'day_7' | 'day_14' }
  | { type: 'clear_grace_period_started_at' }

export interface GracePeriodState {
  status: TenantStatus
  graceBanner: boolean
  gracePeriodStartedAt: string | null
  daysSinceStart: number
}

/**
 * Funcao pura — zero I/O — retorna o conjunto de acoes a aplicar dado o estado atual.
 *
 * Transitions:
 *  Day  0: set_status(grace) + send_email(day_0)    — somente se ainda nao estiver em grace+
 *  Day  3: set_grace_banner(true)                   — sem email (Design Decision D-08)
 *  Day  7: set_status(read_only) + send_email(day_7)
 *  Day 14: set_status(suspended) + send_email(day_14)
 *
 * Idempotencia: guards verificam status e graceBanner antes de emitir acoes.
 */
export function gracePeriodStateTransition(
  state: GracePeriodState
): GracePeriodActionType[] {
  const actions: GracePeriodActionType[] = []
  const { status, graceBanner, daysSinceStart } = state

  // Day 14 — suspensao definitiva
  if (daysSinceStart >= 14) {
    if (status !== 'suspended') {
      actions.push({ type: 'set_status', value: 'suspended' })
      actions.push({ type: 'send_email', template: 'day_14' })
    }
    return actions
  }

  // Day 7 — modo leitura
  if (daysSinceStart >= 7) {
    if (status !== 'read_only' && status !== 'suspended') {
      actions.push({ type: 'set_status', value: 'read_only' })
      actions.push({ type: 'send_email', template: 'day_7' })
    }
    return actions
  }

  // Day 3 — banner de aviso (sem email)
  if (daysSinceStart >= 3) {
    if (!graceBanner) {
      actions.push({ type: 'set_grace_banner', value: true })
    }
    return actions
  }

  // Day 0 — inicio do grace period
  if (status !== 'grace' && status !== 'read_only' && status !== 'suspended') {
    actions.push({ type: 'set_status', value: 'grace' })
    actions.push({ type: 'send_email', template: 'day_0' })
  }

  return actions
}

/**
 * Retorna acoes para resetar completamente o grace period apos pagamento bem-sucedido.
 * Sempre retorna o conjunto completo de reset — pagamento bem-sucedido sempre reseta completamente.
 */
export function resolveGracePeriod(): GracePeriodActionType[] {
  return [
    { type: 'set_status', value: 'active' },
    { type: 'set_grace_banner', value: false },
    { type: 'clear_grace_period_started_at' },
  ]
}
