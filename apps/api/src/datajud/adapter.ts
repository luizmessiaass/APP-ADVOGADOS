import { assertCNJValido, extrairCodigoTribunal } from './cnj-validator.js';
import { resolverTribunal } from './tribunal-map.js';
import { DatajudResponseSchema, DatajudProcesso } from './types.js';

const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';
const DATAJUD_TIMEOUT_MS = 10_000;

export type DatajudErrorTipo = 'network' | 'timeout' | 'auth' | 'schema_drift' | 'unknown';

export class DatajudAdapterError extends Error {
  readonly tipo: DatajudErrorTipo;
  readonly statusCode?: number;
  constructor(message: string, tipo: DatajudErrorTipo, statusCode?: number) {
    super(message);
    this.name = 'DatajudAdapterError';
    this.tipo = tipo;
    this.statusCode = statusCode;
  }
}

export interface DatajudAdapterOptions {
  apiKey?: string;    // default: process.env.DATAJUD_API_KEY
  baseUrl?: string;   // override para testes
  timeoutMs?: number;
}

export class DatajudAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: DatajudAdapterOptions = {}) {
    this.apiKey =
      options.apiKey ??
      process.env.DATAJUD_API_KEY ??
      (() => {
        throw new Error('DATAJUD_API_KEY não definida');
      })();
    this.baseUrl = options.baseUrl ?? DATAJUD_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DATAJUD_TIMEOUT_MS;
  }

  /**
   * Busca processo no DataJud pelo número CNJ.
   * Valida o número ANTES de qualquer I/O externo (DATAJUD-01).
   * Retorna null se hits=[] (processo não encontrado ou segredo de justiça — D-03/D-06).
   * Lança DatajudAdapterError em caso de falha de rede, auth ou schema drift.
   * Lança CNJInvalidoError se o número CNJ for inválido (antes de qualquer fetch).
   */
  async buscarProcesso(numeroCNJ: string): Promise<DatajudProcesso | null> {
    // DATAJUD-01: validar CNJ antes de qualquer I/O (T-02-01)
    assertCNJValido(numeroCNJ);

    const codigoJT = extrairCodigoTribunal(numeroCNJ);
    const alias = resolverTribunal(codigoJT);
    const url = `${this.baseUrl}/${alias}/_search`;

    const body = JSON.stringify({
      query: {
        bool: {
          must: [{ match: { numeroProcesso: numeroCNJ } }],
        },
      },
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // T-02-02: API key nunca logada; apenas no header de transporte
          Authorization: `APIKey ${this.apiKey}`,
        },
        body,
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new DatajudAdapterError(
          `DataJud retornou ${response.status} — API key inválida ou expirada`,
          'auth',
          response.status
        );
      }

      if (!response.ok) {
        throw new DatajudAdapterError(
          `DataJud retornou status ${response.status}`,
          'unknown',
          response.status
        );
      }

      const json = await response.json();

      // T-02-03: Validação Zod — detecta schema drift por tribunal
      const parsed = DatajudResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new DatajudAdapterError(
          `Schema drift no DataJud para tribunal ${alias}: ${parsed.error.message}`,
          'schema_drift'
        );
      }

      const hits = parsed.data.hits.hits;
      // D-03/D-06: hits=[] indica processo não encontrado OU segredo de justiça
      // (DataJud não distingue os dois casos na API pública — retorna array vazio)
      if (hits.length === 0) return null;

      return hits[0]._source;
    } catch (err) {
      if (err instanceof DatajudAdapterError) throw err;
      // Re-lança CNJInvalidoError e outros erros conhecidos sem encapsular
      if ((err as Error).name === 'CNJInvalidoError') throw err;
      if ((err as Error).name === 'AbortError') {
        throw new DatajudAdapterError(
          `DataJud timeout após ${this.timeoutMs}ms`,
          'timeout'
        );
      }
      throw new DatajudAdapterError(
        `Erro de rede ao chamar DataJud: ${(err as Error).message}`,
        'network'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
