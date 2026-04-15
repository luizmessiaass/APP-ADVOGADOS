-- Migration: 0004_rls_policies
-- RLS policies para isolamento multi-tenant e controle por role.
-- PATTERN CRITICO: usar (SELECT ...) para hoist do subquery — evita re-avaliacao por linha.
-- AUTH-05: RLS ativa em todas as tabelas com dados por tenant
-- AUTH-07: Roles admin_escritorio, advogado, cliente com policies distintas

-- =========================================================
-- TABELA: escritorios
-- =========================================================
ALTER TABLE public.escritorios ENABLE ROW LEVEL SECURITY;

-- Admins do escritorio podem ver e editar APENAS o seu proprio escritorio
CREATE POLICY escritorios_tenant_isolation ON public.escritorios
  FOR ALL
  USING (
    id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  )
  WITH CHECK (
    id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

-- =========================================================
-- TABELA: usuarios
-- =========================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Leitura: admin_escritorio e advogado veem todos do seu tenant;
--          cliente vee apenas a si mesmo
CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT
  USING (
    tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_escritorio', 'advogado')
      OR id = auth.uid()
    )
  );

-- Insert: apenas admin_escritorio pode criar usuarios no seu tenant
CREATE POLICY usuarios_insert ON public.usuarios
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin_escritorio'
  );

-- Update: admin_escritorio pode editar qualquer usuario do tenant;
--         usuario pode editar apenas o proprio perfil (exceto role_local)
CREATE POLICY usuarios_update ON public.usuarios
  FOR UPDATE
  USING (
    tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin_escritorio'
      OR id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

-- Delete: apenas admin_escritorio pode deletar usuarios do tenant
CREATE POLICY usuarios_delete ON public.usuarios
  FOR DELETE
  USING (
    tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin_escritorio'
  );

-- =========================================================
-- TABELA: lgpd_consentimentos
-- =========================================================
ALTER TABLE public.lgpd_consentimentos ENABLE ROW LEVEL SECURITY;

-- Cada usuario acessa apenas seus proprios consentimentos
-- admin_escritorio pode ver consentimentos de usuarios do seu tenant
CREATE POLICY lgpd_consentimentos_select ON public.lgpd_consentimentos
  FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin_escritorio'
      AND EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = lgpd_consentimentos.usuario_id
          AND u.tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
      )
    )
  );

-- Insert: usuario insere apenas seu proprio consentimento
CREATE POLICY lgpd_consentimentos_insert ON public.lgpd_consentimentos
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- Update: usuario pode revogar seu proprio consentimento (setar revogado_em)
CREATE POLICY lgpd_consentimentos_update ON public.lgpd_consentimentos
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
