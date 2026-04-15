/**
 * Sistema de budget de tokens por tenant.
 * Controla limites de uso da Claude API por tenant com alertas Sentry 50/80/100%.
 * Phase 3 — AI-07, D-14, D-15, D-16.
 */
import * as Sentry from '@sentry/node';
import { createClient } from '@supabase/supabase-js';

const ALERT_THRESHOLDS = [50, 80, 100] as const;
type AlertThreshold = typeof ALERT_THRESHOLDS[number];

export interface BudgetCheckResult {
  exceeded: boolean;
  percentual: number;
  tokensUsados: number;
  budget: number;
}

export async function checkTokenBudget(tenantId: string): Promise<BudgetCheckResult> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Buscar budget configurado para o tenant (per D-14)
  const { data: escritorio } = await supabase
    .from('escritorios')
    .select('token_budget')
    .eq('id', tenantId)
    .single();

  const defaultBudget = Number(process.env.DEFAULT_TENANT_TOKEN_BUDGET ?? 1_000_000);
  const budget = escritorio?.token_budget ?? defaultBudget;

  // SUM de tokens no rolling 30d via RPC (per Pattern 5 do RESEARCH.md)
  const { data } = await supabase.rpc('get_token_usage_30d', { p_tenant_id: tenantId });
  const tokensUsados = Number(data ?? 0);

  const percentual = (tokensUsados / budget) * 100;

  return {
    exceeded:    percentual >= 100,
    percentual,
    tokensUsados,
    budget,
  };
}

export async function checkAndFireAlerts(tenantId: string, percentual: number): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Buscar nivel de alerta ja disparado (per Pitfall 3 do RESEARCH.md)
  const { data: escritorio } = await supabase
    .from('escritorios')
    .select('ultimo_alerta_nivel')
    .eq('id', tenantId)
    .single();

  let ultimoNivel = escritorio?.ultimo_alerta_nivel ?? 0;

  // Deteccao automatica de novo ciclo rolling 30d:
  // Se o percentual atual esta ABAIXO do ultimo nivel disparado, o ciclo rolou
  // (ex: ultimoNivel=80 mas percentual=10 → novo mes comecou → reset)
  if (ultimoNivel > 0 && percentual < ultimoNivel) {
    await supabase
      .from('escritorios')
      .update({ ultimo_alerta_nivel: 0 })
      .eq('id', tenantId);
    ultimoNivel = 0; // Reset local para processar thresholds do novo ciclo
  }

  // Determinar o threshold mais alto que foi atingido e ainda nao disparado
  const novoNivel = ALERT_THRESHOLDS.reduce<AlertThreshold | 0>((acc, threshold) => {
    if (percentual >= threshold && threshold > ultimoNivel) return threshold;
    return acc;
  }, 0);

  if (novoNivel === 0) return; // Nenhum novo threshold cruzado

  // Disparar alerta (per D-15 — apenas para admin do produto)
  Sentry.captureMessage(
    `[Token Budget] Tenant ${tenantId}: ${novoNivel}% do budget de tokens atingido`,
    {
      level: novoNivel === 100 ? 'error' : 'warning',
      extra: {
        tenant_id:    tenantId,
        percentual:   Math.round(percentual),
        threshold:    novoNivel,
        budget_nivel: `${novoNivel}%`,
      },
      tags: {
        alert_type: 'token_budget',
        threshold:  String(novoNivel),
      },
    }
  );

  // Atualizar nivel para nao disparar novamente (per Pitfall 3)
  await supabase
    .from('escritorios')
    .update({ ultimo_alerta_nivel: novoNivel })
    .eq('id', tenantId);
}

// Reset do nivel de alerta no inicio de cada ciclo de budget (rolling 30d)
export async function resetAlertLevel(tenantId: string): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  await supabase
    .from('escritorios')
    .update({ ultimo_alerta_nivel: 0 })
    .eq('id', tenantId);
}
