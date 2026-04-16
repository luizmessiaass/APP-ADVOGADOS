---
phase: 04-android-app-fluxo-advogado
verified: 2026-04-16T20:00:00Z
status: gaps_found
score: 16/19 must-haves verified
overrides_applied: 0
gaps:
  - truth: "MovimentacaoCard exibe o disclaimer 'Explicação gerada por IA' no topo do card (acima do texto)"
    status: failed
    reason: "O MovimentacaoCard em core-ui foi reimplementado com assinatura completamente diferente (movimentacao: Movimentacao, onExpandToggle, isExpanded). O disclaimer foi explicitamente removido por decisão de produto — o KDoc do arquivo diz 'D-06: Sem disclaimer Explicação gerada por IA (removido por decisão de produto)'. A assinatura original com parâmetros individuais (status, explicacao, impacto, proximaData, disclaimer) não existe mais."
    artifacts:
      - path: "core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/MovimentacaoCard.kt"
        issue: "Assinatura atual: (movimentacao: Movimentacao, onExpandToggle: () -> Unit, isExpanded: Boolean). Sem parâmetro disclaimer. Sem Surface badge de disclaimer no topo. Decisão de produto explícita no KDoc."
    missing:
      - "Decisão explícita documentada em CONTEXT.md ou DECISIONS.md sobre remoção do disclaimer do MovimentacaoCard"
      - "OU: Reverter a decisão e restaurar o disclaimer visível no topo do card conforme ESCR-06 must_have e AI-06"

  - truth: "Cada MovimentacaoCard no preview exibe disclaimer no topo — visível sem rolar"
    status: failed
    reason: "Consequência direta da falha anterior. PreviewScreen renderiza MovimentacaoCard com a assinatura atual (sem disclaimer). O comentário no código '// D-10: MovimentacaoCard com disclaimer no TOPO de cada card (implementado em core-ui 04-02)' é impreciso — o disclaimer não está implementado na versão atual do componente."
    artifacts:
      - path: "app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewScreen.kt"
        issue: "Linha 118 tem comentário sobre disclaimer mas MovimentacaoCard não exibe disclaimer. PreviewScreenTest foi alterado para verificar 'O juiz analisa o processo' em vez do disclaimer."
    missing:
      - "Disclaimer visível no MovimentacaoCard quando usado na PreviewScreen"
      - "OU: override aceito documentando que a decisão de produto de remover o disclaimer é intencional e aceitável"

  - truth: "ProcessoStatusCard exibe ultima_sincronizacao recebida como parâmetro"
    status: failed
    reason: "ProcessoStatusCard foi reimplementado com assinatura (status: String?, impacto: String?, isLoading: Boolean) — sem parâmetro ultimaSincronizacao. O sync DataJud é exibido via campo impacto: 'Última sync: $it', o que semanticamente mistura o campo de impacto AI com informação técnica de sync. A ESCR-08 é atendida parcialmente mas de forma imprecisa."
    artifacts:
      - path: "core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/ProcessoStatusCard.kt"
        issue: "Assinatura: (status: String?, impacto: String?, isLoading: Boolean). Sem campo ultimaSincronizacao dedicado. Sync DataJud é exibido via campo impacto."
      - path: "app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheScreen.kt"
        issue: "Linha 114: impacto = cliente.ultimaSincronizacao?.let { 'Última sync: \$it' } — usa campo impacto para exibir sync timestamp, não semântico."
    missing:
      - "Parâmetro dedicado ultimaSincronizacao em ProcessoStatusCard"
      - "OU: override documentando que o uso do campo impacto para sync timestamp é aceitável para v1"
---

# Phase 04: app_escritorio — Verification Report

**Phase Goal:** Deliver the complete lawyer flow Android app (app-escritorio) with authentication, client list with search, client registration with CPF/CNJ validation, client detail with DataJud sync status, "preview as client" screen, manual message sending, and Stripe subscription portal — all backed by Clean Architecture (Retrofit + Hilt + DataStore) wired to the backend from Phases 1-2.
**Verified:** 2026-04-16T20:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | O módulo :core-network compila com Kotlin plugin, Retrofit 3, OkHttp 4.12, Moshi 1.15.2 | VERIFIED | `gradle/libs.versions.toml`: retrofit="3.0.0", okhttp="4.12.0", moshi="1.15.2". Build files com plugins ksp + hilt.android. |
| 2 | O AuthInterceptor injeta 'Authorization: Bearer {token}' em toda requisição autenticada | VERIFIED | `AuthInterceptor.kt` usa `TokenProvider.getToken()` via `runBlocking` e adiciona header `Authorization`. |
| 3 | O TokenDataStore lê e grava JWT como String no DataStore Preferences | VERIFIED | `TokenDataStore.kt`: `stringPreferencesKey("jwt_token")`, `getTokenFlow()`, `getToken()` (suspend), `saveToken`, `clearToken`. |
| 4 | O JwtDecoder extrai app_metadata.role do payload JWT sem round-trip ao backend | VERIFIED | `JwtDecoder.kt`: `jwt.getClaim("app_metadata").asObject(Map::class.java)?.get("role")` + `isExpired()`. |
| 5 | O NetworkModule provê OkHttpClient, Moshi, Retrofit e ClienteApi via Hilt | VERIFIED | `NetworkModule.kt` em `SingletonComponent`: provê OkHttpClient, Moshi, Retrofit, AuthApi, ClienteApi. |
| 6 | CPF inválido como 111.111.111-11 é rejeitado pela função isValidCpf | VERIFIED | `CpfValidator.kt`: guard `if (digits.all { it == digits[0] }) return false` presente na linha 12. |
| 7 | CNJ com ou sem formatação é normalizado e validado corretamente | VERIFIED | `CnjValidator.kt`: `normalizeCnj` só normaliza strings de 20 dígitos puros; `isValidCnjFormat` usa regex. |
| 8 | MovimentacaoCard exibe o disclaimer 'Explicação gerada por IA' no topo do card (acima do texto) | FAILED | Componente reimplementado com assinatura diferente. KDoc explícito: "D-06: Sem disclaimer removido por decisão de produto". |
| 9 | ProcessoStatusCard exibe ultima_sincronizacao recebida como parâmetro | FAILED | Assinatura atual: (status, impacto, isLoading). Sem parâmetro ultimaSincronizacao. Sync exibido via campo impacto. |
| 10 | Ao abrir o app com token válido de advogado, usuário é navegado automaticamente para clientes | VERIFIED | `EscritorioNavGraph.kt`: LaunchedEffect verifica `getSavedToken()` + `isValidAdvogadoToken()` → navega para ClienteLista. |
| 11 | Login com email/senha corretos salva o token no DataStore e navega para clientes | VERIFIED | `LoginViewModel` → `AuthRepository.login()` → `tokenDataStore.saveToken()` → `LoginUiState.Success` → navegação. |
| 12 | Campo de busca na lista filtra clientes por nome/CPF/processo em tempo real | VERIFIED | `ClienteListViewModel.filterClientes()` filtra por nome + CPF (apenas dígitos) + ultimaSincronizacao. `ClienteListScreen` tem `OutlinedTextField`. |
| 13 | Campo CPF exibe erro em tempo real após primeiro blur quando CPF é inválido | VERIFIED | `CadastroClienteViewModel.onCpfBlur()` usa `isValidCpf(digits)` e seta `cpfError`. Screen usa `isError = formState.cpfError != null`. |
| 14 | Ao submeter cadastro, app faz POST /api/v1/clientes e navega em sucesso | VERIFIED | `CadastroClienteViewModel.cadastrar()` → `clienteRepository.cadastrarCliente()` → `CadastroUiState.Success`. NavGraph faz `popBackStack()`. |
| 15 | Tela de detalhe exibe ultima_sincronizacao do processo (ESCR-08) | PARTIAL | Sync exibido via `ProcessoStatusCard(impacto = cliente.ultimaSincronizacao?.let { "Última sync: $it" })`. Funcional mas semanticamente impreciso — usa campo `impacto` para dado técnico. |
| 16 | Preview é tela separada com LazyColumn de MovimentacaoCard usando componente de :core-ui | VERIFIED | `PreviewScreen.kt` importa `MovimentacaoCard` de `com.aethixdigital.portaljuridico.ui.components.MovimentacaoCard`. LazyColumn com `items(state.movimentacoes)`. |
| 17 | Cada MovimentacaoCard no preview exibe disclaimer no topo — visível sem rolar | FAILED | MovimentacaoCard atual não tem disclaimer. PreviewScreenTest foi alterado para verificar `explicacao` em vez de disclaimer. |
| 18 | Botão 'Enviar mensagem' abre ModalBottomSheet com campo de texto e botão Enviar | VERIFIED | `MensagemBottomSheet.kt` usa `ModalBottomSheet`. `ClienteDetalheScreen` controla `showMensagemSheet`. Botão Enviar desabilitado quando texto vazio. |
| 19 | Botão 'Gerenciar assinatura' busca portal URL e abre Chrome Custom Tabs | VERIFIED | `StripePortalLauncher.openStripePortal()` usa `CustomTabsIntent.Builder()`. `ClienteDetalheViewModel.loadPortalUrl()` busca URL do backend. |

**Score:** 16/19 truths verified (3 failed/partial)

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `gradle/libs.versions.toml` | VERIFIED | retrofit="3.0.0", okhttp="4.12.0", moshi="1.15.2", navigationCompose, datastore, jwtdecode, browser, turbine, kotlinxSerializationJson |
| `core-network/build.gradle.kts` | VERIFIED | plugins: android.library + ksp + hilt.android. Sem kotlin.android explícito (convenção do projeto via hilt.android) |
| `core-network/.../di/NetworkModule.kt` | VERIFIED | @Module @InstallIn(SingletonComponent). Provê OkHttpClient, Moshi, Retrofit, AuthApi, ClienteApi |
| `core-network/.../interceptor/AuthInterceptor.kt` | VERIFIED | @Singleton. Usa TokenProvider via runBlocking. Adiciona header Authorization: Bearer |
| `core-network/.../interceptor/TokenProvider.kt` | VERIFIED | Interface introduzida para desacoplar core-network de core-data (circular dep fix) |
| `core-data/.../auth/TokenDataStore.kt` | VERIFIED | @Singleton. DataStore key "jwt_token". getTokenFlow(), getToken(), saveToken(), clearToken() |
| `core-data/.../auth/JwtDecoder.kt` | VERIFIED | extractRole() via getClaim("app_metadata"). isExpired() via JWT(token).isExpired(0) |
| `core-common/.../validation/CpfValidator.kt` | VERIFIED | isValidCpf() com guard all-same-digits. formatCpf() |
| `core-common/.../validation/CnjValidator.kt` | VERIFIED | isValidCnjFormat() com CNJ_PATTERN regex. normalizeCnj() apenas para 20 dígitos puros |
| `core-ui/.../components/MovimentacaoCard.kt` | STUB | Assinatura completamente diferente do plano. Disclaimer removido por decisão de produto. |
| `core-ui/.../components/ProcessoStatusCard.kt` | PARTIAL | Existe e compila. Assinatura mudou: sem ultimaSincronizacao dedicado. |
| `app-escritorio/.../navigation/EscritorioRoute.kt` | VERIFIED | sealed interface com 5 rotas @Serializable: Login, ClienteLista, ClienteDetalhe, CadastroCliente, PreviewCliente |
| `app-escritorio/.../navigation/EscritorioNavGraph.kt` | VERIFIED | 5 rotas wired. Todas as telas reais (sem stubs). Routing automático. |
| `app-escritorio/.../feature/login/LoginViewModel.kt` | VERIFIED | @HiltViewModel. LoginUiState: Idle/Loading/Success/Error. login() via AuthRepository |
| `app-escritorio/.../feature/login/LoginScreen.kt` | VERIFIED | Campos email/senha. PasswordVisualTransformation. CircularProgressIndicator em loading. |
| `app-escritorio/.../feature/clientes/list/ClienteListViewModel.kt` | VERIFIED | onSearchQueryChange() + filterClientes() com filtro nome+CPF |
| `app-escritorio/.../feature/clientes/list/ClienteListScreen.kt` | VERIFIED | OutlinedTextField busca + LazyColumn + ClienteCard com badge |
| `app-escritorio/.../feature/clientes/cadastro/CadastroClienteViewModel.kt` | VERIFIED | isValidCpf + isValidCnjFormat + normalizeCnj. onCpfBlur() + onCnjBlur(). cadastrar() |
| `app-escritorio/.../feature/clientes/cadastro/CadastroClienteScreen.kt` | VERIFIED | 4 campos com isError inline. Botão desabilitado sem validação. |
| `app-escritorio/.../feature/clientes/detalhe/ClienteDetalheScreen.kt` | VERIFIED | ProcessoStatusCard (sync). Botões Ver como cliente + Enviar mensagem + Gerenciar assinatura |
| `app-escritorio/.../feature/clientes/detalhe/ClienteDetalheViewModel.kt` | VERIFIED | loadPortalUrl() via getPortalSessionUrl(). portalUrl StateFlow. |
| `app-escritorio/.../feature/preview/PreviewScreen.kt` | PARTIAL | LazyColumn com MovimentacaoCard de :core-ui. Sem disclaimer no card. |
| `app-escritorio/.../feature/preview/PreviewViewModel.kt` | VERIFIED | PreviewUiState: Loading/Success/Empty/Error. previewCliente() via ClienteRepository |
| `app-escritorio/.../feature/clientes/detalhe/MensagemBottomSheet.kt` | VERIFIED | ModalBottomSheet. Auto-dismiss após sucesso. Fire-and-forget. |
| `app-escritorio/.../feature/clientes/detalhe/MensagemViewModel.kt` | VERIFIED | guard isBlank(). enviar() com fold Success/Error. resetState() |
| `app-escritorio/.../feature/clientes/detalhe/StripePortalLauncher.kt` | VERIFIED | openStripePortal() com CustomTabsIntent.Builder().setShowTitle(true).build() |
| `app-escritorio/src/androidTest/.../HiltTestRunner.kt` | VERIFIED | extends AndroidJUnitRunner. newApplication() usa HiltTestApplication |
| `.github/workflows/android-ci.yml` | VERIFIED | job app-escritorio-ci: lint + test + assembleDebug |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| NetworkModule | AuthInterceptor | OkHttpClient.Builder().addInterceptor(authInterceptor) | VERIFIED — TokenProvider interface desacopla |
| AuthInterceptor | TokenProvider (TokenDataStore) | runBlocking { tokenProvider.getToken() } | VERIFIED |
| NetworkModule | ClienteApi | retrofit.create(ClienteApi::class.java) | VERIFIED |
| LoginViewModel | AuthRepository.login | viewModelScope.launch { authRepository.login() } | VERIFIED |
| MainActivity | EscritorioNavGraph | setContent { EscritorioNavGraph(authRepository) } | VERIFIED |
| EscritorioNavGraph | LoginScreen/ClienteListScreen | composable<EscritorioRoute.Login> { LoginScreen } + hiltViewModel() | VERIFIED |
| CadastroClienteScreen | CpfValidator.isValidCpf | isValidCpf (import de core-common) em onCpfBlur() | VERIFIED |
| CadastroClienteViewModel | ClienteRepository.cadastrarCliente | viewModelScope.launch { clienteRepository.cadastrarCliente(...) } | VERIFIED |
| PreviewScreen | MovimentacaoCard (core-ui) | items { MovimentacaoCard(movimentacao=...) } | VERIFIED (sem disclaimer) |
| PreviewViewModel | ClienteRepository.previewCliente | viewModelScope.launch { clienteRepository.previewCliente(clienteId) } | VERIFIED |
| ClienteDetalheScreen | EscritorioRoute.PreviewCliente | onPreviewClick → navController.navigate(PreviewCliente(clienteId)) | VERIFIED |
| ClienteDetalheScreen | MensagemBottomSheet | showMensagemSheet=true → MensagemBottomSheet visível | VERIFIED |
| MensagemViewModel | ClienteRepository.enviarMensagem | viewModelScope.launch { clienteRepository.enviarMensagem(clienteId, texto) } | VERIFIED |
| ClienteDetalheScreen | StripePortalLauncher.openStripePortal | LaunchedEffect(portalUrl) → openStripePortal(context, url) | VERIFIED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ESCR-01 | 04-03 | Advogado consegue fazer login com email/senha | SATISFIED | LoginScreen + LoginViewModel + AuthRepository wired |
| ESCR-02 | 04-04 | Advogado consegue cadastrar novo cliente (nome, CPF, email, CNJ) | SATISFIED | CadastroClienteScreen com 4 campos + POST /api/v1/clientes |
| ESCR-03 | 04-02, 04-04 | Validação de CPF e CNJ acontece no formulário antes de submeter | SATISFIED | isValidCpf + isValidCnjFormat em CadastroClienteViewModel. 14 testes unitários. |
| ESCR-04 | 04-03 | Advogado visualiza lista de clientes com status resumido | SATISFIED | ClienteListScreen com ClienteCard (nome, CPF, statusProcesso badge) |
| ESCR-05 | 04-03 | Advogado busca cliente por nome, CPF ou número de processo | SATISFIED | ClienteListViewModel.filterClientes() + OutlinedTextField busca |
| ESCR-06 | 04-05 | Advogado visualiza processo "como o cliente vê" | PARTIAL | PreviewScreen existe e mostra movimentações traduzidas. Disclaimer ausente nos cards — produto removeu. |
| ESCR-07 | 04-06 | Advogado envia mensagem/aviso manual via app | SATISFIED | MensagemBottomSheet + POST /api/v1/clientes/{id}/mensagens |
| ESCR-08 | 04-05, 04-06 | Tela do cliente mostra status da última sincronização DataJud | PARTIAL | ProcessoStatusCard exibe sync via campo impacto ("Última sync: ..."). Funcional mas não semanticamente correto. |
| ESCR-09 | 04-06 | Advogado acessa Stripe Customer Portal via Chrome Custom Tabs | SATISFIED | StripePortalLauncher com CustomTabsIntent. loadPortalUrl() busca URL. |
| ESCR-10 | 04-01..04-07 | Clean Architecture + MVVM + Compose com módulos :core-* | SATISFIED | core-network, core-data, core-common, core-ui separados. Hilt DI. Repository pattern. ViewModel + StateFlow. |
| ESCR-11 | 04-07 | Passa lint + unit tests + UI tests no CI | SATISFIED | HiltTestRunner + 5 UI test files. CI job app-escritorio-ci: lint + test + assembleDebug. |

### Anti-Patterns Found

| File | Padrão | Severidade | Impacto |
|------|--------|------------|---------|
| `core-ui/.../MovimentacaoCard.kt` (linha 27) | Comentário contradiz requisito: "D-06: Sem disclaimer (removido por decisão de produto)" enquanto plans 04-02 e 04-05 exigem disclaimer | Blocker | ESCR-06 must_have + AI-06 compliance em risco |
| `app-escritorio/.../PreviewScreen.kt` (linha 118) | Comentário "// D-10: MovimentacaoCard com disclaimer no TOPO" é falso — disclaimer não existe | Warning | Comentário enganoso que indica divergência entre código e intenção |
| `app-escritorio/.../ClienteDetalheScreen.kt` (linha 114) | `impacto = cliente.ultimaSincronizacao?.let { "Última sync: $it" }` mistura semântica de impacto AI com timestamp técnico | Warning | Semanticamente incorreto: campo impacto deveria ser explicação do que o status significa para o cliente |

### Behavioral Spot-Checks

Step 7b: SKIPPED — este é um projeto Android sem servidor HTTP rodando localmente. Verificações programáticas de comportamento requerem emulador ou device.

### Human Verification Required

#### 1. Disclaimer de IA em MovimentacaoCard — Decisão de Produto vs Requisito

**Test:** Verificar se a remoção do disclaimer "Explicação gerada por IA" do MovimentacaoCard é uma decisão de produto intencional e documentada, ou uma omissão acidental.
**Expected:** Se intencional: documentar no DECISIONS.md ou CONTEXT.md a justificativa, e criar override neste arquivo VERIFICATION.md. Se acidental: restaurar o disclaimer como primeiro elemento visual no card.
**Why human:** A mudança foi feita durante a execução (Plan 07 SUMMARY menciona "ajuste de teste" para disclaimer). Não está claro se o product owner autorizou explicitamente esta mudança. AI-06 exige disclaimer visível — mas AI-06 é um requisito de Phase 3 (backend), não Phase 4. A ambiguidade requer decisão humana.

#### 2. ProcessoStatusCard sem campo dedicado para ultimaSincronizacao

**Test:** Verificar se usar o campo `impacto` para exibir o timestamp de sincronização ("Última sync: há 2 horas") é aceitável para v1.
**Expected:** Se aceitável: criar override. Se não: adicionar parâmetro `ultimaSincronizacao: String?` dedicado ao ProcessoStatusCard.
**Why human:** A decisão afeta como a UI comunica informação técnica (sync) vs informação de impacto (o que o status significa para o cliente). São dois tipos de informação distintos, mas o impacto para o usuário pode ser negligível em v1.

## Gaps Summary

A Phase 4 entregou uma fundação técnica sólida: Clean Architecture completa (Retrofit 3 + Hilt + DataStore + Repository pattern), todos os 11 requisitos ESCR coberidos com implementação real, 14+ testes unitários passando, HiltTestRunner com 5 UI tests, e CI verde.

Os 3 gaps identificados compartilham uma raiz comum: **a reimplementação dos componentes MovimentacaoCard e ProcessoStatusCard** no Plan 07 usou assinaturas diferentes das especificadas nos Plans 02 e 05. Esta reimplementação foi necessária para compilar (os componentes existentes no disco tinham evoluído durante a Phase 4) mas criou divergências com os must-haves documentados.

**Gap crítico:** O disclaimer "Explicação gerada por IA" foi removido explicitamente por decisão de produto (D-06). Esta decisão não estava documentada nos planos originais e contradiz: (a) must_have do Plan 04-02, (b) must_have do Plan 04-05, (c) o requisito AI-06 (embora AI-06 seja de Phase 3). O PreviewScreenTest foi atualizado para não verificar o disclaimer — o que significa que o CI não detecta esta divergência.

Para fechar os gaps, o desenvolvedor deve escolher entre duas opções:
1. **Aceitar a decisão de produto** de remover o disclaimer, documentá-la formalmente, e criar overrides neste arquivo.
2. **Restaurar o disclaimer** como primeiro elemento visual em MovimentacaoCard e ajustar ProcessoStatusCard para ter parâmetro dedicado `ultimaSincronizacao`.

---

_Verified: 2026-04-16T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
