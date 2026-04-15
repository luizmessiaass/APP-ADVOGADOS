-- ============================================================
-- Migration: DataJud Schema — Fase 2
-- Arquivo: 0006_datajud_schema.sql
-- Tabelas: processos, movimentacoes, sync_errors
-- Requisitos: DATAJUD-01..09 (D-09, D-19, D-20 do CONTEXT.md)
-- ============================================================

-- -------------------------
-- TABELA: processos
-- -------------------------
-- Armazena dados brutos do processo DataJud por tenant.
-- ultima_sincronizacao: atualizada SOMENTE em sync bem-sucedido (D-09).
-- tier_refresh: hot/warm/cold — reclassificado apos cada sync (D-01/D-02).
-- dados_brutos: JSONB com response raw do DataJud para Phase 3 (traducao).

CREATE TABLE IF NOT EXISTS public.processos (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,
  numero_cnj           TEXT        NOT NULL,
  tribunal             TEXT        NOT NULL,
  tier_refresh         TEXT        NOT NULL DEFAULT 'hot'
                                   CHECK (tier_refresh IN ('hot', 'warm', 'cold')),
  ultima_sincronizacao TIMESTAMPTZ,                          -- NULL = nunca sincronizado
  sincronizado         BOOLEAN     NOT NULL DEFAULT false,
  dados_brutos         JSONB,                                -- response raw DataJud
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT processos_tenant_cnj_unique UNIQUE (tenant_id, numero_cnj)
);

COMMENT ON TABLE public.processos IS 'Processos juridicos por tenant. Fonte de dados: DataJud (CNJ).';
COMMENT ON COLUMN public.processos.ultima_sincronizacao IS 'D-09: Atualizado SOMENTE em sync bem-sucedido. Base para calculo de staleness (72h).';
COMMENT ON COLUMN public.processos.tier_refresh IS 'D-01/D-02: hot/warm/cold — reclassificado apos cada sync por recencia da ultima movimentacao.';
COMMENT ON COLUMN public.processos.dados_brutos IS 'Response raw do DataJud — usado pela Phase 3 para traducao via Claude API.';

-- Index para buscas por tenant (acesso mais comum)
CREATE INDEX IF NOT EXISTS idx_processos_tenant_id ON public.processos (tenant_id);
-- Index para buscas por tier (scheduler queries do worker)
CREATE INDEX IF NOT EXISTS idx_processos_tier_refresh ON public.processos (tier_refresh);
-- Index para staleness check (ultima_sincronizacao IS NULL ou < now() - interval)
CREATE INDEX IF NOT EXISTS idx_processos_ultima_sincronizacao ON public.processos (ultima_sincronizacao);

-- Trigger updated_at (funcao update_updated_at_column() criada em 0005_triggers.sql)
CREATE TRIGGER set_processos_updated_at
  BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: isolamento total por tenant (D-19, AUTH-05)
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processos_tenant_isolation" ON public.processos
  AS PERMISSIVE FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Service role bypassa RLS (worker BullMQ usa service role key)
CREATE POLICY "processos_service_role_bypass" ON public.processos
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- -------------------------
-- TABELA: movimentacoes
-- -------------------------
-- Armazena movimentacoes individuais do processo.
-- datajud_id: campo id nativo do DataJud (movimentos[].id) — pode ser NULL em alguns tribunais.
-- hash_conteudo: fallback deterministico hash(data_hora|tipo_codigo|descricao_original).
-- UNIQUE em (processo_id, datajud_id, hash_conteudo) garante idempotencia do diff (DATAJUD-05).
-- tenant_id desnormalizado para RLS sem JOIN (performance).

CREATE TABLE IF NOT EXISTS public.movimentacoes (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id        UUID        NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  tenant_id          UUID        NOT NULL,
  datajud_id         TEXT,                                   -- movimentos[].id — nullable
  hash_conteudo      TEXT        NOT NULL,                   -- fallback dedup
  data_hora          TIMESTAMPTZ NOT NULL,
  tipo_codigo        INTEGER,                                -- tipo.nacional.id
  descricao_original TEXT        NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT movimentacoes_dedup_unique
    UNIQUE NULLS NOT DISTINCT (processo_id, datajud_id, hash_conteudo)
);

COMMENT ON TABLE public.movimentacoes IS 'Movimentacoes processuais por processo. Idempotencia garantida por UNIQUE(processo_id, datajud_id, hash_conteudo).';
COMMENT ON COLUMN public.movimentacoes.datajud_id IS 'DATAJUD-05: ID nativo do DataJud (movimentos[].id). NULL em tribunais que nao fornecem ID.';
COMMENT ON COLUMN public.movimentacoes.hash_conteudo IS 'DATAJUD-05: Fallback hash deterministico para dedup quando datajud_id e NULL.';
COMMENT ON COLUMN public.movimentacoes.tenant_id IS 'Desnormalizado de processos.tenant_id para RLS sem JOIN (performance PostgREST).';

-- Index para buscas por processo (acesso mais comum)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_processo_id ON public.movimentacoes (processo_id);
-- Index para buscas por tenant (RLS + queries do app)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tenant_id ON public.movimentacoes (tenant_id);
-- Index para ordenacao cronologica (timeline do app cliente)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_hora ON public.movimentacoes (data_hora DESC);

-- RLS: isolamento por tenant
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimentacoes_tenant_isolation" ON public.movimentacoes
  AS PERMISSIVE FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "movimentacoes_service_role_bypass" ON public.movimentacoes
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- -------------------------
-- TABELA: sync_errors
-- -------------------------
-- Registra erros de sincronizacao com contexto do processo (DATAJUD-08).
-- tipo: enum de tipos de erro — extensivel mas controlado via CHECK.
-- segredo_justica: registrado quando DataJud retorna hits=[] apos 3+ tentativas (D-05).
-- Retencao: D-20 — cron de limpeza de 90 dias (a implementar em Phase 8 hardening).

CREATE TABLE IF NOT EXISTS public.sync_errors (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID        REFERENCES public.processos(id) ON DELETE CASCADE,  -- nullable: erro pode ocorrer antes de criar processo
  tenant_id   UUID        NOT NULL,
  tipo        TEXT        NOT NULL
              CHECK (tipo IN ('rate_limit', 'timeout', 'schema_drift', 'segredo_justica', 'circuit_open', 'unknown')),
  mensagem    TEXT,
  payload     JSONB,                                          -- contexto adicional (stack trace, response body, etc.)
  tentativas  INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sync_errors IS 'Erros de sincronizacao DataJud. D-20: retencao de 90 dias (cron de limpeza na Phase 8).';
COMMENT ON COLUMN public.sync_errors.processo_id IS 'Nullable: erro pode ocorrer antes do processo ser criado no banco.';
COMMENT ON COLUMN public.sync_errors.tipo IS 'Enum controlado: rate_limit|timeout|schema_drift|segredo_justica|circuit_open|unknown.';
COMMENT ON COLUMN public.sync_errors.payload IS 'Contexto do erro: stack trace, response body DataJud, headers de rate limit, etc.';

-- Index para buscas por processo (mais comum)
CREATE INDEX IF NOT EXISTS idx_sync_errors_processo_id ON public.sync_errors (processo_id);
-- Index para buscas por tenant
CREATE INDEX IF NOT EXISTS idx_sync_errors_tenant_id ON public.sync_errors (tenant_id);
-- Index para monitoramento de tipos de erro (dashboards de observabilidade)
CREATE INDEX IF NOT EXISTS idx_sync_errors_tipo ON public.sync_errors (tipo);
-- Index para limpeza por data (cron de retencao 90 dias — D-20)
CREATE INDEX IF NOT EXISTS idx_sync_errors_created_at ON public.sync_errors (created_at);

-- RLS: isolamento por tenant
ALTER TABLE public.sync_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_errors_tenant_isolation" ON public.sync_errors
  AS PERMISSIVE FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "sync_errors_service_role_bypass" ON public.sync_errors
  AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- COMENTARIOS DE DECISAO
-- ============================================================
-- D-09: ultima_sincronizacao atualizada SOMENTE em sync bem-sucedido.
--       Staleness calculado em runtime: now() - ultima_sincronizacao > 72h = desatualizado.
--       O endpoint (Plan 05) adiciona desatualizado: true no response nesse caso.
--
-- D-05/DATAJUD-05: Idempotencia do diff garantida pelo UNIQUE em movimentacoes.
--       datajud_id = campo nativo (preferido); hash_conteudo = fallback quando datajud_id e NULL.
--       NULLS NOT DISTINCT no PostgreSQL 15+ trata NULL como igual para fins de unique constraint.
--       Supabase usa PostgreSQL 15+ por padrao — constraint compativel.
--
-- D-20: Retencao de sync_errors = 90 dias (Claude's Discretion).
--       Cron de limpeza: DELETE FROM sync_errors WHERE created_at < now() - interval '90 days';
--       Implementar como pg_cron job em Phase 8 (hardening) ou manualmente.
--
-- T-02-06: RLS usa auth.jwt() -> 'app_metadata' (nao user_metadata).
--          tenant_id em app_metadata e injetado pelo Custom Access Token Hook (Phase 1).
--          Usuario nao pode alterar app_metadata — elevacao de privilegio impossivel.
--
-- T-02-07: tenant_id desnormalizado em movimentacoes evita JOIN que poderia
--          bypassar RLS via PostgREST — isolamento garantido sem custo de JOIN.
-- ============================================================
