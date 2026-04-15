import { describe, it, expect } from 'vitest';
import { validateTranslacao } from './translation-schema.js';

const VALID_TRANSLACAO = {
  status: 'Aguardando decisão do juiz',
  proxima_data: null,
  explicacao: 'O processo foi enviado ao juiz para análise.',
  impacto: 'Você deve aguardar — não há ação necessária da sua parte.',
  disclaimer: 'Explicação gerada por IA — confirme com seu advogado',
};

describe('Output schema validator — validateTranslacao', () => {
  it('accepts valid Translacao object with correct disclaimer', () => {
    expect(() => validateTranslacao(VALID_TRANSLACAO)).not.toThrow();
  });

  it('throws when disclaimer has wrong text', () => {
    expect(() => validateTranslacao({
      ...VALID_TRANSLACAO,
      disclaimer: 'texto errado',
    })).toThrow('Schema validation failed');
  });

  it('throws when proxima_data is undefined (field is required, even if null is valid)', () => {
    const { proxima_data: _removed, ...withoutProximaData } = VALID_TRANSLACAO;
    expect(() => validateTranslacao(withoutProximaData)).toThrow('Schema validation failed');
  });

  it('accepts when status is empty string (schema is permissive on content)', () => {
    expect(() => validateTranslacao({
      ...VALID_TRANSLACAO,
      status: '',
    })).not.toThrow();
  });
});
