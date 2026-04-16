/**
 * grace-period.ts — Pure state machine for billing grace period transitions.
 *
 * IMPORTANTE: Este arquivo duplica as funcoes puras de apps/api/src/services/billing/grace-period.ts.
 * O worker nao pode importar do processo da API (processos Railway separados).
 * Qualquer alteracao na logica de negocio deve ser replicada em ambos os arquivos.
 *
 * Per D-08 (07-CONTEXT.md):
 *   Day 0  → status=grace, send_email(day_0)
 *   Day 3  → grace_banner=true (sem email no dia 3)
 *   Day 7  → status=read_only, send_email(day_7)
 *   Day 14 → status=suspended, send_email(day_14)
 *
 * Idempotencia: cada acao verifica o estado atual para evitar transicoes duplicadas.
 * Todas as funcoes sao PURAS — sem I/O, sem efeitos colaterais.
 */

export interface GracePeriodState {
  status: string
  graceBanner: boolean
  gracePeriodStartedAt: Date | null
  daysSinceStart: number
}

export type GracePeriodActionType =
  | { type: 'set_status'; status: 'grace' | 'read_only' | 'suspended' | 'active' }
  | { type: 'set_grace_banner'; value: boolean }
  | { type: 'send_email'; template: 'day_0' | 'day_3' | 'day_7' | 'day_14' }
  | { type: 'clear_grace_period_started_at' }
  | { type: 'noop' }

/**
 * Computes the set of actions to apply for a given grace period state.
 *
 * Called by the cron job (Plan 05) daily for each tenant in grace/read_only status.
 * Idempotency guards prevent re-sending emails or re-setting status
 * if the transition has already been applied.
 */
export function gracePeriodStateTransition(state: GracePeriodState): GracePeriodActionType[] {
  const actions: GracePeriodActionType[] = []
  const { daysSinceStart, status, graceBanner } = state

  // Day 0: move to grace + notify (only if not already in grace or beyond)
  if (daysSinceStart === 0) {
    if (status !== 'grace' && status !== 'read_only' && status !== 'suspended') {
      actions.push({ type: 'set_status', status: 'grace' })
      actions.push({ type: 'send_email', template: 'day_0' })
    }
    return actions.length > 0 ? actions : [{ type: 'noop' }]
  }

  // Day 3+: set grace_banner (sem email no dia 3 per D-08)
  if (daysSinceStart >= 3 && !graceBanner) {
    actions.push({ type: 'set_grace_banner', value: true })
  }

  // Day 7+: move to read_only + notify
  if (daysSinceStart >= 7 && status !== 'read_only' && status !== 'suspended') {
    actions.push({ type: 'set_status', status: 'read_only' })
    actions.push({ type: 'send_email', template: 'day_7' })
  }

  // Day 14+: move to suspended + notify
  if (daysSinceStart >= 14 && status !== 'suspended') {
    actions.push({ type: 'set_status', status: 'suspended' })
    actions.push({ type: 'send_email', template: 'day_14' })
  }

  return actions.length > 0 ? actions : [{ type: 'noop' }]
}

/**
 * Returns the set of actions to apply when a payment.succeeded event resolves the grace period.
 * Sempre retorna o conjunto completo de reset — pagamento bem-sucedido sempre reseta completamente.
 */
export function resolveGracePeriod(): GracePeriodActionType[] {
  return [
    { type: 'set_status', status: 'active' },
    { type: 'set_grace_banner', value: false },
    { type: 'clear_grace_period_started_at' },
  ]
}
