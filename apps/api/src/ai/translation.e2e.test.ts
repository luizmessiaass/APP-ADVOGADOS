import { describe, it, expect } from 'vitest';
import { hashMovimentacao } from '../workers/translate-movimentacao.js';
import { validateTranslacao } from '../ai/translation-schema.js';
import { validateCacheThreshold, TRANSLATION_MODEL } from '../ai/translation-prompt.js';
import Anthropic from '@anthropic-ai/sdk';

describe('AI Translation — Integration (E2E)', () => {
  it('hashMovimentacao is deterministic end-to-end', () => {
    const text = 'Concluso ao Juiz para sentença';
    const hash1 = hashMovimentacao(text);
    const hash2 = hashMovimentacao(text);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('validateTranslacao accepts a valid object', () => {
    expect(() => validateTranslacao({
      status: 'Aguardando decisão do juiz',
      proxima_data: null,
      explicacao: 'O processo foi enviado para o juiz tomar uma decisão.',
      impacto: 'Você deve aguardar — não há ação necessária da sua parte.',
      disclaimer: 'Explicação gerada por IA — confirme com seu advogado',
    })).not.toThrow();
  });

  it('validateTranslacao throws with descriptive message on missing disclaimer', () => {
    expect(() => validateTranslacao({
      status: 'Aguardando',
      proxima_data: null,
      explicacao: 'Texto',
      impacto: 'Impacto',
      // disclaimer ausente
    })).toThrow('Schema validation failed');
  });

  it('glossario reaches minimum 4096 token threshold for Haiku 4.5 cache (requires ANTHROPIC_API_KEY)', async () => {
    if (!process.env.ANTHROPIC_API_KEY) return;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    await expect(validateCacheThreshold(client)).resolves.not.toThrow();
  });
});

describe('Smoke tests — Claude API (CI only)', () => {
  it.skipIf(!process.env.ANTHROPIC_API_KEY)(
    'callClaude returns valid Translacao with correct disclaimer',
    async () => {
      const { callClaude } = await import('../ai/translation-service.js');
      const result = await callClaude({
        textoMovimentacao: 'Juntada de petição inicial pelos autos.',
        contexto: {
          numero_cnj: '0000001-00.2026.8.26.0001',
          tipo_acao: 'Ação Civil',
          partes_resumo: 'Autor vs. Réu (dados omitidos por LGPD)',
        },
      });

      expect(result.translacao.disclaimer).toBe(
        'Explicação gerada por IA — confirme com seu advogado'
      );
      expect(result.translacao.status).toBeTruthy();
      expect(result.usage.output_tokens).toBeGreaterThan(0);
    },
    30_000
  );

  it.skipIf(!process.env.ANTHROPIC_API_KEY)(
    'second call with same text shows cache_read_tokens > 0',
    async () => {
      const { callClaude } = await import('../ai/translation-service.js');
      const params = {
        textoMovimentacao: 'Concluso ao Juiz para sentença.',
        contexto: {
          numero_cnj: '0000002-00.2026.8.26.0001',
          tipo_acao: 'Trabalhista',
          partes_resumo: 'Trabalhador vs. Empresa (dados omitidos por LGPD)',
        },
      };

      // Primeira chamada — cria cache
      await callClaude(params);

      // Segunda chamada — deve ter cache hit no system prompt
      const second = await callClaude(params);
      expect(second.usage.cache_read_tokens).toBeGreaterThan(0);
    },
    60_000
  );
});
