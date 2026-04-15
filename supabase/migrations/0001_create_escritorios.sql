-- Migration: 0001_create_escritorios
-- Tabela raiz de tenants. Cada escritorio = um tenant isolado.
-- D-14: PT-BR naming, D-15: UUID PK, D-07: status enum, D-18: timestamps

CREATE TABLE public.escritorios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  email       text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'trial', 'active', 'suspended')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.escritorios IS 'Tenants da plataforma. Cada escritorio de advocacia = 1 tenant.';
COMMENT ON COLUMN public.escritorios.status IS 'pending->trial->active->suspended (aprovacao manual pelo admin do produto)';
