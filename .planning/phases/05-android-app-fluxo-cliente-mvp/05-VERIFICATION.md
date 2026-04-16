---
phase: 05-android-app-fluxo-cliente-mvp
verified: 2026-04-16T20:00:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "PortalJuridicoTheme uses #1A56DB primary color with dynamicColor=false"
    reason: "Primary color changed to #041631 (Editorial Juris navy) via quick task 260416-jt1 — intentional brand decision accepted by developer"
    accepted_by: "developer"
    accepted_at: "2026-04-16T20:00:00Z"
re_verification:
  previous_status: gaps_found
  previous_score: 6/9
  gaps_closed:
    - "ClienteNavGraph now imports from features/processos/ (real ViewModels) instead of features/processo/ (static mocks)"
    - "ProcessoListScreen(navController) and ProcessoDetailScreen(processoId, navController) signatures match real implementations"
    - "Static mock screens in features/processo/ no longer wired into active NavGraph"
    - "Primary color override accepted as intentional brand decision"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "App login flow with real credentials"
    expected: "After login, app navigates to ProcessoList showing the user's actual processes from the API — not hardcoded mock data"
    why_human: "Requires Android device/emulator, real Supabase JWT, and network access to verify RLS filters correctly and real data flows end-to-end"
  - test: "Onboarding + LGPD gate (first-open, fresh install)"
    expected: "4 onboarding pages appear in sequence (no 'Pular' button), after 'Começar' the LGPD screen appears, 'Aceitar' button remains disabled until scroll-to-bottom AND checkbox checked, after accepting the process list appears with real data"
    why_human: "derivedStateOf scroll detection requires physical scroll interaction on a device; HorizontalPager page transitions need instrumented test runner"
  - test: "WhatsApp FAB in process detail"
    expected: "Tapping 'Falar com meu advogado' opens WhatsApp with the phone number from the escritório (whatsapp://send?phone=); on a device without WhatsApp, the phone dialer opens (tel: fallback)"
    why_human: "Deep-link behavior requires physical device with WhatsApp installed and a process that has telefone_whatsapp populated in the escritorios table"
---

# Phase 5: app_cliente (End-user MVP) Verification Report

**Phase Goal:** Deliver the complete Android client app MVP — a working APK the client installs to see their legal processes explained in plain Portuguese, with login, onboarding, LGPD consent, process list, and process detail screens.
**Verified:** 2026-04-16T20:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (NavGraph wiring fix applied)

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A cliente logs in and sees a list of their own processes, nothing from other tenants leaking | ✓ VERIFIED | ClienteNavGraph now imports `ProcessoListScreen` from `features.processos` (line 11). Screen uses `hiltViewModel()` + `ProcessoListViewModel` + `ProcessoRepository.getProcessos()`. Backend RLS: `clientes_select_own_processos` policy enforces `AND (cliente_usuario_id = auth.uid())`. No static mock data path. |
| 2 | Opening a process shows: plain-language status, translated timeline, next important date, cadastral data with plain-language labels | ✓ VERIFIED | ClienteNavGraph imports `ProcessoDetailScreen` from `features.processos` (line 10). Screen has: `ProcessoStatusCard`, `ProximaDataCard`, `stickyHeader` timeline, `DadosCadastraisSection` with `AnimatedVisibility`, all using `ProcessoDetailViewModel` + real API. |
| 3 | "Última sincronização há X horas" visible; "sem movimentação" renders reassuring message | ✓ VERIFIED | `SyncLabelFormatter` is imported in `ProcessoDetailScreen.kt` (line 45). `EmptyTimelineCard` composable exists and is called when `hasEmptyTimeline=true`. Both are now reachable through the active NavGraph. |
| 4 | 4-screen onboarding (no skip), LGPD consent gate accepted before process data shown, no AI disclaimers | ✓ VERIFIED | `OnboardingScreen`: 4 pages with D-09 content, `BackHandler` no-op on page 0, no "Pular". `LgpdConsentScreen`: `derivedStateOf` scroll detection, checkbox with `testTag("lgpd_checkbox")`, `AlertDialog` with exact copy. `SplashViewModel` gates `LGPD_CONSENT` before `PROCESSO_LIST`. No "Explicação gerada por IA" found in app-cliente. |
| 5 | "Falar com meu advogado" button opens WhatsApp deep-link; CI runs lint + unit tests on every commit | ✓ VERIFIED | `ExtendedFloatingActionButton` + `abrirWhatsApp()` with `whatsapp://send?phone=` + `tel:` fallback in `features/processos/ProcessoDetailScreen.kt` — now reachable via NavGraph. CI: `build-app-cliente` job runs `lintDemoDebug`, `test`, `assembleDemoDebug` as separate steps on push/PR to main/master. |

**Score:** 5/5 roadmap truths verified

### Plan Must-Have Truths Verified

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/v1/processos returns only processes where cliente_usuario_id = auth.uid() | ✓ VERIFIED | `0008_processos_cliente_usuario.sql`: `clientes_select_own_processos` policy with `AND (cliente_usuario_id = auth.uid())` |
| 2 | GET /api/v1/processos/:id/movimentacoes returns rows including translated fields: status, explicacao, proxima_data, impacto | ✓ VERIFIED | `apps/api/src/routes/processos/movimentacoes.ts`: selects all 4 fields, ordered `data_hora DESC` |
| 3 | GET /api/v1/processos/:id response includes telefone_whatsapp from escritório row | ✓ VERIFIED | `processos.ts`: `.select('*, escritorios(telefone_whatsapp)')` with null-coalescing in response |
| 4 | RLS policy for role=cliente includes AND (cliente_usuario_id = auth.uid()) | ✓ VERIFIED | Migration 0008 confirmed; role-split approach (PERMISSIVE by role) is correct |
| 5 | movimentacoesRoutes registered in Fastify entry point | ✓ VERIFIED | `apps/api/src/server.ts` line 139: `app.register(movimentacoesRoutes, { prefix: '/api/v1/processos' })` |
| 6 | A cliente can navigate to screens based on DataStore flags | ✓ VERIFIED | `SplashViewModel` reads `TOKEN_KEY`, `ONBOARDING_SEEN_KEY`, `LGPD_ACCEPTED_KEY`; `initialValue=null`; routes correctly |
| 7 | ClienteNavGraph has routes: login, onboarding, lgpd_consent, processo_list, processo_detail | ✓ VERIFIED | All 5 required routes wired to real screen implementations; no `TODO()` stubs; extra `WELCOME` route is additive |
| 8 | SplashViewModel reads 3 DataStore flags and computes startDestination | ✓ VERIFIED | `SplashViewModel.kt`: `token=null → LOGIN`, `!onboardingSeen → ONBOARDING`, `!lgpdAccepted → LGPD_CONSENT`, `else → PROCESSO_LIST` |
| 9 | PortalJuridicoTheme uses #1A56DB primary color with dynamicColor=false | PASSED (override) | Override: `#041631` (Editorial Juris navy) is the accepted brand color. `dynamicColor=false` is correct. Override accepted per developer instruction. |

**Score:** 9/9 must-haves verified (1 via accepted override)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0008_processos_cliente_usuario.sql` | ADD COLUMN + RLS split + telefone_whatsapp | ✓ VERIFIED | EXISTS, correct SQL, role-split policies |
| `apps/api/src/routes/processos.ts` | GET /api/v1/processos list + telefone_whatsapp enrichment | ✓ VERIFIED | List and detail endpoints confirmed |
| `apps/api/src/routes/processos/movimentacoes.ts` | GET movimentacoes with 4 translated fields | ✓ VERIFIED | All 4 fields + 404 on RLS block |
| `apps/api/src/server.ts` | movimentacoesRoutes registered | ✓ VERIFIED | Line 139 |
| `gradle/libs.versions.toml` | navigation-compose, retrofit, datastore | ✓ VERIFIED | All entries present |
| `app-cliente/build.gradle.kts` | libs.navigation.compose + isMinifyEnabled=true | ✓ VERIFIED | Both confirmed |
| `core-ui/.../ui/theme/Color.kt` | Primary color + palette | PASSED (override) | EjPrimary = #041631 — accepted brand deviation |
| `core-ui/.../ui/theme/Theme.kt` | PortalJuridicoTheme dynamicColor=false | ✓ VERIFIED | Function exists, dynamicColor=false |
| `core-ui/.../ui/components/` (8 components) | All 8 @Composable components | ✓ VERIFIED | All 8 exist: ProcessoStatusCard, ProximaDataCard, MovimentacaoCard, ExpandableText, ProcessoListCard, SkeletonCard, EmptyStateView, PagerDots |
| `app-cliente/.../navigation/ClienteNavGraph.kt` | NavHost with 5+ routes wired to real screens | ✓ VERIFIED | Imports from `features.processos` (lines 10-11). `ProcessoListScreen(navController)` and `ProcessoDetailScreen(processoId, navController)` called with matching signatures. No `TODO()` stubs. |
| `app-cliente/.../features/auth/SplashViewModel.kt` | startDestination StateFlow<String?> | ✓ VERIFIED | initialValue=null, 3 DataStore flags |
| `app-cliente/.../features/auth/LoginScreen.kt` | Email+password, loading, error text | ✓ VERIFIED | Full implementation with JWT role check |
| `app-cliente/.../features/processos/ProcessoListScreen.kt` | 4 states, hiltViewModel, real ViewModel | ✓ VERIFIED | Uses `hiltViewModel()`, `ProcessoListViewModel`, `collectAsState()` — active in NavGraph |
| `app-cliente/.../features/processos/ProcessoDetailScreen.kt` | Single LazyColumn, stickyHeader, FAB, EmptyTimelineCard | ✓ VERIFIED | `hiltViewModel()`, `loadProcessoDetail()`, `SyncLabelFormatter`, `ExtendedFloatingActionButton`, `EmptyTimelineCard` — active in NavGraph |
| `app-cliente/.../features/onboarding/OnboardingScreen.kt` | 4 pages, no skip, BackHandler | ✓ VERIFIED | 4 pages D-09 content, BackHandler, no "Pular" |
| `app-cliente/.../features/lgpd/LgpdConsentScreen.kt` | derivedStateOf scroll, checkbox, AlertDialog | ✓ VERIFIED | All features present |
| `app-cliente/.../features/lgpd/LgpdConsentViewModel.kt` | POST consentimento, LGPD_ACCEPTED_KEY | ✓ VERIFIED | Confirmed |
| `app-cliente/src/main/AndroidManifest.xml` | queries for com.whatsapp | ✓ VERIFIED | Both com.whatsapp and com.whatsapp.w4b |
| `core-common/.../util/SyncLabelFormatter.kt` | format() for all time ranges | ✓ VERIFIED | All 4 ranges handled |
| `app-cliente/src/androidTest/.../HiltTestRunner.kt` | HiltTestApplication | ✓ VERIFIED | In androidTest; testInstrumentationRunner references it |
| `app-cliente/src/androidTest/.../ProcessoDetailScreenEmptyTest.kt` | Tests EmptyTimelineCard (APP-08) | ✓ VERIFIED | Tests 3 phrases of reassuring card |
| `app-cliente/src/androidTest/.../ProcessoListScreenTest.kt` | Tests error state + retry | ✓ VERIFIED | Tests EmptyStateView directly |
| `.github/workflows/android-ci.yml` | lint + test + assemble for app-cliente | ✓ VERIFIED | 3 separate `run:` commands, JDK 17 temurin, Gradle cache |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ClienteNavGraph → ProcessoListScreen | Real ViewModel-backed screen | import features.processos | ✓ WIRED | Line 11: `import …features.processos.ProcessoListScreen`; line 39: `ProcessoListScreen(navController)` |
| ClienteNavGraph → ProcessoDetailScreen | Real ViewModel-backed screen | import features.processos | ✓ WIRED | Line 10: `import …features.processos.ProcessoDetailScreen`; lines 43-46: `ProcessoDetailScreen(processoId, navController)` |
| ProcessoListScreen → ProcessoListViewModel | hiltViewModel() + StateFlow | Hilt injection + collectAsState | ✓ WIRED | `viewModel: ProcessoListViewModel = hiltViewModel()` at line 35 |
| ProcessoListViewModel → ProcessoRepository | getProcessos() | Hilt @Inject | ✓ WIRED | Line 36 of ProcessoListViewModel.kt: `processoRepository.getProcessos()` |
| ProcessoDetailScreen → ProcessoDetailViewModel | hiltViewModel() + loadProcessoDetail | Hilt injection | ✓ WIRED | Line 63: `viewModel.loadProcessoDetail(processoId)` in LaunchedEffect |
| ProcessoDetailScreen → whatsapp://send | abrirWhatsApp() + ExtendedFAB | Intent | ✓ WIRED | ExtendedFAB in ProcessoDetailScreen.kt (features/processos/) — now active in NavGraph |
| LgpdConsentScreen → POST /api/v1/lgpd/consentimento | LgpdConsentViewModel.acceptConsent() | clienteApi.postConsentimento | ✓ WIRED | Confirmed |
| SplashViewModel → DataStore | 3 flag keys | clienteDataStore.data.map | ✓ WIRED | Confirmed |
| apps/api/src/server.ts → movimentacoesRoutes | Registration with prefix | fastify.register | ✓ WIRED | server.ts line 139 |
| supabase processos RLS → cliente_usuario_id | clientes_select_own_processos policy | PostgreSQL USING clause | ✓ WIRED | Migration 0008 confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| features/processos/ProcessoListScreen.kt (ACTIVE) | uiState (StateFlow) | ProcessoListViewModel → ProcessoRepository → ClienteApi → Supabase | Yes | ✓ FLOWING |
| features/processos/ProcessoDetailScreen.kt (ACTIVE) | uiState (StateFlow) | ProcessoDetailViewModel → ProcessoRepository → GET /processos/:id + /movimentacoes | Yes | ✓ FLOWING |
| features/processo/ProcessoListScreen.kt (ORPHANED, no longer wired) | processosMock | hardcoded val | No | Not reachable — no impact on users |
| features/processo/ProcessoDetailScreen.kt (ORPHANED, no longer wired) | hardcoded strings | literals | No | Not reachable — no impact on users |

### Behavioral Spot-Checks

| Behavior | Result | Status |
|----------|--------|--------|
| NavGraph imports from features.processos (not features.processo) | Lines 10-11 of ClienteNavGraph.kt confirm correct package | ✓ PASS |
| No TODO() stubs in ClienteNavGraph | grep returns empty | ✓ PASS |
| ProcessoListScreen signature matches NavGraph call | `fun ProcessoListScreen(navController: NavController, viewModel = hiltViewModel())` — called as `ProcessoListScreen(navController = navController)` | ✓ PASS |
| ProcessoDetailScreen signature matches NavGraph call | `fun ProcessoDetailScreen(processoId: String, navController: NavController, viewModel = hiltViewModel())` — called as `ProcessoDetailScreen(processoId = processoId, navController = navController)` | ✓ PASS |
| hiltViewModel() used in both screens (not static data) | Confirmed in both ProcessoListScreen.kt and ProcessoDetailScreen.kt | ✓ PASS |
| movimentacoesRoutes reachable from app entry | Registered at prefix /api/v1/processos in server.ts | ✓ PASS |
| No AI disclaimer in app | No "Explicação gerada por IA" found in app-cliente/src/main/ | ✓ PASS (D-06 honored) |
| CI workflow has lint + test + assemble | android-ci.yml build-app-cliente job confirmed | ✓ PASS |

### Requirements Coverage

| Requirement | Description | Source Plans | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| APP-01 | Cliente login com email/senha | 05-02 | ✓ SATISFIED | LoginScreen + LoginViewModel with JWT role check |
| APP-02 | Tela inicial lista processos vinculados ao CPF | 05-01, 05-03 | ✓ SATISFIED | ProcessoListScreen (processos/) now active in NavGraph; ProcessoListViewModel calls ProcessoRepository.getProcessos(); RLS enforces cliente_usuario_id filter |
| APP-03 | Tela exibe status atual em linguagem simples | 05-03 | ✓ SATISFIED | ProcessoDetailScreen (processos/) active; ProcessoStatusCard shows translated `status` from movimentacoes |
| APP-04 | Linha do tempo de movimentações com descrição traduzida | 05-03 | ✓ SATISFIED | stickyHeader timeline with MovimentacaoCard + ExpandableText(collapsedMaxLines=3) — now active |
| APP-05 | Próxima data em destaque | 05-03 | ✓ SATISFIED | ProximaDataCard in active ProcessoDetailScreen |
| APP-06 | Dados cadastrais do processo | 05-03 | ✓ SATISFIED | DadosCadastraisSection with AnimatedVisibility + plain-language labels — active |
| APP-07 | Data/hora da última atualização ("sincronizado há X horas") | 05-01, 05-03 | ✓ SATISFIED | SyncLabelFormatter.format() imported in ProcessoDetailScreen — now active |
| APP-08 | "Sem movimentação recente" exibe mensagem tranquilizadora | 05-03, 05-05 | ✓ SATISFIED | EmptyTimelineCard internal composable exists and is invoked when hasEmptyTimeline=true — active. ProcessoDetailScreenEmptyTest verifies this. |
| APP-11 | Botão "falar com meu advogado" WhatsApp deep-link | 05-03 | ✓ SATISFIED | ExtendedFAB + abrirWhatsApp() + <queries> — active in NavGraph |
| APP-12 | Onboarding de 3-4 telas na primeira abertura | 05-04 | ✓ SATISFIED | 4 pages D-09 content, no skip, BackHandler |
| APP-13 | LGPD consent screen na primeira abertura | 05-04 | ✓ SATISFIED | LgpdConsentScreen with scroll detection, checkbox, AlertDialog |
| APP-14 | Disclaimer "Explicação gerada por IA" | (descoped) | OVERRIDE — D-06 | User decision: APP-14 explicitly removed per D-06 in 05-CONTEXT.md. No disclaimer present — correct per decision. |
| APP-15 | Clean Architecture + MVVM + Compose + :core-* modules | 05-02 | ✓ SATISFIED | Module structure: core-common, core-network, core-data, core-ui, app-cliente. ViewModel pattern with Hilt DI. Repository pattern. |
| APP-16 | CI lint + unit tests + UI tests | 05-05 | ✓ SATISFIED | CI workflow: lint + test + assembleDemoDebug as separate steps. Unit tests: SyncLabelFormatterTest, ProcessoListViewModelTest, ProcessoDetailViewModelTest, LoginViewModelTest. |
| LGPD-02 | Política de privacidade consent gate na primeira abertura | 05-04 | ✓ SATISFIED | LgpdConsentScreen gates ProcessoList via SplashViewModel (!lgpdAccepted → LGPD_CONSENT) |

All 14 active requirements satisfied. APP-14 accepted as intentional descope per D-06.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app-cliente/features/processo/ProcessoListScreen.kt` | 70-78 | `val processosMock = listOf(...)` hardcoded mock data | WARNING (no longer blocking) | Static mock file still exists but is no longer wired into NavGraph — no user impact. Consider deleting to avoid future confusion. |
| `app-cliente/features/processos/ProcessoListViewModel.kt` | logout() | Empty logout implementation (comment: "implementado na integração completa") | INFO | Logout button exists in TopAppBar but callback is no-op. Not blocking MVP — login still works, session persists correctly. |

No BLOCKER anti-patterns remain in the active code path.

### Human Verification Required

#### 1. Real Login + Process Flow (end-to-end)

**Test:** Install the demo APK on a real device or emulator. Log in with a `cliente` account that has at least one process linked via `cliente_usuario_id` in the database. Verify the process list loads from the API (not hardcoded data), tap a process, verify the detail screen shows the AI-translated `status`, movimentacoes timeline with `explicacao`, sync label "Sincronizado há Xh", and the WhatsApp FAB.
**Expected:** Non-mock data; `ProcessoStatusCard` shows translated status; `stickyHeader` timeline shows `MovimentacaoCard` entries; sync label uses `SyncLabelFormatter`; `ExtendedFloatingActionButton` "Falar com meu advogado" is visible.
**Why human:** Requires real device/emulator, real Supabase JWT, network access, and process data seeded with `cliente_usuario_id` pointing to the test user.

#### 2. Onboarding + LGPD Gate (fresh install)

**Test:** Clear app data, launch the app. Verify: (a) 4 onboarding pages appear in sequence, (b) no "Pular" button visible at any point, (c) after "Começar" on page 4 the LGPD consent screen appears, (d) "Aceitar" button is disabled initially, (e) after scrolling to bottom AND checking checkbox "Aceitar" becomes enabled, (f) after accepting, the process list screen appears.
**Expected:** Sequential mandatory flow; LGPD gate strictly enforced before process data is shown.
**Why human:** `derivedStateOf` scroll detection requires physical scroll interaction; HorizontalPager page transitions cannot be reliably verified without an instrumented test runner on a device.

#### 3. WhatsApp FAB Deep-Link

**Test:** On the process detail screen (with a process that has `telefone_whatsapp` populated in the `escritorios` table), tap "Falar com meu advogado". On a device with WhatsApp installed, verify WhatsApp opens with the phone number. On a device without WhatsApp, verify the phone dialer opens.
**Expected:** `whatsapp://send?phone={telefone}` deep-link works; `tel:` fallback works when WhatsApp absent.
**Why human:** Requires a physical device with WhatsApp installed and real `telefone_whatsapp` data in the backend.

### Gaps Summary

No blocking gaps remain. All three gaps from the previous verification have been resolved:

1. **NavGraph wiring (CLOSED):** `ClienteNavGraph.kt` now imports `ProcessoListScreen` and `ProcessoDetailScreen` from `features.processos` (real ViewModel-backed screens). Constructor signatures match the NavGraph call sites exactly. No `TODO()` stubs remain. Data flow is confirmed: NavGraph → Screen → hiltViewModel() → ViewModel → ProcessoRepository → ClienteApi → Supabase.

2. **Static mock screens no longer active (CLOSED):** The `features/processo/` package files still exist in the repository but are no longer imported by the NavGraph. They have zero user impact. Cleanup (deletion) is recommended to avoid future confusion but is not a blocking issue.

3. **Primary color deviation (ACCEPTED):** `#041631` (Editorial Juris navy) is the accepted brand color per developer instruction. Override documented in frontmatter. `dynamicColor=false` is correct.

The phase goal is functionally achieved. The 3 human verification items above represent behaviors that require physical device/network testing and cannot be verified statically — they are expected post-implementation validation steps, not missing implementation work.

---

_Verified: 2026-04-16T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
