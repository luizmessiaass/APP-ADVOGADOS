# Phase 4: Android App — Fluxo Advogado - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

O `app-escritorio`, quando logado como advogado/admin, entrega um fluxo completo end-to-end:
login com detecção de role via JWT, CRUD de clientes com validação CPF+CNJ em tempo real,
lista pesquisável, preview read-only "como o cliente vê" das movimentações traduzidas,
envio de mensagem/aviso manual via Bottom Sheet, e acesso ao Stripe Customer Portal via
Chrome Custom Tabs — validando o contrato da API do backend antes de construir o fluxo cliente.

**Não inclui:** fluxo do cliente final (Phase 5), push notifications (Phase 6),
Stripe checkout/webhook (Phase 7), chatbot IA (roadmap futuro).

</domain>

<decisions>
## Implementation Decisions

### Navegação
- **D-01:** Navigation Compose + NavHost como lib de navegação. O `hilt-navigation-compose` já está no version catalog (1.2.0) — adicionar `navigation-compose` como dependência complementar.
- **D-02:** Rotas mínimas: `login`, `clientes` (lista), `clientes/{id}` (detalhe), `clientes/cadastro`, `preview/{clienteId}` (como o cliente vê).

### HTTP Client e Rede
- **D-03:** Retrofit + OkHttp para comunicação com o backend Fastify. Interceptor OkHttp para injetar JWT no header `Authorization: Bearer {token}` em todas as requisições autenticadas.
- **D-04:** Adicionar ao version catalog: `retrofit`, `retrofit-converter-gson` (ou `retrofit-converter-moshi`), `okhttp`, `okhttp-logging-interceptor`. Pesquisador confirma versões estáveis no momento do planejamento.

### Autenticação e JWT
- **D-05:** JWT persistido com **DataStore Preferences** (substituto oficial do SharedPreferences). Token salvo como String, lido como Flow no repositório de auth.
- **D-06:** Role detection via **decode JWT local** — biblioteca leve (ex: `java-jwt` ou `kotlin-jwt`) lê o campo `role` do payload sem round-trip ao backend. Role disponível offline e sem latência extra no boot.
- **D-07:** Ao abrir o app: verificar token no DataStore → se válido e role == `advogado`, navegar para `clientes`; se inválido/ausente, navegar para `login`.

### Preview "como o cliente vê"
- **D-08:** Componentes que renderizam movimentações traduzidas (`MovimentacaoCard`, `ProcessoStatusCard`, etc.) ficam em **`:core-ui`** — Phase 5 (app-cliente) reutiliza sem duplicar. Criados em Phase 4 com dados vindos do endpoint de preview do backend.
- **D-09:** Preview é uma **tela separada** com rota `preview/{clienteId}` — scroll em tela cheia, mais testável do que bottom sheet para listas longas de movimentações.
- **D-10:** Disclaimer "Explicação gerada por IA" visível em cada card de movimentação traduzida (alinhado com Phase 3 CONTEXT, requisito AI/LGPD).

### Validação de Formulários
- **D-11:** Validação de CPF e CNJ acontece **em tempo real** — erro exibido após primeiro `onFocusChanged` (blur) ou quando o campo atinge o comprimento esperado. Lógica local (sem chamada ao backend): CPF via mod11, CNJ via regex `NNNNNNN-DD.AAAA.J.TT.OOOO`.
- **D-12:** Verificação de CPF já cadastrado (unicidade) é feita **ao submeter** via chamada ao backend — não é possível saber localmente.

### Mensagem Manual (ESCR-07)
- **D-13:** Envio de mensagem/aviso manual via **Bottom Sheet** — abre a partir da tela de detalhe do cliente. Campo de texto + botão Enviar. Fire-and-forget com feedback visual de sucesso/erro no Bottom Sheet.

### Arquitetura de UI (ESCR-10)
- **D-14:** **Sealed class por tela** para UiState. Exemplo: `sealed class ClienteListUiState { object Loading; data class Success(val clientes: List<ClienteItem>); data class Error(val message: String) }`. Padrão MVVM Compose, explícito e testável.
- **D-15:** Clean Architecture + MVVM: ViewModel → UseCase → Repository → RemoteDataSource (Retrofit). Módulos `:core-network` e `:core-data` populados nesta fase com as interfaces necessárias.

### Claude's Discretion
- Versão exata de Retrofit, OkHttp, Navigation Compose, e biblioteca de JWT decode (pesquisador confirma versões estáveis)
- Estratégia de refresh token automático (interceptor 401 → refresh → retry)
- Estrutura interna dos módulos `:core-network` e `:core-data` (interfaces, DTOs, mappers)
- Layout visual dos cards na lista de clientes (avatar, status badge, ícone de processo)
- Estado vazio da lista de clientes (sem clientes cadastrados)
- Tratamento de erro de rede offline no app

</decisions>

<canonical_refs>
## Canonical References

**Agentes downstream DEVEM ler esses arquivos antes de planejar ou implementar.**

### Requisitos desta Fase
- `.planning/REQUIREMENTS.md` §"app_escritorio (ESCR)" — ESCR-01 a ESCR-11 são os critérios de aceitação desta fase
- `.planning/ROADMAP.md` §"Phase 4: Android App — Fluxo Advogado" — Goal, success criteria, dependências

### Projeto e Contexto Geral
- `.planning/PROJECT.md` — Core value, constraints (stack não negociável, minSdk 27, multi-tenancy RLS)
- `.planning/STATE.md` — Estado atual do projeto

### Phase 0 Context (Fundação Android)
- `.planning/phases/00-android-bootstrap-cleanup/00-CONTEXT.md` — D-01..D-21: package name, módulos, Hilt, versão do BOM, CI baseline. Módulos existentes: `:app-escritorio`, `:core-common`, `:core-network`, `:core-data`, `:core-ui`.

### Phase 3 Context (Dados que esta fase consome)
- `.planning/phases/03-claude-ai-translation-core-value-prop/03-CONTEXT.md` — D-06..D-10 (output schema de tradução: status, proxima_data, explicacao, impacto). O preview "como o cliente vê" exibe esses campos.

### Código existente (baseline do app-escritorio)
- `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/MainActivity.kt` — stub atual a ser substituído
- `app-escritorio/build.gradle.kts` — dependências atuais do módulo
- `gradle/libs.versions.toml` — version catalog (adicionar Retrofit, OkHttp, Navigation Compose, JWT decode)
- `core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/theme/` — tema e cores existentes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PortalJuridicoTheme` em `:core-ui` — tema Material3 já configurado, usar em todas as telas do app-escritorio
- Hilt já wired: `EscritorioApp` com `@HiltAndroidApp`, `MainActivity` com `@AndroidEntryPoint`
- `hilt-navigation-compose` 1.2.0 já no version catalog — usar `hiltViewModel()` nas rotas do NavHost

### Established Patterns (das phases anteriores)
- Version catalog (`gradle/libs.versions.toml`) como fonte única de versões — todas as novas dependências adicionadas aqui
- `compileOptions { JavaVersion.VERSION_11 }` — manter em todos os módulos
- CI: lint + unit tests + assembleDebug (já configurado em Phase 0)
- Nomenclatura PT-BR sem acentos para nomes de tabelas/campos do backend

### Integration Points
- **Phase 3 → Phase 4:** Endpoint de preview de movimentações traduzidas (`GET /api/v1/clientes/{id}/preview`) fornece os dados para o componente `MovimentacaoCard` em `:core-ui`
- **Phase 4 → Phase 5:** Componentes criados em `:core-ui` (MovimentacaoCard, ProcessoStatusCard) são reutilizados pelo app-cliente
- **Phase 4 → Phase 6:** O DataStore de auth e a estrutura de ViewModel servirão de base para o fluxo do cliente

</code_context>

<specifics>
## Specific Ideas

- Preview "como o cliente vê" deve ser idêntico ao que o cliente final verá em Phase 5 — não é um resumo, é a tela real renderizada com dados reais.
- O disclaimer "Explicação gerada por IA" deve ser visível sem o usuário ter que rolar — parte superior do card, não rodapé.
- Validação de CNJ deve aceitar com ou sem formatação (o usuário pode digitar `0001234-55.2023.8.26.0100` ou `00012345520238260100` — normalizar antes de validar).

</specifics>

<deferred>
## Deferred Ideas

- **Chatbot IA para o advogado:** Surgiu naturalmente, mas é escopo de milestone futuro (não numerado no roadmap atual).
- **Dashboard com métricas do escritório** (total de clientes, processos ativos, últimas movimentações): Seria Phase 4.x ou feature de milestone futuro.
- **Exportação de relatórios PDF:** Fora de escopo v1.
- **proxima_data como ISO date para ordenação:** Já deferido na Phase 3 — reavaliar em Phase 5.

</deferred>

---

*Phase: 04-android-app-fluxo-advogado*
*Context gathered: 2026-04-15*
