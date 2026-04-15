import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT_BLOCKS, TRANSLATION_MODEL, buildUserTurn, ProcessoContexto } from './translation-prompt.js';
import { validateTranslacao, Translacao, OUTPUT_JSON_SCHEMA } from './translation-schema.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export { TRANSLATION_MODEL };

export interface CallClaudeParams {
  textoMovimentacao: string;
  contexto: ProcessoContexto;
}

export interface CallClaudeResult {
  translacao: Translacao;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_creation_tokens: number;
  };
}

export async function callClaude(params: CallClaudeParams): Promise<CallClaudeResult> {
  const userTurn = buildUserTurn({ texto: params.textoMovimentacao, contexto: params.contexto });

  const response = await client.messages.create({
    model: TRANSLATION_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT_BLOCKS,
    messages: [{ role: 'user', content: userTurn }],
    // @ts-expect-error output_config is available in SDK 0.89.0 (Structured Outputs GA)
    output_config: {
      format: {
        type: 'json_schema',
        schema: OUTPUT_JSON_SCHEMA,
      },
    },
  });

  const rawText = response.content[0]?.type === 'text' ? response.content[0].text : null;
  if (!rawText) throw new Error('Claude API returned empty content block');

  const parsed = JSON.parse(rawText);
  const translacao = validateTranslacao(parsed); // lanca se invalido (per AI-04)

  return {
    translacao,
    usage: {
      input_tokens:          response.usage.input_tokens,
      output_tokens:         response.usage.output_tokens,
      cache_read_tokens:     (response.usage as any).cache_read_input_tokens ?? 0,
      cache_creation_tokens: (response.usage as any).cache_creation_input_tokens ?? 0,
    },
  };
}

export { client as anthropicClient };
