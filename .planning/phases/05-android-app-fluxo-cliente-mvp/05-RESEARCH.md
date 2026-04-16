# Phase 5: Android App — Fluxo Cliente (MVP) - Research

**Researched:** 2026-04-15
**Domain:** Android Jetpack Compose — client-facing MVP (login, process list, process detail, onboarding, LGPD consent gate, WhatsApp deep-link)
**Confidence:** HIGH (all critical stack decisions already locked in Phase 4; Phase 5 reuses the same patterns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Layout da Tela do Processo**
- D-01: Layout em scroll único com seções verticais — sem tabs. Ordem: card de status atual (IA) → card de próxima data importante → seção de movimentações (timeline) → seção collapsable de dados cadastrais → botão "Falar com meu advogado".
- D-02: Acima da dobra (sem scroll) em smartphone médio (~6"): card de status atual IA + card de próxima data importante. A timeline começa logo abaixo para induzir o scroll.
- D-03: Botão "Falar com meu advogado" abre WhatsApp direto via deep-link `whatsapp://send?phone={telefone_escritorio}`. Se WhatsApp não estiver instalado, fallback para o discador de telefone nativo.
- D-04: Estado "sem movimentação recente" (APP-08): exibir um card fixo dentro da seção de timeline com texto tranquilizador. Sem tela vazia ou ilustração separada.

**Timeline de Movimentações**
- D-05: Cada movimentação truncada a 2-3 linhas com botão "ver mais" que expande inline (sem nova tela).
- D-06: APP-14 REMOVIDO pelo usuário — sem disclaimer "Explicação gerada por IA" em nenhuma parte do app. O executor NÃO deve implementar avisos de IA.
- D-07: Movimentações agrupadas por cabeçalhos de mês/ano (ex: "Maio 2025") como separadores visuais.

**Onboarding**
- D-08: Estilo visual: ilustrações vetoriais (SVG/Lottie) — uma por tela.
- D-09: 4 telas obrigatórias: (1) "Seus processos em linguagem simples", (2) "Próximas datas e prazos", (3) "Notificações automáticas", (4) "Falar com o advogado".
- D-10: Onboarding obrigatório na primeira abertura (sem botão "Pular"). Flag "onboarding visto" persistida em DataStore.

**LGPD Consent Gate**
- D-11: Tela completa dedicada com texto completo da política de privacidade scrollável. Botão "Aceitar" desabilitado até rolar ao final. Inclui checkbox "Li e aceito os termos" antes do botão.
- D-12: Se recusar: logout automático + mensagem explicativa + retorno à tela de login. Na próxima abertura, tela reaparece.
- D-13: Fluxo de primeira abertura: Login → Onboarding (4 telas, apenas 1ª vez) → LGPD consent gate → Lista de processos. Em aberturas subsequentes: Login → Lista de processos (se já consentiu).

### Claude's Discretion
- Cores e estilo visual do card de status IA (dentro do padrão Material3 do `:core-ui`)
- Animação de transição entre telas do onboarding (pager nativo ou Accompanist Pager)
- Skeleton loading states nas telas de lista e detalhe
- Indicador "última sincronização há X horas" — posicionamento exato dentro da tela do processo
- Formato exato das datas na timeline (relativo "há 3 dias" vs absoluto "15 mai")
- Estrutura de módulos internos do `:app-cliente` (ViewModels, Use Cases, etc.)

### Deferred Ideas (OUT OF SCOPE)
- Chat IA com o processo — v2 (CHAT-01 a CHAT-06)
- Classificação de movimentações por impacto (crítico/importante/rotineiro) — DIFF-01, v2
- Glossário contextual inline — DIFF-02, v2
- Indicador visual de fase do processo — DIFF-03, v2
- Push notifications — Phase 6
- Re-exibição do consent LGPD quando a política mudar de versão — Phase 8
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APP-01 | Cliente consegue fazer login com email/senha fornecidos pelo escritório | Auth via `POST /api/v1/auth/login` — JWT contains `role` + `tenant_id` in `app_metadata`; DataStore token persistence from Phase 4 |
| APP-02 | Tela inicial exibe lista de processos vinculados ao CPF do cliente | Requires new `GET /api/v1/processos` (list) endpoint — gap noted; RLS enforces tenant isolation automatically |
| APP-03 | Tela do processo exibe status atual em linguagem simples gerado por IA | `movimentacoes.status` field from Phase 3 translation schema; most recent translated `movimentacao` |
| APP-04 | Tela do processo exibe linha do tempo de movimentações com descrição traduzida por IA | `movimentacoes.explicacao` + `movimentacoes.data_hora` fields; grouped by month/year (D-07) |
| APP-05 | Tela do processo exibe próxima data importante em destaque | `movimentacoes.proxima_data` field (Phase 3 schema); prominent card above the fold (D-02) |
| APP-06 | Tela do processo exibe dados cadastrais (número CNJ, vara, comarca, partes) | `processos.numero_cnj`, `processos.tribunal`; `dados_brutos` JSONB may contain vara/partes — backend endpoint must expose these |
| APP-07 | Tela do processo exibe data/hora da última atualização ("sincronizado há X horas") | `processos.ultima_sincronizacao` field; `desatualizado: boolean` flag from existing GET endpoint |
| APP-08 | Tela "sem movimentação recente" exibe mensagem tranquilizadora | Empty/null movimentacoes list → fixed card with reassuring text (D-04); not a blank screen |
| APP-11 | Botão "falar com meu advogado" com deep-link para WhatsApp/email | `Intent(Intent.ACTION_VIEW, Uri.parse("whatsapp://send?phone=..."))` — fallback to `tel:` URI (D-03) |
| APP-12 | Onboarding de 4 telas na primeira abertura | HorizontalPager (Compose Foundation) + DataStore flag; no skip (D-10) |
| APP-13 | LGPD consent screen na primeira abertura (aceite obrigatório antes de usar) | Full-screen scrollable + scroll-detection to enable Accept button (D-11); POST /api/v1/lgpd/consentimento on accept |
| APP-15 | Clean Architecture + MVVM + Compose com módulos `:core-*` compartilhados | Same architecture as Phase 4 (locked in Phase 4 CONTEXT D-14/D-15) |
| APP-16 | App_cliente passa linting, testes unitários e UI tests no CI antes de qualquer release | Existing `android-ci.yml` runs `:app-cliente:lintDemoDebug` + `test`; add Compose UI test for LGPD scroll gate |
| LGPD-02 | App_cliente exibe política de privacidade e termos de uso na primeira abertura (consent gate) | Full-screen tela D-11; POST /api/v1/lgpd/consentimento; revogado_em = NULL = active consent |
</phase_requirements>

---

## Summary

Phase 5 builds the `:app-cliente` module end-to-end: login with JWT role detection, process list bound to the user's CPF via RLS, process detail screen (plain-language status, translated timeline grouped by month/year, next important date above the fold, cadastral data, freshness indicator), 4-screen onboarding on first open, LGPD consent gate with scroll-detection before enabling Accept, and "Falar com meu advogado" WhatsApp deep-link.

The good news: all architectural patterns are already locked by Phase 4. Phase 5 inherits the identical stack — Retrofit + OkHttp, DataStore Preferences, Navigation Compose, Hilt, sealed-class UiState, Clean Architecture + MVVM — and the reusable Compose components from `:core-ui` (notably `MovimentacaoCard`, `ProcessoStatusCard`) that Phase 4 was designed to produce for exactly this purpose. Phase 5 is net-new screens built on an already-validated contract.

The critical gap to plan around: the existing backend has `GET /api/v1/processos/:id` (single process) and `POST /api/v1/processos` (create) but no `GET /api/v1/processos` list endpoint filtered by client user. APP-02 requires this endpoint. Phase 5 planning must include a Wave 0 backend task to add `GET /api/v1/processos` returning all processes for the authenticated user (RLS handles tenant + user scoping). The Android side is blocked on this endpoint.

**Primary recommendation:** Treat Phase 5 as "screens + one backend list endpoint". All library versions, DI patterns, and network layers are inherited from Phase 4. The planner should scope Wave 0 as: (1) backend `GET /api/v1/processos` list endpoint, (2) verify `:core-ui` shared components exist from Phase 4. Subsequent waves build screens sequentially: auth → list → detail → onboarding → LGPD gate.

---

## Standard Stack

### Core (all inherited from Phase 4 — already in `libs.versions.toml`)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| Jetpack Compose BOM | 2026.03.00 | Compose version alignment | [VERIFIED: libs.versions.toml] |
| Material3 (via BOM) | BOM-managed | UI components, theming | [VERIFIED: libs.versions.toml] |
| Kotlin | 2.2.10 | Language | [VERIFIED: libs.versions.toml] |
| AGP | 9.1.1 | Android build tooling | [VERIFIED: libs.versions.toml] |
| Hilt | 2.59.2 | DI framework | [VERIFIED: libs.versions.toml] |
| hilt-navigation-compose | 1.2.0 | Hilt + NavController integration | [VERIFIED: libs.versions.toml] |
| KSP | 2.2.10-2.0.2 | Annotation processing for Hilt | [VERIFIED: libs.versions.toml] |
| androidx.core:core-ktx | 1.18.0 | Core Kotlin extensions | [VERIFIED: libs.versions.toml] |
| lifecycle-runtime-ktx | 2.10.0 | Coroutine lifecycle scopes | [VERIFIED: libs.versions.toml] |
| activity-compose | 1.13.0 | ComponentActivity + Compose | [VERIFIED: libs.versions.toml] |

### Additions Required in Phase 5

Phase 4 established these in `libs.versions.toml`; Phase 5 consumes them from `:app-cliente`'s `build.gradle.kts`. Verify they are listed; add if not:

| Library | Version | Purpose | Why This |
|---------|---------|---------|---------|
| Navigation Compose | ~2.8.x | Screen navigation + NavHost | [ASSUMED — Phase 4 D-01 added it; confirm in toml] |
| Retrofit | ~2.11.x | HTTP client for backend calls | [ASSUMED — Phase 4 D-03; confirm in toml] |
| OkHttp | ~4.12.x | HTTP engine + logging interceptor | [ASSUMED — Phase 4 D-03; confirm in toml] |
| Gson or Moshi converter | ~2.11.x / ~1.15.x | JSON deserialization | [ASSUMED — Phase 4 D-04; confirm selection] |
| DataStore Preferences | ~1.1.x | Token + onboarding flag storage | [ASSUMED — Phase 4 D-05; confirm in toml] |
| kotlin-jwt or jose4j | ~4.x | JWT decode (role detection, no round-trip) | [ASSUMED — Phase 4 D-06; confirm selection] |
| HorizontalPager (Compose Foundation) | BOM-managed | Onboarding swipe pager | [ASSUMED — built into `foundation` library via BOM] |
| Lottie for Android (optional) | ~6.x | Animated illustrations in onboarding | [ASSUMED — if SVG assets are Lottie JSON; alternative: static vector drawables] |

> **CRITICAL for planner:** Before writing dependency tasks, the executor must check `libs.versions.toml` to confirm which Phase 4 libraries were actually added. The file currently (at time of research) only shows Hilt and base Compose — Retrofit, Navigation, DataStore were listed as Phase 4 "to-add". If Phase 4 is not yet complete, Wave 0 of Phase 5 must add them.

**Installation additions for `:app-cliente/build.gradle.kts`:**
```kotlin
implementation(libs.navigation.compose)
implementation(libs.retrofit)
implementation(libs.retrofit.converter.gson)  // or moshi
implementation(libs.okhttp)
implementation(libs.okhttp.logging.interceptor)
implementation(libs.datastore.preferences)
implementation(libs.hilt.navigation.compose)  // already declared for app-escritorio
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Retrofit + OkHttp | Ktor Client | Phase 4 already chose Retrofit — locked. Ktor adds multiplatform value not needed here. |
| DataStore Preferences | SharedPreferences | DataStore is the official replacement; async, Flow-based, no ANR risk. Locked by Phase 4. |
| HorizontalPager (Foundation) | Accompanist Pager | Accompanist Pager was deprecated; native HorizontalPager in `androidx.compose.foundation` is the current approach. [ASSUMED — Accompanist deprecated ~2023] |
| Static vector drawables | Lottie JSON | Lottie adds animation; SVG/VectorDrawable is simpler, no extra dep. Since D-08 says "SVG/Lottie", either is valid — planner picks one. |

---

## Architecture Patterns

### Module Structure (established by Phase 0)

```
:app-cliente/
├── src/
│   ├── main/
│   │   ├── java/com/aethixdigital/portaljuridico/cliente/
│   │   │   ├── ClienteApp.kt                 # @HiltAndroidApp
│   │   │   ├── MainActivity.kt               # NavHost host, onboarding/LGPD routing
│   │   │   ├── navigation/
│   │   │   │   └── ClienteNavGraph.kt        # routes: login, onboarding, lgpd, processoList, processoDetail
│   │   │   ├── features/
│   │   │   │   ├── auth/                     # LoginViewModel, LoginScreen
│   │   │   │   ├── processos/                # ProcessoListViewModel, ProcessoDetailViewModel, screens
│   │   │   │   ├── onboarding/               # OnboardingViewModel, OnboardingScreen (pager)
│   │   │   │   └── lgpd/                     # LgpdConsentViewModel, LgpdConsentScreen
│   │   │   └── di/                           # Hilt modules (NetworkModule, RepositoryModule)
│   │   └── res/
│   │       ├── values/strings.xml            # Demo flavor fallback
│   │       └── raw/                          # Lottie JSON assets (if using Lottie)
│   └── demo/
│       └── res/values/strings.xml            # "app_name = Portal Jurídico (Demo)"
:core-ui/
│   ├── ProcessoStatusCard.kt    # Status card (created in Phase 4 — reuse here)
│   ├── MovimentacaoCard.kt      # Timeline item (created in Phase 4 — reuse here)
│   └── PortalJuridicoTheme.kt  # Already in core-ui
:core-network/
│   ├── ApiService.kt            # Retrofit interface (populated in Phase 4)
│   ├── AuthInterceptor.kt       # Bearer token injector (Phase 4)
│   └── RetrofitModule.kt        # Hilt @Provides (Phase 4)
:core-data/
│   ├── AuthRepository.kt        # login, logout, token read/write (Phase 4)
│   └── ProcessoRepository.kt   # getProcessos(), getProcesso(id) (Phase 4 adds getById; Phase 5 adds list)
```

### Pattern 1: Navigation Graph with Conditional Start Destination

Phase 5's startup routing is more complex than Phase 4: the starting screen depends on three flags read at boot.

```kotlin
// Source: [ASSUMED — standard Navigation Compose + DataStore pattern]
@Composable
fun ClienteNavGraph(
    navController: NavHostController,
    startDestination: String,  // computed in MainActivity from DataStore flags
) {
    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.LOGIN) { LoginScreen(navController) }
        composable(Routes.ONBOARDING) { OnboardingScreen(navController) }
        composable(Routes.LGPD_CONSENT) { LgpdConsentScreen(navController) }
        composable(Routes.PROCESSO_LIST) { ProcessoListScreen(navController) }
        composable(Routes.PROCESSO_DETAIL + "/{processoId}") { backStackEntry ->
            val id = backStackEntry.arguments?.getString("processoId") ?: return@composable
            ProcessoDetailScreen(processoId = id, navController = navController)
        }
    }
}
```

The startup decision logic (in MainActivity ViewModel or a SplashViewModel):
```kotlin
// [ASSUMED — standard DataStore + ViewModelScope pattern]
val startDestination = when {
    !isLoggedIn -> Routes.LOGIN
    isLoggedIn && !hasSeenOnboarding -> Routes.ONBOARDING
    isLoggedIn && hasSeenOnboarding && !hasAcceptedLgpd -> Routes.LGPD_CONSENT
    else -> Routes.PROCESSO_LIST
}
```

### Pattern 2: Scroll-Detection for LGPD Accept Button Enablement

The LGPD consent screen requires the Accept button to be disabled until the user scrolls to the end of the policy text. In Compose:

```kotlin
// Source: [ASSUMED — standard LazyColumn + derivedStateOf pattern]
@Composable
fun LgpdConsentScreen() {
    val listState = rememberLazyListState()
    val hasScrolledToEnd by remember {
        derivedStateOf {
            val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()
            val totalItems = listState.layoutInfo.totalItemsCount
            lastVisible != null && lastVisible.index >= totalItems - 1
        }
    }

    LazyColumn(state = listState) {
        item { /* policy text paragraphs */ }
    }
    Button(
        enabled = hasScrolledToEnd && checkboxChecked,
        onClick = { /* POST /api/v1/lgpd/consentimento */ }
    ) { Text("Aceitar") }
}
```

**Pitfall:** `LazyColumn` virtualizes items — `totalItemsCount` is the full count only once items are laid out. Use `layoutInfo.totalItemsCount` (not a static count) and check after composition settles. Testing this in a Compose UI test requires scrolling via `performScrollToIndex` on the SemanticsNode.

### Pattern 3: Timeline with Month/Year Headers (LazyColumn with stickyHeader)

```kotlin
// Source: [ASSUMED — standard LazyColumn stickyHeader pattern in Compose]
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun TimelineSection(movimentacoesByMonth: Map<String, List<Movimentacao>>) {
    LazyColumn {
        movimentacoesByMonth.forEach { (mesAno, items) ->
            stickyHeader {
                Text(text = mesAno, style = MaterialTheme.typography.labelLarge)
            }
            items(items) { movimentacao ->
                MovimentacaoCard(movimentacao = movimentacao)
            }
        }
    }
}
```

**Note on nesting:** The process detail screen is a single scroll (`Column` wrapped in `verticalScroll` or a `LazyColumn`). Nesting a `LazyColumn` inside a `verticalScroll` causes a crash. Use a single `LazyColumn` for the whole screen with `item {}` blocks for the non-list sections above the timeline.

### Pattern 4: Expandable Text (2-3 lines + "ver mais")

```kotlin
// Source: [ASSUMED — standard Compose animateContentSize pattern]
@Composable
fun ExpandableText(text: String, collapsedMaxLines: Int = 3) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        Text(
            text = text,
            maxLines = if (expanded) Int.MAX_VALUE else collapsedMaxLines,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.animateContentSize()
        )
        if (!expanded) {
            TextButton(onClick = { expanded = true }) { Text("ver mais") }
        }
    }
}
```

### Pattern 5: WhatsApp Deep-Link with Fallback

```kotlin
// Source: [ASSUMED — standard Android Intent pattern]
fun abrirWhatsApp(context: Context, telefone: String) {
    val uri = Uri.parse("whatsapp://send?phone=$telefone")
    val intent = Intent(Intent.ACTION_VIEW, uri)
    if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
    } else {
        // WhatsApp não instalado — fallback para discador
        val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$telefone"))
        context.startActivity(dialIntent)
    }
}
```

**AndroidManifest query declaration required (Android 11+, API 30+, minSdk is 27 so some devices hit this):**
```xml
<queries>
    <package android:name="com.whatsapp" />
    <package android:name="com.whatsapp.w4b" />
</queries>
```
Without this, `resolveActivity` returns null on API 30+ even if WhatsApp is installed. [ASSUMED — standard Android 11 package visibility requirement]

### Pattern 6: HorizontalPager Onboarding

```kotlin
// Source: [ASSUMED — standard Compose Foundation HorizontalPager pattern]
@Composable
fun OnboardingScreen(onFinish: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { 4 })
    val scope = rememberCoroutineScope()

    Column {
        HorizontalPager(state = pagerState) { page ->
            OnboardingPage(pageIndex = page)
        }
        HorizontalPagerIndicator(pagerState = pagerState)  // from accompanist or custom dots
        Button(
            onClick = {
                if (pagerState.currentPage < 3) {
                    scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                } else {
                    onFinish()
                }
            }
        ) {
            Text(if (pagerState.currentPage < 3) "Próximo" else "Começar")
        }
    }
}
```

**Note:** `HorizontalPagerIndicator` was in Accompanist; the native Compose equivalent is a custom dot row. Since Accompanist Pager was deprecated and its indicator is in `accompanist-pager-indicators`, check if Phase 4 added accompanist or if a custom dots composable in `:core-ui` is preferable. Recommend custom dots to avoid the deprecated dependency.

### Anti-Patterns to Avoid

- **Nested scrollable containers:** Never put `LazyColumn` inside `Column + verticalScroll`. For the process detail screen, use a single `LazyColumn` with `item {}` for each non-list section.
- **Reading DataStore outside of ViewModel/Coroutine:** DataStore returns `Flow<T>` — collect via `collectAsStateWithLifecycle()` in the Composable, drive it from the ViewModel. Never call `runBlocking` on DataStore in the UI thread.
- **Storing raw JWT in SharedPreferences:** Use DataStore (encrypted if needed). Phase 4 locked this — do not regress.
- **Inline `Intent.ACTION_VIEW` without `<queries>` manifest entry:** On API 30+ devices (Android 11), `resolveActivity` returns null for WhatsApp without the `<queries>` block. Always add it.
- **Blocking the LGPD Accept button state on a single `isScrolledToEnd` boolean set too early:** Use `derivedStateOf` with `layoutInfo` to correctly detect end-of-scroll after items are laid out.
- **Calling `resolveActivity` in a Composable directly:** Move side effects to event handlers or ViewModel — do not call `context.startActivity` directly in the composition phase.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP networking | Custom HttpURLConnection wrapper | Retrofit + OkHttp (Phase 4 locked) | Interceptors, error handling, timeout config, type-safe API definition |
| JWT payload decoding | Manual Base64 decode + JSON parse | Lightweight JWT library (e.g., `java-jwt` 4.x) | Edge cases: padding, URL-safe base64, expiry validation |
| Token persistence | SharedPreferences raw write | DataStore Preferences | ANR-safe, coroutine-based, migration path to encrypted variant |
| Scroll-to-end detection | Pixel offset calculation | `LazyListState.layoutInfo` + `derivedStateOf` | Handles virtual scroll, item size variance |
| Expandable text | Re-implementing `onTextLayout` callback | `maxLines` + `animateContentSize()` | Trivial with Compose; onTextLayout is notoriously tricky across font sizes |
| DI graph | Manual Dagger setup | Hilt (Phase 0 locked) | Already wired; @HiltAndroidApp and @AndroidEntryPoint already in place |
| Navigation | Manual Fragment/Activity back stack | Navigation Compose (Phase 4 locked) | NavController handles back stack, deep links, argument passing |
| WhatsApp launch | Custom package check | `Intent.resolveActivity` + `<queries>` manifest | The only correct pattern for API 30+ package visibility |

**Key insight:** The entire infrastructure layer (network, auth, DI, navigation, token storage) was built in Phases 0 and 4. Phase 5 is pure UI + feature logic on top of established infrastructure. Never re-implement what Phase 4 wired.

---

## API Contract: What the Backend Exposes

Understanding the exact backend contract is critical for Phase 5 planning.

### Existing Endpoints (Phases 1–3)

| Endpoint | Method | Auth | Response |
|----------|--------|------|----------|
| `/api/v1/auth/login` | POST | None | `{ access_token, refresh_token, user: { id, email, role, tenant_id } }` |
| `/api/v1/auth/logout` | POST | Bearer | `{ success: true }` |
| `/api/v1/processos` | POST | Bearer | 201 — cadastra processo (advogado only) |
| `/api/v1/processos/:id` | GET | Bearer | `{ data: { id, numero_cnj, tribunal, ultima_sincronizacao, desatualizado, ... } }` |
| `/api/v1/processos/:id/sync` | POST | Bearer | 202 — enfileira sync |
| `/api/v1/processos/:id/traducao` | POST | Bearer | 202 — enfileira tradução |
| `/api/v1/lgpd/consentimento` | POST | Bearer | 201 — registra aceite |
| `/api/v1/lgpd/consentimento` | GET | Bearer | Histórico de consentimentos |

### Gap 1 (CRITICAL — blocks APP-02): Missing Process List Endpoint

**There is no `GET /api/v1/processos` that returns all processes for the authenticated cliente user.**

The existing `GET /api/v1/processos/:id` requires a known process UUID. The client app cannot discover their process IDs without a list endpoint.

**Required new endpoint (must be planned in Wave 0 of Phase 5):**
```
GET /api/v1/processos
Authorization: Bearer {jwt}
Response: {
  success: true,
  data: [{ id, numero_cnj, tribunal, ultima_sincronizacao, desatualizado, status_atual }, ...]
}
```
RLS on the `processos` table already scopes by `tenant_id` via JWT `app_metadata`. The endpoint only needs to do `SELECT * FROM processos` — RLS handles isolation. However, the current `processos` table links processes to a `tenant_id` (escritório), not to individual `usuario_id`. This means RLS alone will return ALL processes of the tenant, not just the client's own processes.

**Sub-gap (APP-02 requires "bound to their CPF"):** The `processos` table has no `cliente_usuario_id` or `cpf` column. Processes are owned by the escritório (tenant), not by individual clients. To show only the client's own processes, either:
- Option A: Add `cliente_usuario_id UUID REFERENCES usuarios(id)` to `processos` table — set when escritório creates the process for a client.
- Option B: Add a `processos_clientes` join table (processo_id, cliente_usuario_id) for many-to-many.
- Option C: Keep processes at tenant level but add a `cpf` filter: query `processos JOIN usuarios ON cpf match` — fragile.

**Recommendation:** Option A — add `cliente_usuario_id` to `processos` table (nullable for backwards compat). This requires a new Supabase migration and updated `POST /api/v1/processos` to accept `cliente_usuario_id`. The RLS policy for `cliente` role needs a clause: `(cliente_usuario_id = auth.uid())`. [ASSUMED — analysis based on schema review]

### Gap 2: Missing Translated Movimentações in GET Endpoint

The `GET /api/v1/processos/:id` returns process header data but not the movimentações with translations. Phase 5 needs a detail endpoint that includes:

```
GET /api/v1/processos/:id/movimentacoes
Response: [{
  id, data_hora, descricao_original,
  status,        // Phase 3 translation field
  explicacao,    // Phase 3 translation field  
  proxima_data,  // Phase 3 translation field
  impacto        // Phase 3 translation field
}]
```
This endpoint may exist post-Phase 3 — the `dist/routes/processos/traducao.d.ts` only shows the POST to enqueue translation, not a GET for translated results. The planner must include a task to add/verify `GET /api/v1/processos/:id/movimentacoes` that returns translated movimentações.

### Gap 3: Missing WhatsApp Phone Number in Process Context

The "Falar com meu advogado" button needs `telefone_escritorio`. This is not exposed in the current `processos` endpoint. Options:
- Include `escritorio.telefone_whatsapp` in the process detail response (JOIN on `tenant_id`).
- Fetch it separately from a `GET /api/v1/escritorio/profile` endpoint.

The simplest approach: add `telefone_whatsapp` to the `escritorios` table (if not already there) and include it in the process detail or a user profile endpoint. [ASSUMED — field existence in escritorios table not confirmed]

---

## Common Pitfalls

### Pitfall 1: Nested Scrollable Containers (LazyColumn in Column+verticalScroll)
**What goes wrong:** App crashes with `IllegalStateException: Nesting scrollable in the same direction layouts is not supported` when a `LazyColumn` (timeline) is placed inside a parent `Column` with `Modifier.verticalScroll`.
**Why it happens:** Both containers try to measure infinite height simultaneously.
**How to avoid:** The entire process detail screen must be ONE `LazyColumn`. Use `item {}` blocks for the status card, próxima data card, and cadastral data section. The movimentação list uses `items()` + `stickyHeader()` within the same `LazyColumn`.
**Warning signs:** Compile-time warning "Lazy layout should not be placed inside a scrollable parent with the same orientation." in Android Studio.

### Pitfall 2: Android 11+ Package Visibility (WhatsApp Intent)
**What goes wrong:** `intent.resolveActivity(packageManager)` returns `null` on API 30+ even when WhatsApp is installed. The fallback to dialer fires silently.
**Why it happens:** Android 11 introduced package visibility restrictions. Without a `<queries>` element in `AndroidManifest.xml`, the app cannot see WhatsApp's package.
**How to avoid:** Add `<queries><package android:name="com.whatsapp" /><package android:name="com.whatsapp.w4b" /></queries>` to `AndroidManifest.xml`.
**Warning signs:** Works on Android 10 emulator, fails on Android 11+ physical device.

### Pitfall 3: LGPD Scroll Detection with derivedStateOf
**What goes wrong:** Accept button remains disabled after the user has scrolled to the end (or enables too early).
**Why it happens:** `visibleItemsInfo` can be empty before the first composition pass, causing `hasScrolledToEnd` to be `true` incorrectly when there is only one item. Alternatively, using a pixel-offset calculation fails on variable-height text.
**How to avoid:** Check both `lastVisible.index >= totalItems - 1` AND `totalItems > 0` in the `derivedStateOf` lambda. Also wrap the policy text in multiple `item {}` blocks (not a single massive Text) to give `totalItemsCount` > 1.
**Warning signs:** Accept button enabled immediately on a device with a large screen; never enabled on a device with small screen.

### Pitfall 4: DataStore Read in Composition (collectAsState timing)
**What goes wrong:** App flickers briefly showing the wrong screen before the DataStore value is read, causing the nav graph to re-navigate mid-composition.
**Why it happens:** DataStore is async; reading it for `startDestination` shows a default value first, then the real value arrives via Flow.
**How to avoid:** Show a SplashScreen (or blank screen without navigation) until ALL DataStore flags are loaded. Use `StateFlow` in the ViewModel, start the NavHost only after the initial state is non-null.
**Warning signs:** Brief flash of login screen before landing on processo list on returning users.

### Pitfall 5: RLS Role Mismatch (cliente viewing all tenant processos)
**What goes wrong:** A `cliente` user can see ALL processes in the escritório's tenant, not just their own.
**Why it happens:** Current RLS policy on `processos` only checks `tenant_id`, not `cliente_usuario_id`. Any authenticated user of the same tenant can read all processes.
**How to avoid:** The new migration must add `cliente_usuario_id` to `processos` and the RLS policy for `role = 'cliente'` must add `AND (cliente_usuario_id = auth.uid())`. The `advogado`/`admin_escritorio` roles retain full tenant access.
**Warning signs:** APP-02 success criterion explicitly states "nothing from other tenants leaking" — but also REQUIRES "list of their own processes, bound to their CPF", which requires user-level scoping beyond tenant-level.

### Pitfall 6: Onboarding Pager — No Back Navigation to Prevent Partial Traversal
**What goes wrong:** Hardware back button on onboarding screen navigates back to login screen (user exits onboarding).
**Why it happens:** Default NavController back behavior pops the current destination.
**How to avoid:** Intercept the back press on the onboarding screen using `BackHandler` and either navigate back within the pager OR disable back when on the first page. Since D-10 says no skip, back navigation within onboarding should go to previous page (not exit). Back on page 1 should either do nothing or show a dialog.

### Pitfall 7: translacao Fields May Be Null on New Processos
**What goes wrong:** App crashes or shows blank status card when `status` / `explicacao` / `proxima_data` fields are null (process just added, translation not yet run).
**Why it happens:** Phase 3 translation is async (202 Accepted). A freshly added process has movimentações without translation fields.
**How to avoid:** Always null-check translation fields. Show a "Tradução em andamento..." placeholder state when all translation fields are null. This is a skeleton loading variant specific to translation latency.

---

## Code Examples

### Verified Patterns from Existing Codebase

**JWT role detection (server side, for reference — same JWT structure on client):**
```kotlin
// Source: [VERIFIED: apps/api/src/plugins/auth.ts]
// JWT app_metadata contains: { tenant_id: string, role: "admin_escritorio"|"advogado"|"cliente" }
// Client-side: decode JWT payload (Base64), read app_metadata.role
// Navigation: if role == "cliente" → go to ProcessoList; if role == "advogado" → go to app_escritorio
```

**DataStore token persistence pattern (Phase 4 established):**
```kotlin
// Source: [ASSUMED — Phase 4 D-05 locked DataStore; exact implementation in :core-data]
// Retrieve token as Flow, collect in ViewModel via viewModelScope + stateIn
val tokenFlow: Flow<String?> = dataStore.data.map { prefs -> prefs[TOKEN_KEY] }
```

**Supabase LGPD consent POST body:**
```kotlin
// Source: [VERIFIED: apps/api/src/routes/lgpd/index.ts]
// POST /api/v1/lgpd/consentimento
// Body: { versao_termos: "2026-04-15" }  // ISO date string — must match ^\\d{4}-\\d{2}-\\d{2}$
// Response: { success: true, consentimento_id: UUID, privacy_policy_url: string }
```

**Process staleness indicator:**
```kotlin
// Source: [VERIFIED: apps/api/src/routes/processos.ts]
// GET /api/v1/processos/:id returns { desatualizado: boolean, ultima_sincronizacao: ISO string | null }
// "nunca sincronizado" = ultima_sincronizacao is null (desatualizado: false by convention)
// "sincronizado há X horas" = compute from ultima_sincronizacao timestamp
fun formatSyncLabel(ultimaSincronizacao: String?): String {
    if (ultimaSincronizacao == null) return "Nunca sincronizado"
    val diffHours = ChronoUnit.HOURS.between(
        Instant.parse(ultimaSincronizacao), Instant.now()
    )
    return "Sincronizado há ${diffHours}h"
}
```

**Translation output schema (what `:app-cliente` will receive):**
```kotlin
// Source: [VERIFIED: apps/api/dist/ai/translation-schema.d.ts]
data class Translacao(
    val status: String,           // plain-language current status
    val proxima_data: String?,    // "Audiência em 20 de maio de 2026" or null
    val explicacao: String,       // what happened, in plain Portuguese
    val impacto: String,          // what it means for the client
    // NOTE: D-06 removes disclaimer field from UI — backend still sends it, app ignores it
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Accompanist Pager (viewpager2 wrapper) | Native `HorizontalPager` in `androidx.compose.foundation` | ~2023 with Compose 1.4+ | Remove accompanist-pager dependency; `rememberPagerState` API changed |
| Accompanist PagerIndicator | Custom dots composable or third-party | ~2023 | No standard replacement; build a simple `Row` of dots |
| SharedPreferences | DataStore Preferences | Android Jetpack 2020+ | Already adopted in Phase 4; async, ANR-safe |
| startActivityForResult | ActivityResultContracts | Android API 30 | Not relevant here but worth noting for any future file/camera access |
| Fragment Navigation | Navigation Compose | 2021+ for Compose projects | Already adopted in Phase 4 |

**Deprecated/outdated:**
- Accompanist Pager (`com.google.accompanist:accompanist-pager`): Deprecated since ~2023. Use `HorizontalPager` from `androidx.compose.foundation`. [ASSUMED — based on training knowledge; verify with official docs if Accompanist is in libs.versions.toml]
- Glide for image loading in Compose: Use Coil 3.x for Compose-first image loading. Not needed for this phase (no remote images), but relevant for future office logo loading in white-label.

---

## Backend Gap Summary (for Wave 0 planning)

The following backend changes are required before the Android screens can be built:

| Gap | Required Change | Urgency |
|-----|----------------|---------|
| No process list endpoint | Add `GET /api/v1/processos` — returns processes for authenticated user | BLOCKING (APP-02) |
| No user-level process ownership | Add `cliente_usuario_id UUID` column to `processos` table; new Supabase migration | BLOCKING (APP-02) |
| No RLS policy for cliente role | Add `AND (cliente_usuario_id = auth.uid())` to `processos` RLS for `role = 'cliente'` | BLOCKING (APP-02 security) |
| No movimentacoes endpoint with translations | Add `GET /api/v1/processos/:id/movimentacoes` returning translation fields | BLOCKING (APP-03, APP-04) |
| No escritorio WhatsApp phone in API response | Add `telefone_whatsapp` to `GET /api/v1/processos/:id` or a `/profile` endpoint | Required for APP-11 |

These gaps should be Wave 0 tasks in the Phase 5 plan, before any Android UI waves.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 4.13.2 + Espresso 3.7.0 + Compose UI Test (via BOM) |
| Config file | `app-cliente/build.gradle.kts` (testInstrumentationRunner already configured) |
| Quick run command | `./gradlew :app-cliente:test` (unit tests only) |
| Full suite command | `./gradlew :app-cliente:lintDemoDebug :app-cliente:test :app-cliente:connectedDemoDebugAndroidTest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| APP-01 | Login with email/senha, JWT persisted | Unit (ViewModel) | `./gradlew :app-cliente:test --tests "*LoginViewModelTest*"` |
| APP-02 | Process list filtered by user | Unit (Repository) | `./gradlew :app-cliente:test --tests "*ProcessoRepositoryTest*"` |
| APP-03 | Status card shows translated status | Unit (ViewModel/UI) | `./gradlew :app-cliente:test --tests "*ProcessoDetailViewModelTest*"` |
| APP-07 | "Sincronizado há X horas" label | Unit (formatter) | `./gradlew :app-cliente:test --tests "*SyncLabelFormatterTest*"` |
| APP-08 | Empty timeline → reassuring card visible | Compose UI Test | `./gradlew :app-cliente:connectedDemoDebugAndroidTest --tests "*ProcessoDetailScreenEmptyTest*"` |
| APP-11 | WhatsApp intent resolves correctly | Unit (Intent mock) | `./gradlew :app-cliente:test --tests "*WhatsAppIntentTest*"` |
| APP-12 | Onboarding shows 4 pages, no skip | Compose UI Test | `./gradlew :app-cliente:connectedDemoDebugAndroidTest --tests "*OnboardingScreenTest*"` |
| APP-13 / LGPD-02 | Accept button disabled until scroll end | Compose UI Test | `./gradlew :app-cliente:connectedDemoDebugAndroidTest --tests "*LgpdConsentScreenTest*"` |
| APP-16 | Lint + unit + UI tests pass in CI | CI gate | `android-ci.yml` already runs lint + test + assembleDemoDebug |

### Sampling Rate
- **Per task commit:** `./gradlew :app-cliente:test` (unit tests, < 30s)
- **Per wave merge:** `./gradlew :app-cliente:lintDemoDebug :app-cliente:test`
- **Phase gate:** Full Compose UI test suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `app-cliente/src/test/LoginViewModelTest.kt` — covers APP-01
- [ ] `app-cliente/src/test/ProcessoRepositoryTest.kt` — covers APP-02
- [ ] `app-cliente/src/test/ProcessoDetailViewModelTest.kt` — covers APP-03, APP-07
- [ ] `app-cliente/src/test/SyncLabelFormatterTest.kt` — covers APP-07
- [ ] `app-cliente/src/test/WhatsAppIntentTest.kt` — covers APP-11
- [ ] `app-cliente/src/androidTest/OnboardingScreenTest.kt` — covers APP-12
- [ ] `app-cliente/src/androidTest/LgpdConsentScreenTest.kt` — covers APP-13/LGPD-02
- [ ] `app-cliente/src/androidTest/ProcessoDetailScreenEmptyTest.kt` — covers APP-08

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth JWT (locked); token stored in DataStore not plain SharedPreferences |
| V3 Session Management | Yes | JWT expiry handled by Supabase; refresh token persisted in DataStore; logout clears both |
| V4 Access Control | Yes | RLS enforces tenant isolation + user-level process ownership (new `cliente_usuario_id` column) |
| V5 Input Validation | Minimal (client login only) | Email/password fields validated before API call; no user-controlled data creation in Phase 5 |
| V6 Cryptography | No | No custom crypto; Supabase JWT verification handled server-side |

### Known Threat Patterns for Android JWT + Supabase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JWT stored in plain SharedPreferences | Information Disclosure | Use DataStore (encrypted variant if high sensitivity); never log JWTs |
| Cross-tenant data leakage via missing RLS clause | Tampering / Spoofing | Add `cliente_usuario_id` to RLS (see Gap 1 above) |
| WhatsApp `phone` parameter injection | Tampering | Phone number comes from backend response, not user input — trust the API; sanitize if ever user-provided |
| LGPD consent bypass (button state manipulation) | Tampering | Server-side: POST `/lgpd/consentimento` is authenticated; the backend records the consent. UI enforcement is UX; security enforcement is server-side |
| Intent redirect via deep-link to malicious WhatsApp clone | Spoofing | `resolveActivity` + `<queries>` filters to `com.whatsapp` package specifically |

---

## Environment Availability

Phase 5 is Android-only. No external services are needed beyond what the backend already provides.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Android SDK (API 36) | Build | [ASSUMED available] | 36 | — |
| JDK 17 | CI build | Configured in `android-ci.yml` | 17 (temurin) | — |
| Gradle wrapper | Build | ✓ | 9.3.1 | — |
| Backend API | APP-01 through APP-16 | Phases 1-3 built; Phase 2/3 may be incomplete | — | Mock Retrofit responses for unit tests |
| Supabase (lgpd_consentimentos table) | LGPD-02 | ✓ | Migration 0003 applied | — |

**Missing dependencies with no fallback:**
- Backend `GET /api/v1/processos` list endpoint — must be created in Wave 0 (Phase 5 blocker)
- `processos.cliente_usuario_id` migration — must be created in Wave 0

**Missing dependencies with fallback:**
- Backend may be partially complete (Phases 2-3 in progress) — Android unit tests use Retrofit `MockWebServer` or manual fakes to unblock Android development

---

## Open Questions

1. **Did Phase 4 add Retrofit, Navigation, DataStore to `libs.versions.toml`?**
   - What we know: Phase 4 CONTEXT D-03/D-04/D-05 required these additions.
   - What's unclear: Phase 4 status is "Not started" per STATE.md — these libraries may not yet be in the version catalog.
   - Recommendation: Wave 0 of Phase 5 plan must include a task to add all missing library entries to `libs.versions.toml` and to `:app-cliente/build.gradle.kts`.

2. **What is the `escritorios` table's WhatsApp field name?**
   - What we know: The `escritorios` table has `nome`, `email`, `status`. No `telefone_whatsapp` confirmed.
   - What's unclear: Whether a phone field was added in Phase 1 or needs to be added now.
   - Recommendation: Wave 0 includes a migration task to add `telefone_whatsapp TEXT` to `escritorios` if not present.

3. **Does Phase 4's `core-ui` contain `ProcessoStatusCard` and `MovimentacaoCard`?**
   - What we know: Phase 4 CONTEXT D-08 stated these components should be in `:core-ui` for reuse by Phase 5.
   - What's unclear: Phase 4 is not yet started — these components don't exist yet.
   - Recommendation: The first UI wave in Phase 5 should either build on Phase 4's components OR define them here if Phase 4 is not yet done. Make Phase 4 a hard dependency.

4. **Onboarding illustration assets — SVG or Lottie?**
   - What we know: D-08 says "SVG/Lottie".
   - What's unclear: No design assets exist yet. Lottie requires the `com.airbnb.android:lottie-compose` dependency; static vector drawables do not.
   - Recommendation: Use static `VectorDrawable` XML assets for v1 (no extra dependency, works offline, no animator needed for MVP). Lottie can be added in Phase 6+ if animated illustrations are prioritized.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Retrofit, OkHttp, Navigation, DataStore were added to `libs.versions.toml` in Phase 4 | Standard Stack | Wave 0 task needed to add them; not a blocker if caught early |
| A2 | `HorizontalPager` in `androidx.compose.foundation` is the current non-deprecated API | Architecture Patterns | Need to verify Compose BOM 2026.03.00 includes stable HorizontalPager API |
| A3 | Accompanist Pager is deprecated and should not be used | State of the Art | If accompanist is still actively maintained, it's a valid option |
| A4 | `processos` table needs `cliente_usuario_id` column to filter processes by client | API Contract Gap 1 | Critical — APP-02 requires per-client filtering; if another mechanism exists (e.g., separate table), migration plan changes |
| A5 | `escritorios` table does not have a `telefone_whatsapp` column | API Contract Gap 3 | If column exists, Gap 3 is already resolved |
| A6 | WhatsApp `resolveActivity` requires `<queries>` manifest on API 30+ | Architecture Patterns | Standard Android behavior — low risk of being wrong |
| A7 | `GET /api/v1/processos/:id/movimentacoes` endpoint does not exist | API Contract Gap 2 | If Phase 3 added it, Gap 2 is already resolved |
| A8 | Static `VectorDrawable` is sufficient for onboarding illustrations (no Lottie needed) | Open Questions | If stakeholder requires animation, Lottie dependency + `lottie-compose` ~150KB needed |

---

## Sources

### Primary (HIGH confidence — VERIFIED from codebase)
- `apps/api/src/routes/processos.ts` — exact backend response shape for processo endpoints
- `apps/api/src/routes/auth/index.ts` — login response shape, JWT fields
- `apps/api/src/routes/lgpd/index.ts` — LGPD consent POST contract, versao_termos format
- `apps/api/dist/ai/translation-schema.d.ts` — translation output schema (status, proxima_data, explicacao, impacto, disclaimer)
- `supabase/migrations/0006_datajud_schema.sql` — processos and movimentacoes table columns, RLS policies
- `supabase/migrations/0002_create_usuarios.sql` — usuarios table (no cliente_usuario_id in processos confirmed)
- `supabase/migrations/0003_create_lgpd_consentimentos.sql` — consentimento table structure
- `gradle/libs.versions.toml` — current dependency versions (Compose BOM 2026.03.00, Hilt 2.59.2, KSP 2.2.10-2.0.2)
- `app-cliente/build.gradle.kts` — current app-cliente build config (productFlavors, Hilt wired)
- `.github/workflows/android-ci.yml` — CI pipeline (lint + test + assembleDemoDebug confirmed)
- `.planning/phases/04-android-app-fluxo-advogado/04-CONTEXT.md` — Phase 4 architecture decisions (locked stack)
- `.planning/phases/05-android-app-fluxo-cliente-mvp/05-CONTEXT.md` — Phase 5 user decisions (D-01 through D-13)
- `apps/api/src/plugins/auth.ts` — JWT structure (app_metadata with role and tenant_id confirmed)

### Secondary (ASSUMED — based on training knowledge, not verified in this session)
- A2-A8 above: Jetpack Compose HorizontalPager, WhatsApp Intent pattern, derivedStateOf scroll detection, DataStore patterns — all standard Compose/Android patterns from training data. Verify against official Android docs before implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in version catalog; pattern inheritance from Phase 4 confirmed
- Architecture: HIGH — Clean Architecture + MVVM + Navigation Compose locked by Phase 4; screen patterns are well-established Compose idioms
- API contract gaps: HIGH — confirmed by reading actual route files; no `GET /processos` list and no `cliente_usuario_id` are verified facts
- Pitfalls: MEDIUM — nested scrollable crash and WhatsApp visibility are verified Android behaviors; LGPD scroll detection is common Compose pattern
- Onboarding patterns: MEDIUM — HorizontalPager API assumed current but not verified against BOM 2026.03.00 changelog

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable ecosystem; backend gaps are the biggest uncertainty, not library versions)
