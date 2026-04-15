import { describe, it, expect } from 'vitest';
import { validateTranslacao, TranslacaoSchema } from './translation-schema.js';
import { Type } from '@sinclair/typebox';

const VALID_TRANSLACAO = {
  status: 'Em andamento',
  proxima_data: null,
  explicacao: 'O processo está em análise.',
  impacto: 'Aguarde o resultado.',
  disclaimer: 'Explicação gerada por IA — confirme com seu advogado',
};

describe('Disclaimer — AI translation mandatory notice', () => {
  it('TranslacaoSchema.disclaimer is Type.Literal with exact value', () => {
    const disclaimerSchema = TranslacaoSchema.properties.disclaimer;
    // Type.Literal creates a schema with const equal to the literal value
    expect((disclaimerSchema as any).const).toBe('Explicação gerada por IA — confirme com seu advogado');
  });

  it('validateTranslacao accepts object with correct disclaimer', () => {
    expect(() => validateTranslacao(VALID_TRANSLACAO)).not.toThrow();
    const result = validateTranslacao(VALID_TRANSLACAO);
    expect(result.disclaimer).toBe('Explicação gerada por IA — confirme com seu advogado');
  });

  it('validateTranslacao throws when disclaimer field is absent', () => {
    const { disclaimer: _removed, ...withoutDisclaimer } = VALID_TRANSLACAO;
    expect(() => validateTranslacao(withoutDisclaimer)).toThrow('Schema validation failed');
  });
});
