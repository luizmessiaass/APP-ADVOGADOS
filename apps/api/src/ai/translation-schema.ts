import { Type, Static } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

// Tamanhos maximos (Claude's Discretion aplicada):
// status: 200 chars — resumo curto do estado do processo
// explicacao: 1000 chars — explicacao detalhada da movimentacao
// impacto: 500 chars — o que significa para o cliente
// proxima_data: texto descritivo (nao ISO date — per D-07)
export const TranslacaoSchema = Type.Object({
  status:       Type.String({ maxLength: 200 }),
  proxima_data: Type.Union([Type.String({ maxLength: 300 }), Type.Null()]),
  explicacao:   Type.String({ maxLength: 1000 }),
  impacto:      Type.String({ maxLength: 500 }),
  disclaimer:   Type.Literal('Explicação gerada por IA — confirme com seu advogado'), // AI-06
});

export type Translacao = Static<typeof TranslacaoSchema>;

const TranslacaoCheck = TypeCompiler.Compile(TranslacaoSchema);

export function validateTranslacao(raw: unknown): Translacao {
  if (!TranslacaoCheck.Check(raw)) {
    const errors = [...TranslacaoCheck.Errors(raw)];
    throw new Error(`Schema validation failed: ${JSON.stringify(errors)}`);
  }
  return raw as Translacao;
}

// JSON Schema para output_config.format (Structured Outputs GA — per RESEARCH.md)
// Usa anyOf ao inves de oneOf para proxima_data — per Pitfall 5 do RESEARCH.md
export const OUTPUT_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    status:       { type: 'string', description: 'Status atual do processo em linguagem simples' },
    proxima_data: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Proxima data importante ou null' },
    explicacao:   { type: 'string', description: 'O que aconteceu nesta movimentacao em linguagem simples' },
    impacto:      { type: 'string', description: 'O que isso significa para o cliente' },
    disclaimer:   { type: 'string', description: 'Sempre: Explicacao gerada por IA — confirme com seu advogado' },
  },
  required: ['status', 'proxima_data', 'explicacao', 'impacto', 'disclaimer'],
  additionalProperties: false,
};
