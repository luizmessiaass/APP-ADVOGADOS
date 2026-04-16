import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import Fastify from 'fastify'
import { webhookBillingRoutes } from './billing.js'

// Mock supabaseAdmin
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockNot = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
    })),
  },
}))

// Mock env — BILLING_WEBHOOK_SECRET required, no default
vi.mock('../../config.js', () => ({
  env: {
    BILLING_WEBHOOK_SECRET: 'test-webhook-secret-abc123',
    TERMS_VERSION: '2026-04-16',
    NODE_ENV: 'test',
  },
}))

// Mock entitlement cache invalidation
vi.mock('../../plugins/entitlement.js', () => ({
  invalidateTenantStatusCache: vi.fn().mockResolvedValue(undefined),
}))

// Mock Redis (only used by invalidateTenantStatusCache which is mocked above)
const mockRedis = {} as import('ioredis').Redis

describe('POST /api/webhooks/billing (BILLING-03, BILLING-04)', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    app = Fastify({ logger: false })
    await app.register(webhookBillingRoutes, { redis: mockRedis })
    await app.ready()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => app.close())

  it('missing X-Webhook-Secret header — retorna 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/billing',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'payment.failed',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        event_id: 'evt-001',
        occurred_at: new Date().toISOString(),
      }),
    })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ code: 'INVALID_WEBHOOK_SECRET' })
  })

  it('X-Webhook-Secret errado — retorna 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/billing',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': 'wrong-secret',
      },
      body: JSON.stringify({
        event: 'payment.failed',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        event_id: 'evt-002',
        occurred_at: new Date().toISOString(),
      }),
    })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ code: 'INVALID_WEBHOOK_SECRET' })
  })

  it('evento payment.failed valido — gravado em billing_events, retorna 200', async () => {
    // Mock idempotency insert returning a new row (not duplicate)
    const mockSelectChain = { data: [{ id: 'row-1' }], error: null }
    mockInsert.mockReturnValue({ select: vi.fn().mockResolvedValue(mockSelectChain) })

    // Mock status update
    const mockUpdateChain = { error: null }
    vi.mocked(require('../../lib/supabase.js').supabaseAdmin.from).mockReturnValueOnce({
      insert: mockInsert,
    } as any).mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue(mockUpdateChain),
        }),
      }),
    } as any)

    const res = await app.inject({
      method: 'POST',
      url: '/billing',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': 'test-webhook-secret-abc123',
      },
      body: JSON.stringify({
        event: 'payment.failed',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        event_id: 'evt-003',
        occurred_at: new Date().toISOString(),
      }),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'processed' })
    expect(mockInsert).toHaveBeenCalledOnce()
  })

  it('replay de event_id duplicado — idempotente, retorna 200 sem reprocessar', async () => {
    // Mock insert returning empty array (duplicate — ON CONFLICT DO NOTHING)
    const callsBefore = mockInsert.mock.calls.length
    const mockSelectChain = { data: [], error: null }
    mockInsert.mockReturnValue({ select: vi.fn().mockResolvedValue(mockSelectChain) })

    const res = await app.inject({
      method: 'POST',
      url: '/billing',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': 'test-webhook-secret-abc123',
      },
      body: JSON.stringify({
        event: 'payment.failed',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        event_id: 'evt-003', // same event_id = duplicate
        occurred_at: new Date().toISOString(),
      }),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'already_processed' })
    // Only one insert call happened in this test (not a replay from a previous test)
    expect(mockInsert.mock.calls.length).toBe(callsBefore + 1)
  })
})
