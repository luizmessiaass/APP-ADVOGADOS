import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'

// Wave 0 — TDD Red phase
// Stubs para BILLING-03 (webhook secret) e BILLING-04 (idempotency)
// Todos os testes falham com 'not implemented' ate Plan 03

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

describe('POST /api/webhooks/billing (BILLING-03, BILLING-04)', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    app = Fastify({ logger: false })
    // Plan 03 irá registrar a rota de webhook
    // Por ora instancia minima para confirmar estrutura
    await app.ready()
  })

  afterAll(() => app.close())

  it('missing X-Webhook-Secret header — retorna 401', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })

  it('X-Webhook-Secret errado — retorna 401', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })

  it('evento payment.failed valido — gravado em billing_events, retorna 200', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })

  it('replay de event_id duplicado — idempotente, retorna 200 sem reprocessar', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })
})
