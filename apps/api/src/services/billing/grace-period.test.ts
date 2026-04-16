import { describe, it, expect } from 'vitest'
import { gracePeriodStateTransition, resolveGracePeriod } from '../billing/grace-period.js'
import type { GracePeriodState } from '../billing/grace-period.js'

// TDD GREEN phase — Plan 03
// Testa a maquina de estados pura para grace period de billing (BILLING-06)

const baseState: GracePeriodState = {
  status: 'active',
  graceBanner: false,
  gracePeriodStartedAt: new Date(),
  daysSinceStart: 0,
}

describe('gracePeriodStateTransition (BILLING-06)', () => {
  it('dia 0 — transicao: status=grace, action=send_email', async () => {
    const state: GracePeriodState = { ...baseState, status: 'active', daysSinceStart: 0 }
    const actions = gracePeriodStateTransition(state)
    expect(actions).toContainEqual({ type: 'set_status', status: 'grace' })
    expect(actions).toContainEqual({ type: 'send_email', template: 'day_0' })
  })

  it('dia 3 — grace_banner=true, sem mudanca de status', async () => {
    const state: GracePeriodState = {
      ...baseState,
      status: 'grace',
      graceBanner: false,
      daysSinceStart: 3,
    }
    const actions = gracePeriodStateTransition(state)
    expect(actions).toContainEqual({ type: 'set_grace_banner', value: true })
    // Nao deve mudar status nem enviar email no dia 3
    expect(actions).not.toContainEqual(expect.objectContaining({ type: 'set_status' }))
    expect(actions).not.toContainEqual(expect.objectContaining({ type: 'send_email' }))
  })

  it('dia 7 — status=read_only, action=send_email', async () => {
    const state: GracePeriodState = {
      ...baseState,
      status: 'grace',
      graceBanner: true,
      daysSinceStart: 7,
    }
    const actions = gracePeriodStateTransition(state)
    expect(actions).toContainEqual({ type: 'set_status', status: 'read_only' })
    expect(actions).toContainEqual({ type: 'send_email', template: 'day_7' })
  })

  it('dia 14 — status=suspended, action=send_email', async () => {
    const state: GracePeriodState = {
      ...baseState,
      status: 'read_only',
      graceBanner: true,
      daysSinceStart: 14,
    }
    const actions = gracePeriodStateTransition(state)
    expect(actions).toContainEqual({ type: 'set_status', status: 'suspended' })
    expect(actions).toContainEqual({ type: 'send_email', template: 'day_14' })
  })

  it('payment.succeeded resolve — status=active, campos grace limpos', async () => {
    const actions = resolveGracePeriod()
    expect(actions).toContainEqual({ type: 'set_status', status: 'active' })
    expect(actions).toContainEqual({ type: 'set_grace_banner', value: false })
    expect(actions).toContainEqual({ type: 'clear_grace_period_started_at' })
  })

  it('dia 4 re-avaliacao — grace_banner ja true, sem acao duplicada', async () => {
    const state: GracePeriodState = {
      ...baseState,
      status: 'grace',
      graceBanner: true, // ja foi setado no dia 3
      daysSinceStart: 4,
    }
    const actions = gracePeriodStateTransition(state)
    // graceBanner ja verdadeiro — nao deve duplicar
    const bannerActions = actions.filter(
      (a) => a.type === 'set_grace_banner' && (a as { type: 'set_grace_banner'; value: boolean }).value === true
    )
    expect(bannerActions).toHaveLength(0)
    // Sem mudanca de status ou email (ainda nao chegou ao dia 7)
    expect(actions).not.toContainEqual(expect.objectContaining({ type: 'set_status' }))
  })
})
