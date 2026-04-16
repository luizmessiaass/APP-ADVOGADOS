---
phase: 04-android-app-fluxo-advogado
plan: "03"
subsystem: app-escritorio / core-data / core-network
tags: [android, compose, hilt, navigation, mvvm, repository, jwt, auth]
dependency_graph:
  requires: ["04-01", "04-02"]
  provides: ["AuthRepository", "ClienteRepository", "EscritorioNavGraph", "LoginViewModel", "ClienteListViewModel"]
  affects: ["04-04", "04-05", "04-06"]
tech_stack:
  added:
    - "material-icons-core (via Compose BOM) — ícones Add e Search na UI"
    - "material-icons-extended (via Compose BOM) — ícones estendidos"
    - "kotlinx-coroutines-test 1.9.0 — testes unitários de ViewModel com UnconfinedTestDispatcher"
    - "TokenProvider interface em core-network — desacopla AuthInterceptor de core-data"
  patterns:
    - "Repository pattern com interface + impl + @Binds em DataBindingModule"
    - "TDD: testes RED escritos antes da implementação (GREEN)"
    - "D-07: routing automático no NavGraph via LaunchedEffect + isValidAdvogadoToken"
    - "UiState sealed class por tela (D-14)"
    - "FakeRepository pattern para testes unitários sem Hilt"
key_files:
  created:
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/repository/AuthRepository.kt
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/repository/ClienteRepository.kt
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/interceptor/TokenProvider.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/navigation/EscritorioRoute.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/navigation/EscritorioNavGraph.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/login/LoginViewModel.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/login/LoginScreen.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListViewModel.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListScreen.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/login/LoginViewModelTest.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListViewModelTest.kt
  modified:
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/auth/TokenDataStore.kt
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/di/DataModule.kt
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/interceptor/AuthInterceptor.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/MainActivity.kt
    - app-escritorio/build.gradle.kts
    - gradle/libs.versions.toml
decisions:
  - "TokenProvider interface em core-network para eliminar dependência circular core-network → core-data"
  - "getTokenFlow() (Flow) e getToken() (suspend String?) separados em TokenDataStore"
  - "Filtro CPF: só compara dígitos quando query contém dígitos — evita contains('') sempre true"
metrics:
  duration: "~9 minutos"
  completed_date: "2026-04-16"
  tasks_completed: 2
  files_created: 11
  files_modified: 6
---

# Phase 04 Plan 03: Auth Flow + ClienteList Summary

**One-liner:** NavGraph type-safe com 5 rotas @Serializable, routing automático por JWT role, LoginViewModel + ClienteListScreen com busca em tempo real — 7 testes unitários verdes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Repositories + Auth flow + NavGraph | 6645018 | AuthRepository, ClienteRepository, TokenProvider, EscritorioRoute, EscritorioNavGraph, LoginViewModel, LoginScreen, MainActivity, DataModule, TokenDataStore, AuthInterceptor, LoginViewModelTest |
| 2 | ClienteListScreen + ClienteListViewModel com search | 61a088c | ClienteListViewModel, ClienteListScreen, ClienteListViewModelTest |

## What Was Built

### AuthRepository (core-data)
Interface com `login()`, `logout()`, `getSavedToken()`, `isValidAdvogadoToken()`. Implementação usa `AuthApi` para login, `TokenDataStore` para persistência do token, e `JwtDecoder` para verificar role e expiração. Retorna `Result<String>` (role) em `login()`.

### ClienteRepository (core-data)
Interface com `listarClientes(search: String?)`. Implementação delega para `ClienteApi.listarClientes()` wrapped em `runCatching`.

### TokenProvider + AuthInterceptor refatorado (core-network)
Interface `TokenProvider` introduzida em core-network para desacoplar `AuthInterceptor` de `TokenDataStore` (que está em core-data). `TokenDataStore` implementa `TokenProvider`; binding feito em `DataBindingModule` em core-data.

### EscritorioNavGraph (app-escritorio)
NavHost com 5 rotas type-safe. Routing automático via `LaunchedEffect` + `isValidAdvogadoToken`: token válido + role advogado/admin_escritorio navega para `ClienteLista`, caso contrário `Login`. Stubs para `ClienteDetalhe`, `CadastroCliente`, `PreviewCliente` (implementados em planos 04-04/04-05).

### LoginViewModel + LoginScreen
ViewModel com `LoginUiState` (Idle/Loading/Success/Error). Screen com campos email/senha, `PasswordVisualTransformation`, loading indicator no botão, mensagem de erro em vermelho.

### ClienteListViewModel + ClienteListScreen
ViewModel com `ClienteListUiState` (Loading/Success/Error), `allClientes` como cache local, e `filterClientes` com busca case-insensitive por nome, CPF (apenas quando query tem dígitos) e sincronização. Screen com `LazyColumn` + `OutlinedTextField` busca, `ClienteCard` com badge de status.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dependência circular core-network ↔ core-data via AuthInterceptor → TokenDataStore**
- **Found during:** Task 1, compilação de core-network
- **Issue:** `AuthInterceptor` em core-network importava `TokenDataStore` de core-data, mas core-data depende de core-network — dependência circular que impedia KSP de processar
- **Fix:** Criada interface `TokenProvider` em core-network; `AuthInterceptor` usa `TokenProvider`; `TokenDataStore` implementa a interface; binding `@Binds TokenProvider` adicionado em `DataBindingModule`
- **Files modified:** `core-network/interceptor/TokenProvider.kt` (criado), `core-network/interceptor/AuthInterceptor.kt`, `core-data/auth/TokenDataStore.kt`, `core-data/di/DataModule.kt`
- **Commits:** 6645018

**2. [Rule 2 - Missing] material-icons-core não estava no build.gradle.kts**
- **Found during:** Task 1/2, compilação de app-escritorio
- **Issue:** `Icons.Default.Add` e `Icons.Default.Search` requerem `material-icons-core` explicitamente mesmo com BOM
- **Fix:** Adicionados `material-icons-core` e `material-icons-extended` ao `libs.versions.toml` e `app-escritorio/build.gradle.kts`
- **Files modified:** `gradle/libs.versions.toml`, `app-escritorio/build.gradle.kts`

**3. [Rule 2 - Missing] kotlinx-coroutines-test não estava disponível para testes**
- **Found during:** Task 1, escrita dos testes
- **Issue:** `UnconfinedTestDispatcher`, `runTest` requerem `kotlinx-coroutines-test`
- **Fix:** Adicionado `kotlinx-coroutines-test 1.9.0` ao catalog e `testImplementation` em `app-escritorio/build.gradle.kts`

**4. [Rule 1 - Bug] Filtro CPF com query sem dígitos retornava todos os clientes**
- **Found during:** Task 2, teste `searchByName_filtersCorrectly` (expected 1, was 3)
- **Issue:** `q.filter { it.isDigit() }` retornava string vazia; `contains("")` é sempre `true`
- **Fix:** Adicionada guarda `qDigits.isNotEmpty()` antes do `contains(qDigits)` no filtro CPF
- **Files modified:** `ClienteListViewModel.kt`
- **Commit:** 61a088c

**5. [Rule 1 - Bug] TokenDataStore: clash de nomes getToken() (Flow vs suspend)**
- **Found during:** Task 1, após implementar TokenProvider
- **Issue:** Dois métodos `getToken()` — o original retornando `Flow<String?>` e o novo `override suspend fun getToken(): String?`
- **Fix:** Renomeado o Flow para `getTokenFlow()` para distinguir os dois; `AuthRepository` usa `getToken()` (suspend)

**6. [Rule 1 - Bug] Smart cast impossível em ClienteListScreen para statusProcesso**
- **Found during:** Task 1/2, compilação
- **Issue:** `cliente.statusProcesso` é propriedade pública de módulo diferente — Kotlin não permite smart cast direto
- **Fix:** Extraída para variável local `val status = cliente.statusProcesso` antes do `if (status != null)`

## Test Results

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| LoginViewModelTest | 3 | 3 | 0 |
| ClienteListViewModelTest | 4 | 4 | 0 |
| **Total** | **7** | **7** | **0** |

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `Text("Detalhe cliente — implementado em 04-05")` | EscritorioNavGraph.kt | Tela implementada em plano 04-05 |
| `Text("Cadastro cliente — implementado em 04-04")` | EscritorioNavGraph.kt | Tela implementada em plano 04-04 |
| `Text("Preview cliente — implementado em 04-05")` | EscritorioNavGraph.kt | Tela implementada em plano 04-05 |

Stubs são intencionais — o NavGraph precisa compilar com rotas declaradas. Planos 04-04 e 04-05 substituirão os stubs com telas reais.

## Self-Check: PASSED

- [x] `core-data/src/main/java/.../data/repository/AuthRepository.kt` — FOUND
- [x] `core-data/src/main/java/.../data/repository/ClienteRepository.kt` — FOUND
- [x] `app-escritorio/src/main/java/.../navigation/EscritorioRoute.kt` — FOUND
- [x] `app-escritorio/src/main/java/.../navigation/EscritorioNavGraph.kt` — FOUND
- [x] `app-escritorio/src/main/java/.../feature/login/LoginViewModel.kt` — FOUND
- [x] `app-escritorio/src/main/java/.../feature/clientes/list/ClienteListViewModel.kt` — FOUND
- [x] Commit `6645018` — FOUND
- [x] Commit `61a088c` — FOUND
- [x] 7 testes passando, 0 falhas — VERIFIED
