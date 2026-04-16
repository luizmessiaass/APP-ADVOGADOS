---
phase: 05-android-app-fluxo-cliente-mvp
plan: "03"
subsystem: android-cliente-processos
tags: [android, compose, viewmodel, hilt, retrofit, moshi, repository, unit-tests, navigation]
dependency_graph:
  requires:
    - 05-01 (GET /api/v1/processos, GET /api/v1/processos/:id/movimentacoes, GET /api/v1/processos/:id com telefone_whatsapp)
    - 05-02 (ClienteNavGraph com TODO() stubs, Routes, ProcessoListCard, MovimentacaoCard, ProcessoStatusCard, ProximaDataCard, SkeletonCard, EmptyStateView, ExpandableText, ProcessoSummary, Movimentacao em core-common)
  provides:
    - ProcessoListScreen com 4 estados (Loading/Empty/Error/Success)
    - ProcessoDetailScreen como LazyColumn único com timeline stickyHeader, EmptyTimelineCard, Dados Cadastrais, FAB WhatsApp
    - ProcessoRepository (getProcessos, getProcessoDetail, getMovimentacoes) wrapping API calls em Result<T>
    - SyncLabelFormatter (null/< 24h/1-7d/>7d)
    - ClienteNavGraph com stubs TODO() substituídos pelas screens reais
  affects:
    - 05-04 (OnboardingScreen/LgpdConsentScreen — mesma NavGraph)
    - 05-05 (testes de UI que referenciam EmptyTimelineCard por nome)
tech_stack:
  added:
    - ProcessoDetail domain model em core-common
    - SyncLabelFormatter object em core-common/util
    - ProcessoRepository interface + ProcessoRepositoryImpl em core-data
    - RepositoryModule @Binds Hilt em app-cliente/di
    - ProcessoSummaryDto, ProcessoDetailDto, ProcessoMovimentacaoDto, MovimentacoesResponse, ProcessoListResponse, ProcessoDetailResponse, ConsentimentoRequest/Response, ClienteLoginResponse em core-network/dto
    - :core-common dependency adicionada ao core-data/build.gradle.kts
  patterns:
    - Single LazyColumn para tela de detalhe (sem nested scrollable — RESEARCH Pitfall 1)
    - stickyHeader para agrupamento mês/ano na timeline (RESEARCH Pattern 3)
    - LinkedHashMap para preservar ordem de inserção nos grupos de movimentações
    - async/await paralelo para carregar processo + movimentações simultaneamente
    - EmptyTimelineCard como @Composable interno nomeado (referenciável por testes em 05-05)
    - ProcessoMovimentacaoDto separado do MovimentacaoDto original (evita quebra do app-escritorio)
key_files:
  created:
    - core-common/src/main/java/com/aethixdigital/portaljuridico/common/model/ProcessoDetail.kt
    - core-common/src/main/java/com/aethixdigital/portaljuridico/common/util/SyncLabelFormatter.kt
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/repository/ProcessoRepository.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/di/RepositoryModule.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/processos/ProcessoListViewModel.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/processos/ProcessoListScreen.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/processos/ProcessoDetailViewModel.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/processos/ProcessoDetailScreen.kt
    - app-cliente/src/test/java/com/aethixdigital/portaljuridico/cliente/SyncLabelFormatterTest.kt
    - app-cliente/src/test/java/com/aethixdigital/portaljuridico/cliente/ProcessoListViewModelTest.kt
    - app-cliente/src/test/java/com/aethixdigital/portaljuridico/cliente/ProcessoDetailViewModelTest.kt
  modified:
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/api/ClienteApi.kt (adicionados 6 novos endpoints do fluxo cliente)
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/model/dto/ClienteDtos.kt (adicionados DTOs de processos/LGPD/login cliente; MovimentacaoDto original preservado)
    - core-data/build.gradle.kts (adicionado :core-common dependency)
    - app-cliente/src/main/AndroidManifest.xml (adicionado <queries> para WhatsApp)
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/navigation/ClienteNavGraph.kt (substituídos TODO() stubs)
decisions:
  - "ProcessoMovimentacaoDto separado do MovimentacaoDto: o DTO original usado por PreviewResponse (painel do advogado) tem campos incompatíveis (disclaimer não-nullable, sem dataHora/descricaoOriginal). Criado ProcessoMovimentacaoDto para o endpoint GET /processos/:id/movimentacoes evitando quebra dos testes do app-escritorio."
  - "groupMovimentacoesByMonth no companion object: permite que ProcessoDetailViewModelTest acesse a função diretamente via ProcessoDetailViewModel.groupMovimentacoesByMonth() sem instanciar o ViewModel."
  - "async/await paralelo para getProcessoDetail + getMovimentacoes: as duas chamadas são independentes; carregamento paralelo reduz latência percebida pelo usuário."
  - ":core-common adicionado como dependência explícita de core-data: ProcessoRepository usa ProcessoSummary, ProcessoDetail e Movimentacao — dependência transitiva não é suficiente em módulos Android library."
metrics:
  duration: "35m"
  completed: "2026-04-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 11
  files_modified: 5
---

# Phase 05 Plan 03: ProcessoListScreen + ProcessoDetailScreen Summary

**One-liner:** Duas telas core do app cliente (lista e detalhe de processos) com ViewModel, repositório Retrofit/Moshi, SyncLabelFormatter, timeline stickyHeader em LazyColumn único e FAB WhatsApp.

## What Was Built

### Tarefa 1 — Camada de dados e testes

**ClienteApi** (`core-network`): 6 novos endpoints adicionados à interface existente — `getProcessos`, `getProcesso`, `getMovimentacoes`, `login`, `logout`, `postConsentimento`. Os endpoints do painel do advogado foram preservados sem alteração.

**DTOs novos** (`ClienteDtos.kt`): `ProcessoSummaryDto`, `ProcessoDetailDto`, `DadosBrutosDto`, `PartesDto`, `ProcessoListResponse`, `ProcessoDetailResponse`, `ProcessoMovimentacaoDto`, `MovimentacoesResponse`, `ConsentimentoRequest/Response`, `ClienteLoginResponse`, `UserDto`. O `MovimentacaoDto` original foi preservado intacto para não quebrar o `PreviewResponse` do painel do advogado.

**ProcessoDetail** (`core-common`): modelo de domínio com campos de dados cadastrais (`comarca`, `classeProcessual`, `requerente`, `requerido`) e `telefoneWhatsapp`.

**SyncLabelFormatter** (`core-common/util`): converte ISO timestamp para label legível — `"Nunca sincronizado"` (null), `"Sincronizado há Xh"` (<24h), `"Sincronizado há Xd"` (1-7d), `"Sincronizado há X semanas"` (>7d).

**ProcessoRepository** (`core-data`): interface + impl com `getProcessos()`, `getProcessoDetail()`, `getMovimentacoes()` todos retornando `Result<T>` via `runCatching {}`. Mapeia DTOs para modelos de domínio.

**RepositoryModule** (`app-cliente/di`): módulo Hilt `@Binds` ligando `ProcessoRepositoryImpl` a `ProcessoRepository` no `SingletonComponent`.

**ViewModels**: `ProcessoListViewModel` com `sealed class UiState` (Loading/Success/Empty/Error) e `ProcessoDetailViewModel` com `ProcessoDetailUiState` data class, `toggleMovimentacao()`, `toggleDadosCadastrais()` e `groupMovimentacoesByMonth()` no companion object.

**Testes unitários**: `SyncLabelFormatterTest` (8 casos), `ProcessoListViewModelTest` (5 casos: Loading→Success/Empty/Error/retry), `ProcessoDetailViewModelTest` (6 casos incluindo ordenação de grupos e itens).

### Tarefa 2 — Screens e navegação

**ProcessoListScreen**: `Scaffold` com `TopAppBar` "Meus Processos" + ícone de logout. Quatro estados conforme UI-SPEC: Loading (2x `SkeletonCard(88.dp)`), Empty (`EmptyStateView` com copywriting exato), Error (`EmptyStateView` com "Tentar novamente"), Success (`LazyColumn` de `ProcessoListCard` com `onClick` navegando para detalhe).

**ProcessoDetailScreen**: **um único `LazyColumn`** contendo todos os blocos — `ProcessoStatusCard`, `ProximaDataCard`, staleness indicator com ícone de Warning em vermelho se `desatualizado=true`, header "Movimentações", `stickyHeader` por mês/ano em pt-BR, `MovimentacaoCard` com expand/collapse via `toggleMovimentacao()`, `EmptyTimelineCard` (composable interno nomeado) para timeline vazia, `DadosCadastraisSection` com `AnimatedVisibility`, `ExtendedFloatingActionButton` "Falar com meu advogado" abrindo `whatsapp://send?phone=` com fallback `tel:`.

**AndroidManifest**: bloco `<queries>` com `com.whatsapp` e `com.whatsapp.w4b` para visibilidade de pacote no Android 11+ (API 30+).

**ClienteNavGraph**: `TODO()` stubs de `ProcessoListScreen` e `ProcessoDetailScreen` substituídos por chamadas reais com imports corretos.

## Commits

| Tarefa | Commit | Descrição |
|--------|--------|-----------|
| Task 1 | `7410803` | feat(05-03): network/repository layer |
| Task 2 | `ed617d1` | feat(05-03): screens + manifest + navgraph |

## Decisions Made

1. **ProcessoMovimentacaoDto separado:** O `MovimentacaoDto` original tem estrutura incompatível com o endpoint de processos (campos `disclaimer`, `status` não-nullable, sem `dataHora`/`descricaoOriginal`). Criar um DTO separado para o fluxo cliente evita quebrar os testes existentes do `app-escritorio` que constroem `MovimentacaoDto` com a assinatura original.

2. **groupMovimentacoesByMonth no companion object:** Facilita testes unitários — `ProcessoDetailViewModelTest` pode chamar `ProcessoDetailViewModel.groupMovimentacoesByMonth(list)` diretamente sem instanciar o ViewModel (que requer contexto Android via Hilt).

3. **async/await paralelo para detalhe + movimentações:** As duas chamadas de API são independentes. Carregadas em paralelo com `async {}` reduz latência total da tela de detalhe.

4. **:core-common como dependência explícita de core-data:** `ProcessoRepository` usa tipos de `core-common`. Em módulos Android library a dependência transitiva via `core-network` não é propagada automaticamente — necessário declarar explicitamente no `build.gradle.kts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MovimentacaoDto incompatível com endpoint de processos**
- **Found during:** Criação do `ClienteDtos.kt` — comparação da estrutura original com os campos do endpoint `GET /api/v1/processos/:id/movimentacoes`
- **Issue:** O `MovimentacaoDto` existente tinha `disclaimer: String`, `status: String` (não-nullable), sem `dataHora` e sem `descricaoOriginal`. Reutilizá-lo quebraria os testes do `PreviewViewModelTest` e `PreviewScreenTest` no `app-escritorio` que instanciam `MovimentacaoDto` com a assinatura original.
- **Fix:** Mantido o `MovimentacaoDto` original intacto. Criado `ProcessoMovimentacaoDto` com os campos corretos para o endpoint de processos. `MovimentacoesResponse` usa `List<ProcessoMovimentacaoDto>`.
- **Files modified:** `ClienteDtos.kt`, `ProcessoRepository.kt`
- **Commit:** `7410803`

## Known Stubs

- `ProcessoListViewModel.logout()` não foi implementado — a função de logout requer acesso ao `TokenDataStore` e navegação para login, que será conectada quando o fluxo completo de autenticação do app cliente for montado (plano 05-04/05-05). O botão de logout existe na `TopAppBar` mas o callback está vazio com comentário.

## Threat Flags

Nenhuma superfície nova além do planejado no `<threat_model>` do plano.

## Self-Check: PASSED

Arquivos criados/existem:
- `core-common/src/main/java/.../common/model/ProcessoDetail.kt` — FOUND
- `core-common/src/main/java/.../common/util/SyncLabelFormatter.kt` — FOUND
- `core-data/src/main/java/.../data/repository/ProcessoRepository.kt` — FOUND
- `app-cliente/src/main/java/.../cliente/di/RepositoryModule.kt` — FOUND
- `app-cliente/src/main/java/.../features/processos/ProcessoListViewModel.kt` — FOUND
- `app-cliente/src/main/java/.../features/processos/ProcessoListScreen.kt` — FOUND
- `app-cliente/src/main/java/.../features/processos/ProcessoDetailViewModel.kt` — FOUND
- `app-cliente/src/main/java/.../features/processos/ProcessoDetailScreen.kt` — FOUND
- `app-cliente/src/test/.../SyncLabelFormatterTest.kt` — FOUND
- `app-cliente/src/test/.../ProcessoListViewModelTest.kt` — FOUND
- `app-cliente/src/test/.../ProcessoDetailViewModelTest.kt` — FOUND

Commits existem:
- `7410803` — FOUND (feat(05-03): network/repository layer)
- `ed617d1` — FOUND (feat(05-03): screens + manifest + navgraph)

Critérios de aceitação verificados manualmente:
- `grep "suspend fun getProcessos" ClienteApi.kt` — FOUND
- `grep "suspend fun getMovimentacoes" ClienteApi.kt` — FOUND
- `grep "SyncLabelFormatter" SyncLabelFormatter.kt` — FOUND
- `grep -c "LazyColumn" ProcessoDetailScreen.kt` — 1 (único LazyColumn)
- `grep "stickyHeader" ProcessoDetailScreen.kt` — FOUND
- `grep "whatsapp://send" ProcessoDetailScreen.kt` — FOUND
- `grep "com.whatsapp" AndroidManifest.xml` — FOUND
- `grep "AnimatedVisibility" ProcessoDetailScreen.kt` — FOUND
- `grep "ExtendedFloatingActionButton" ProcessoDetailScreen.kt` — FOUND
- `grep "Nenhuma novidade desde" ProcessoDetailScreen.kt` — FOUND
- `grep "fun EmptyTimelineCard" ProcessoDetailScreen.kt` — FOUND
- `grep "ProcessoListScreen" ClienteNavGraph.kt` — FOUND
- `grep "ProcessoDetailScreen" ClienteNavGraph.kt` — FOUND
