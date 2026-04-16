import { describe, it, expect, vi } from 'vitest'

// Wave 0 — TDD Red phase
// Stub de integracao para BILLING-07: dados nao deletados ao suspender tenant
// Todos os testes falham com 'not implemented' ate Plan 05

// Mock do Supabase admin client para testes de integracao
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

describe('billing suspension — data preservation (BILLING-07)', () => {
  it('suspender tenant NAO deleta processos, movimentacoes ou usuarios', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })

  it('tenant suspenso ainda pode acessar dados via super_admin', async () => {
    expect.fail('not implemented — stub for Wave 0')
  })
})
