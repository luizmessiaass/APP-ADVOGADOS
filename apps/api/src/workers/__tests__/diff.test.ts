import { describe, it, expect } from 'vitest';
import { gerarHashMovimento, diffMovimentacoes } from '../datajud-sync.js';

// =====================================================================
// Testes Wave 0 — diff básico (stubs)
// =====================================================================

const MOV_COM_ID = {
  id: 'mov-estavel-abc',
  data: '2024-03-10T14:30:00Z',
  tipo: { nacional: { id: 26, nome: 'Distribuição' } },
  descricao: 'Distribuição por sorteio',
};

const MOV_SEM_ID = {
  data: '2024-04-01T10:00:00Z',
  tipo: { nacional: { id: 848, nome: 'Audiência' } },
  descricao: 'Audiência de instrução realizada',
};

describe('gerarHashMovimento', () => {
  it('deve retornar string de 16 caracteres hex', () => {
    const hash = gerarHashMovimento(MOV_SEM_ID);
    expect(hash).toHaveLength(16);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });

  it('deve ser determinístico — mesma entrada, mesmo hash', () => {
    expect(gerarHashMovimento(MOV_SEM_ID)).toBe(gerarHashMovimento(MOV_SEM_ID));
  });

  it('deve gerar hashes diferentes para movimentos diferentes', () => {
    const mov2 = { ...MOV_SEM_ID, descricao: 'Outra audiência' };
    expect(gerarHashMovimento(MOV_SEM_ID)).not.toBe(gerarHashMovimento(mov2));
  });
});

describe('diffMovimentacoes', () => {
  it('deve retornar array vazio quando não há movimentos', async () => {
    const mockSupabase = {
      from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }),
    };
    const result = await diffMovimentacoes(mockSupabase as any, 'proc-123', []);
    expect(result).toHaveLength(0);
  });

  it('deve filtrar movimentos já existentes por datajud_id', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({ data: [{ datajud_id: 'mov-estavel-abc', hash_conteudo: 'h1' }], error: null }),
        }),
      }),
    };
    const result = await diffMovimentacoes(
      mockSupabase as any,
      'proc-123',
      [MOV_COM_ID, MOV_SEM_ID]
    );
    // MOV_COM_ID tem datajud_id='mov-estavel-abc' — já existe -> filtrado
    // MOV_SEM_ID não tem datajud_id — hash não está no banco -> incluído
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(MOV_SEM_ID);
  });
});

// =====================================================================
// TESTES COMPLETOS DE IDEMPOTÊNCIA (DATAJUD-05)
// =====================================================================

const MOV_A = {
  id: 'datajud-id-A',
  data: '2024-01-10T10:00:00Z',
  tipo: { nacional: { id: 26, nome: 'Distribuição' } },
  descricao: 'Distribuição inicial',
};

const MOV_B = {
  id: 'datajud-id-B',
  data: '2024-02-15T14:00:00Z',
  tipo: { nacional: { id: 11009, nome: 'Julgamento' } },
  descricao: 'Julgamento realizado',
};

const MOV_C_SEM_ID = {
  data: '2024-03-20T09:00:00Z',
  tipo: { nacional: { id: 848, nome: 'Audiência' } },
  descricao: 'Audiência de instrução',
};

describe('diffMovimentacoes — idempotência completa (DATAJUD-05)', () => {
  it('deve retornar apenas movimentos novos quando 2 de 3 já existem', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            data: [
              { datajud_id: 'datajud-id-A', hash_conteudo: 'hash-a' },
              { datajud_id: 'datajud-id-B', hash_conteudo: 'hash-b' },
            ],
            error: null,
          }),
        }),
      }),
    };

    const result = await diffMovimentacoes(mockSupabase as any, 'proc-xyz', [MOV_A, MOV_B, MOV_C_SEM_ID]);
    // A e B existem; C é novo (não tem datajud_id, usa hash)
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(MOV_C_SEM_ID);
  });

  it('deve retornar [] quando todos os movimentos já existem (segunda execução = zero duplicatas)', async () => {
    const hashC = gerarHashMovimento(MOV_C_SEM_ID);
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            data: [
              { datajud_id: 'datajud-id-A', hash_conteudo: 'h1' },
              { datajud_id: 'datajud-id-B', hash_conteudo: 'h2' },
              { datajud_id: null, hash_conteudo: hashC },
            ],
            error: null,
          }),
        }),
      }),
    };

    const result = await diffMovimentacoes(mockSupabase as any, 'proc-xyz', [MOV_A, MOV_B, MOV_C_SEM_ID]);
    expect(result).toHaveLength(0);
  });

  it('deve usar hash_conteudo para movimentos sem datajud_id', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ data: [], error: null }) }),
      }),
    };

    // MOV_C_SEM_ID não tem campo 'id' — deve usar hash
    const result = await diffMovimentacoes(mockSupabase as any, 'proc-xyz', [MOV_C_SEM_ID]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(MOV_C_SEM_ID);
  });

  it('gerarHashMovimento deve ser determinístico', () => {
    const hash1 = gerarHashMovimento(MOV_C_SEM_ID);
    const hash2 = gerarHashMovimento(MOV_C_SEM_ID);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(16);
    expect(/^[a-f0-9]+$/.test(hash1)).toBe(true);
  });

  it('gerarHashMovimento deve gerar hashes diferentes para movimentos diferentes', () => {
    const hashA = gerarHashMovimento({ ...MOV_C_SEM_ID, descricao: 'Audiência 1' });
    const hashB = gerarHashMovimento({ ...MOV_C_SEM_ID, descricao: 'Audiência 2' });
    expect(hashA).not.toBe(hashB);
  });
});
