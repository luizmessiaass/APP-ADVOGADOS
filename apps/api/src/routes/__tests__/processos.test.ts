/**
 * Testes Wave 0 para a rota GET /processos/:id — DATAJUD-09.
 * Verificam o campo desatualizado: true/false com base em ultima_sincronizacao.
 *
 * Fase TDD: Testa lógica de staleness e CNJ isoladamente (sem Fastify/banco real).
 */
import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Lógica de staleness (espelha a função interna de processos.ts)
// ---------------------------------------------------------------------------
const STALENESS_THRESHOLD_MS = 72 * 60 * 60 * 1000

function calcularDesatualizado(ultimaSincronizacao: string | null): boolean {
  if (!ultimaSincronizacao) return false
  return Date.now() - new Date(ultimaSincronizacao).getTime() > STALENESS_THRESHOLD_MS
}

describe('calcularDesatualizado (DATAJUD-09, D-07/D-08)', () => {
  it('deve retornar false para processo sincronizado há 10 horas', () => {
    const dezHorasAtras = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
    expect(calcularDesatualizado(dezHorasAtras)).toBe(false)
  })

  it('deve retornar true para processo sincronizado há 80 horas', () => {
    const oitentaHorasAtras = new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString()
    expect(calcularDesatualizado(oitentaHorasAtras)).toBe(true)
  })

  it('deve retornar true para processo sincronizado exatamente há 73 horas', () => {
    const setentaTresHorasAtras = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString()
    expect(calcularDesatualizado(setentaTresHorasAtras)).toBe(true)
  })

  it('deve retornar false para processo nunca sincronizado (null)', () => {
    expect(calcularDesatualizado(null)).toBe(false)
  })

  it('deve retornar false para processo sincronizado há exatamente 71 horas', () => {
    const setentaUmaHorasAtras = new Date(Date.now() - 71 * 60 * 60 * 1000).toISOString()
    expect(calcularDesatualizado(setentaUmaHorasAtras)).toBe(false)
  })
})

describe('validação CNJ na rota POST /processos', () => {
  it('deve importar assertCNJValido e CNJInvalidoError sem erros', async () => {
    const { assertCNJValido, CNJInvalidoError } = await import('../../datajud/cnj-validator.js')
    expect(assertCNJValido).toBeDefined()
    expect(CNJInvalidoError).toBeDefined()
  })

  it('deve lançar CNJInvalidoError com code INVALID_CNJ para CNJ inválido', async () => {
    const { assertCNJValido, CNJInvalidoError } = await import('../../datajud/cnj-validator.js')
    try {
      assertCNJValido('0000001-00.2024.8.26.0001')
      expect.fail('Deveria ter lançado CNJInvalidoError')
    } catch (e) {
      expect(e).toBeInstanceOf(CNJInvalidoError)
      expect((e as InstanceType<typeof CNJInvalidoError>).code).toBe('INVALID_CNJ')
    }
  })

  it('deve aceitar CNJ sem lançar TypeError (verifica que a função é importável)', async () => {
    const { assertCNJValido } = await import('../../datajud/cnj-validator.js')
    expect(typeof assertCNJValido).toBe('function')
  })
})

describe('processosRoutes export', () => {
  it('deve exportar processosRoutes como função', async () => {
    const { processosRoutes } = await import('../processos.js')
    expect(typeof processosRoutes).toBe('function')
  })
})

// =====================================================================
// TESTES COMPLETOS DE STALENESS (DATAJUD-09, D-07/D-08)
// =====================================================================

describe('calcularDesatualizado — limites exatos (DATAJUD-09)', () => {
  const THRESHOLD_MS = 72 * 60 * 60 * 1000

  it('deve retornar true para ultima_sincronizacao exatamente 72h + 1ms atrás', () => {
    const ts = new Date(Date.now() - THRESHOLD_MS - 1).toISOString()
    expect(calcularDesatualizado(ts)).toBe(true)
  })

  it('deve retornar false para ultima_sincronizacao exatamente 72h - 1ms atrás', () => {
    const ts = new Date(Date.now() - THRESHOLD_MS + 1).toISOString()
    expect(calcularDesatualizado(ts)).toBe(false)
  })

  it('deve retornar false para timestamp no futuro (edge case)', () => {
    const ts = new Date(Date.now() + 60_000).toISOString()
    expect(calcularDesatualizado(ts)).toBe(false)
  })

  it('deve retornar false para processo com ultima_sincronizacao há 1 hora', () => {
    const ts = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(calcularDesatualizado(ts)).toBe(false)
  })

  it('deve retornar true para processo com ultima_sincronizacao há 7 dias', () => {
    const ts = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(calcularDesatualizado(ts)).toBe(true)
  })
})

// =====================================================================
// TESTES DE VALIDAÇÃO CNJ NA ROTA (DATAJUD-01 via rota POST /processos)
// =====================================================================

describe('assertCNJValido — casos edge', () => {
  it('deve não lançar para CNJ com formato válido e check-digit correto', async () => {
    const { assertCNJValido } = await import('../../datajud/cnj-validator.js')
    // CNJ com check-digit correto (0000001-45.2024.8.26.0001 — validado via mod-97)
    expect(() => assertCNJValido('0000001-45.2024.8.26.0001')).not.toThrow()
  })

  it('deve lançar CNJInvalidoError para string vazia', async () => {
    const { assertCNJValido, CNJInvalidoError } = await import('../../datajud/cnj-validator.js')
    expect(() => assertCNJValido('')).toThrow(CNJInvalidoError)
  })

  it('deve lançar CNJInvalidoError para número com 19 dígitos (muito curto)', async () => {
    const { assertCNJValido, CNJInvalidoError } = await import('../../datajud/cnj-validator.js')
    expect(() => assertCNJValido('000000-47.2024.8.26.0001')).toThrow(CNJInvalidoError)
  })

  it('deve lançar CNJInvalidoError para número com letras', async () => {
    const { assertCNJValido, CNJInvalidoError } = await import('../../datajud/cnj-validator.js')
    expect(() => assertCNJValido('XXXXXXX-47.2024.8.26.0001')).toThrow(CNJInvalidoError)
  })

  it('erro deve ter code INVALID_CNJ', async () => {
    const { assertCNJValido, CNJInvalidoError } = await import('../../datajud/cnj-validator.js')
    try {
      assertCNJValido('invalido')
    } catch (e) {
      expect(e).toBeInstanceOf(CNJInvalidoError)
      expect((e as any).code).toBe('INVALID_CNJ')
    }
  })
})
