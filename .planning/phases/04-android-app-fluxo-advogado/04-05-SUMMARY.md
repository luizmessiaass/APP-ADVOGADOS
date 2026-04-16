---
phase: 04-android-app-fluxo-advogado
plan: "05"
subsystem: app-escritorio + core-data + core-network
tags: [android, compose, mvvm, preview, detalhe-cliente, core-ui, navigation]
dependency_graph:
  requires: ["04-01", "04-02", "04-03"]
  provides: ["ClienteDetalheScreen", "PreviewScreen", "ClienteDetalheViewModel", "PreviewViewModel"]
  affects: ["EscritorioNavGraph", "ClienteRepository", "ClienteApi"]
tech_stack:
  added: []
  patterns:
    - "MVVM com SavedStateHandle para nav args type-safe"
    - "TDD: teste RED antes da implementação GREEN"
    - "Reutilização de componentes core-ui (MovimentacaoCard, ProcessoStatusCard)"
    - "LazyColumn full-scroll para lista de movimentações"
key_files:
  created:
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheViewModel.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheScreen.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewViewModel.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewScreen.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewViewModelTest.kt
  modified:
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/api/ClienteApi.kt
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/repository/ClienteRepository.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/navigation/EscritorioNavGraph.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteViewModelTest.kt
    - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListViewModelTest.kt
decisions:
  - "ProcessoStatusCard reutilizado diretamente de :core-ui — sem duplicação"
  - "clienteId extraído via SavedStateHandle (Navigation Compose type-safe 2.9)"
  - "onEnviarMensagemClick deixado como stub no NavGraph — implementado em 04-06"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-16"
  tasks_completed: 1
  files_changed: 10
---

# Phase 04 Plan 05: ClienteDetalheScreen + PreviewScreen Summary

**One-liner:** Tela de detalhe do cliente com sync DataJud via ProcessoStatusCard (ESCR-08) e tela preview "como o cliente vê" com LazyColumn de MovimentacaoCard reutilizável de :core-ui (ESCR-06).

## What Was Built

### ClienteDetalheScreen + ViewModel (ESCR-08)
- `ClienteDetalheViewModel`: carrega cliente via `getClienteById`, expõe `ClienteDetalheUiState` (Loading/Success/Error)
- `ClienteDetalheScreen`: exibe nome, CPF, `ProcessoStatusCard` com `ultimaSincronizacao` DataJud, botões "Ver como cliente" e "Enviar mensagem"
- `clienteId` extraído de `SavedStateHandle` — padrão Navigation Compose type-safe

### PreviewScreen + ViewModel (ESCR-06)
- `PreviewViewModel`: chama `clienteRepository.previewCliente()`, expõe `PreviewUiState` (Loading/Success/Empty/Error), método `loadPreview()` para retry
- `PreviewScreen`: `LazyColumn` full-scroll com `ProcessoStatusCard` no topo e `MovimentacaoCard` de `:core-ui` para cada movimentação
- Disclaimer passado como parâmetro `disclaimer = mov.disclaimer` — exibido no TOPO de cada card (D-10)
- Estado vazio exibe "Nenhuma movimentação disponível ainda."

### Infraestrutura
- `ClienteApi`: adicionado `@GET("api/v1/clientes/{id}") getClienteById()`
- `ClienteRepository` interface e impl: adicionados `getClienteById` e `previewCliente`
- `EscritorioNavGraph`: stubs substituídos por `ClienteDetalheScreen` e `PreviewScreen` reais

### Testes
- `PreviewViewModelTest`: 3 testes TDD (Success com 3 movimentações, Empty, Error) — todos passando
- Fakes existentes (`FakeClienteRepository`, `FakeCadastroClienteRepository`) atualizados com novos métodos da interface

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fakes existentes desatualizados com nova interface ClienteRepository**
- **Found during:** Task 1 (fase GREEN)
- **Issue:** `FakeClienteRepository` em `ClienteListViewModelTest` e `FakeCadastroClienteRepository` em `CadastroClienteViewModelTest` não implementavam `getClienteById` e `previewCliente`, causando falha de compilação
- **Fix:** Adicionados os dois métodos com implementações stub em ambos os fakes
- **Files modified:** `ClienteListViewModelTest.kt`, `CadastroClienteViewModelTest.kt`
- **Commit:** 2935eba

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `onEnviarMensagemClick = { _ -> /* implementado em 04-06 */ }` | EscritorioNavGraph.kt | ~65 | Funcionalidade de envio de mensagem é escopo do plano 04-06 |
| `numeroCnj = "—"` em ClienteDetalheScreen | ClienteDetalheScreen.kt | ~89 | ClienteItem não inclui numeroCnj; backend deve incluir no endpoint GET /clientes/{id} — a ser resolvido quando backend Phase 3 for integrado |

## Threat Flags

Nenhuma nova superfície de segurança introduzida além do que o threat model do plano já cobre (T-04-05-01 a T-04-05-04).

## Self-Check: PASSED

- `ClienteDetalheViewModel.kt` — FOUND
- `ClienteDetalheScreen.kt` — FOUND
- `PreviewViewModel.kt` — FOUND
- `PreviewScreen.kt` — FOUND
- `PreviewViewModelTest.kt` — FOUND
- Commit `2935eba` — FOUND (`git log --oneline -1` confirma)
