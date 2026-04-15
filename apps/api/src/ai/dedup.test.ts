import { describe, it, expect } from 'vitest';
import { hashMovimentacao } from '../workers/translate-movimentacao.js';

describe('Hash deduplication — hashMovimentacao', () => {
  it('returns a 64-character hex string for a given text', () => {
    const hash = hashMovimentacao('Juntada de petição inicial');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic — same input always produces same hash', () => {
    const text = 'Juntada de petição inicial';
    const hash1 = hashMovimentacao(text);
    const hash2 = hashMovimentacao(text);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different texts', () => {
    const hashA = hashMovimentacao('Texto A — movimentação de citação');
    const hashB = hashMovimentacao('Texto B — sentença proferida');
    expect(hashA).not.toBe(hashB);
  });
});
