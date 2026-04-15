/**
 * Endpoint POST /api/v1/processos/:id/traducao
 * Enfileira jobs de tradução para movimentações pendentes do processo.
 * Retorna 202 Accepted imediatamente — sem esperar a Claude responder.
 * Phase 3 — AI-01, D-02.
 */
import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import type { Queue } from 'bullmq';
import type { TranslateJobData } from '../../workers/translate-movimentacao.js';

export interface TraducaoRoutesOptions {
  translateQueue: Queue<TranslateJobData>;
}

const ParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

const Response202Schema = Type.Object({
  success: Type.Literal(true),
  job_id:  Type.String(),
});

export const traducaoRoutes: FastifyPluginAsync<TraducaoRoutesOptions> = async (
  fastify,
  opts
) => {
  const { translateQueue } = opts;

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/processos/:id/traducao',
    {
      schema: {
        params: ParamsSchema,
        response: {
          202: Response202Schema,
        },
      },
    },
    async (request, reply) => {
      const { id: processo_id } = request.params;
      const tenant_id = request.user.tenant_id; // injetado pelo middleware de Phase 1

      // Buscar movimentações pendentes de tradução deste processo e tenant
      const supabase = (fastify as any).supabase ?? null;

      // Buscar movimentacoes pendentes usando supabaseAdmin via Fastify decorator
      // ou construir cliente diretamente com env vars
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: movimentacoes } = await supabaseClient
        .from('movimentacoes')
        .select('id, texto_movimentacao, hash_texto, traducao_status')
        .eq('processo_id', processo_id)
        .eq('tenant_id', tenant_id)
        .in('traducao_status', ['pending', 'failed']);

      if (!movimentacoes?.length) {
        return reply.code(202).send({ success: true, job_id: 'noop-already-translated' });
      }

      const { data: processo } = await supabaseClient
        .from('processos')
        .select('numero_cnj, tipo_acao, partes_resumo')
        .eq('id', processo_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (!processo) {
        return reply.code(202).send({ success: true, job_id: 'noop-process-not-found' });
      }

      // Enfileirar um job por movimentação pendente (per D-01)
      const jobs = await Promise.all(
        movimentacoes.map((mov) =>
          translateQueue.add(
            'translate',
            {
              tenant_id,
              movimentacao_id:    mov.id,
              texto_movimentacao: mov.texto_movimentacao,
              processo_id,
              numero_cnj:         processo.numero_cnj,
              tipo_acao:          processo.tipo_acao,
              partes_resumo:      processo.partes_resumo,
            } as TranslateJobData,
            {
              attempts: 5,
              backoff: { type: 'exponential', delay: 2000 },
              priority: 2,
            }
          )
        )
      );

      const firstJobId = jobs[0]?.id ?? 'batch';
      return reply.code(202).send({ success: true, job_id: firstJobId });
    }
  );
};
