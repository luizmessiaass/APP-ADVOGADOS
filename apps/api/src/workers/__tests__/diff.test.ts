import { describe, it, expect } from 'vitest';
import { gerarHashMovimento, diffMovimentacoes } from '../datajud-sync.js';

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
