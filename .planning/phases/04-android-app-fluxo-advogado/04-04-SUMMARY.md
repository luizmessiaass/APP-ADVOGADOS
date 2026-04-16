---
phase: 04-android-app-fluxo-advogado
plan: "04"
subsystem: app-escritorio/cadastro
tags: [android, compose, viewmodel, validation, cpf, cnj, tdd, hilt, retrofit]
dependency_graph:
  requires:
    - "04-01: core-network (ClienteApi.cadastrarCliente, CadastroClienteRequest/Response)"
    - "04-02: core-common (isValidCpf, formatCpf, isValidCnjFormat, normalizeCnj)"
    - "04-03: EscritorioNavGraph com rota CadastroCliente stub"
  provides:
    - "CadastroClienteViewModel com validação real-time CPF/CNJ"
    - "CadastroClienteScreen com 4 campos + isError inline"
    - "ClienteRepository.cadastrarCliente() implementado"
    - "EscritorioNavGraph.CadastroCliente apontando para tela real"
  affects:
    - "04-05: DetalheCliente (mesmo padrão MVVM)"
tech_stack:
  added: []
  patterns:
    - "MVVM com StateFlow (formState + uiState separados)"
    - "TDD: RED commit antes da implementação GREEN"
    - "EMAIL_REGEX Kotlin pura (compatível com unit tests JVM)"
    - "Validação por blur (D-11): cpfTouched/cnjTouched gates isSubmitEnabled"
key_files:
  created:
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteViewModel.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteScreen.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteViewModelTest.kt
  modified:
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/repository/ClienteRepository.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/navigation/EscritorioNavGraph.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListViewModelTest.kt
decisions:
  - "EMAIL_REGEX Kotlin pura em vez de android.util.Patterns — compatível com unit tests JVM sem necessidade de robolectric"
metrics:
  duration: "~25 minutos"
  completed_date: "2026-04-16"
  tasks_completed: 1
  files_changed: 6
requirements_covered: [ESCR-02, ESCR-03, ESCR-10]
---

# Phase 04 Plan 04: Tela de Cadastro de Cliente com Validação Inline Summary

Implementação do MVVM de cadastro de novo cliente com validação em tempo real de CPF (mod11 via isValidCpf de :core-common) e CNJ (regex + normalização via isValidCnjFormat/normalizeCnj de :core-common), submissão via ClienteRepository.cadastrarCliente ao backend, e navegação pós-sucesso.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED  | Testes unitários CadastroClienteViewModel (7 testes) | 9fa821f | CadastroClienteViewModelTest.kt |
| GREEN | CadastroClienteViewModel + Screen + Repository + NavGraph | b686e6d | 5 arquivos criados/modificados |

## What Was Built

**CadastroClienteViewModel** — ViewModel Hilt com dois StateFlows:
- `formState: StateFlow<CadastroFormState>` — campos + erros + touched flags
- `uiState: StateFlow<CadastroUiState>` — Idle / Loading / Success(id) / Error(msg)
- `onCpfBlur()` — valida CPF com `isValidCpf` de :core-common após first blur (D-11)
- `onCnjBlur()` — valida CNJ com `isValidCnjFormat` de :core-common após first blur (D-11)
- `cadastrar()` — envia CPF só dígitos + CNJ normalizado via `normalizeCnj`, D-12

**CadastroFormState.isSubmitEnabled** — `false` até todos os campos preenchidos, `cpfTouched = true`, `cnjTouched = true` e sem erros. Previne submit prematuro.

**CadastroClienteScreen** — 4 OutlinedTextField (nome, CPF, email, CNJ) com `isError` inline, CircularProgressIndicator durante Loading, texto de erro de backend abaixo do botão.

**ClienteRepository** — interface extendida com `cadastrarCliente()` delegando para `ClienteApi.cadastrarCliente()` via `runCatching`.

**EscritorioNavGraph** — stub `Text("Cadastro cliente...")` substituído por `CadastroClienteScreen(onSuccess, onBack)`.

## Test Results

```
CadastroClienteViewModelTest: 7 tests, 0 failures, 0 errors
ClienteListViewModelTest: 4 tests, 0 failures, 0 errors  (mantido passando)
LoginViewModelTest: passando (mantido)
assembleDebug: BUILD SUCCESSFUL
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] android.util.Patterns null em unit tests JVM**
- **Found during:** Fase GREEN, ao rodar os testes de submit
- **Issue:** `android.util.Patterns.EMAIL_ADDRESS` é `null` em unit tests JVM puro (sem Robolectric), causando NullPointerException nos testes `cadastrar_success_emitsSuccess` e `cadastrar_failure_emitsError`
- **Fix:** Substituído por `private val EMAIL_REGEX = Regex(...)` Kotlin pura no topo do ViewModel — compatível com JVM e produção Android
- **Files modified:** `CadastroClienteViewModel.kt`
- **Commit:** b686e6d

**2. [Rule 1 - Bug] FakeClienteRepository em ClienteListViewModelTest não implementava nova interface**
- **Found during:** Primeira compilação dos testes após adicionar `cadastrarCliente` à interface `ClienteRepository`
- **Issue:** `FakeClienteRepository` em `ClienteListViewModelTest.kt` não implementava o novo método abstrato, causando erro de compilação
- **Fix:** Adicionado `override suspend fun cadastrarCliente(...)` retornando `Result.success("fake-id")`
- **Files modified:** `ClienteListViewModelTest.kt`
- **Commit:** b686e6d

## Known Stubs

Nenhum. A tela e o ViewModel estão totalmente funcionais com dados reais via ClienteRepository.

## Threat Flags

Nenhuma superfície nova além do planejado no threat model do plano. `T-04-04-02` (CPF em logs OkHttp) mitigado por `HttpLoggingInterceptor` condicional ao `BuildConfig.DEBUG` (implementado em 04-01).

## Self-Check: PASSED

- [x] `CadastroClienteViewModel.kt` existe em app-escritorio/.../feature/clientes/cadastro/
- [x] `CadastroClienteScreen.kt` existe em app-escritorio/.../feature/clientes/cadastro/
- [x] `CadastroClienteViewModelTest.kt` existe em app-escritorio/src/test/.../cadastro/
- [x] Commit 9fa821f (RED tests) existe
- [x] Commit b686e6d (GREEN implementation) existe
- [x] 7 tests, 0 failures em CadastroClienteViewModelTest
- [x] assembleDebug BUILD SUCCESSFUL
