/**
 * Lookup table J.TT → alias do endpoint DataJud.
 * Fonte: api-publica.datajud.cnj.jus.br + mapeamento CNJ 65/2008
 * (D-13 / DATAJUD-02 do CONTEXT.md)
 */

export class TribunalNaoSuportadoError extends Error {
  constructor(codigoJT: string) {
    super(`Tribunal com código J.TT "${codigoJT}" não está mapeado no sistema`);
    this.name = 'TribunalNaoSuportadoError';
  }
}

/**
 * Mapeamento completo de código J.TT → alias do endpoint DataJud.
 * Chave: "J.TT" (ex: "8.26"), Valor: alias (ex: "api_publica_tjsp")
 */
const TRIBUNAL_MAP: Record<string, string> = {
  // Tribunais Estaduais (J=8)
  '8.01': 'api_publica_tjac',
  '8.02': 'api_publica_tjal',
  '8.03': 'api_publica_tjam',
  '8.04': 'api_publica_tjap',
  '8.05': 'api_publica_tjba',
  '8.06': 'api_publica_tjce',
  '8.07': 'api_publica_tjdft',
  '8.08': 'api_publica_tjes',
  '8.09': 'api_publica_tjgo',
  '8.10': 'api_publica_tjma',
  '8.11': 'api_publica_tjmt',
  '8.12': 'api_publica_tjms',
  '8.13': 'api_publica_tjmg',
  '8.14': 'api_publica_tjpa',
  '8.15': 'api_publica_tjpb',
  '8.16': 'api_publica_tjpr',
  '8.17': 'api_publica_tjpe',
  '8.18': 'api_publica_tjpi',
  '8.19': 'api_publica_tjrj',
  '8.20': 'api_publica_tjrn',
  '8.21': 'api_publica_tjrs',
  '8.22': 'api_publica_tjro',
  '8.23': 'api_publica_tjrr',
  '8.24': 'api_publica_tjsc',
  '8.25': 'api_publica_tjse',
  '8.26': 'api_publica_tjsp',
  '8.27': 'api_publica_tjto',
  // Tribunais Regionais Federais (J=4)
  '4.01': 'api_publica_trf1',
  '4.02': 'api_publica_trf2',
  '4.03': 'api_publica_trf3',
  '4.04': 'api_publica_trf4',
  '4.05': 'api_publica_trf5',
  '4.06': 'api_publica_trf6',
  // Tribunais Superiores (J=5)
  '5.01': 'api_publica_tst',
  '5.02': 'api_publica_csjt',
  // Tribunais Regionais do Trabalho (J=5, TT=03..24)
  '5.03': 'api_publica_trt3',
  '5.04': 'api_publica_trt4',
  '5.05': 'api_publica_trt5',
  '5.06': 'api_publica_trt6',
  '5.07': 'api_publica_trt7',
  '5.08': 'api_publica_trt8',
  '5.09': 'api_publica_trt9',
  '5.10': 'api_publica_trt10',
  '5.11': 'api_publica_trt11',
  '5.12': 'api_publica_trt12',
  '5.13': 'api_publica_trt13',
  '5.14': 'api_publica_trt14',
  '5.15': 'api_publica_trt15',
  '5.16': 'api_publica_trt16',
  '5.17': 'api_publica_trt17',
  '5.18': 'api_publica_trt18',
  '5.19': 'api_publica_trt19',
  '5.20': 'api_publica_trt20',
  '5.21': 'api_publica_trt21',
  '5.22': 'api_publica_trt22',
  '5.23': 'api_publica_trt23',
  '5.24': 'api_publica_trt24',
  // STJ, STF, outros superiores
  '3.01': 'api_publica_stj',
  '1.01': 'api_publica_stf',
  '2.01': 'api_publica_cjf',
  '6.01': 'api_publica_stm',
  '7.01': 'api_publica_tse',
  '7.02': 'api_publica_tre',
};

/**
 * Resolve o código J.TT para o alias do endpoint DataJud.
 * @param codigoJT - String no formato "J.TT" extraída do número CNJ (ex: "8.26")
 * @throws TribunalNaoSuportadoError se o código não estiver mapeado
 */
export function resolverTribunal(codigoJT: string): string {
  const alias = TRIBUNAL_MAP[codigoJT];
  if (!alias) throw new TribunalNaoSuportadoError(codigoJT);
  return alias;
}

/**
 * Retorna todos os tribunais suportados (para monitoramento/health).
 */
export function tribunaisSuportados(): string[] {
  return Object.keys(TRIBUNAL_MAP);
}
