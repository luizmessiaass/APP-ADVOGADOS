import { describe, it, expect } from 'vitest';
import {
  validarNumeroCNJ,
  normalizarCNJ,
  assertCNJValido,
  extrairCodigoTribunal,
  CNJInvalidoError,
} from '../../datajud/cnj-validator.js';
import { resolverTribunal, TribunalNaoSuportadoError } from '../../datajud/tribunal-map.js';

// CNJ válido: 0000001-45.2024.8.26.0001
// Check-digit 45 calculado via mod-97 (Resolução CNJ 65/2008):
// op1 = 0000001 % 97 = 1
// op2 = (1_2024_8_26) % 97 = 27
// opFinal = (27_0001_45) % 97 = 1 ✓
const CNJ_VALIDO = '0000001-45.2024.8.26.0001';
const CNJ_VALIDO_NORMALIZADO = '00000014520248260001';

describe('validarNumeroCNJ', () => {
  it('deve retornar true para número CNJ válido', () => {
    expect(validarNumeroCNJ(CNJ_VALIDO)).toBe(true);
  });

  it('deve retornar false para check-digit incorreto', () => {
    expect(validarNumeroCNJ('0000001-00.2024.8.26.0001')).toBe(false);
  });

  it('deve retornar false para número muito curto', () => {
    expect(validarNumeroCNJ('1234567-89.2024.8.26.00')).toBe(false);
  });

  it('deve retornar false para string vazia', () => {
    expect(validarNumeroCNJ('')).toBe(false);
  });

  it('deve retornar false para caracteres não numéricos (além de separadores)', () => {
    expect(validarNumeroCNJ('XXXXXXX-XX.XXXX.X.XX.XXXX')).toBe(false);
  });

  it('deve aceitar número sem formatação (20 dígitos)', () => {
    // Mesmo número sem separadores
    expect(validarNumeroCNJ(CNJ_VALIDO_NORMALIZADO)).toBe(true);
  });
});

describe('normalizarCNJ', () => {
  it('deve remover hífens e pontos', () => {
    expect(normalizarCNJ(CNJ_VALIDO)).toBe(CNJ_VALIDO_NORMALIZADO);
  });

  it('deve remover espaços', () => {
    expect(normalizarCNJ('0000001 45 2024 8 26 0001')).toBe(CNJ_VALIDO_NORMALIZADO);
  });
});

describe('assertCNJValido', () => {
  it('deve lançar CNJInvalidoError para número inválido', () => {
    expect(() => assertCNJValido('0000001-00.2024.8.26.0001')).toThrow(CNJInvalidoError);
  });

  it('deve lançar com code INVALID_CNJ', () => {
    try {
      assertCNJValido('invalido');
    } catch (e) {
      expect((e as CNJInvalidoError).code).toBe('INVALID_CNJ');
    }
  });

  it('não deve lançar para CNJ válido', () => {
    expect(() => assertCNJValido(CNJ_VALIDO)).not.toThrow();
  });
});

describe('extrairCodigoTribunal', () => {
  it('deve extrair J.TT corretamente (TJSP = 8.26)', () => {
    expect(extrairCodigoTribunal(CNJ_VALIDO)).toBe('8.26');
  });
});

describe('resolverTribunal', () => {
  it('deve mapear 8.26 para api_publica_tjsp', () => {
    expect(resolverTribunal('8.26')).toBe('api_publica_tjsp');
  });

  it('deve mapear 5.01 para api_publica_tst', () => {
    expect(resolverTribunal('5.01')).toBe('api_publica_tst');
  });

  it('deve lançar TribunalNaoSuportadoError para código desconhecido', () => {
    expect(() => resolverTribunal('9.99')).toThrow(TribunalNaoSuportadoError);
  });
});
