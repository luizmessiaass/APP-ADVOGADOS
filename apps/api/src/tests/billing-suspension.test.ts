import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import type { Redis } from 'ioredis'

// TDD GREEN phase — Plan 03
// BILLING-07: suspension is purely a status flag — no data deletion

vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock('../plugins/entitlement.js', () => ({
  invalidateTenantStatusCache: vi.fn().mockResolvedValue(undefined),
  ENTITLEMENT_SKIP_ROUTES: new Set(),
}))

vi.mock('../config.js', () => ({
  env: {
    NODE_ENV: 'test',
    BILLING_WEBHOOK_SECRET: 'test-secret',
  },
}))

import { adminTenantsRoutes } from '../routes/admin/tenants.js'
import { supabaseAdmin } from '../lib/supabase.js'

const SUPER_ADMIN_USER = {
  sub: 'admin-user-id',
  tenant_id: 'a0000000-0000-4000-8000-000000000001',
  role: 'super_admin' as const,
}

const TENANT_ID = 'a0000000-0000-4000-8000-000000000002'

describe('billing suspension — data preservation (BILLING-07)', () => {
  let app: ReturnType<typeof Fastify>
  const mockRedis = { del: vi.fn().mockResolvedValue(1) } as unknown as Redis

  beforeAll(async () => {
    app = Fastify({ logger: false })

    // Decorator para simular request.user (auth plugin)
    app.decorateRequest('user', null)
    app.addHook('preHandler', async (request) => {
      // Injeta super_admin para todos os requests neste teste
      request.user = SUPER_ADMIN_USER
    })

    await app.register(adminTenantsRoutes, { redis: mockRedis })
    await app.ready()
  })

  afterAll(() => app.close())

  it('suspender tenant NAO deleta processos, movimentacoes ou usuarios', async () => {
    // Mock do billing_events insert
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    // Mock do escritorios update
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'billing_events') return { insert: mockInsert } as never
      if (table === 'escritorios') return { update: mockUpdate } as never
      // BILLING-07: nenhuma chamada a processos, movimentacoes ou usuarios deve ocorrer
      throw new Error(`BILLING-07 VIOLATION: tentativa de acesso a tabela '${table}' durante suspensão`)
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/tenants/${TENANT_ID}/status`,
      payload: { status: 'suspended' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.new_status).toBe('suspended')

    // Verifica que APENAS billing_events e escritorios foram acessados
    const calls = vi.mocked(supabaseAdmin.from).mock.calls.map((c) => c[0])
    expect(calls).not.toContain('processos')
    expect(calls).not.toContain('movimentacoes')
    expect(calls).not.toContain('usuarios')
  })

  it('tenant suspenso ainda pode acessar dados via super_admin', async () => {
    // Simula GET /tenants retornando tenant suspenso com dados
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: TENANT_ID,
            nome: 'Escritório Suspenso',
            email: 'escritorio@test.com',
            status: 'suspended',
            grace_banner: true,
            grace_period_started_at: '2026-04-01T00:00:00Z',
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        error: null,
      }),
    })

    vi.mocked(supabaseAdmin.from).mockReturnValue({ select: mockSelect } as never)

    const res = await app.inject({
      method: 'GET',
      url: '/tenants',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    // Tenant suspenso visível para super_admin
    const suspended = body.tenants.find((t: { id: string }) => t.id === TENANT_ID)
    expect(suspended).toBeDefined()
    expect(suspended.status).toBe('suspended')
  })
})
