import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatajudAdapter, DatajudAdapterError } from '../../datajud/adapter.js';
import { CNJInvalidoError } from '../../datajud/cnj-validator.js';

// CNJ válido: 0000001-45.2024.8.26.0001
// Check-digit 45 calculado via mod-97 (Resolução CNJ 65/2008)
const CNJ_VALIDO = '0000001-45.2024.8.26.0001';
const CNJ_INVALIDO = '0000001-00.2024.8.26.0001';

const MOCK_RESPONSE_COM_HITS = {
  hits: {
    total: { value: 1, relation: 'eq' },
    hits: [
      {
        _source: {
          dadosBasicos: {
            numero: CNJ_VALIDO,
            nivelSigilo: 0,
          },
          movimentos: [
            {
              id: 'mov-abc123',
              data: '2024-03-10T14:30:00Z',
              tipo: { nacional: { id: 26, nome: 'Distribuição' } },
              descricao: 'Distribuição por sorteio',
            },
          ],
        },
      },
    ],
  },
};

const MOCK_RESPONSE_VAZIO = {
  hits: { total: { value: 0, relation: 'eq' }, hits: [] },
};

describe('DatajudAdapter', () => {
  let adapter: DatajudAdapter;

  beforeEach(() => {
    adapter = new DatajudAdapter({ apiKey: 'test-key', baseUrl: 'https://mock.datajud' });
    vi.restoreAllMocks();
  });

  it('deve lançar CNJInvalidoError ANTES de chamar fetch para CNJ inválido', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(adapter.buscarProcesso(CNJ_INVALIDO)).rejects.toThrow(CNJInvalidoError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('deve enviar header Authorization: APIKey no fetch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESPONSE_COM_HITS), { status: 200 })
    );
    await adapter.buscarProcesso(CNJ_VALIDO);
    const [, options] = fetchMock.mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: 'APIKey test-key',
    });
  });

  it('deve retornar DatajudProcesso quando hits contém resultado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESPONSE_COM_HITS), { status: 200 })
    );
    const resultado = await adapter.buscarProcesso(CNJ_VALIDO);
    expect(resultado).not.toBeNull();
    expect(resultado?.movimentos).toHaveLength(1);
    expect(resultado?.movimentos[0].id).toBe('mov-abc123');
  });

  it('deve retornar null quando hits=[] (segredo de justiça ou processo inexistente)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_RESPONSE_VAZIO), { status: 200 })
    );
    const resultado = await adapter.buscarProcesso(CNJ_VALIDO);
    expect(resultado).toBeNull();
  });

  it('deve lançar DatajudAdapterError com tipo "auth" para HTTP 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    );
    await expect(adapter.buscarProcesso(CNJ_VALIDO)).rejects.toMatchObject({
      tipo: 'auth',
      statusCode: 401,
    });
  });

  it('deve lançar DatajudAdapterError com tipo "schema_drift" para response malformado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ invalid: true }), { status: 200 })
    );
    await expect(adapter.buscarProcesso(CNJ_VALIDO)).rejects.toMatchObject({
      tipo: 'schema_drift',
    });
  });

  it('deve lançar DatajudAdapterError com tipo "network" para erro de rede', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network fail'));
    await expect(adapter.buscarProcesso(CNJ_VALIDO)).rejects.toMatchObject({
      tipo: 'network',
    });
  });
});
