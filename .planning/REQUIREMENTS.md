# Requirements: Portal Jurídico — SaaS B2B para Escritórios de Advocacia

**Defined:** 2026-04-14
**Core Value:** O cliente leigo consegue entender o que está acontecendo no seu processo jurídico sem precisar ligar para o advogado.

## v1 Requirements

### Infrastructure & Setup (INFRA)

- [ ] **INFRA-01**: Projeto Node.js/TypeScript com Fastify está configurado com hot-reload e script de build
- [ ] **INFRA-02**: Projeto Supabase está configurado com Supabase CLI e migrations versionadas em SQL
- [ ] **INFRA-03**: Supavisor (connection pooler) está configurado no projeto Supabase
- [ ] **INFRA-04**: Variáveis de ambiente sensíveis são gerenciadas via `.env` com validação na inicialização
- [ ] **INFRA-05**: CI/CD com GitHub Actions executa testes e build em cada push
- [ ] **INFRA-06**: Logs estruturados com `pino` incluem `tenant_id`, `user_id`, `request_id` em todas as entradas
- [ ] **INFRA-07**: Sentry está configurado para capturar erros com contexto de tenant e usuário
- [ ] **INFRA-08**: Health endpoint `/health` retorna status dos serviços dependentes (Supabase, Redis, DataJud)
- [ ] **INFRA-09**: Worker BullMQ roda como processo separado do servidor HTTP API

### Authentication & Multi-tenancy (AUTH)

- [ ] **AUTH-01**: Escritório consegue criar conta e fazer login com email/senha via Supabase Auth
- [ ] **AUTH-02**: Cliente final consegue fazer login com email/senha via Supabase Auth
- [ ] **AUTH-03**: JWT contém `tenant_id` e `role` em `app_metadata` (injetados pelo Custom Access Token Hook)
- [ ] **AUTH-04**: Middleware de tenant extrai `tenant_id` do JWT e rejeita requisições sem contexto de tenant válido
- [ ] **AUTH-05**: Row Level Security está ativa em todas as tabelas com dados por tenant (tenants, users, processos, movimentacoes, chat_messages)
- [ ] **AUTH-06**: Test de integração "tenant A não consegue ler dados do tenant B via nenhum endpoint" é executado no CI como gate
- [ ] **AUTH-07**: Roles `admin_escritorio`, `advogado`, `cliente` têm políticas RLS distintas no banco
- [ ] **AUTH-08**: Cliente final recebe email com credenciais de acesso ao app quando cadastrado pelo escritório
- [ ] **AUTH-09**: Usuário consegue fazer logout e sessão é invalidada

### DataJud Integration (DATAJUD)

- [ ] **DATAJUD-01**: Backend valida número CNJ (algoritmo mod-97 de check-digit, Resolução CNJ 65/2008) antes de qualquer consulta
- [ ] **DATAJUD-02**: Backend busca dados do processo no DataJud via número CNJ
- [ ] **DATAJUD-03**: Job de sincronização executa via BullMQ com política de retry (exponential backoff + jitter)
- [ ] **DATAJUD-04**: Sincronização é agendada em tiers (hot/warm/cold: processos ativos com frequência maior)
- [ ] **DATAJUD-05**: Movimentações novas são detectadas por diffing idempotente por ID de movimentação
- [ ] **DATAJUD-06**: Circuit breaker suspende chamadas ao DataJud após N falhas consecutivas
- [ ] **DATAJUD-07**: Job retoma do checkpoint correto após reinicialização (não reprocessa do zero)
- [ ] **DATAJUD-08**: Erros de sincronização são registrados em tabela `sync_errors` com contexto do processo
- [ ] **DATAJUD-09**: UI mostra "última atualização" com timestamp; nunca bloqueia UI por falha de sync

### AI Translation (AI)

- [ ] **AI-01**: Endpoint traduz movimentações jurídicas para português simples via Claude API
- [ ] **AI-02**: Prompt usa caching de tokens (system prompt + glossário jurídico em blocos `cache_control`)
- [ ] **AI-03**: Input de movimentação é delimitado por tags XML (`<movimentacao>...</movimentacao>`) para isolar de instruções do sistema
- [ ] **AI-04**: Output é validado por schema antes de salvar (`{status, proxima_data, explicacao, impacto}`)
- [ ] **AI-05**: Tradução já realizada é cacheada por hash do texto original (não reprocessa movimentação igual)
- [ ] **AI-06**: Cada resposta da IA exibe disclaimer visível: "Explicação gerada por IA — confirme com seu advogado"
- [ ] **AI-07**: Limites de tokens por tenant estão configurados com alertas de gasto em 50/80/100%
- [ ] **AI-08**: Modelo Haiku é usado para tradução em lote; Sonnet para interações (v1.1)

### Push Notifications (NOTIFY)

- [ ] **NOTIFY-01**: App registra device token FCM no backend após login (`POST /api/devices/register`)
- [ ] **NOTIFY-02**: Backend envia push notification FCM de alta prioridade quando nova movimentação é detectada
- [ ] **NOTIFY-03**: Backend trata tokens inválidos (HTTP 404 do FCM) removendo-os da base
- [ ] **NOTIFY-04**: App_cliente exibe notificações recebidas em primeiro plano e em background com deep-link para o processo
- [ ] **NOTIFY-05**: App_cliente possui central de notificações in-app que carrega notificações não lidas do backend (safety net para entregas perdidas)
- [ ] **NOTIFY-06**: App_cliente inclui tela de onboarding orientando usuário a desativar otimização de bateria para receber notificações (OEM: Xiaomi, Samsung, Motorola)
- [ ] **NOTIFY-07**: WorkManager executa poll periódico de notificações não lidas como fallback de entrega

### Stripe Billing (BILLING)

- [ ] **BILLING-01**: Escritório consegue assinar um plano via Stripe Checkout hosted
- [ ] **BILLING-02**: Escritório consegue gerenciar assinatura (cancelar, mudar plano) via Stripe Customer Portal
- [ ] **BILLING-03**: Webhook Stripe é verificado por assinatura antes de processar (`stripe.webhooks.constructEvent`)
- [ ] **BILLING-04**: Todos os eventos Stripe são registrados em tabela `stripe_events` para idempotência (replay-safe)
- [ ] **BILLING-05**: Middleware de entitlement verifica `subscription_status` do tenant antes de liberar endpoints protegidos
- [ ] **BILLING-06**: State machine de grace period: Dia 0 (email) → Dia 3 (banner in-app) → Dia 7 (painel escritório somente leitura) → Dia 14 (suspensão total)
- [ ] **BILLING-07**: Tenant nunca tem dados deletados por falta de pagamento (apenas `status` desativado)

### LGPD Compliance (LGPD)

- [ ] **LGPD-01**: Tabela de consentimento LGPD registra opt-in/opt-out com timestamp e versão dos termos
- [ ] **LGPD-02**: App_cliente exibe política de privacidade e termos de uso na primeira abertura (consent gate)
- [ ] **LGPD-03**: CPF e PII não são incluídos em prompts enviados para a Claude API (data minimization)
- [ ] **LGPD-04**: Logs não registram CPF ou conteúdo bruto de prompts (redação de PII)
- [ ] **LGPD-05**: Escritório consegue deletar cliente e todos os seus dados via endpoint (Art. 18 LGPD) com cascade
- [ ] **LGPD-06**: Política de privacidade menciona Anthropic como sub-processador internacional (Art. 33)

### app_escritorio (ESCR)

- [ ] **ESCR-01**: Advogado/admin consegue fazer login com email/senha
- [ ] **ESCR-02**: Advogado consegue cadastrar novo cliente (nome, CPF, email, número CNJ)
- [ ] **ESCR-03**: Validação de CPF e número CNJ acontece no formulário de cadastro antes de submeter
- [ ] **ESCR-04**: Advogado consegue visualizar lista de clientes com status resumido dos processos
- [ ] **ESCR-05**: Advogado consegue buscar cliente por nome, CPF ou número de processo
- [ ] **ESCR-06**: Advogado consegue visualizar o processo "como o cliente vê" (preview read-only das movimentações traduzidas)
- [ ] **ESCR-07**: Advogado consegue enviar mensagem/aviso manual para o cliente via app
- [ ] **ESCR-08**: Tela do cliente mostra status da última sincronização DataJud de cada processo
- [ ] **ESCR-09**: Advogado consegue acessar Stripe Customer Portal para gerenciar assinatura via Chrome Custom Tabs
- [ ] **ESCR-10**: App_escritorio usa arquitetura Clean Architecture + MVVM + Compose com módulos `:core-*` compartilhados
- [ ] **ESCR-11**: App_escritorio passa linting, testes unitários e UI tests no CI antes de qualquer release

### app_cliente (APP)

- [ ] **APP-01**: Cliente consegue fazer login com email/senha fornecidos pelo escritório
- [ ] **APP-02**: Tela inicial exibe lista de processos vinculados ao CPF do cliente
- [ ] **APP-03**: Tela do processo exibe status atual em linguagem simples gerado por IA
- [ ] **APP-04**: Tela do processo exibe linha do tempo de movimentações com descrição traduzida por IA
- [ ] **APP-05**: Tela do processo exibe próxima data importante (audiência, prazo, perícia) em destaque
- [ ] **APP-06**: Tela do processo exibe dados cadastrais do processo (número CNJ, vara, comarca, partes)
- [ ] **APP-07**: Tela do processo exibe data/hora da última atualização ("sincronizado há X horas")
- [ ] **APP-08**: Tela "sem movimentação recente" exibe mensagem tranquilizadora (não vazia/quebrada)
- [ ] **APP-09**: Cliente recebe push notification quando há nova movimentação e pode tocar para abrir o processo
- [ ] **APP-10**: App possui central de notificações in-app com histórico de notificações não lidas
- [ ] **APP-11**: Tela do processo possui botão "falar com meu advogado" com deep-link para WhatsApp/email
- [ ] **APP-12**: App exibe onboarding de 3-4 telas na primeira abertura explicando as funcionalidades
- [ ] **APP-13**: App exibe LGPD consent screen na primeira abertura (aceite obrigatório antes de usar)
- [ ] **APP-14**: Cada informação gerada por IA exibe disclaimer visível "Explicação gerada por IA"
- [ ] **APP-15**: App_cliente usa arquitetura Clean Architecture + MVVM + Compose com módulos `:core-*` compartilhados
- [ ] **APP-16**: App_cliente passa linting, testes unitários e UI tests no CI antes de qualquer release

### Project Bootstrap (BOOT)

- [ ] **BOOT-01**: Pacote Android renomeado de `com.example.appteste` para pacote de produção
- [ ] **BOOT-02**: Compose BOM atualizado para versão atual (2024.09.00 está desatualizado)
- [ ] **BOOT-03**: Minificação habilitada em builds de release (`isMinifyEnabled = true`)
- [ ] **BOOT-04**: Estrutura multi-módulo Android criada: `:core-common`, `:core-network`, `:core-data`, `:core-ui`, `:app-cliente`, `:app-escritorio`
- [ ] **BOOT-05**: DI framework (Hilt) configurado no projeto Android
- [ ] **BOOT-06**: Dependências Android verificadas e atualizadas para versões atuais

---

## v2 Requirements

### Chat IA (CHAT)

- **CHAT-01**: Cliente consegue fazer perguntas sobre seu processo em linguagem natural
- **CHAT-02**: IA responde com contexto do processo (movimentações + dados cadastrais) via Claude API
- **CHAT-03**: Respostas da IA incluem disclaimer proeminente "Confirme com seu advogado"
- **CHAT-04**: Histórico de chat é armazenado por processo e usuário
- **CHAT-05**: Rate limiting por usuário (ex: 20 mensagens/hora, 100/dia) para controle de custo
- **CHAT-06**: Input é delimitado por tags XML contra prompt injection; output é schema-validado

### Differentiators (DIFF)

- **DIFF-01**: Notificações são classificadas por impacto (crítico / importante / rotineiro) para evitar fadiga
- **DIFF-02**: Glossário contextual: cliente toca em termo técnico e vê explicação inline
- **DIFF-03**: Indicador visual de fase do processo (petição → audiência → sentença → trânsito)
- **DIFF-04**: White-label leve por tenant (logo do escritório, cor primária)
- **DIFF-05**: Métricas de "ligações evitadas" no painel do escritório (ROI justification)
- **DIFF-06**: Templates reutilizáveis de avisos para advogados enviarem em massa

### Onboarding & Growth (GROWTH)

- **GROWTH-01**: Convite do cliente via magic link por WhatsApp (além de email)
- **GROWTH-02**: Relatório mensal PDF automatizado do status dos processos por cliente
- **GROWTH-03**: Painel de insights do escritório (quais clientes estão mais ansiosos)

---

## Out of Scope

| Feature | Motivo |
|---------|--------|
| AI que dá conselho jurídico ("você deve recorrer") | Prática jurídica não autorizada — violação OAB |
| AI que estima prazo final do processo | Jurisprudência é imprevisível; falso positivo destrói confiança e cria risco legal |
| AI que calcula valor esperado da causa | Mesmo risco que acima |
| Upload de documentos pelo cliente | v1 é somente leitura de DataJud; adicionar uploads aumenta complexidade LGPD |
| Cadastro self-service do cliente final | Quebra o modelo B2B2C; cliente é sempre cadastrado pelo escritório |
| Integração com SAJ / Themis / Projuris | Alto custo de integração; DataJud cobre o caso principal |
| Portal web para clientes | v1 foca em Android; web pode vir depois |
| App iOS | v1 foca em Android |
| Avaliação pública do escritório | OAB proíbe publicidade comparativa de serviços jurídicos |
| Videoconferência integrada | Zoom/Meet resolvem; não é diferencial |
| Assinatura digital ICP-Brasil | DocuSign/Clicksign resolvem; fora do escopo |
| Schema-per-tenant multi-tenancy | Não escala; shared schema + RLS é o padrão |
| Gamificação de qualquer tipo | Processos jurídicos não são um jogo |
| Alertas proativos de prazo do cliente | Risco de responsabilidade legal; requer revisão jurídica para v2 |
| Busca/histórico público de processos de terceiros | Privacy; é o espaço do JusBrasil |
| Cálculos trabalhistas ou previdenciários automáticos | Fora do escopo; requer expertise específica |

---

## Traceability

*(Preenchido durante a criação do roadmap)*

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOOT-01 to BOOT-06 | Phase 0 | Pending |
| INFRA-01 to INFRA-09 | Phase 1 | Pending |
| AUTH-01 to AUTH-09 | Phase 1 | Pending |
| LGPD-01, LGPD-03, LGPD-04, LGPD-06 | Phase 1 | Pending |
| DATAJUD-01 to DATAJUD-09 | Phase 2 | Pending |
| AI-01 to AI-08 | Phase 3 | Pending |
| LGPD-02, LGPD-05 | Phase 4–5 | Pending |
| ESCR-01 to ESCR-11 | Phase 4 | Pending |
| APP-01 to APP-16 | Phase 5 | Pending |
| NOTIFY-01 to NOTIFY-07 | Phase 6 | Pending |
| BILLING-01 to BILLING-07 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 70 total
- Mapped to phases: 70
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after initial definition*
