-- Migration: 0003_create_lgpd_consentimentos
-- Registro de consentimento LGPD por usuario, conforme D-23.
-- Suporta historico completo para auditoria ANPD.
-- D-24: versao_termos como ISO date string (ex: "2026-04-14")

CREATE TABLE public.lgpd_consentimentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  versao_termos   text NOT NULL,       -- ISO date string ex: "2026-04-14"
  consentido_em   timestamptz NOT NULL DEFAULT now(),
  ip_origem       inet,                -- inet type para validacao de IP
  user_agent      text,
  revogado_em     timestamptz,         -- NULL = consentimento ativo
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index para lookup rapido por usuario (listagem de historico)
CREATE INDEX idx_lgpd_usuario ON public.lgpd_consentimentos(usuario_id);

COMMENT ON TABLE public.lgpd_consentimentos IS 'Registro de consentimento LGPD. Historico imutavel — nunca deletar registros (exceto Art.18 hard delete).';
COMMENT ON COLUMN public.lgpd_consentimentos.versao_termos IS 'ISO date string da versao dos termos aceita. Ex: 2026-04-14';
COMMENT ON COLUMN public.lgpd_consentimentos.revogado_em IS 'NULL = consentimento ativo. Preenchido quando usuario revoga.';
