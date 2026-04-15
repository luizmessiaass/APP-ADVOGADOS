/**
 * Worker BullMQ para tradução de movimentações processuais via Claude AI.
 * Consumer do job 'translate-movimentacao' — Phase 3 (AI-01..08).
 *
 * Funcionalidades:
 * - Deduplicação por hash SHA-256 (AI-05, D-11)
 * - Verificação de budget de tokens por tenant antes de chamar Claude (AI-07, D-14)
 * - Chamada à Claude API com output schema validado (AI-01, AI-04)
 * - Telemetria de tokens por job (D-17)
 * - Logs sem PII — apenas IDs e contagens de tokens (D-20/LGPD-04)
 */
import { Worker, UnrecoverableError } from 'bullmq';
import { createHash } from 'crypto';
import type { Redis } from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { callClaude, TRANSLATION_MODEL } from '../ai/translation-service.js';
import { checkTokenBudget, checkAndFireAlerts } from '../budget/token-budget.js';

export function hashMovimentacao(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

export interface TranslateJobData {
  tenant_id: string;
  movimentacao_id: string;
  texto_movimentacao: string;
  processo_id: string;
  numero_cnj: string;
  tipo_acao: string;
  partes_resumo: string; // Sem CPF — apenas resumo (per D-19/LGPD-03)
}

export function createTranslateWorker(redisConnection: Redis) {
  return new Worker<TranslateJobData>(
    'translate-movimentacao',
    async (job) => {
      const {
        tenant_id,
        movimentacao_id,
        texto_movimentacao,
        numero_cnj,
        tipo_acao,
        partes_resumo,
      } = job.data;

      const hashTexto = hashMovimentacao(texto_movimentacao);

      // Supabase admin client (bypassa RLS — uso legítimo em workers)
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // 1. Verificar cache de hash (per D-11, AI-05)
      const { data: existente } = await supabase
        .from('movimentacoes')
        .select('id, traducao_json')
        .eq('hash_texto', hashTexto)
        .eq('tenant_id', tenant_id)
        .not('traducao_json', 'is', null)
        .maybeSingle();

      if (existente?.traducao_json) {
        // Cache hit (per D-12)
        console.log(JSON.stringify({
          level: 'info',
          movimentacao_id,
          tenant_id,
          hash_texto: hashTexto,
          translation_source: 'cache', // AI-05 — visível nos logs
        }));

        await supabase.from('movimentacoes').update({
          hash_texto:          hashTexto,
          traducao_json:       existente.traducao_json,
          traducao_status:     'done',
          traducao_cache_hit:  true,
          traduzido_em:        new Date().toISOString(),
        }).eq('id', movimentacao_id);

        return;
      }

      // 2. Verificar budget ANTES de chamar Claude (per D-14, D-16, AI-07)
      const { exceeded, percentual } = await checkTokenBudget(tenant_id);
      await checkAndFireAlerts(tenant_id, percentual);

      if (exceeded) {
        await supabase.from('movimentacoes')
          .update({ traducao_status: 'budget_exceeded' })
          .eq('id', movimentacao_id);
        throw new UnrecoverableError('TOKEN_BUDGET_EXCEEDED'); // per D-16, Pattern 4
      }

      // 3. Marcar como processando
      await supabase.from('movimentacoes')
        .update({ traducao_status: 'processing' })
        .eq('id', movimentacao_id);

      // 4. Chamar Claude (per AI-01, AI-08)
      let resultado;
      try {
        resultado = await callClaude({
          textoMovimentacao: texto_movimentacao,
          contexto: { numero_cnj, tipo_acao, partes_resumo },
        });
      } catch (err: any) {
        if (err?.status === 429) {
          // Rate limit — retry normal pelo BullMQ
          throw err;
        }
        // Outros erros da API — nao retentar
        // Log sem PII (per D-20/LGPD-04) — nunca logar texto_movimentacao
        console.error(JSON.stringify({
          level: 'error',
          movimentacao_id,
          tenant_id,
          err_message: err.message,
        }));
        throw new UnrecoverableError(`CLAUDE_API_ERROR: ${err.message}`);
      }

      // 5. Salvar traducao (per AI-04 — validateTranslacao ja foi chamado em callClaude)
      await supabase.from('movimentacoes').update({
        hash_texto:         hashTexto,
        traducao_json:      resultado.translacao,
        traducao_status:    'done',
        traducao_cache_hit: false,
        traduzido_em:       new Date().toISOString(),
      }).eq('id', movimentacao_id);

      // 6. Registrar telemetria de tokens (per D-17)
      await supabase.from('token_usage').insert({
        tenant_id,
        modelo:                TRANSLATION_MODEL, // AI-08 — visivel na telemetria
        input_tokens:          resultado.usage.input_tokens,
        output_tokens:         resultado.usage.output_tokens,
        cache_read_tokens:     resultado.usage.cache_read_tokens,
        cache_creation_tokens: resultado.usage.cache_creation_tokens,
        job_id:                job.id,
        movimentacao_id,
      });

      // 7. Log sem PII (per D-20/LGPD-04) — NUNCA logar texto da movimentacao
      console.log(JSON.stringify({
        level: 'info',
        movimentacao_id,
        tenant_id,
        hash_texto:            hashTexto,
        modelo:                TRANSLATION_MODEL,
        input_tokens:          resultado.usage.input_tokens,
        output_tokens:         resultado.usage.output_tokens,
        cache_read_tokens:     resultado.usage.cache_read_tokens,
        cache_creation_tokens: resultado.usage.cache_creation_tokens,
        translation_source:    'claude', // per D-12
      }));
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );
}
