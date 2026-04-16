---
phase: 07-stripe-billing-grace-period
reviewed: 2026-04-16T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - apps/api/src/routes/tenant/status.ts
  - apps/api/src/config.ts
  - apps/api/src/server.ts
  - apps/worker/src/queues/grace-period.ts
  - apps/worker/src/workers/grace-period-check.ts
  - apps/worker/src/workers/grace-period-check.test.ts
  - apps/worker/src/services/grace-period.ts
  - apps/worker/src/services/grace-period.test.ts
  - apps/worker/src/worker.ts
  - apps/worker/package.json
  - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/billing/BillingStatusBanner.kt
  - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/billing/SuspensionScreen.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/billing/BillingStatusViewModel.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/billing/TenantStatusWorker.kt
  - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/billing/BillingStatusViewModel.kt
  - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/billing/TenantStatusWorker.kt
  - app-cliente/src/test/java/com/aethixdigital/portaljuridico/cliente/billing/BillingStatusViewModelTest.kt
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-04-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

This phase implements the Stripe billing grace period system: a server-side BullMQ cron worker that drives tenant state transitions (grace → read_only → suspended), a Fastify REST endpoint for tenant status polling, and Android-side components (WorkManager poller, ViewModel, UI banner and suspension screen) in both `app-escritorio` and `app-cliente`.

The pure state machine (`gracePeriodStateTransition`) is well-structured and well-tested. The idempotency guard for emails (checking `billing_events` before sending) is a solid design. The Android ViewModel and banner composable are clean.

Two critical issues were found: the tenant status API route is never mounted in `server.ts`, meaning the endpoint is entirely unreachable in production; and the `RESEND_API_KEY` defaults to an empty string in the worker config, allowing the worker to silently start and attempt email sends without a valid key. Four warnings and three info items are documented below.

---

## Critical Issues

### CR-01: Tenant status route is never registered in the API server

**File:** `apps/api/src/server.ts:74` / `apps/api/src/routes/tenant/index.ts`

**Issue:** `tenantRoutes` is defined and exported from `apps/api/src/routes/tenant/index.ts`, but it is never imported or registered in `server.ts`. The `buildApp` function only registers `authRoutes` and `lgpdRoutes`. As a result, `GET /api/v1/tenant/status` does not exist at runtime — all Android polling will receive 404 responses and the entire billing status feature is broken end-to-end.

**Fix:**
```typescript
// apps/api/src/server.ts — add import
import { tenantRoutes } from './routes/tenant/index.js'

// Inside buildApp(), after the lgpd registration:
app.register(lgpdRoutes, { prefix: '/api/v1/lgpd' })
app.register(tenantRoutes, { prefix: '/api/v1/tenant' })  // ADD THIS LINE
```

---

### CR-02: RESEND_API_KEY defaults to empty string — email sends will silently fail in production

**File:** `apps/worker/src/config.ts:9`

**Issue:** `RESEND_API_KEY` is declared with `default: ''`, so if the environment variable is missing the worker starts normally, creates a `new Resend('')` instance, and every email send returns an error that is only logged as a warning. There is no startup-time guard. In a misconfigured deployment all email notifications are silently dropped while the status transitions still execute, leaving tenants in grace/read_only/suspended with no email communication.

**Fix:**
```typescript
// apps/worker/src/config.ts
RESEND_API_KEY: str(),           // remove default — fail at startup if missing
RESEND_FROM_EMAIL: str({ default: 'Portal Juridico <noreply@portaljuridico.com.br>' }),
```

`envalid` will throw `EnvVarError` at startup if `RESEND_API_KEY` is absent, which is the correct fail-fast behavior consistent with how `SUPABASE_SERVICE_ROLE_KEY` is treated.

---

## Warnings

### WR-01: grace-period-check worker uses `continue` inside a `for...of` that is inside a `for...of` — email skip may silently skip the logBillingEvent call

**File:** `apps/worker/src/workers/grace-period-check.ts:252-256`

**Issue:** When `alreadySent` is `true`, the code executes `continue` on line 253. However, `continue` here exits the **inner** `for (const action of actions)` loop, not the outer tenant loop. This is structurally correct in isolation, but the ordering of operations around it creates a logic hazard: `logBillingEvent` (line 255) is called **after** the idempotency check but only when `alreadySent` is `false`. If `logBillingEvent` fails (line 141 logs a warning but does not throw), the next daily run will call `alreadySentEmail` again, find no event, and attempt to send the email a second time. The idempotency relies on a write (`billing_events.insert`) that can silently fail — this is documented as accepted risk, but the code does not log a structured warning that explicitly flags the idempotency gap when the insert fails.

**Fix:** After `logBillingEvent`, check whether the insert succeeded before calling `sendGracePeriodEmail`. If it did not, skip the send and emit a warning that idempotency could not be guaranteed:
```typescript
const eventLogged = await logBillingEvent(tenant.id, daysSinceStart, stageKey)
if (!eventLogged) {
  logger.warn(
    { tenant_id: tenant.id, stageKey },
    '[grace-period] billing_event insert falhou — email nao enviado para preservar idempotencia'
  )
  continue
}
await sendGracePeriodEmail(tenant.id, action.template)
```
This requires `logBillingEvent` to return `boolean`.

---

### WR-02: TenantStatusWorker does not stale/clear DAYS_UNTIL_SUSPENSION_KEY when server returns null

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/billing/TenantStatusWorker.kt:50`
**File:** `app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/billing/TenantStatusWorker.kt:41`

**Issue:** When `status.daysUntilSuspension` is `null` (tenant is `active`), the DataStore key `DAYS_UNTIL_SUSPENSION_KEY` is left unchanged from its previous value. If the tenant was previously in grace/read_only and has since paid (transitioning back to `active`), the stale `daysUntilSuspension` value persists in DataStore. The ViewModel reads this key on next launch and could display a countdown banner for an active tenant.

**Fix:** Always write the key explicitly, using a sentinel value or removing it:
```kotlin
applicationContext.dataStore.edit { prefs ->
    prefs[BILLING_STATUS_KEY] = status.status
    prefs[GRACE_BANNER_KEY] = status.graceBanner
    if (status.daysUntilSuspension != null) {
        prefs[DAYS_UNTIL_SUSPENSION_KEY] = status.daysUntilSuspension
    } else {
        prefs.remove(DAYS_UNTIL_SUSPENSION_KEY)  // clear stale value
    }
}
```

---

### WR-03: gracePeriodStateTransition does not emit set_grace_banner(false) when transitioning to read_only or suspended

**File:** `apps/worker/src/services/grace-period.ts:47-53`

**Issue:** When `daysSinceStart >= 7`, the function returns `[set_status(read_only), send_email(day_7)]` with no action to clear `grace_banner`. Equally, at day 14 it returns `[set_status(suspended), send_email(day_14)]` without clearing `grace_banner`. The `grace_banner` column is left `true` in the database for suspended tenants. Downstream, `BillingStatusBanner` uses `status == "suspended"` as its first branch, so the banner rendering is not directly broken — but the `grace_banner` flag left dirty in the database is misleading and may cause issues if any other consumer relies on it independently.

**Fix:** Add a `set_grace_banner(false)` action when transitioning out of the grace window:
```typescript
// Day 7
if (daysSinceStart >= 7) {
  if (status !== 'read_only' && status !== 'suspended') {
    actions.push({ type: 'set_status', value: 'read_only' })
    actions.push({ type: 'set_grace_banner', value: false })  // ADD
    actions.push({ type: 'send_email', template: 'day_7' })
  }
  return actions
}
```

---

### WR-04: grace-period-check.test.ts fourth test queries tenants with `status: 'suspended'` but the worker only queries `['grace', 'read_only']`

**File:** `apps/worker/src/workers/grace-period-check.test.ts:172-205`

**Issue:** The test "nao processa tenant ja em suspended (idempotente)" mocks a tenant with `status: 'suspended'` being returned by the `escritorios.select(...).in('status', [...])` call. In production, the query filters `.in('status', ['grace', 'read_only'])`, so a `suspended` tenant would never be returned in the first place. The test is verifying a condition that cannot occur in production, giving false confidence. The `gracePeriodStateTransition` guard for the `suspended` case is still exercised by `grace-period.test.ts`, so the logic is covered — but this worker test is misleading.

**Fix:** Change the mock to return a tenant that *is* in the query scope but already fully idempotent — e.g., a `grace` tenant at day 3 with `grace_banner: true` — to test the "no actions needed" path correctly:
```typescript
// Replace status: 'suspended' with a legitimately idempotent case
status: 'grace',
grace_banner: true,           // already set → set_grace_banner not emitted
grace_period_started_at: threeDaysAgo,
```

---

## Info

### IN-01: Intentional code duplication between worker and API is undocumented at the file level for the API copy

**File:** `apps/worker/src/services/grace-period.ts:1-3`

**Issue:** The worker's copy of `grace-period.ts` carries a clear duplication notice at lines 1-3. The corresponding API-side file (`apps/api/src/services/billing/grace-period.ts`, not in review scope but referenced) presumably does not have the same notice pointing back to the worker. If a developer edits only one copy, the two implementations diverge silently. The comment structure is good but one-directional.

**Fix:** Ensure the API-side copy has an identical duplication notice pointing to the worker path. Consider adding a lint rule or test that asserts both files have identical exports (e.g., a snapshot test comparing the two ASTs or function signatures).

---

### IN-02: BillingStatusBanner uses a hardcoded hex color instead of a theme token for the amber/warning state

**File:** `core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/billing/BillingStatusBanner.kt:55`

**Issue:** `Color(0xFFFF8F00)` is used directly for the amber warning color shown to `app-cliente` users when `graceBanner && !isEscritorioApp`. This bypasses the Material3 color system and will not adapt if the app's theme changes. There is no corresponding token in the design system for a "warning" surface color.

**Fix:** Define a semantic color token (e.g., `WarningContainer`) in the `PortalJuridicoTheme` color scheme and use `MaterialTheme.colorScheme.warningContainer` here. If the design system does not yet have a warning color, at minimum move the hex constant to a named top-level val in `Color.kt`:
```kotlin
// Color.kt
val AmberWarning = Color(0xFFFF8F00)

// BillingStatusBanner.kt
graceBanner && !isEscritorioApp -> Pair(AmberWarning, "Escritório com pagamento pendente...")
```

---

### IN-03: TenantStatusWorker import `kotlinx.coroutines.flow.first` is unused in the escritorio variant

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/billing/TenantStatusWorker.kt:13`

**Issue:** `import kotlinx.coroutines.flow.first` is listed in the imports but is not referenced anywhere in the file. The `app-cliente` variant correctly does not import it. This is a dead import that will generate an "Unused import directive" warning in the IDE.

**Fix:** Remove the unused import:
```kotlin
// Delete this line from app-escritorio TenantStatusWorker.kt:
import kotlinx.coroutines.flow.first
```

---

_Reviewed: 2026-04-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
