import { describe, it, expect, vi, beforeEach } from 'vitest'

// RED: Tests for grace-period-check worker processor
// Verifies: idempotency guards, DB updates, email dispatch, billing_events logging

// Mock supabase admin client
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

const mockBillingEventsSelect = vi.fn()

const mockSupabaseAdmin = {
  from: vi.fn((table: string) => {
    if (table === 'billing_events') {
      return {
        select: mockBillingEventsSelect,
        insert: mockInsert,
      }
    }
    return {
      select: mockSelect,
      update: mockUpdate,
    }
  }),
}

vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}))

// Mock Resend
const mockEmailSend = vi.fn()
const MockResend = vi.fn(function () {
  return { emails: { send: mockEmailSend } }
})
vi.mock('resend', () => ({
  Resend: MockResend,
}))

// Mock config
vi.mock('../config.js', () => ({
  env: {
    RESEND_API_KEY: 'test-key',
    RESEND_FROM_EMAIL: 'Portal Juridico <noreply@portaljuridico.com.br>',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    NODE_ENV: 'test',
  },
}))

describe('processarGracePeriodCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEmailSend.mockResolvedValue({ data: { id: 'email-id' }, error: null })
    mockInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'event-id' }], error: null }),
    })
  })

  it('exports processarGracePeriodCheck function', async () => {
    const { processarGracePeriodCheck } = await import('./grace-period-check.js')
    expect(typeof processarGracePeriodCheck).toBe('function')
  })

  it('queries escritorios with status IN grace and read_only', async () => {
    // Arrange: escritorios query returns empty (no tenants to process)
    mockSelect.mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const { processarGracePeriodCheck } = await import('./grace-period-check.js')
    const mockJob = { id: 'job-1', data: { triggered_at: new Date().toISOString() } } as any

    await processarGracePeriodCheck(mockJob)

    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('escritorios')
    const selectCall = mockSelect.mock.calls[0]
    expect(selectCall).toBeDefined()
  })

  it('sends day_0 email for tenant entering grace (daysSinceStart=0)', async () => {
    const now = new Date()
    const tenant = {
      id: 'tenant-1',
      nome: 'Escritorio Test',
      email: 'admin@test.com',
      status: 'active',
      grace_banner: false,
      grace_period_started_at: now.toISOString(),
    }

    // Mock escritorios query
    mockSelect.mockReturnValueOnce({
      in: vi.fn().mockResolvedValue({ data: [tenant], error: null }),
    })

    // Mock usuarios query for admin email
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: 'admin@test.com' },
              error: null,
            }),
          }),
        }),
      }),
    })

    // Mock billing_events idempotency check (not found)
    mockBillingEventsSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    })

    // Mock update and insert
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const { processarGracePeriodCheck } = await import('./grace-period-check.js')
    const mockJob = { id: 'job-1', data: { triggered_at: now.toISOString() } } as any

    await processarGracePeriodCheck(mockJob)

    expect(mockEmailSend).toHaveBeenCalled()
    const emailCall = mockEmailSend.mock.calls[0][0]
    expect(emailCall.to).toBe('admin@test.com')
  })

  it('skips email if billing_events shows it was already sent (idempotent)', async () => {
    const gracePeriodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const tenant = {
      id: 'tenant-2',
      nome: 'Escritorio Test 2',
      email: 'admin2@test.com',
      status: 'grace',
      grace_banner: true,
      grace_period_started_at: gracePeriodStart.toISOString(),
    }

    mockSelect.mockReturnValueOnce({
      in: vi.fn().mockResolvedValue({ data: [tenant], error: null }),
    })

    // Mock billing_events: day_7 email already sent
    mockBillingEventsSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'existing-event' }],
              error: null,
            }),
          }),
        }),
      }),
    })

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const { processarGracePeriodCheck } = await import('./grace-period-check.js')
    const mockJob = { id: 'job-2', data: { triggered_at: new Date().toISOString() } } as any

    await processarGracePeriodCheck(mockJob)

    // Email should NOT be sent because billing_events shows it was already dispatched
    expect(mockEmailSend).not.toHaveBeenCalled()
  })

  it('logs billing_events row with event=grace.advanced for each transition', async () => {
    const now = new Date()
    const tenant = {
      id: 'tenant-3',
      nome: 'Escritorio Test 3',
      email: 'admin3@test.com',
      status: 'active',
      grace_banner: false,
      grace_period_started_at: now.toISOString(),
    }

    mockSelect.mockReturnValueOnce({
      in: vi.fn().mockResolvedValue({ data: [tenant], error: null }),
    })

    // Admin email query
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: 'admin3@test.com' },
              error: null,
            }),
          }),
        }),
      }),
    })

    // Idempotency check: not found
    mockBillingEventsSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    })

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const { processarGracePeriodCheck } = await import('./grace-period-check.js')
    const mockJob = { id: 'job-3', data: { triggered_at: now.toISOString() } } as any

    await processarGracePeriodCheck(mockJob)

    // billing_events insert should be called (for logging)
    expect(mockInsert).toHaveBeenCalled()
  })
})
