import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

// Modelo correto (per D-13, AI-08) — Haiku 3 aposentado em 19/04/2026
export const TRANSLATION_MODEL = 'claude-haiku-4-5-20251001';

// Suporte a __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Glossario carregado uma vez na inicializacao do worker (per D-03)
const glossarioPath = resolve(__dirname, 'glossario-juridico.md');
const glossario = readFileSync(glossarioPath, 'utf-8');

// System prompt generico para maximizar cache hits entre processos (per D-05)
// O conteudo variavel do processo vai SEMPRE no user turn — nunca aqui
export const SYSTEM_PROMPT_BLOCKS: Anthropic.TextBlockParam[] = [
  {
    type: 'text',
    text: `Você é um assistente especializado em traduzir movimentações processuais jurídicas do Brasil para linguagem simples e acessível para cidadãos leigos sem formação jurídica.

REGRAS OBRIGATÓRIAS:
1. Use linguagem clara, direta e sem jargão técnico.
2. Explique o que aconteceu no processo em termos que qualquer pessoa possa entender.
3. NUNCA dê conselhos jurídicos, recomendações de estratégia, prognóstico ou previsão de resultado.
4. NUNCA mencione valores financeiros específicos como sendo definitivos — use linguagem condicional.
5. SEMPRE inclua o campo "disclaimer" com o valor exato: "Explicação gerada por IA — confirme com seu advogado".
6. Use português do Brasil informal e acolhedor — como se explicasse para um amigo.
7. Para o campo "proxima_data": use texto descritivo (ex: "Audiência marcada para 20 de maio de 2026") ou null se não houver data relevante identificável.

ESTRUTURA DO OUTPUT:
Retorne sempre um JSON com os campos: status, proxima_data, explicacao, impacto, disclaimer.

${glossario}`,
    cache_control: { type: 'ephemeral' }, // Cachear instrucoes + glossario (per AI-02)
  },
];

export interface ProcessoContexto {
  numero_cnj: string;
  tipo_acao: string;
  partes_resumo: string; // Apenas resumo — sem CPF ou dados identificaveis (per D-19/LGPD-03)
}

// Delimita o texto com XML tags para isolamento de injecao (per AI-03)
// Trata tentativas de escape das tags por substituicao de '</' para neutralizar tags de fechamento
function sanitizeForXml(texto: string): string {
  // Previne que o texto injete HTML/XML que escape as tags delimitadoras
  // Abordagem: substituir '</' por '< /' para neutralizar tags de fechamento injetadas
  return texto.replace(/<\//g, '< /');
}

export function buildUserTurn(params: { texto: string; contexto: ProcessoContexto }): string {
  const textoSanitizado = sanitizeForXml(params.texto);

  return `<contexto>
Processo: ${params.contexto.numero_cnj}
Tipo de ação: ${params.contexto.tipo_acao}
Partes: ${params.contexto.partes_resumo}
</contexto>

<movimentacao>
${textoSanitizado}
</movimentacao>

Traduza esta movimentação para linguagem simples seguindo as regras do sistema. Retorne apenas o JSON.`;
}

// Validacao de cache threshold antes do deploy (per AI-02, Pitfall 1 do RESEARCH.md)
export async function validateCacheThreshold(client: Anthropic): Promise<void> {
  const HAIKU_45_MIN_CACHE_TOKENS = 4096;

  const count = await client.messages.countTokens({
    model: TRANSLATION_MODEL,
    system: SYSTEM_PROMPT_BLOCKS,
    messages: [{ role: 'user', content: 'test' }],
  });

  if (count.input_tokens < HAIKU_45_MIN_CACHE_TOKENS) {
    throw new Error(
      `System prompt tem ${count.input_tokens} tokens. ` +
      `Haiku 4.5 requer >= ${HAIKU_45_MIN_CACHE_TOKENS} tokens para ativar prompt caching. ` +
      `Expanda o glossario-juridico.md.`
    );
  }
}
