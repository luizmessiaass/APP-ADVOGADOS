import { describe, it, expect } from 'vitest'
import {
  gracePeriodStateTransition,
  resolveGracePeriod,
  type GracePeriodState,
} from './grace-period.js'

const baseState: GracePeriodState = {
  status: 'active',
  graceBanner: false,
  gracePeriodStartedAt: new Date().toISOString(),
  daysSinceStart: 0,
}

describe('gracePeriodStateTransition', () => {
  it('Day 0: set_status(grace) + send_email(day_0) quando status=active', () => {
    const actions = gracePeriodStateTransition({ ...baseState, status: 'active', daysSinceStart: 0 })
    expect(actions).toContainEqual({ type: 'set_status', value: 'grace' })
    expect(actions).toContainEqual({ type: 'send_email', template: 'day_0' })
  })

  it('Day 0: idempotente — nenhuma acao quando ja em status=grace', () => {
    const actions = gracePeriodStateTransition({ ...baseState, status: 'grace', daysSinceStart: 0 })
    expect(actions).toHaveLength(0)
  })

  it('Day 3: set_grace_banner(true) quando graceBanner=false', () => {
    const actions = gracePeriodStateTransition({
      ...baseState,
      status: 'grace',
      graceBanner: false,
      daysSinceStart: 3,
    })
    expect(actions).toContainEqual({ type: 'set_grace_banner', value: true })
    expect(actions.some((a) => a.type === 'send_email')).toBe(false)
  })

  it('Day 3: idempotente — nenhuma acao quando graceBanner ja=true', () => {
    const actions = gracePeriodStateTransition({
      ...baseState,
      status: 'grace',
      graceBanner: true,
      daysSinceStart: 3,
    })
    expect(actions).toHaveLength(0)
  })

  it('Day 7: set_status(read_only) + send_email(day_7)', () => {
    const actions = gracePeriodStateTransition({
      ...baseState,
      status: 'grace',
      daysSinceStart: 7,
    })
    expect(actions).toContainEqual({ type: 'set_status', value: 'read_only' })
    expect(actions).toContainEqual({ type: 'send_email', template: 'day_7' })
  })

  it('Day 7: idempotente — nenhuma acao quando status ja=read_only', () => {
    const actions = gracePeriodStateTransition({
      ...baseState,
      status: 'read_only',
      daysSinceStart: 7,
    })
    expect(actions).toHaveLength(0)
  })

  it('Day 14: set_status(suspended) + send_email(day_14)', () => {
    const actions = gracePeriodStateTransition({
      ...baseState,
      status: 'read_only',
      daysSinceStart: 14,
    })
    expect(actions).toContainEqual({ type: 'set_status', value: 'suspended' })
    expect(actions).toContainEqual({ type: 'send_email', template: 'day_14' })
  })

  it('Day 14: idempotente — nenhuma acao quando status ja=suspended', () => {
    const actions = gracePeriodStateTransition({
      ...baseState,
      status: 'suspended',
      daysSinceStart: 14,
    })
    expect(actions).toHaveLength(0)
  })
})

describe('resolveGracePeriod', () => {
  it('retorna set_status(active) + set_grace_banner(false) + clear_grace_period_started_at', () => {
    const actions = resolveGracePeriod()
    expect(actions).toContainEqual({ type: 'set_status', value: 'active' })
    expect(actions).toContainEqual({ type: 'set_grace_banner', value: false })
    expect(actions).toContainEqual({ type: 'clear_grace_period_started_at' })
    expect(actions).toHaveLength(3)
  })
})
