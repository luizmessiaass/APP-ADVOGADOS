-- Migration: 0009_billing_schema
-- Phase 7: Provider-agnostic billing infra
-- D-04: Extend status enum (grace, read_only)
-- D-06: billing_events idempotency (BILLING-04)
-- D-03: super_admin role_local (BILLING-01)

-- 1. Extend status CHECK on escritorios (replace existing constraint)
ALTER TABLE public.escritorios
  DROP CONSTRAINT escritorios_status_check,
  ADD CONSTRAINT escritorios_status_check
    CHECK (status IN ('pending', 'trial', 'active', 'grace', 'read_only', 'suspended'));

-- 2. Add grace period columns to escritorios
ALTER TABLE public.escritorios
  ADD COLUMN IF NOT EXISTS grace_period_started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS grace_banner             boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.escritorios.grace_period_started_at
  IS 'Timestamp when grace period started (Day 0). NULL means not in grace period.';
COMMENT ON COLUMN public.escritorios.grace_banner
  IS 'Set true from Day 3. App uses this flag — no need to compute days client-side.';

-- 3. Extend role_local CHECK on usuarios for super_admin (D-03)
ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_role_local_check,
  ADD CONSTRAINT usuarios_role_local_check
    CHECK (role_local IN ('admin_escritorio', 'advogado', 'cliente', 'super_admin'));

-- 4. billing_events table — idempotent webhook log (BILLING-04)
CREATE TABLE IF NOT EXISTS public.billing_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,
  event           text        NOT NULL
                              CHECK (event IN (
                                'payment.failed',
                                'payment.succeeded',
                                'grace.advanced',
                                'status.manual_change'
                              )),
  event_id        text        NOT NULL,
  provider        text,
  payload         jsonb,
  processed_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_events_event_id_unique UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS billing_events_tenant_id_idx ON public.billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS billing_events_event_idx     ON public.billing_events(event);

COMMENT ON TABLE public.billing_events
  IS 'Idempotent log of billing events. UNIQUE(event_id) makes webhook processing replay-safe.';

-- 5. RLS on billing_events
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_events_super_admin_all"
  ON public.billing_events
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

CREATE POLICY "billing_events_tenant_select"
  ON public.billing_events
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'role') IN ('admin_escritorio', 'advogado')
  );
