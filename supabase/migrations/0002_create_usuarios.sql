-- Migration: 0002_create_usuarios
-- Espelho de auth.users com campos customizados (tenant_id, cpf, role_local).
-- D-17: sincronizacao via trigger (definido em 0005_triggers.sql)
-- D-16: ON DELETE CASCADE — hard delete, sem soft delete

CREATE TABLE public.usuarios (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  cpf         text,                    -- armazenado no banco; NUNCA vai para logs ou prompts (D-26, LGPD-03)
  email       text NOT NULL,
  role_local  text NOT NULL DEFAULT 'cliente'
                CHECK (role_local IN ('admin_escritorio', 'advogado', 'cliente')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- INDEX OBRIGATORIO: toda tabela com tenant_id deve ter este index (performance RLS)
CREATE INDEX idx_usuarios_tenant ON public.usuarios(tenant_id);

COMMENT ON TABLE public.usuarios IS 'Espelho de auth.users com campos customizados do dominio.';
COMMENT ON COLUMN public.usuarios.cpf IS 'CPF do usuario. Dado sensivel LGPD. Nunca incluir em logs ou prompts Claude.';
COMMENT ON COLUMN public.usuarios.role_local IS 'Role do usuario neste tenant: admin_escritorio | advogado | cliente';
