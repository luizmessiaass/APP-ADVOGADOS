-- Migration 007: AI Translation support
-- Adds translation columns to movimentacoes and creates token_usage table
-- Phase 3 — Claude AI Translation Core Value Prop

-- 1. Novas colunas em movimentacoes (per D-18: PT-BR sem acentos)
ALTER TABLE movimentacoes
  ADD COLUMN IF NOT EXISTS hash_texto          TEXT,
  ADD COLUMN IF NOT EXISTS traducao_json       JSONB,
  ADD COLUMN IF NOT EXISTS traducao_status     TEXT NOT NULL DEFAULT 'pending'
    CHECK (traducao_status IN ('pending', 'processing', 'done', 'failed', 'budget_exceeded')),
  ADD COLUMN IF NOT EXISTS traducao_cache_hit  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS traduzido_em        TIMESTAMPTZ;

-- Index para lookup de deduplicacao por hash + tenant (per D-11)
-- UNIQUE por tenant — mesma movimentacao em tenants diferentes pode ter traducoes independentes
CREATE UNIQUE INDEX IF NOT EXISTS idx_movimentacoes_hash_tenant
  ON movimentacoes (hash_texto, tenant_id)
  WHERE hash_texto IS NOT NULL;

-- 2. Tabela de telemetria de tokens (per D-17)
CREATE TABLE IF NOT EXISTS token_usage (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  modelo                TEXT NOT NULL,
  input_tokens          INTEGER NOT NULL DEFAULT 0,
  output_tokens         INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens     INTEGER NOT NULL DEFAULT 0,
  cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
  job_id                TEXT,
  movimentacao_id       UUID REFERENCES movimentacoes(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index para SUM queries de budget (rolling 30d por tenant)
CREATE INDEX IF NOT EXISTS idx_token_usage_tenant_created
  ON token_usage (tenant_id, created_at DESC);

-- RLS para token_usage
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_usage_tenant_isolation" ON token_usage
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 3. Colunas em escritorios para budget por tenant (per D-14)
ALTER TABLE escritorios
  ADD COLUMN IF NOT EXISTS token_budget        INTEGER,           -- NULL = usar DEFAULT_TENANT_TOKEN_BUDGET
  ADD COLUMN IF NOT EXISTS ultimo_alerta_nivel INTEGER NOT NULL DEFAULT 0; -- 0/50/80/100

-- 4. Funcao RPC para budget query com rolling 30 dias (per Pattern 5 do RESEARCH.md)
CREATE OR REPLACE FUNCTION get_token_usage_30d(p_tenant_id UUID)
RETURNS TABLE(tokens_usados BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(
      SUM(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens),
      0
    )::BIGINT AS tokens_usados
  FROM token_usage
  WHERE
    tenant_id = p_tenant_id
    AND created_at >= (NOW() - INTERVAL '30 days');
$$;
