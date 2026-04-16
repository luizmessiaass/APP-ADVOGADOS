---
phase: 05-android-app-fluxo-cliente-mvp
plan: "05"
subsystem: android-cliente-ci-tests
tags: [android, compose, hilt, testing, ci, github-actions]
dependency_graph:
  requires:
    - 05-03 (EmptyTimelineCard em ProcessoDetailScreen, EmptyStateView em ProcessoListScreen)
    - 05-04 (HiltTestRunner em androidTest, OnboardingScreenTest pattern)
  provides:
    - ProcessoDetailScreenEmptyTest (APP-08: empty timeline reassuring card test)
    - ProcessoListScreenTest (error state retry button + empty state tests)
    - GitHub Actions CI job build-app-cliente (lint + test + assemble)
  affects:
    - CI pipeline: todo PR ao main/master agora tem gate de qualidade para app-cliente
tech_stack:
  added:
    - hilt-android-testing (androidTestImplementation) em app-cliente/build.gradle.kts
    - actions/cache@v4 para Gradle cache no CI
    - actions/upload-artifact@v4 para lint report e test results
  patterns:
    - @HiltAndroidTest + HiltAndroidRule(order=0) + createAndroidComposeRule(order=1) para testes Compose com Hilt
    - Testes de componentes isolados (EmptyTimelineCard, EmptyStateView) em vez de tela completa — evita necessidade de ViewModel fake/mock
    - CI jobs paralelos (build-app-cliente + app-escritorio-ci) — sem dependência entre eles
    - Cada step CI como run: separado (nao combinados com &&) para rastreamento individual no GitHub Actions
key_files:
  created:
    - app-cliente/src/androidTest/java/com/aethixdigital/portaljuridico/cliente/ProcessoDetailScreenEmptyTest.kt
    - app-cliente/src/androidTest/java/com/aethixdigital/portaljuridico/cliente/ProcessoListScreenTest.kt
  modified:
    - app-cliente/build.gradle.kts (hilt-android-testing adicionado em androidTestImplementation)
    - .github/workflows/android-ci.yml (job build-app-cliente adicionado; job antigo build removido e substituido; app-escritorio-ci preservado)
decisions:
  - "HiltTestRunner em androidTest (nao src/main): o runner ja existia em app-cliente/src/androidTest desde 04-07 e o build.gradle.kts ja o referenciava corretamente — sem necessidade de mover para src/main"
  - "Testes de componentes isolados em vez de telas completas: EmptyTimelineCard e EmptyStateView testados diretamente, eliminando necessidade de ViewModels fake ou @UninstallModules"
  - "Job antigo build removido do CI: combinava lints de app-cliente e app-escritorio em um unico run — substituido por dois jobs dedicados (build-app-cliente + app-escritorio-ci) para melhor rastreamento"
metrics:
  duration: "15m"
  completed: "2026-04-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 05 Plan 05: Testes de UI e CI Gateway Summary

**One-liner:** Testes Compose para APP-08 (EmptyTimelineCard) e estado de erro (EmptyStateView), com job CI dedicado para app-cliente executando lint + unit tests + assembleDemoDebug em cada PR.

## What Was Built

### Task 1 — ProcessoDetailScreenEmptyTest + ProcessoListScreenTest + hilt-android-testing

**ProcessoDetailScreenEmptyTest** (`androidTest`): Teste `@HiltAndroidTest` que instancia `EmptyTimelineCard` diretamente via `setContent` e verifica as tres frases do card de tranquilizacao — "Nenhuma novidade desde", "Isso e normal", "Seu advogado sera notificado". Cobre o requisito APP-08 (usuario leigo nao deve ser alarmado por ausencia de movimentacoes).

**ProcessoListScreenTest** (`androidTest`): Dois testes `@HiltAndroidTest`:
1. `processoList_errorState_showsRetryButton` — verifica que o texto de erro e o botao "Tentar novamente" aparecem via `EmptyStateView`
2. `processoList_emptyState_showsEmptyMessage` — verifica heading e body do estado vazio

**Dependencia adicionada:** `hilt-android-testing` adicionado como `androidTestImplementation` no `app-cliente/build.gradle.kts`. Esta dependencia e necessaria para `@HiltAndroidTest` e `HiltAndroidRule` funcionarem nos testes instrumentados.

**Observacoes:**
- `HiltTestRunner.kt` ja existia em `androidTest` desde o plano 04-07 e ja estava corretamente referenciado em `build.gradle.kts` como `testInstrumentationRunner`
- `EmptyTimelineCard` ja estava extraido como composable interno nomeado em `ProcessoDetailScreen.kt` (commit 263e5af)

### Task 2 — GitHub Actions CI Workflow

**`.github/workflows/android-ci.yml`** atualizado:

Job antigo `build` (que combinava lint de app-cliente e app-escritorio em um unico `run:`) foi substituido pelo job dedicado `build-app-cliente`:

```
build-app-cliente:
  - Lint app-cliente          → ./gradlew :app-cliente:lintDemoDebug
  - Unit tests app-cliente    → ./gradlew :app-cliente:test
  - Assemble app-cliente      → ./gradlew :app-cliente:assembleDemoDebug
  - Upload lint report        → app-cliente/build/reports/lint-results-demoDebug.html
  - Upload test results       → app-cliente/build/test-results/
```

JDK 17 temurin + Gradle cache via `actions/cache@v4`. Job `app-escritorio-ci` preservado sem alteracoes. Nenhum teste instrumentado (connectedAndroidTest) no CI — conforme D-20.

## Commits

| Tarefa | Commit | Descricao |
|--------|--------|-----------|
| Task 1 | `6bd04aa` | feat(05-05): add ProcessoDetailScreenEmptyTest + ProcessoListScreenTest + hilt-android-testing dep |
| Task 2 | `5423a55` | feat(05-05): add dedicated build-app-cliente CI job with lint + test + assemble steps |

## Decisions Made

1. **HiltTestRunner permanece em androidTest:** O runner ja existia no local correto (`androidTest`) desde 04-07 e ja estava referenciado no `build.gradle.kts`. Nao ha necessidade tecnica de mover para `src/main` — ambos os locais funcionam para o `testInstrumentationRunner`.

2. **Testes de componentes isolados (nao telas completas):** `EmptyTimelineCard` e `EmptyStateView` sao testados diretamente em vez de montar `ProcessoDetailScreen` ou `ProcessoListScreen` completas. Isso elimina a necessidade de ViewModels fake, `@UninstallModules`, e providers de teste — os testes ficam mais simples e deterministas.

3. **Job antigo `build` removido:** O job `build` original combinava lint de app-cliente e app-escritorio em um unico `run:` (`./gradlew :app-cliente:lintDemoDebug :app-escritorio:lintDebug`). Substituido por dois jobs completamente separados, cada um com steps independentes — melhora rastreabilidade de falhas no GitHub Actions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Dependency] hilt-android-testing ausente no build.gradle.kts**
- **Found during:** Task 1 — analise das dependencias antes de criar os testes @HiltAndroidTest
- **Issue:** `hilt-android-testing` nao estava listado em `androidTestImplementation` no `app-cliente/build.gradle.kts`, mas e necessario para `HiltAndroidRule` e `@HiltAndroidTest` compilarem
- **Fix:** Adicionado `androidTestImplementation(libs.hilt.android.testing)` ao `build.gradle.kts`
- **Files modified:** `app-cliente/build.gradle.kts`
- **Commit:** `6bd04aa`

**2. [Rule 3 - Blocking] Job CI antigo precisava ser substituido, nao apenas complementado**
- **Found during:** Task 2 — leitura do workflow existente
- **Issue:** O job `build` existente ja rodava `:app-cliente:lintDemoDebug` mas como parte de um `run:` combinado com `:app-escritorio:lintDebug`. Manter esse job E adicionar o novo `build-app-cliente` causaria lint duplicado para app-cliente
- **Fix:** Job `build` removido; substituido por `build-app-cliente` com steps separados. Job `app-escritorio-ci` preservado intacto.
- **Files modified:** `.github/workflows/android-ci.yml`
- **Commit:** `5423a55`

## Known Stubs

Nenhum stub que impeça os objetivos do plano. Os testes de UI instrumentados requerem emulador/dispositivo fisico para executar — esse e o comportamento esperado (CI roda apenas lint + unit tests + assemble por D-20).

## Threat Flags

Nenhuma superficie nova alem do planejado no `<threat_model>` do plano.

- T-05-05-01 (CI bypass): mitigado — workflow dispara em push E pull_request para main/master. Branch protection rules sao configuradas manualmente no GitHub (documentado como pos-lancamento).
- T-05-05-02 (secrets em CI logs): aceito — nenhum secret necessario para lint + unit test + assemble (sem rede, sem emulador).
- T-05-05-03 (testes flakey no CI): mitigado — connectedAndroidTest excluido do CI conforme D-20.

## Self-Check: PASSED

Arquivos criados/existem:
- `app-cliente/src/androidTest/.../ProcessoDetailScreenEmptyTest.kt` — FOUND (commit 6bd04aa)
- `app-cliente/src/androidTest/.../ProcessoListScreenTest.kt` — FOUND (commit 6bd04aa)

Arquivos modificados:
- `app-cliente/build.gradle.kts` — hilt-android-testing adicionado (commit 6bd04aa)
- `.github/workflows/android-ci.yml` — job build-app-cliente adicionado (commit 5423a55)

Commits existem:
- `6bd04aa` — FOUND
- `5423a55` — FOUND

Criterios de aceitacao verificados:
- `grep "HiltTestApplication" HiltTestRunner.kt` — FOUND (androidTest)
- `grep "HiltTestRunner" build.gradle.kts` — FOUND (testInstrumentationRunner)
- `grep "fun EmptyTimelineCard" ProcessoDetailScreen.kt` — FOUND
- `grep "ProcessoDetailScreenEmptyTest" ProcessoDetailScreenEmptyTest.kt` — FOUND
- `grep "Nenhuma novidade desde" ProcessoDetailScreenEmptyTest.kt` — FOUND
- `grep "Tentar novamente" ProcessoListScreenTest.kt` — FOUND
- `grep "app-cliente:lintDemoDebug" android-ci.yml` — FOUND
- `grep "app-cliente:test" android-ci.yml` — FOUND
- `grep "app-cliente:assembleDemoDebug" android-ci.yml` — FOUND
- `grep "temurin" android-ci.yml` — FOUND
- `grep "connectedDemoDebugAndroidTest" android-ci.yml` — NOT FOUND (correto)
