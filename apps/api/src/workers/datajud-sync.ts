/**
 * Step-job BullMQ para sincronização DataJud.
 * Padrão: job.updateData({ step }) persiste checkpoint no Redis.
 * Em crash/restart, job retoma do step correto sem reprocessar do zero.
 * (D-17 do CONTEXT.md, DATAJUD-07)
 *
 * Steps: INITIAL -> FETCH_DATAJUD -> DIFF_MOVIMENTACOES -> PERSIST -> CLASSIFY_TIER -> FINISH
 */
import { createHash } from 'node:crypto';
import type { Job, Queue } from 'bullmq';
import CircuitBreaker from 'opossum';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DatajudAdapterError } from '../datajud/adapter.js';
import type { DatajudMovimento, DatajudProcesso } from '../datajud/types.js';
import type { SyncJobData, SyncStep } from '../queues/datajud-queue.js';
import { calcularTier, agendarSyncProcesso } from './scheduler.js';

// Limiar para inferência de segredo de justiça (Claude's Discretion: 3 tentativas)
const SEGREDO_JUSTICA_THRESHOLD = 3;

/**
 * Gera hash determinístico de 16 chars para movimentações sem ID nativo.
 * Usado como fallback quando DataJud não retorna campo 'id' no movimento.
 * (DATAJUD-05, D-18)
 */
export function gerarHashMovimento(m: DatajudMovimento): string {
  const conteudo = `${m.data}|${m.tipo?.nacional?.id ?? ''}|${m.descricao ?? ''}`;
  return createHash('sha256').update(conteudo).digest('hex').substring(0, 16);
}

/**
 * Diff idempotente: retorna apenas movimentos ainda não persistidos.
 * Usa datajud_id (campo nativo) com fallback para hash_conteudo.
 * (DATAJUD-05, D-18)
 */
export async function diffMovimentacoes(
  supabaseAdmin: SupabaseClient,
  processoId: string,
  movimentosDatajud: DatajudMovimento[]
): Promise<DatajudMovimento[]> {
  if (movimentosDatajud.length === 0) return [];

  const { data: existentes, error } = await supabaseAdmin
    .from('movimentacoes')
    .select('datajud_id, hash_conteudo')
    .eq('processo_id', processoId);

  if (error) throw new Error(`Erro ao buscar movimentações existentes: ${error.message}`);

  const idsExistentes = new Set(
    (existentes ?? []).map((m: { datajud_id: string | null; hash_conteudo: string }) =>
      m.datajud_id ?? m.hash_conteudo
    )
  );

  return movimentosDatajud.filter(m => {
    const id = m.id ?? gerarHashMovimento(m);
    return !idsExistentes.has(id);
  });
}

/**
 * Processador principal do job de sync DataJud.
 * Deve ser passado para o BullMQ Worker como handler.
 * O breaker deve ser criado em torno de adapter.buscarProcesso.bind(adapter).
 */
export async function processarSyncJob(
  job: Job<SyncJobData>,
  supabaseAdmin: SupabaseClient,
  datajudQueue: Queue<SyncJobData>,
  breaker: CircuitBreaker
): Promise<void> {
  let step = (job.data.step ?? 'INITIAL') as SyncStep;
  const { processoId, numeroCNJ, tenantId } = job.data;

  try {
    while (step !== 'FINISH') {
      switch (step) {
        case 'INITIAL': {
          await job.updateData({ ...job.data, step: 'FETCH_DATAJUD' });
          step = 'FETCH_DATAJUD';
          break;
        }

        case 'FETCH_DATAJUD': {
          // Executar chamada DataJud via circuit breaker
          let dadosDatajud: DatajudProcesso | null = null;

          try {
            dadosDatajud = (await breaker.fire(numeroCNJ)) as DatajudProcesso | null;
          } catch (err) {
            // OpenCircuitError é lançado pelo opossum quando o circuito está aberto
            if ((err as Error).name === 'OpenCircuitError') {
              await gravarSyncError(
                supabaseAdmin,
                processoId,
                tenantId,
                'circuit_open',
                'Circuit breaker DataJud aberto — sync suspenso'
              );
              step = 'FINISH';
              await job.updateData({ ...job.data, step });
              break;
            }
            throw err; // re-lançar para BullMQ registrar como falha e aplicar retry
          }

          if (dadosDatajud === null) {
            // hits=[] — processo não encontrado ou segredo de justiça
            const tentativas = (job.data.tentativasHitsVazio ?? 0) + 1;
            await job.updateData({ ...job.data, tentativasHitsVazio: tentativas, step: 'FINISH' });

            if (tentativas >= SEGREDO_JUSTICA_THRESHOLD) {
              await gravarSyncError(
                supabaseAdmin,
                processoId,
                tenantId,
                'segredo_justica',
                `DataJud retornou hits=[] por ${tentativas} tentativas consecutivas — possível segredo de justiça (D-03/D-05)`
              );
            }
            step = 'FINISH';
          } else {
            await job.updateData({ ...job.data, dadosDatajud, step: 'DIFF_MOVIMENTACOES' });
            step = 'DIFF_MOVIMENTACOES';
          }
          break;
        }

        case 'DIFF_MOVIMENTACOES': {
          const dados = job.data.dadosDatajud as DatajudProcesso;
          const novas = await diffMovimentacoes(supabaseAdmin, processoId, dados.movimentos ?? []);
          await job.updateData({
            ...job.data,
            novasMovimentacoesCount: novas.length,
            // Salvar apenas IDs/hashes das novas, não o payload completo (economia de memória Redis)
            novasMovimentacoesIds: novas.map(m => m.id ?? gerarHashMovimento(m)),
            step: 'PERSIST',
          });
          step = 'PERSIST';
          break;
        }

        case 'PERSIST': {
          const dados = job.data.dadosDatajud as DatajudProcesso;
          const novasMovimentacoesIds = new Set(
            (job.data.novasMovimentacoesIds ?? [])
          );

          const novas = (dados.movimentos ?? []).filter(m => {
            const id = m.id ?? gerarHashMovimento(m);
            return novasMovimentacoesIds.has(id);
          });

          if (novas.length > 0) {
            const rows = novas.map(m => ({
              processo_id: processoId,
              tenant_id: tenantId,
              datajud_id: m.id ?? null,
              hash_conteudo: gerarHashMovimento(m),
              data_hora: m.data,
              tipo_codigo: m.tipo?.nacional?.id ?? null,
              descricao_original: m.descricao ?? '',
            }));

            const { error } = await supabaseAdmin
              .from('movimentacoes')
              .insert(rows);

            // ON CONFLICT DO NOTHING — idempotência extra além do diff
            // Ignorar erros de duplicata; re-lançar outros
            if (error && !error.message.includes('duplicate')) {
              throw new Error(`Erro ao inserir movimentações: ${error.message}`);
            }
          }

          // Determinar última movimentação para reclassificação de tier
          const ultimaMovimentacaoAt = novas.length > 0
            ? new Date(novas[novas.length - 1].data)
            : null;

          // Atualizar ultima_sincronizacao SOMENTE em sync bem-sucedido (D-09)
          await supabaseAdmin
            .from('processos')
            .update({
              ultima_sincronizacao: new Date().toISOString(),
              sincronizado: true,
              dados_brutos: dados,
              updated_at: new Date().toISOString(),
            })
            .eq('id', processoId)
            .eq('tenant_id', tenantId);

          await job.updateData({
            ...job.data,
            ultimaMovimentacaoIso: ultimaMovimentacaoAt?.toISOString() ?? null,
            step: 'CLASSIFY_TIER',
          });
          step = 'CLASSIFY_TIER';
          break;
        }

        case 'CLASSIFY_TIER': {
          const ultimaMovAt = job.data.ultimaMovimentacaoIso
            ? new Date(job.data.ultimaMovimentacaoIso)
            : null;

          const novoTier = calcularTier(ultimaMovAt);

          // Atualizar tier no banco
          await supabaseAdmin
            .from('processos')
            .update({ tier_refresh: novoTier, updated_at: new Date().toISOString() })
            .eq('id', processoId);

          // Reagendar com novo tier (upsertJobScheduler é idempotente — D-01/D-02)
          await agendarSyncProcesso(datajudQueue, processoId, numeroCNJ, tenantId, novoTier);

          await job.updateData({ ...job.data, step: 'FINISH' });
          step = 'FINISH';
          break;
        }

        default: {
          // Estado inválido — finalizar para não travar em loop
          step = 'FINISH';
          break;
        }
      }
    }
  } catch (err) {
    // Registrar erro em sync_errors com contexto (DATAJUD-08)
    const tipo = err instanceof DatajudAdapterError ? err.tipo : 'unknown';
    await gravarSyncError(
      supabaseAdmin,
      processoId,
      tenantId,
      tipo as SyncErrorTipo,
      (err as Error).message,
      { jobId: job.id, step, stack: (err as Error).stack?.substring(0, 500) }
    );
    throw err; // re-lançar para BullMQ aplicar retry policy (D-03)
  }
}

type SyncErrorTipo =
  | 'rate_limit'
  | 'timeout'
  | 'schema_drift'
  | 'segredo_justica'
  | 'circuit_open'
  | 'unknown';

async function gravarSyncError(
  supabaseAdmin: SupabaseClient,
  processoId: string,
  tenantId: string,
  tipo: SyncErrorTipo,
  mensagem: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin.from('sync_errors').insert({
      processo_id: processoId,
      tenant_id: tenantId,
      tipo,
      mensagem,
      payload: payload ?? null,
    });
  } catch {
    // Não bloquear o worker se o registro de erro falhar — logar via pino em produção
  }
}
