/**
 * Validação de número CNJ — Resolução CNJ 65/2008, algoritmo mod-97
 * (D-13 / D-14 do CONTEXT.md, DATAJUD-01)
 */

export class CNJInvalidoError extends Error {
  readonly code = 'INVALID_CNJ';
  constructor(message: string) {
    super(message);
    this.name = 'CNJInvalidoError';
  }
}

/**
 * Divisão modular para strings numéricas longas (evita overflow de Number)
 */
function bcmod(dividend: string, divisor: number): number {
  let remainder = 0;
  for (const char of dividend) {
    remainder = (remainder * 10 + parseInt(char, 10)) % divisor;
  }
  return remainder;
}

/**
 * Remove separadores e retorna os 20 dígitos do CNJ.
 * Aceita formato NNNNNNN-DD.AAAA.J.TT.OOOO ou string de 20 dígitos.
 */
export function normalizarCNJ(numero: string): string {
  return numero.replace(/[-.\s]/g, '');
}

/**
 * Valida o check-digit do número CNJ usando o algoritmo mod-97 (ISO 7064:2003).
 * Retorna true se válido, false caso contrário.
 * Não lança exceção — use assertCNJValido para lançar.
 */
export function validarNumeroCNJ(numero: string): boolean {
  const clean = normalizarCNJ(numero);
  if (clean.length !== 20 || !/^\d{20}$/.test(clean)) return false;

  const N = clean.substring(0, 7);   // sequencial
  const D = clean.substring(7, 9);   // check digits
  const A = clean.substring(9, 13);  // ano
  const J = clean.substring(13, 14); // justiça
  const T = clean.substring(14, 16); // tribunal
  const O = clean.substring(16, 20); // vara/origem

  const op1 = bcmod(N, 97);
  const op2 = bcmod(`${op1}${A}${J}${T}`, 97);
  const opFinal = bcmod(`${op2}${O}${D}`, 97);

  return opFinal === 1;
}

/**
 * Valida e lança CNJInvalidoError se o número for inválido.
 * Use isso nos pontos de entrada da API antes de qualquer I/O externo.
 */
export function assertCNJValido(numero: string): void {
  if (!validarNumeroCNJ(numero)) {
    throw new CNJInvalidoError(
      `Número CNJ inválido: "${numero}". Formato esperado: NNNNNNN-DD.AAAA.J.TT.OOOO`
    );
  }
}

/**
 * Extrai o código J.TT de um número CNJ normalizado (20 dígitos).
 * Retorna no formato "J.TT" (ex: "8.26" para TJSP).
 */
export function extrairCodigoTribunal(numeroCNJ: string): string {
  const clean = normalizarCNJ(numeroCNJ);
  if (clean.length !== 20) throw new CNJInvalidoError('CNJ deve ter 20 dígitos após normalização');
  const J = clean.substring(13, 14);
  const T = clean.substring(14, 16);
  return `${J}.${T}`;
}
