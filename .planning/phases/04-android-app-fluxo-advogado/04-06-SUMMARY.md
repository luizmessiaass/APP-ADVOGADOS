---
phase: 04-android-app-fluxo-advogado
plan: 06
subsystem: ui
tags: [android, compose, bottomsheet, stripe, chrome-custom-tabs, mvvm, hilt, coroutines, tdd]

# Dependency graph
requires:
  - phase: 04-android-app-fluxo-advogado/04-05
    provides: ClienteDetalheScreen e ClienteDetalheViewModel base
  - phase: 04-android-app-fluxo-advogado/04-01
    provides: ClienteApi com enviarMensagem e getPortalSession definidos
provides:
  - MensagemViewModel com sealed UiState (Idle/Loading/Success/Error) e guard blank text
  - MensagemBottomSheet com ModalBottomSheet Material3, auto-dismiss e feedback visual
  - StripePortalLauncher via CustomTabsIntent (Chrome Custom Tabs)
  - ClienteRepository interface estendida com enviarMensagem e getPortalSessionUrl
  - ClienteDetalheViewModel com loadPortalUrl() e portalUrl/portalError StateFlow
  - 6 testes unitarios MensagemViewModelTest cobrindo ESCR-07
affects:
  - 05-android-app-fluxo-cliente
  - 06-push-notifications

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ModalBottomSheet Material3 com auto-dismiss via LaunchedEffect + delay
    - Chrome Custom Tabs via CustomTabsIntent.Builder para URLs externas in-app
    - Fire-and-forget com feedback visual (D-13): Loading->Success/Error sem bloqueio de UI
    - TDD RED/GREEN: teste criado antes da implementacao, compilacao confirma GREEN

key-files:
  created:
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/MensagemViewModel.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/MensagemBottomSheet.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/StripePortalLauncher.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/MensagemViewModelTest.kt
  modified:
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/repository/ClienteRepository.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheViewModel.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheScreen.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/navigation/EscritorioNavGraph.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListViewModelTest.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteViewModelTest.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewViewModelTest.kt

key-decisions:
  - "Bottom Sheet de mensagem gerenciado internamente em ClienteDetalheScreen via showMensagemSheet: Boolean state — onEnviarMensagemClick removido da assinatura publica da screen"
  - "portalUrl exposto como StateFlow nullable — LaunchedEffect observa e abre CCT automaticamente quando URL chega"
  - "auto-dismiss do Bottom Sheet via LaunchedEffect(uiState) + delay(1500ms) para mostrar feedback de sucesso antes de fechar"

patterns-established:
  - "ModalBottomSheet condicional: if (showSheet) { MensagemBottomSheet(...) } — evita recomposicao desnecessaria"
  - "Chrome Custom Tabs via openStripePortal(context, url) top-level function — testavel e reusavel"
  - "Guard blank text em ViewModel: if (texto.isBlank()) return — validacao leve sem state de erro"

requirements-completed:
  - ESCR-07
  - ESCR-09
  - ESCR-10

# Metrics
duration: 25min
completed: 2026-04-16
---

# Phase 04 Plan 06: MensagemBottomSheet + Stripe Portal Summary

**ModalBottomSheet fire-and-forget para mensagem manual (ESCR-07) e Stripe Customer Portal via Chrome Custom Tabs (ESCR-09), completando o fluxo funcional do app-escritorio**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-16T13:30:00Z
- **Completed:** 2026-04-16T13:55:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 11

## Accomplishments

- MensagemViewModel com sealed UiState, guard blank text e fire-and-forget via coroutine
- MensagemBottomSheet Material3 com auto-dismiss 1.5s apos sucesso e feedback visual de erro
- StripePortalLauncher usando CustomTabsIntent.Builder (nao startActivity ACTION_VIEW)
- ClienteRepository estendido com enviarMensagem e getPortalSessionUrl
- ClienteDetalheViewModel com loadPortalUrl() e portalUrl/portalError StateFlow
- ClienteDetalheScreen integrado: botao Enviar mensagem abre BottomSheet local; botao Gerenciar assinatura dispara loadPortalUrl() com LaunchedEffect abrindo CCT
- 6 testes unitarios MensagemViewModelTest passando (0 falhas)

## Task Commits

1. **Task 1 RED: testes + ClienteRepository** - `019a448` (test)
2. **Task 1 GREEN: implementacao completa** - `046eb89` (feat)

## Files Created/Modified

- `core-data/.../repository/ClienteRepository.kt` — interface + impl com enviarMensagem e getPortalSessionUrl
- `app-escritorio/.../detalhe/MensagemViewModel.kt` — ViewModel com sealed UiState e guard blank
- `app-escritorio/.../detalhe/MensagemBottomSheet.kt` — ModalBottomSheet com auto-dismiss e feedback
- `app-escritorio/.../detalhe/StripePortalLauncher.kt` — fun openStripePortal via CustomTabsIntent
- `app-escritorio/.../detalhe/ClienteDetalheViewModel.kt` — adiciona loadPortalUrl(), portalUrl, portalError
- `app-escritorio/.../detalhe/ClienteDetalheScreen.kt` — integra BottomSheet, botao Stripe, LaunchedEffect CCT
- `app-escritorio/.../navigation/EscritorioNavGraph.kt` — remove onEnviarMensagemClick (internalized)
- `app-escritorio/.../detalhe/MensagemViewModelTest.kt` — 6 testes unitarios (criado)
- Tres FakeRepository existentes atualizados com os novos metodos da interface

## Decisions Made

- `onEnviarMensagemClick` removido da assinatura publica de `ClienteDetalheScreen` — o Bottom Sheet e gerenciado por estado local interno (`showMensagemSheet`), eliminando callback desnecessario no NavGraph
- `portalUrl` exposto como `StateFlow<String?>` e observado via `LaunchedEffect` — abre CCT automaticamente quando URL chega, sem necessidade de event channel adicional
- Auto-dismiss via `LaunchedEffect(uiState)` + `delay(1500)` — padrao simples e correto para feedback temporario sem timer externo

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removido onEnviarMensagemClick da assinatura da screen e do NavGraph**
- **Found during:** Task 1 GREEN (integracao do BottomSheet na ClienteDetalheScreen)
- **Issue:** O plano definia substituir `onEnviarMensagemClick` por estado local, mas a assinatura publica ainda tinha o parametro — o NavGraph passava `onEnviarMensagemClick = { _ -> }` como stub, que causaria falha de compilacao apos remover o parametro
- **Fix:** Removido o parametro da assinatura da screen e atualizado o NavGraph para nao passa-lo
- **Files modified:** ClienteDetalheScreen.kt, EscritorioNavGraph.kt
- **Verification:** assembleDebug BUILD SUCCESSFUL
- **Committed in:** 046eb89

**2. [Rule 2 - Missing Critical] FakeRepositories existentes atualizados com novos metodos da interface**
- **Found during:** Task 1 RED (extensao da interface ClienteRepository)
- **Issue:** Tres FakeRepository em testes existentes nao implementavam os novos metodos `enviarMensagem` e `getPortalSessionUrl` — causaria falha de compilacao em todos os testes existentes
- **Fix:** Adicionados os dois metodos com implementacoes padrao em FakeCadastroClienteRepository, FakeClienteRepository e FakePreviewClienteRepository
- **Files modified:** CadastroClienteViewModelTest.kt, ClienteListViewModelTest.kt, PreviewViewModelTest.kt
- **Verification:** testDebugUnitTest BUILD SUCCESSFUL — todos os testes existentes continuam passando
- **Committed in:** 019a448

---

**Total deviations:** 2 auto-fixed (1 bug/compilacao, 1 missing critical/interface compliance)
**Impact on plan:** Ambas as correcoes necessarias para compilacao e corretude. Sem escopo adicional.

## Issues Encountered

Nenhum — compilacao e testes passaram na primeira tentativa apos implementacao completa.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ESCR-07 (mensagem manual) e ESCR-09 (Stripe portal) cobertos e funcionais
- Phase 04 (app-escritorio) agora tem todos os features funcionais implementados: login, lista de clientes, cadastro, detalhe, preview, mensagem e portal Stripe
- Phase 05 (app-cliente) pode reutilizar MovimentacaoCard, ProcessoStatusCard e padroes MVVM estabelecidos
- Verificacao manual no emulador recomendada antes de fechar a phase (ver secao Verification no plano)

## Self-Check

- [x] MensagemViewModel.kt existe: FOUND
- [x] MensagemBottomSheet.kt existe: FOUND
- [x] StripePortalLauncher.kt existe: FOUND
- [x] MensagemViewModelTest.kt existe: FOUND
- [x] Commit 019a448 existe: FOUND
- [x] Commit 046eb89 existe: FOUND
- [x] 6 testes passando, 0 falhas: CONFIRMED
- [x] assembleDebug BUILD SUCCESSFUL: CONFIRMED

## Self-Check: PASSED

---
*Phase: 04-android-app-fluxo-advogado*
*Completed: 2026-04-16*
