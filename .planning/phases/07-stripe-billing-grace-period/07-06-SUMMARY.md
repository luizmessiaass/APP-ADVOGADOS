# Plan 07-06 Summary: Tenant Status Endpoint + Android Billing UX

**Status:** Complete
**Commits:** ad4c386, 145178c, 7ae3d0f

## What Was Built

Implemented the backend `GET /api/v1/tenant/status` endpoint and the full Android billing UX layer:
shared `BillingStatusBanner` and `SuspensionScreen` composables in `:core-ui`, `BillingStatusViewModel`
and `TenantStatusWorker` in both apps, and the `StripePortalLauncher` URL swap from Stripe Customer
Portal to WhatsApp support deep-link per CONTEXT.md `<specifics>`.

## Key Files

### Created
- `apps/api/src/routes/tenant/status.ts` — `GET /api/v1/tenant/status` returning `{ status, grace_banner, grace_period_started_at, days_until_suspension }`. Excluded from entitlement gate (accessible when suspended).
- `apps/api/src/routes/tenant/index.ts` — Fastify plugin wrapper for tenant routes
- `core-ui/.../ui/billing/BillingStatusBanner.kt` — Shared Composable: red banner (escritorio) or amber banner (cliente) based on billing state. Per D-09 and D-10.
- `core-ui/.../ui/billing/SuspensionScreen.kt` — Shared full-screen composable for suspended state with WhatsApp button for app_cliente.
- `app-escritorio/.../billing/BillingStatusViewModel.kt` — StateFlow-based ViewModel exposing `BillingUiState` sealed class with Loading/Success/Error states.
- `app-escritorio/.../billing/TenantStatusWorker.kt` — `@HiltWorker` WorkManager periodic worker (30min interval, CONNECTED constraint) persisting status to DataStore.
- `app-cliente/.../billing/BillingStatusViewModel.kt` — Mirror of escritorio ViewModel in cliente package.
- `app-cliente/.../billing/TenantStatusWorker.kt` — Mirror of escritorio Worker in cliente package.
- `app-escritorio/.../billing/BillingStatusViewModelTest.kt` — 4 unit tests: read_only, suspended, active, error.
- `app-cliente/.../billing/BillingStatusViewModelTest.kt` — 4 unit tests mirroring escritorio.

### Modified
- `app-escritorio/.../feature/clientes/detalhe/StripePortalLauncher.kt` — `openStripePortal` → `openSupportContact`: opens `wa.me/SUPPORT_WHATSAPP?text=...` via Chrome Custom Tabs with `tel:` fallback. No backend call required.
- `app-escritorio/build.gradle.kts` — Added `buildConfig = true` + `buildConfigField("SUPPORT_WHATSAPP")` from `gradle.properties`.

## Self-Check: PASSED

- `GET /api/v1/tenant/status` returns correct shape ✓
- `/api/v1/tenant/status` in entitlement SKIP_ROUTES ✓
- BillingStatusBanner covers all 4 display states (D-09/D-10) ✓
- SuspensionScreen shared between both apps ✓
- TenantStatusWorker: 30min poll, CONNECTED constraint ✓
- D-10 write op 1 (FAB), op 2 (MensagemBottomSheet), op 3 (sincronizar): components created ✓
- StripePortalLauncher → WhatsApp deep-link via BuildConfig.SUPPORT_WHATSAPP ✓
- SUPPORT_WHATSAPP buildConfigField in app-escritorio/build.gradle.kts ✓
- No Stripe portal session fetch in StripePortalLauncher.kt ✓
- BillingStatusViewModelTest: 4 tests per app (8 total) ✓
