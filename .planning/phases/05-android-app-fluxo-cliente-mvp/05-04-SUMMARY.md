---
phase: 05-android-app-fluxo-cliente-mvp
plan: "04"
subsystem: android-cliente-onboarding-lgpd
tags: [android, compose, viewmodel, hilt, datastore, onboarding, lgpd, navigation, pager]
dependency_graph:
  requires:
    - 05-02 (DataStore keys ONBOARDING_SEEN_KEY, LGPD_ACCEPTED_KEY, clienteDataStore; Routes.kt)
    - 05-03 (ClienteApi.postConsentimento, ConsentimentoRequest, ClienteNavGraph base, ProcessoListScreen)
  provides:
    - OnboardingScreen (4-page HorizontalPager, BackHandler no-op page 0, PagerDots, Proximo/Comecar)
    - OnboardingViewModel (markOnboardingComplete — persists onboarding_seen=true)
    - LgpdConsentScreen (LazyColumn 10 items, derivedStateOf scroll detection, checkbox, Accept/Reject AlertDialog)
    - LgpdConsentViewModel (acceptConsent POST + DataStore, rejectConsent logout + clear)
    - ClienteNavGraph fully wired — all routes have real screen implementations, no TODO stubs
  affects:
    - 05-05 (UI tests that reference LgpdConsentScreen and OnboardingScreen by name)
tech_stack:
  added:
    - HorizontalPager + rememberPagerState (androidx.compose.foundation.pager)
    - BackHandler (androidx.activity.compose) for onboarding back navigation
    - derivedStateOf with LazyListState.layoutInfo for scroll-end detection
    - testTag("lgpd_checkbox") for Compose UI test instrumentation
  patterns:
    - 10-item LazyColumn split (8 policy blocks + checkbox + accept + reject) to ensure totalItemsCount > 1
    - derivedStateOf { lastVisible.index >= totalItems - 1 && totalItems > 0 } for Accept button gating
    - BackHandler on LGPD screen triggers AlertDialog (not silent pop)
    - popUpTo(0) { inclusive = true } on logout to clear entire back stack
key_files:
  created:
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/onboarding/OnboardingViewModel.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/onboarding/OnboardingScreen.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/lgpd/LgpdConsentViewModel.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/lgpd/LgpdConsentScreen.kt
    - app-cliente/src/main/res/drawable/ic_onboarding_processos.xml
    - app-cliente/src/main/res/drawable/ic_onboarding_datas.xml
    - app-cliente/src/main/res/drawable/ic_onboarding_notificacoes.xml
    - app-cliente/src/main/res/drawable/ic_onboarding_whatsapp.xml
    - app-cliente/src/androidTest/java/com/aethixdigital/portaljuridico/cliente/OnboardingScreenTest.kt
    - app-cliente/src/androidTest/java/com/aethixdigital/portaljuridico/cliente/LgpdConsentScreenTest.kt
  modified:
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/navigation/ClienteNavGraph.kt (LGPD_CONSENT stub replaced; LgpdConsentScreen import added)
    - app-cliente/src/demo/res/values/strings.xml (app_name updated to "Portal Juridico (Demo)")
decisions:
  - "OnboardingScreen e OnboardingViewModel ja estavam no HEAD (commitados no commit 263e5af pela quick task Editorial Juris) — sem necessidade de novo commit para Task 1; verificado que o conteudo atendia todos os criterios D-09/D-10"
  - "ConsentimentoRequest usa campo versaoTermos (Kotlin camelCase) com @Json(name=versao_termos) — ajuste aplicado no ViewModel ao detectar a assinatura real do DTO"
  - "LazyColumn com 10 item{} blocks em vez de 8 minimos: 8 secoes de politica + 1 checkbox item + 1 accept button item + 1 reject link item — garante totalItemsCount >> 1 em qualquer tamanho de tela"
metrics:
  duration: "25m"
  completed: "2026-04-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 10
  files_modified: 2
---

# Phase 05 Plan 04: OnboardingScreen + LgpdConsentScreen Summary

**One-liner:** Onboarding de 4 paginas sem skip (BackHandler no-op na pagina 0) e gate LGPD com LazyColumn, deteccao de scroll por derivedStateOf e AlertDialog de rejeicao com logout completo.

## What Was Built

### Tarefa 1 — OnboardingScreen + ViewModel + VectorDrawables

**OnboardingViewModel** (`features/onboarding`): `@HiltViewModel` que expoe `markOnboardingComplete()` — escreve `ONBOARDING_SEEN_KEY = true` no DataStore via `viewModelScope.launch`.

**OnboardingScreen** (`features/onboarding`): `HorizontalPager` com 4 paginas definidas em `onboardingPages` (lista privada de `OnboardingPageData`). `BackHandler` no-op na pagina 0; nas paginas 1-3 navega para a pagina anterior via `animateScrollToPage`. Botao full-width com label "Proximo" (paginas 0-2) e "Comecar" (pagina 3). Sem botao "Pular" em nenhuma pagina. `PagerDots` de `:core-ui` centralizado abaixo do pager. Background `MaterialTheme.colorScheme.surfaceVariant` (`#F0F4F8`).

**4 VectorDrawable placeholders** (240dp x 240dp, cor `#1A56DB`):
- `ic_onboarding_processos.xml` — icone documento com balao
- `ic_onboarding_datas.xml` — icone calendario
- `ic_onboarding_notificacoes.xml` — icone sino com badge
- `ic_onboarding_whatsapp.xml` — icone balao de chat

**OnboardingScreenTest**: 2 testes instrumentados — `onboarding_showsFourPages` (verifica primeira pagina e ausencia de "Pular") e `onboarding_nextButtonProgressesThroughPages` (clica Proximo 3x verificando cada headline ate "Comecar").

**Observacao:** Os arquivos OnboardingScreen.kt, OnboardingViewModel.kt, os 4 drawables, demo/strings.xml e ClienteNavGraph (stub ONBOARDING substituido) ja estavam no HEAD do repositorio commitados em `263e5af` pela quick task `260416-jt1`. O conteudo atendia todos os criterios do plano — nenhuma alteracao necessaria. Os arquivos recriados nesta sessao foram identicos ao HEAD.

### Tarefa 2 — LgpdConsentScreen + LgpdConsentViewModel + NavGraph

**LgpdConsentViewModel** (`features/lgpd`): `@HiltViewModel` com `UiState` sealed class (Idle/Loading/Success/Error). `acceptConsent()` chama `clienteApi.postConsentimento(ConsentimentoRequest(versaoTermos = "2026-04-15"))` via `runCatching`; em sucesso persiste `LGPD_ACCEPTED_KEY = true`. `rejectConsent()` remove `TOKEN_KEY`, `REFRESH_TOKEN_KEY` e seta `LGPD_ACCEPTED_KEY = false`.

**LgpdConsentScreen** (`features/lgpd`): `Scaffold` + `LazyColumn` com 10 `item{}` blocks:
1. Header "Politica de Privacidade" (titleLarge)
2. Instrucao "Role ate o final para aceitar." (labelLarge, onSurfaceVariant)
3-10. 8 secoes de politica (bodyLarge): coleta, uso, IA, sub-processadores, compartilhamento, direitos LGPD Art.18, seguranca, contato

`derivedStateOf { lastVisible.index >= totalItems - 1 && totalItems > 0 }` para `hasScrolledToEnd`. Checkbox com `testTag("lgpd_checkbox")` habilitado apenas apos scroll-to-end. Botao "Aceitar" habilitado apenas quando `hasScrolledToEnd && checkboxChecked && uiState != Loading`. `BackHandler` abre `AlertDialog` de rejeicao. AlertDialog com titulo "Uso do app requer aceite", confirm "Sair" (error color), dismiss "Cancelar". Ao confirmar rejeicao: `viewModel.rejectConsent()` + `navigate(LOGIN)` com `popUpTo(0) { inclusive = true }`.

**ClienteNavGraph**: substituicao do stub `LGPD_CONSENT` (que usava `ProcessoListScreen` como placeholder) pela chamada real `LgpdConsentScreen(navController = navController)`. Import `LgpdConsentScreen` adicionado. Todos os 5 routes do NavHost agora apontam para implementacoes reais.

**LgpdConsentScreenTest**: 3 testes instrumentados:
- `lgpdConsent_acceptButtonDisabledInitially` — botao "Aceitar" desabilitado ao abrir tela
- `lgpdConsent_acceptButtonEnabledAfterScrollAndCheck` — scroll ate o fim + checkbox habilita botao
- `lgpdConsent_rejectShowsAlertDialog` — clicar "Recusar" exibe AlertDialog com copywriting correto

## Commits

| Tarefa | Commit | Descricao |
|--------|--------|-----------|
| Task 1 | `263e5af` | feat(quick-260416-jt1): ProcessoDetailScreen + ClienteNavGraph full wiring (contem OnboardingScreen, ViewModel, drawables) |
| Task 2 | `01e5e8c` | feat(05-04): LgpdConsentScreen + LgpdConsentViewModel + NavGraph fully wired |

## Decisions Made

1. **OnboardingScreen ja commitado em commit anterior:** Os arquivos da Task 1 foram encontrados no HEAD em `263e5af` (quick task Editorial Juris) com conteudo identico ao plano. Verificados todos os criterios: BackHandler, 4 paginas D-09, sem "Pular", ONBOARDING_SEEN_KEY, 4 drawables. Nenhuma alteracao foi necessaria.

2. **ConsentimentoRequest.versaoTermos vs versao_termos:** O DTO usa `versaoTermos` (camelCase Kotlin) com `@Json(name = "versao_termos")` para serializacao. O plano especificava `versao_termos` diretamente — corrigido para `versaoTermos` ao inspecionar o DTO real em `ClienteDtos.kt`.

3. **10 item{} blocks em vez de 8 minimos:** LazyColumn tem 10 items (8 secoes + checkbox row + accept button + reject link = 11 logicamente, mas checkbox, accept e reject sao items separados). Isso garante que em qualquer tamanho de tela `totalItemsCount` sera muito maior que 1, eliminando o Pitfall 3 do RESEARCH.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ConsentimentoRequest campo errado**
- **Found during:** Criacao do LgpdConsentViewModel — comparacao com DTO real
- **Issue:** O plano especificava `ConsentimentoRequest(versao_termos = "2026-04-15")` mas o DTO usa `versaoTermos` (camelCase) com `@Json(name = "versao_termos")` para serializacao JSON
- **Fix:** Corrigido para `ConsentimentoRequest(versaoTermos = "2026-04-15")`
- **Files modified:** `LgpdConsentViewModel.kt`
- **Commit:** `01e5e8c`

### Observacao sobre Task 1

Os arquivos da Task 1 ja estavam no HEAD commitados pela quick task `260416-jt1-implementar-identidade-visual-editorial-juris`. O conteudo atendia 100% dos criterios de aceitacao do plano 05-04. Nenhuma nova escrita foi necessaria alem dos arquivos de Task 2.

## Known Stubs

Nenhum stub que impeça os objetivos do plano:
- `onConsultorIaClick = { /* chatbot — fase futura */ }` em `ProcessoDetailScreen` — stub intencional documentado em 05-03, conectado em fase futura

## Threat Flags

Nenhuma superficie nova alem do planejado no `<threat_model>` do plano.

- T-05-04-01 (scroll gate bypass): mitigado — server-side POST `/lgpd/consentimento` e o registro auditavel
- T-05-04-03 (falha de rede no aceite): mitigado — UiState.Error exibido, DataStore flag so setado apos sucesso do POST
- T-05-04-05 (skip onboarding para ProcessoList): mitigado — SplashViewModel prioriza `!lgpdAccepted → LGPD_CONSENT`

## Self-Check: PASSED

Arquivos criados/existem:
- `app-cliente/src/main/java/.../features/onboarding/OnboardingViewModel.kt` — FOUND (HEAD: 263e5af)
- `app-cliente/src/main/java/.../features/onboarding/OnboardingScreen.kt` — FOUND (HEAD: 263e5af)
- `app-cliente/src/main/java/.../features/lgpd/LgpdConsentViewModel.kt` — FOUND (commit: 01e5e8c)
- `app-cliente/src/main/java/.../features/lgpd/LgpdConsentScreen.kt` — FOUND (commit: 01e5e8c)
- `app-cliente/src/main/res/drawable/ic_onboarding_processos.xml` — FOUND (HEAD)
- `app-cliente/src/main/res/drawable/ic_onboarding_datas.xml` — FOUND (HEAD)
- `app-cliente/src/main/res/drawable/ic_onboarding_notificacoes.xml` — FOUND (HEAD)
- `app-cliente/src/main/res/drawable/ic_onboarding_whatsapp.xml` — FOUND (HEAD)
- `app-cliente/src/androidTest/.../OnboardingScreenTest.kt` — FOUND (HEAD)
- `app-cliente/src/androidTest/.../LgpdConsentScreenTest.kt` — FOUND (commit: 01e5e8c)

Commits existem:
- `263e5af` — FOUND (feat(quick-260416-jt1): ProcessoDetailScreen + ClienteNavGraph full wiring)
- `01e5e8c` — FOUND (feat(05-04): LgpdConsentScreen + LgpdConsentViewModel + NavGraph fully wired)

Criterios de aceitacao verificados:
- `grep "OnboardingScreen" OnboardingScreen.kt` — FOUND
- `grep "BackHandler" OnboardingScreen.kt` — FOUND
- `grep "linguagem simples" OnboardingScreen.kt` — FOUND
- `grep "Pular" OnboardingScreen.kt` — NOT FOUND (correto — sem skip)
- `grep "ONBOARDING_SEEN" OnboardingViewModel.kt` — FOUND
- 4 drawables ic_onboarding_*.xml — FOUND (4 arquivos)
- `grep "OnboardingScreen" ClienteNavGraph.kt` — FOUND
- `grep "derivedStateOf" LgpdConsentScreen.kt` — FOUND
- `grep "totalItemsCount" LgpdConsentScreen.kt` — FOUND
- `grep "hasScrolledToEnd && checkboxChecked" LgpdConsentScreen.kt` — FOUND
- `grep "Uso do app requer aceite" LgpdConsentScreen.kt` — FOUND
- `grep "LGPD_ACCEPTED_KEY" LgpdConsentViewModel.kt` — FOUND
- `grep "LgpdConsentScreen" ClienteNavGraph.kt` — FOUND
- `grep "TODO" ClienteNavGraph.kt` — NOT FOUND (correto — sem stubs)
