import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock must be at top level for hoisting
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
    constructor(_opts?: unknown) {}
  }
  return {
    default: MockAnthropic,
  };
});

describe('Model routing — TRANSLATION_MODEL constant', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        status: 'Aguardando',
        proxima_data: null,
        explicacao: 'Texto de explicação.',
        impacto: 'Impacto para o cliente.',
        disclaimer: 'Explicação gerada por IA — confirme com seu advogado',
      }) }],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    });
  });

  it('TRANSLATION_MODEL equals claude-haiku-4-5-20251001', async () => {
    const { TRANSLATION_MODEL } = await import('./translation-service.js');
    expect(TRANSLATION_MODEL).toBe('claude-haiku-4-5-20251001');
  });

  it('callClaude (with mocked Anthropic client) passes TRANSLATION_MODEL as model parameter', async () => {
    const { callClaude } = await import('./translation-service.js');

    await callClaude({
      textoMovimentacao: 'Juntada de petição inicial.',
      contexto: {
        numero_cnj: '0001234-55.2026.8.26.0100',
        tipo_acao: 'Civil',
        partes_resumo: 'Autor vs. Réu',
      },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-4-5-20251001' })
    );
  });
});
