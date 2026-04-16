# Phase 5: Android App — Fluxo Cliente (MVP) - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Implementar o fluxo completo do cliente final (leigo) no `:app-cliente` — todas as telas que um cliente de escritório de advocacia vê: login com detecção de role via JWT, lista de processos, tela de detalhe do processo (status IA, timeline de movimentações, próxima data, dados cadastrais, indicador de sincronização), onboarding de primeira abertura, gate de consentimento LGPD obrigatório, e botão "Falar com meu advogado" via WhatsApp.

Escopo: módulo `:app-cliente` — UI Compose, ViewModels, repositórios e chamadas de API dos fluxos do cliente. Não inclui fluxo do advogado (Fase 4), push notifications (Fase 6), nem chat IA (v2).

</domain>

<decisions>
## Implementation Decisions

### Layout da Tela do Processo

- **D-01:** Layout em **scroll único com seções verticais** — sem tabs. Ordem de cima para baixo: card de status atual (IA), card de próxima data importante, seção de movimentações (timeline), seção collapsable de dados cadastrais, botão "Falar com meu advogado".
- **D-02:** **Acima da dobra** (sem scroll) em smartphone médio (~6"): card de status atual IA + card de próxima data importante. A timeline começa logo abaixo para induzir o scroll.
- **D-03:** Botão **"Falar com meu advogado"** abre WhatsApp direto via deep-link `whatsapp://send?phone={telefone_escritorio}`. Se WhatsApp não estiver instalado, fallback para o discador de telefone nativo.
- **D-04:** Estado **"sem movimentação recente"** (APP-08): exibir um card fixo dentro da seção de timeline com texto tranquilizador: *"Nenhuma novidade desde [data]. Isso é normal — processos judiciais podem ficar semanas sem movimentação. Seu advogado será notificado automaticamente quando houver atualização."* Sem tela vazia ou ilustração separada.

### Timeline de Movimentações

- **D-05:** Cada movimentação é exibida **truncada a 2-3 linhas** com botão "ver mais" que expande o texto inline (sem navegar para outra tela). Torna a timeline escaneável em processos com muitas movimentações.
- **D-06:** **APP-14 REMOVIDO pelo usuário** — sem disclaimer "Explicação gerada por IA" em nenhuma parte do app. O requisito APP-14 está explicitamente descartado por decisão de produto. Planner e executor NÃO devem implementar avisos de IA.
- **D-07:** Movimentações agrupadas por **cabeçalhos de mês/ano** (ex: "Maio 2025", "Abril 2025") como separadores visuais na timeline.

### Onboarding

- **D-08:** Estilo visual: **ilustrações vetoriais** (SVG/Lottie) — uma por tela. Assets de design a serem definidos na fase de planejamento/implementação.
- **D-09:** **4 telas obrigatórias** com os seguintes tópicos:
  1. *"Seus processos em linguagem simples"* — veja o que está acontecendo sem jargão jurídico
  2. *"Próximas datas e prazos"* — saiba sua próxima audiência sem precisar ligar pro advogado
  3. *"Notificações automáticas"* — receba avisos quando houver novidade no processo
  4. *"Falar com o advogado"* — contato direto via WhatsApp com um toque
- **D-10:** Onboarding é **obrigatório na primeira abertura** (sem botão "Pular"). Nunca reexibido após ser concluído. A flag de "onboarding visto" é persistida em SharedPreferences/DataStore.

### LGPD Consent Gate

- **D-11:** Tela de consentimento é uma **tela completa dedicada** com o texto completo da política de privacidade scrollável. O botão "Aceitar" fica **desabilitado** até o usuário rolar até o final do texto. Inclui checkbox "Li e aceito os termos" antes do botão.
- **D-12:** Se o usuário **recusar** (ou fechar o app sem aceitar): logout automático com mensagem explicativa — *"Para usar o app, é necessário aceitar a política de privacidade."* — e retorno à tela de login. Na próxima abertura, a tela de consentimento reaparece.
- **D-13:** **Fluxo de primeira abertura:** Login → Onboarding (4 telas, apenas 1ª vez) → LGPD consent gate → Lista de processos. O cliente vê o onboarding antes de aceitar os termos. Em aberturas subsequentes: Login → Lista de processos (se já consentiu).

### Claude's Discretion

- Cores e estilo visual do card de status IA (dentro do padrão Material3 do `:core-ui`)
- Animação de transição entre telas do onboarding (pager nativo ou Accompanist Pager)
- Skeleton loading states nas telas de lista e detalhe
- Indicador "última sincronização há X horas" — posicionamento exato dentro da tela do processo
- Formato exato das datas na timeline (relativo "há 3 dias" vs absoluto "15 mai")
- Estrutura de módulos internos do `:app-cliente` (ViewModels, Use Cases, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` §"app_cliente (APP)" — APP-01 through APP-16 (nota: APP-14 descartado por D-06 acima)
- `.planning/REQUIREMENTS.md` §"LGPD" — LGPD-02 (consent gate obrigatório)
- `.planning/ROADMAP.md` §"Phase 5: Android App — Fluxo Cliente (MVP)" — goal, success criteria, requirements list

### Prior phase decisions that affect this phase
- `.planning/phases/00-android-bootstrap-cleanup/00-CONTEXT.md` — D-06 a D-10: white-label via productFlavors, `:app-cliente` com flavor `demo` como baseline; D-11: estrutura de 6 módulos (`:core-common`, `:core-network`, `:core-data`, `:core-ui`, `:app-cliente`, `:app-escritorio`)

### Android scaffold baseline
- `app/src/main/java/com/example/appteste/MainActivity.kt` — código de origem (a ser migrado/substituído)
- `gradle/libs.versions.toml` — catálogo de versões centralizado

No external specs além dos acima — decisões completamente capturadas neste documento.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `APPTESTETheme` (`:core-ui`) — tema Material3 já configurado, será o tema de todas as telas do `:app-cliente`
- `Color.kt`, `Type.kt` (`:core-ui`) — paleta e tipografia já estabelecidas, usar como base

### Established Patterns
- Material3 + Jetpack Compose BOM — já em uso, todas as telas usam composables Material3
- Version catalog (`gradle/libs.versions.toml`) — todas as novas dependências (Retrofit, Coil, etc.) devem ser adicionadas aqui
- Kotlin official code style — 4 espaços, trailing lambdas, PascalCase para composables

### Integration Points
- `:app-cliente` depende de `:core-network` (chamadas de API), `:core-data` (Room/repositórios), `:core-ui` (tema e componentes compartilhados), `:core-common` (utilitários)
- Auth via Supabase Auth + JWT (Fase 1) — o `:core-network` deve incluir interceptor que adiciona Bearer token em todas as requisições
- Fluxo de detecção de role: JWT contém `role` no `app_metadata` → app lê ao fazer login e roteia para fluxo cliente ou advogado
- White-label: o `:app-cliente` usa productFlavors — flavor `demo` é o baseline de desenvolvimento/CI

</code_context>

<specifics>
## Specific Ideas

- O cliente final é um **leigo** — linguagem do app deve ser extremamente simples, sem jargão. Termos como "vara", "comarca", "partes" nos dados cadastrais devem ter labels claros (ex: "Tribunal responsável" ao invés de "Vara").
- White-label por escritório: o nome do escritório aparece como nome do app (configurado via Gradle flavor). A tela de onboarding pode mencionar o nome do escritório na tela 1.
- O botão "Falar com meu advogado" usa o número de WhatsApp cadastrado pelo escritório ao vincular o cliente. Se o escritório não tiver WhatsApp cadastrado, o botão pode abrir o discador diretamente.

</specifics>

<deferred>
## Deferred Ideas

- **Chat IA com o processo** — em escopo do v2 (CHAT-01 a CHAT-06), não desta fase
- **Classificação de movimentações por impacto** (crítico/importante/rotineiro) — DIFF-01, v2
- **Glossário contextual inline** — DIFF-02, v2
- **Indicador visual de fase do processo** (petição → audiência → sentença) — DIFF-03, v2
- **Push notifications** — Fase 6, não esta fase
- **Re-exibição do consent LGPD quando a política mudar de versão** — a ser implementado na Fase 8 (LGPD Hardening)

</deferred>

---

*Phase: 05-android-app-fluxo-cliente-mvp*
*Context gathered: 2026-04-15*
