# Phase 2: DataJud Integration & Sync Worker — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

O backend consegue buscar dados processuais da API DataJud do CNJ de forma confiável: valida números CNJ (mod-97), agenda refresh por tier automático baseado em recência, detecta movimentações novas de forma idempotente por ID, degrada graciosamente quando o DataJud está fora ou com rate limit, e nunca bloqueia a UI por falha de sync.

**Não inclui:** tradução com Claude (Phase 3), UI Android (Phase 4+), push notifications (Phase 6), LGPD hardening além do já feito em Phase 1.

</domain>

<decisions>
## Implementation Decisions

### Tiers de Refresh

- **D-01:** Classificação automática por recência da última movimentação. Sem intervenção manual do advogado. Claude's Discretion para definir os limiares exatos (ex: hot = <30 dias, warm = 30-180 dias, cold = >180 dias).
- **D-02:** A reclassificação de tier acontece a cada execução de sync — se uma movimentação nova foi detectada, o processo sobe para hot automaticamente.

### Segredo de Justiça

- **D-03:** Quando o DataJud sinaliza sigilo ou a consulta é barrada por segredo de justiça, o processo permanece cadastrado no sistema mas sem dados de movimentações.
- **D-04:** O cliente vê uma mensagem genérica: "Este processo está sujeito a sigilo judicial. Consulte seu advogado para mais informações." Nenhum dado vazio, nenhuma tela quebrada.
- **D-05:** O advogado é notificado internamente (registro na tabela `sync_errors` com tipo `segredo_justica`) para ciência — sem push para o cliente.
- **D-06:** A pesquisa DataJud deve verificar como a API sinaliza segredo de justiça na prática (campo específico, status code, ou ausência de dados).

### Tolerância de Staleness (Cache Degradado)

- **D-07:** Dados em cache são exibidos normalmente por até **72 horas** após o timestamp da última sincronização bem-sucedida.
- **D-08:** Após 72h sem sync bem-sucedida, o processo exibe um badge "desatualizado" mais visível na UI — mas os dados continuam acessíveis. A UI nunca quebra por falha de sync (DATAJUD-09).
- **D-09:** O campo `ultima_sincronizacao` na tabela `processos` é a fonte de verdade para o cálculo de staleness. Timestamp atualizado somente quando o sync completa sem erro.

### Observabilidade da Fila (Bull Board)

- **D-10:** Bull Board instalado nesta fase e montado em `/admin/queues`, protegido por `ADMIN_TOKEN` em variável de ambiente (Bearer token simples no header).
- **D-11:** Acesso apenas para o administrador do produto (proprietário). Nenhuma interface exposta no painel do escritório. Sem multi-auth: um token único definido em env.
- **D-12:** Railway deploy: o Bull Board é roteado pelo serviço API (não worker separado) para simplificar a configuração de rede.

### Validação CNJ

- **D-13:** Validação do check-digit mod-97 (Resolução CNJ 65/2008) obrigatória antes de qualquer chamada ao DataJud (DATAJUD-01). Claude's Discretion para a implementação exata do algoritmo.
- **D-14:** Formato aceito: `NNNNNNN-DD.AAAA.J.TT.OOOO`. Rejeitar com erro descritivo (`INVALID_CNJ`) antes de qualquer I/O externo.

### Circuit Breaker

- **D-15:** Circuit breaker suspende chamadas ao DataJud após N falhas consecutivas (DATAJUD-06). Claude's Discretion para N, timeout de half-open, e estratégia de recovery.
- **D-16:** Estado do circuit breaker persistido no Redis (não em memória) para que o worker Railway possa reiniciar sem perder o estado.

### Checkpoint e Idempotência

- **D-17:** Job resume do checkpoint correto após reinicialização sem reprocessar do zero (DATAJUD-07). Checkpoint armazenado por job no Redis via BullMQ `job.data`.
- **D-18:** Diff de movimentações por ID estável (DATAJUD-05). A pesquisa DataJud deve identificar qual campo usar como ID de movimentação (campo nativo ou hash de conteúdo).

### Nomenclatura de Banco (continuidade da Phase 1)

- **D-19:** Tabelas em português sem acentos: `processos`, `movimentacoes`, `sync_errors`. Campos: `ultima_sincronizacao`, `tier_refresh`, `circuit_breaker_estado`, `tenant_id`.
- **D-20:** Hard delete para `sync_errors` antigos pode ser implementado via cron de limpeza. Claude's Discretion para o prazo de retenção.

### Claude's Discretion

- Limiares exatos dos tiers de refresh (dias por tier)
- Parâmetros de exponential backoff + jitter para retry (DATAJUD-03)
- N-failures para o circuit breaker e tempo de half-open
- Implementação do algoritmo mod-97 de validação CNJ
- ID de movimentação para diffing (depende da pesquisa da API DataJud)
- Prazo de retenção para registros em `sync_errors`
- Configuração de rate limit numérico para o endpoint /admin/queues

</decisions>

<specifics>
## Specific Ideas

- **72h de tolerância:** decisão baseada em cobrir fins de semana — o DataJud pode não ter SLA e fins de semana com manutenção são realistas.
- **Segredo de justiça:** cliente leigo pode ficar confuso com tela vazia — a mensagem genérica explícita é melhor do que ausência de conteúdo.
- **Bull Board simples:** bearer token em env var é suficiente para v1 — o admin é uma pessoa (o próprio dono do produto), não uma equipe.
- **Circuit breaker no Redis:** evita que múltiplos restarts do worker Railway (que pode reiniciar em crash) percam o estado do circuit breaker e retomem chamadas que já deveriam estar suspensas.

</specifics>

<canonical_refs>
## Canonical References

**Agentes downstream DEVEM ler esses arquivos antes de planejar ou implementar.**

### Requisitos desta Fase
- `.planning/REQUIREMENTS.md` §DataJud Integration (DATAJUD-01..09) — Requisitos exatos mapeados para Phase 2
- `.planning/ROADMAP.md` §Phase 2 — Goal, success criteria, dependências, research flags

### Projeto & Contexto Geral
- `.planning/PROJECT.md` — Constraints do projeto (DataJud como única fonte, Node.js + Supabase não negociável)
- `.planning/STATE.md` — Estado atual do projeto

### Pesquisa Técnica Existente
- `.planning/research/STACK.md` — Stack recomendada: BullMQ, Redis, exponential backoff, circuit breaker patterns
- `.planning/research/ARCHITECTURE.md` — Arquitetura: worker BullMQ como processo separado, dois clientes Supabase
- `.planning/research/PITFALLS.md` — Armadilhas críticas: DataJud reliability, idempotência de jobs, circuit breaker
- `.planning/research/SUMMARY.md` §Phase 2 research flags (Q1, Q10) — Open questions críticos para esta fase

### Phase 1 Context (Fundação que esta fase usa)
- `.planning/phases/01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics/01-CONTEXT.md` — Decisões D-31 (worker BullMQ), D-32 (Redis), D-33 (Bull Board deferido), D-14 (nomenclatura), D-15 (UUID), D-19 (versionamento API)

### Pesquisa Crítica Pendente (RESEARCHER DEVE INVESTIGAR)
- DataJud API 2026: rate limits reais, autenticação (se houver), schema de resposta, cobertura por tribunal, comportamento para segredo de justiça, campo ID de movimentação para diffing
- Verificar se DataJud retorna campo estável de ID por movimentação (fundamental para DATAJUD-05)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (da Phase 1)
- Worker BullMQ em `worker.ts` — já estruturado com multiple consumers. Phase 2 adiciona o consumer `datajud-sync`.
- Redis client configurado — Upstash em produção/CI, Docker Compose em dev. Pronto para uso.
- Fastify server com middleware de tenant — Phase 2 pode adicionar endpoint `/api/v1/processos` que dispara sync manual.
- Tabela `sync_errors` — será criada nesta fase (ainda não existe; Phase 1 apenas estruturou o worker).

### Established Patterns (da Phase 1)
- Nomenclatura PT-BR sem acentos para tabelas e colunas
- UUID v4 (`gen_random_uuid()`) para primary keys
- Timestamps `created_at` + `updated_at` via trigger
- Validação de schema com TypeBox
- Formato de erro padrão: `{ success: false, error: "...", code: "ERROR_CODE" }`
- Logs com pino incluindo `tenant_id`, `user_id`, `request_id`

### Integration Points
- **Phase 3 (Claude Translation):** O worker DataJud desta fase dispara o job de tradução após detectar movimentações novas. A tabela `movimentacoes` é o ponto de handoff.
- **Phase 4 (app_escritorio):** Endpoint de status de sync (`ultima_sincronizacao`, `tier_refresh`) será consumido pelo app Android.
- **Phase 6 (Notificações):** Detecção de movimentação nova (DATAJUD-05) é o gatilho para push notification — a tabela `movimentacoes` ou um evento BullMQ será o ponto de integração.

</code_context>

<deferred>
## Deferred Ideas

- **Bull Board no painel do escritório:** Fase 4 pode adicionar um indicador simplificado de status de sync por processo (última sincronização, status do circuit breaker). Não o Bull Board em si, mas um status derivado.
- **Override manual de tier pelo advogado:** Foi descartado para v1. Se um advogado precisar forçar sync imediato, pode ser adicionado como endpoint admin em Phase 8 (hardening).
- **Alertas proativos de staleness para o advogado:** Se o DataJud ficar fora por mais de 72h, enviar email/notificação interna para o administrador. Diferido para Phase 8 (monitoring/alertas).
- **Múltiplos processos por sync batch:** Otimização para sync de múltiplos processos do mesmo tenant em uma chamada. Diferido — começar com um processo por job e otimizar se necessário.

</deferred>

---

*Phase: 02-datajud-integration-sync-worker*
*Context gathered: 2026-04-14*
