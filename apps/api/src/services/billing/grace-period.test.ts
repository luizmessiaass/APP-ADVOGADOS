import { describe, it, expect } from 'vitest'

// Wave 0 — TDD Red phase
// Stubs para BILLING-06: pure state machine gracePeriodStateTransition
// Import vai falhar (modulo nao existe) — comportamento red esperado
// Todos os testes falham com 'not implemented' ate Plan 04

// Este import vai falhar no red phase — e comportamento esperado
// Plan 04 criara o modulo
import { gracePeriodStateTransition } from '../billing/grace-period.js'

describe('gracePeriodStateTransition (BILLING-06)', () => {
  it('dia 0 — transicao: status=grace, action=send_email', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })

  it('dia 3 — grace_banner=true, sem mudanca de status', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })

  it('dia 7 — status=read_only, action=send_email', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })

  it('dia 14 — status=suspended, action=send_email', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })

  it('payment.succeeded resolve — status=active, campos grace limpos', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })

  it('dia 4 re-avaliacao — grace_banner ja true, sem acao duplicada', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })
})
