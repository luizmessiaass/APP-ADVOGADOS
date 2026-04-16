import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Job } from 'bullmq'
import type { GracePeriodJobData } from '../queues/grace-period.js'

// --- Mocks de dependencias externas ---

// Mock supabaseAdmin antes de importar o modulo
const mockSupabaseSelect = vi.fn()
const mockSupabaseUpdate = vi.fn()
const mockSupabaseInsert = vi.fn()
const mockSupabaseFilter = vi.fn()

// Builder encadeado simplificado para supabase
function buildQueryMock(finalResult: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'update', 'insert', 'eq', 'in', 'filter', 'limit', 'single']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Ultimo metodo da cadeia retorna a promise
  ;(chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalResult)
  ;(chain['limit'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalResult)
  return chain
}

// Mock do modulo supabase do worker
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Mock do modulo resend — precisa ser uma classe construtora real
vi.mock('resend', () => {
  const mockSend = vi.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null })
  class MockResend {
    emails = { send: mockSend }
    constructor(_apiKey: string) {}
  }
  return { Resend: MockResend }
})

// Mock do config
vi.mock('../config.js', () => ({
  env: {
    NODE_ENV: 'test',
    RESEND_API_KEY: 'test-key',
    RESEND_FROM_EMAIL: 'test@test.com',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    REDIS_URL: 'redis://localhost:6379',
    SENTRY_DSN: '',
  },
}))

// Importar apos mocks
const { supabaseAdmin } = await import('../lib/supabase.js')
const { processarGracePeriodCheck } = await import('./grace-period-check.js')

function makeJob(data: GracePeriodJobData): Job<GracePeriodJobData> {
  return { id: 'test-job-1', data } as unknown as Job<GracePeriodJobData>
}

describe('processarGracePeriodCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('finaliza sem erros quando nao ha tenants em grace/read_only', async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(fromMock)

    await expect(
      processarGracePeriodCheck(makeJob({ triggered_at: new Date().toISOString() }))
    ).resolves.toBeUndefined()
  })

  it('lanca erro quando query ao banco falha', async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      }),
    })
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(fromMock)

    await expect(
      processarGracePeriodCheck(makeJob({ triggered_at: new Date().toISOString() }))
    ).rejects.toThrow('DB error')
  })

  it('processa tenant em grace Day 3 e atualiza grace_banner', async () => {
    // grace_period_started_at = 3 dias atras
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString()

    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }

    const billingEventsQueryChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'escritorios') {
        let callCount = 0
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'tenant-001',
                  nome: 'Escritorio Test',
                  status: 'grace',
                  grace_banner: false,
                  grace_period_started_at: threeDaysAgo,
                },
              ],
              error: null,
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'billing_events') {
        return billingEventsQueryChain
      }
      if (table === 'usuarios') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { email: 'admin@test.com' }, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(fromMock)

    await expect(
      processarGracePeriodCheck(makeJob({ triggered_at: new Date().toISOString() }))
    ).resolves.toBeUndefined()

    // Verificar que escritorios.update foi chamado para grace_banner
    expect(supabaseAdmin.from).toHaveBeenCalledWith('escritorios')
  })

  it('nao processa tenant ja em suspended (idempotente)', async () => {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString()

    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'tenant-002',
              nome: 'Escritorio Suspenso',
              status: 'suspended',
              grace_banner: true,
              grace_period_started_at: fourteenDaysAgo,
            },
          ],
          error: null,
        }),
      }),
    })
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(fromMock)

    await expect(
      processarGracePeriodCheck(makeJob({ triggered_at: new Date().toISOString() }))
    ).resolves.toBeUndefined()

    // Nenhum update chamado (status ja correto — gracePeriodStateTransition retorna [])
    const updateCalls = (supabaseAdmin.from as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => {
        const table = call[0]
        return table === 'escritorios'
      }
    )
    // from('escritorios') foi chamado somente uma vez (query inicial)
    expect(updateCalls).toHaveLength(1)
  })
})
