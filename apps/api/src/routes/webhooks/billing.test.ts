import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { Redis } from 'ioredis'

// TDD GREEN phase — Plan 03
// BILLING-03: webhook secret validation
// BILLING-04: idempotent event processing

// Mock supabase admin
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Mock entitlement plugin (invalidateTenantStatusCache)
vi.mock('../../plugins/entitlement.js', () => ({
  invalidateTenantStatusCache: vi.fn().mockResolvedValue(undefined),
  ENTITLEMENT_SKIP_ROUTES: new Set(['/api/webhooks/billing']),
}))

// Mock config with a known secret for tests
vi.mock('../../config.js', () => ({
  env: {
    NODE_ENV: 'test',
    BILLING_WEBHOOK_SECRET: 'test-secret-value',
  },
}))

import { webhookBillingRoutes } from './billing.js'
import { supabaseAdmin } from '../../lib/supabase.js'

const VALID_SECRET = 'test-secret-value'
const VALID_PAYLOAD = {
  event: 'payment.failed',
  tenant_id: 'a0000000-0000-4000-8000-000000000001',
  event_id: 'evt_test_001',
  occurred_at: '2026-04-16T10:00:00Z',
  provider: 'stripe',
}

describe('POST /api/webhooks/billing (BILLING-03, BILLING-04)', () => {
  let app: ReturnType<typeof Fastify>
  const mockRedis = { del: vi.fn().mockResolvedValue(1) } as unknown as Redis

  beforeAll(async () => {
    app = Fastify({ logger: false })
    await app.register(webhookBillingRoutes, { redis: mockRedis })
    await app.ready()
  })

  afterAll(() => app.close())

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('missing X-Webhook-Secret header — retorna 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/billing',
      payload: VALID_PAYLOAD,
      // sem header X-Webhook-Secret
    })
    expect(res.statusCode).toBe(401)
    const body = res.json()
    expect(body.code).toBe('INVALID_WEBHOOK_SECRET')
  })

  it('X-Webhook-Secret errado — retorna 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/billing',
      headers: { 'x-webhook-secret': 'wrong-secret' },
      payload: VALID_PAYLOAD,
    })
    expect(res.statusCode).toBe(401)
    const body = res.json()
    expect(body.code).toBe('INVALID_WEBHOOK_SECRET')
  })

  it('evento payment.failed valido — gravado em billing_events, retorna 200', async () => {
    // Simula insert bem-sucedido com RETURNING de 1 linha
    const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: 'row-1' }], error: null })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    const mockNotIn = vi.fn().mockResolvedValue({ error: null })
    const mockEq = vi.fn().mockReturnValue({ not: mockNotIn })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'billing_events') return { insert: mockInsert } as never
      if (table === 'escritorios') return { update: mockUpdate } as never
      return { insert: mockInsert } as never
    })

    const res = await app.inject({
      method: 'POST',
      url: '/billing',
      headers: { 'x-webhook-secret': VALID_SECRET },
      payload: VALID_PAYLOAD,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('processed')
  })

  it('replay de event_id duplicado — idempotente, retorna 200 sem reprocessar', async () => {
    // Simula ON CONFLICT DO NOTHING — RETURNING vazio
    const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: mockInsert } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/billing',
      headers: { 'x-webhook-secret': VALID_SECRET },
      payload: { ...VALID_PAYLOAD, event_id: 'evt_duplicate_001' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('already_processed')
  })
})
