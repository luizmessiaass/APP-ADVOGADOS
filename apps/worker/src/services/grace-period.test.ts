import { describe, it, expect } from 'vitest'

// RED: Tests for grace-period pure service functions (duplicated from apps/api — worker cannot import from API)

describe('gracePeriodStateTransition', () => {
  it('Day 0: returns set_status(grace) + send_email(day_0) when status is active', async () => {
    const { gracePeriodStateTransition } = await import('./grace-period.js')
    const actions = gracePeriodStateTransition({
      status: 'active',
      graceBanner: false,
      gracePeriodStartedAt: new Date(),
      daysSinceStart: 0,
    })
    expect(actions).toContainEqual({ type: 'set_status', status: 'grace' })
    expect(actions).toContainEqual({ type: 'send_email', template: 'day_0' })
  })

  it('Day 0: returns noop when status is already grace', async () => {
    const { gracePeriodStateTransition } = await import('./grace-period.js')
    const actions = gracePeriodStateTransition({
      status: 'grace',
      graceBanner: false,
      gracePeriodStartedAt: new Date(),
      daysSinceStart: 0,
    })
    expect(actions).toContainEqual({ type: 'noop' })
    expect(actions.some((a) => a.type === 'set_status')).toBe(false)
  })

  it('Day 3: sets grace_banner when not yet set', async () => {
    const { gracePeriodStateTransition } = await import('./grace-period.js')
    const actions = gracePeriodStateTransition({
      status: 'grace',
      graceBanner: false,
      gracePeriodStartedAt: new Date(),
      daysSinceStart: 3,
    })
    expect(actions).toContainEqual({ type: 'set_grace_banner', value: true })
  })

  it('Day 3: does NOT set grace_banner again if already set (idempotent)', async () => {
    const { gracePeriodStateTransition } = await import('./grace-period.js')
    const actions = gracePeriodStateTransition({
      status: 'grace',
      graceBanner: true,
      gracePeriodStartedAt: new Date(),
      daysSinceStart: 3,
    })
    expect(actions.some((a) => a.type === 'set_grace_banner')).toBe(false)
  })

  it('Day 7: transitions to read_only + send_email(day_7)', async () => {
    const { gracePeriodStateTransition } = await import('./grace-period.js')
    const actions = gracePeriodStateTransition({
      status: 'grace',
      graceBanner: true,
      gracePeriodStartedAt: new Date(),
      daysSinceStart: 7,
    })
    expect(actions).toContainEqual({ type: 'set_status', status: 'read_only' })
    expect(actions).toContainEqual({ type: 'send_email', template: 'day_7' })
  })

  it('Day 7: does NOT re-transition if already read_only (idempotent)', async () => {
    const { gracePeriodStateTransition } = await import('./grace-period.js')
    const actions = gracePeriodStateTransition({
      status: 'read_only',
      graceBanner: true,
      gracePeriodStartedAt: new Date(),
      daysSinceStart: 7,
    })
    expect(actions.some((a) => a.type === 'set_status' && a.status === 'read_only')).toBe(false)
  })

  it('Day 14: transitions to suspended + send_email(day_14)', async () => {
    const { gracePeriodStateTransition } = await import('./grace-period.js')
    const actions = gracePeriodStateTransition({
      status: 'read_only',
      graceBanner: true,
      gracePeriodStartedAt: new Date(),
      daysSinceStart: 14,
    })
    expect(actions).toContainEqual({ type: 'set_status', status: 'suspended' })
    expect(actions).toContainEqual({ type: 'send_email', template: 'day_14' })
  })

  it('Day 14: does NOT re-suspend if already suspended (idempotent)', async () => {
    const { gracePeriodStateTransition } = await import('./grace-period.js')
    const actions = gracePeriodStateTransition({
      status: 'suspended',
      graceBanner: true,
      gracePeriodStartedAt: new Date(),
      daysSinceStart: 14,
    })
    expect(actions.some((a) => a.type === 'set_status' && a.status === 'suspended')).toBe(false)
  })
})

describe('resolveGracePeriod', () => {
  it('returns set_status(active) + set_grace_banner(false) + clear_grace_period_started_at', async () => {
    const { resolveGracePeriod } = await import('./grace-period.js')
    const actions = resolveGracePeriod()
    expect(actions).toContainEqual({ type: 'set_status', status: 'active' })
    expect(actions).toContainEqual({ type: 'set_grace_banner', value: false })
    expect(actions).toContainEqual({ type: 'clear_grace_period_started_at' })
  })
})
