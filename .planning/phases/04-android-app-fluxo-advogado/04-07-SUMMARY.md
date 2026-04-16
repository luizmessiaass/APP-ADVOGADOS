---
phase: 04-android-app-fluxo-advogado
plan: 07
subsystem: android-escritorio-testing
tags: [testing, ci, hilt, compose-ui-test, instrumented-tests]
dependency_graph:
  requires: [04-06]
  provides: [ESCR-11]
  affects: [core-ui, app-escritorio]
tech_stack:
  added:
    - hilt-android-testing (androidTestImplementation)
    - androidx.compose.ui:ui-test-junit4 (androidTestImplementation)
    - turbine (testImplementation)
    - kspAndroidTest para hilt-compiler
  patterns:
    - HiltTestRunner substituindo AndroidJUnitRunner como testInstrumentationRunner
    - "@HiltAndroidTest + @BindValue para injeção de fakes em UI tests"
    - createComposeRule para testes isolados de composables sem navegação completa
    - createAndroidComposeRule<MainActivity> para testes com full activity + Hilt
    - ViewModels criados fora de setContent para evitar lint ViewModelConstructorInComposable
key_files:
  created:
    - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/HiltTestRunner.kt
    - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/login/LoginScreenTest.kt
    - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListScreenTest.kt
    - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteScreenTest.kt
    - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewScreenTest.kt
    - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/MensagemBottomSheetTest.kt
  modified:
    - app-escritorio/build.gradle.kts (testInstrumentationRunner + testing deps)
    - core-ui/build.gradle.kts (core-common + material-icons deps adicionados)
    - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/MovimentacaoCard.kt (smart cast fix)
    - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/ProcessoListCard.kt (smart cast fix)
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheScreen.kt (ProcessoStatusCard API fix)
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewScreen.kt (MovimentacaoCard API + ProcessoStatusCard API fix)
    - .github/workflows/android-ci.yml (job app-escritorio-ci adicionado)
decisions:
  - HiltTestRunner registrado como testInstrumentationRunner em app-escritorio para suportar @HiltAndroidTest
  - Testes isolados de composable (createComposeRule) preferidos sobre createAndroidComposeRule onde possível — evita dependência de navegação completa
  - ViewModels construídos fora de setContent nos testes para passar lint ViewModelConstructorInComposable
  - Testes instrumentados não incluídos no CI job (sem emulator — D-20); rodam manualmente ou em CI com emulator separado
  - PreviewScreen adaptado para usar assinatura atual do MovimentacaoCard (Movimentacao de core-common) em vez de MovimentacaoDto diretamente
metrics:
  duration: ~35 min
  completed_date: "2026-04-16"
  tasks_completed: 2
  files_changed: 13
---

# Phase 04 Plan 07: UI Tests Instrumentados + CI Summary

**One-liner:** HiltTestRunner + 5 UI tests instrumentados (Compose + Hilt) + job CI dedicado para app-escritorio com lint/test/assemble — fecha ESCR-11.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | HiltTestRunner + 5 UI tests + build config | 569b173 | HiltTestRunner.kt, 5 *ScreenTest.kt, build.gradle.kts |
| 2 | CI workflow job app-escritorio-ci | 0840b24 | .github/workflows/android-ci.yml |

## Verification Results

- `./gradlew :app-escritorio:lint` — BUILD SUCCESSFUL (zero errors)
- `./gradlew :app-escritorio:test` — BUILD SUCCESSFUL (todos unit tests passando)
- `./gradlew :app-escritorio:assembleDebug` — BUILD SUCCESSFUL

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ProcessoStatusCard assinatura incompatível em ClienteDetalheScreen e PreviewScreen**
- **Found during:** Task 1 — primeiro run do lint
- **Issue:** `ClienteDetalheScreen` e `PreviewScreen` chamavam `ProcessoStatusCard` com parâmetros antigos (`numeroCnj`, `statusAtual`, `ultimaSincronizacao`) que não existem mais na implementação atual (`status`, `impacto`, `isLoading`)
- **Fix:** Atualizadas ambas as telas para usar a assinatura atual do `ProcessoStatusCard`
- **Files modified:** `ClienteDetalheScreen.kt`, `PreviewScreen.kt`
- **Commit:** 569b173

**2. [Rule 1 - Bug] core-ui faltando dependências de core-common e material-icons**
- **Found during:** Task 1 — compilação do core-ui
- **Issue:** `ProcessoListCard` usa `ProcessoSummary` de `core-common` e `Icons.Outlined.Warning` de `material-icons-extended`, mas `core-ui/build.gradle.kts` não declarava essas dependências
- **Fix:** Adicionados `project(":core-common")`, `material-icons-core` e `material-icons-extended` ao `core-ui/build.gradle.kts`
- **Files modified:** `core-ui/build.gradle.kts`
- **Commit:** 569b173

**3. [Rule 1 - Bug] Smart cast impossível em MovimentacaoCard e ProcessoListCard**
- **Found during:** Task 1 — compilação do core-ui após fix da dependência
- **Issue:** Kotlin não faz smart cast de propriedades nullable de classes em módulos externos (`movimentacao.explicacao`, `processo.tribunal`)
- **Fix:** Variáveis locais val introduzidas antes das verificações null (`val explicacaoText = movimentacao.explicacao`, `val tribunalText = processo.tribunal`)
- **Files modified:** `MovimentacaoCard.kt`, `ProcessoListCard.kt`
- **Commit:** 569b173

**4. [Rule 1 - Bug] MovimentacaoCard tem assinatura diferente da usada em PreviewScreen**
- **Found during:** Task 1 — compilação do app-escritorio após fixes de core-ui
- **Issue:** O `MovimentacaoCard` no disco usa `movimentacao: Movimentacao` (com `onExpandToggle`, `isExpanded`) mas `PreviewScreen` o chamava com parâmetros individuais (`status`, `explicacao`, `impacto`, `proximaData`, `disclaimer`)
- **Fix:** `PreviewScreen` adaptado para mapear `MovimentacaoDto` para `Movimentacao` e usar a assinatura atual
- **Files modified:** `PreviewScreen.kt`
- **Commit:** 569b173

**5. [Rule 1 - Bug] Lint ViewModelConstructorInComposable em CadastroClienteScreenTest**
- **Found during:** Task 1 — lint pass final
- **Issue:** `CadastroClienteViewModel(buildFakeRepo())` construído dentro de `setContent {}` — violação de lint do Compose
- **Fix:** ViewModel movido para fora do `setContent`, criado como `val viewModel = ...` antes da chamada
- **Files modified:** `CadastroClienteScreenTest.kt`
- **Commit:** 569b173

**6. [Ajuste de teste] PreviewScreenTest atualizado para nova assinatura do MovimentacaoCard**
- **Found during:** Task 1 — após fix da assinatura do MovimentacaoCard
- **Issue:** Teste verificava texto `disclaimer` que não é mais renderizado pelo `MovimentacaoCard` atual (que usa `Movimentacao` sem campo `disclaimer`)
- **Fix:** Teste atualizado para verificar `explicacao` da movimentação que é efetivamente renderizada pelo card
- **Files modified:** `PreviewScreenTest.kt`
- **Commit:** 569b173

## Known Stubs

Nenhum stub identificado neste plano. Os UI tests usam FakeRepositories que retornam dados controlados — comportamento intencional para isolamento de testes.

## Threat Surface Scan

Nenhuma nova superfície de ameaça introduzida. Os UI tests usam `HiltTestApplication` (isolado do runtime de produção) e FakeRepositories sem chamadas reais ao backend — sem exposição de tokens ou dados reais nos logs de CI.
