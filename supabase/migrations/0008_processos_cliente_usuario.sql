-- Migration 0008: Add cliente_usuario_id to processos for per-client process ownership
-- Required by Phase 5 (APP-02): clients must only see their own processes
-- Also adds telefone_whatsapp to escritorios for Phase 5 WhatsApp contact feature.

-- -------------------------
-- ADD COLUMN: processos.cliente_usuario_id
-- Nullable for backwards compat with existing processos rows (advogado processos without a client).
-- FK to usuarios(id) — if the client user is deleted, set NULL (ON DELETE SET NULL).
-- -------------------------
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS cliente_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- Index for efficient per-client queries (RLS filter + GET /processos list)
CREATE INDEX IF NOT EXISTS idx_processos_cliente_usuario_id
  ON public.processos (cliente_usuario_id);

-- -------------------------
-- ADD COLUMN: escritorios.telefone_whatsapp
-- Phone number for WhatsApp contact — exposed in GET /processos/:id response.
-- Nullable: not all escritorios may configure WhatsApp.
-- -------------------------
ALTER TABLE public.escritorios
  ADD COLUMN IF NOT EXISTS telefone_whatsapp TEXT;

-- -------------------------
-- UPDATE RLS: processos for role='cliente'
-- Old policy (0006_datajud_schema.sql): "processos_tenant_isolation" applies to ALL roles
-- and only checks tenant_id — any authenticated user in the tenant can see all processos.
--
-- New policy for 'cliente' role:
-- - Must match tenant_id (unchanged — multi-tenant isolation)
-- - AND must match cliente_usuario_id = auth.uid() (new — per-client isolation)
--
-- Admin and advogado roles retain full tenant access via the existing
-- "processos_tenant_isolation" policy (PERMISSIVE — Postgres evaluates all matching
-- policies with OR logic, so clients hitting this new restrictive policy AND the
-- permissive one would still see all rows).
--
-- IMPORTANT: To make the cliente restriction effective, we need a RESTRICTIVE policy
-- for clients, OR we split the existing permissive policy by role.
-- We choose to DROP the generic permissive policy and create role-specific ones.
-- -------------------------

-- Drop the generic permissive policy created in 0006
DROP POLICY IF EXISTS "processos_tenant_isolation" ON public.processos;

-- Policy for admin_escritorio and advogado: full tenant access (unchanged behavior)
DROP POLICY IF EXISTS "processos_staff_tenant_isolation" ON public.processos;
CREATE POLICY "processos_staff_tenant_isolation" ON public.processos
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_escritorio', 'advogado')
    AND tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_escritorio', 'advogado')
    AND tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );

-- Policy for cliente role: tenant_id match AND must be assigned as owner
-- T-05-01-01 mitigation: prevents any authenticated tenant user from reading all processos
DROP POLICY IF EXISTS "clientes_select_own_processos" ON public.processos;
CREATE POLICY "clientes_select_own_processos"
  ON public.processos
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'cliente'
    AND tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (cliente_usuario_id = auth.uid())
  );

-- Service role bypass remains (created in 0006 — no change needed)
-- "processos_service_role_bypass" policy still applies to service_role.

-- ============================================================
-- DECISION NOTES
-- ============================================================
-- D-P5-01: PERMISSIVE policies in Postgres use OR logic — if a row matches ANY
--          permissive policy, it is visible. To restrict clientes, we split the
--          former generic "processos_tenant_isolation" (FOR ALL) into two policies:
--          1. "processos_staff_tenant_isolation" — admin/advogado, full tenant
--          2. "clientes_select_own_processos"   — cliente, own processos only
--          Since staff policy excludes role='cliente' in its USING clause,
--          clientes are only matched by the client-specific policy, which enforces
--          the cliente_usuario_id = auth.uid() constraint.
--
-- D-P5-02: cliente_usuario_id is nullable to preserve backwards compatibility.
--          Existing processos (created before Phase 5) have NULL cliente_usuario_id.
--          A cliente querying processos will never see these legacy rows — this is
--          intentional: admins must assign processes to clients explicitly.
-- ============================================================
