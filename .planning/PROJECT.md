# Portal Jurídico — SaaS B2B para Escritórios de Advocacia

## What This Is

Plataforma SaaS multi-tenant onde escritórios de advocacia assinam o serviço e seus clientes acessam informações dos seus processos jurídicos em linguagem acessível via app Android. O sistema busca dados processuais no DataJud (CNJ), usa IA (Claude API) para traduzir jargão jurídico para português simples, e disponibiliza um chatbot para que o cliente tire dúvidas diretamente sobre seu processo.

## Core Value

O cliente leigo consegue entender o que está acontecendo no seu processo jurídico sem precisar ligar para o advogado.

## Requirements

### Validated

- ✓ Scaffold Android app com Jetpack Compose + Material3 — existente (template APPTESTE)

### Active

**Backend**
- [ ] Setup Node.js + Supabase com schema multi-tenant
- [ ] Autenticação via Supabase Auth com roles (admin_escritorio, advogado, cliente)
- [ ] Isolamento de dados por tenant (Row Level Security no Supabase)
- [ ] Integração com API DataJud (CNJ) para busca de processos por número CNJ
- [ ] Endpoint de tradução de movimentações via Claude API
- [ ] Endpoint de chat com IA contextualizado por processo
- [ ] Job agendado de atualização automática dos processos no DataJud
- [ ] Envio de push notifications quando há nova movimentação
- [ ] Integração Stripe para assinatura mensal por escritório

**App Android — Cliente Final**
- [ ] Login com email/senha (Supabase Auth)
- [ ] Tela inicial: lista de processos vinculados ao CPF do cliente
- [ ] Tela do processo: status atual em linguagem simples (IA)
- [ ] Linha do tempo das movimentações traduzidas por IA
- [ ] Exibição da próxima data importante (audiência, prazo)
- [ ] Chat com IA sobre o processo específico
- [ ] Push notification ao receber nova movimentação

**App Android — Painel do Escritório**
- [ ] Login separado com role advogado/admin
- [ ] Cadastro de cliente: nome, CPF, email, número do processo CNJ
- [ ] Listagem de clientes com status dos processos
- [ ] Visualização do que o cliente está vendo
- [ ] Envio de mensagem/aviso manual para o cliente

### Out of Scope

- Integração com outros sistemas jurídicos além do DataJud — DataJud (CNJ) é gratuito e cobre processos federais e estaduais; outros sistemas aumentariam complexidade sem cobrir o caso principal
- App iOS — v1 foca em Android; iOS pode ser adicionado em milestone futuro
- Portal web para clientes — app Android cobre o caso principal; web pode vir depois
- Geração de documentos ou petições — produto é de consulta, não de produção jurídica
- Integração com sistemas de processo interno dos escritórios (e.g. SAJ, Themis) — alto custo de integração, fora do escopo v1

## Context

**Stack existente:**
- App Android: Kotlin 2.2.10, Jetpack Compose (BOM 2024.09.00), Material3, minSdk 27 (Android 8.1+)
- Estrutura atual: scaffold mínimo (MainActivity + tema), zero business logic
- Todo o backend e lógica de negócio será construído do zero

**Domínio jurídico brasileiro:**
- Números de processo seguem o padrão CNJ: `NNNNNNN-DD.AAAA.J.TT.OOOO` (ex: `0001234-55.2023.8.26.0100`)
- DataJud é a API oficial do CNJ — gratuita, sem chave de API para consultas básicas
- Movimentações processuais usam linguagem técnica jurídica inacessível ao leigo

**Modelo de negócio:**
- B2B: escritório de advocacia é o cliente pagante
- Escritório oferece o serviço como diferencial para seus clientes finais
- Cobrança via Stripe por plano (número de clientes ativos)

**Usuários:**
- Advogado/admin do escritório: cadastra clientes, gerencia processos, monitora painel
- Cliente final: leigo, quer saber o que está acontecendo com seu processo sem jargão

## Constraints

- **Tech Stack**: Android (Kotlin/Compose) + Node.js + Supabase — decisão tomada, não negociável
- **API jurídica**: DataJud (CNJ) apenas — gratuito, sem custo variável com volume
- **IA**: Claude API (Anthropic) para tradução e chat — consistência de qualidade
- **Auth**: Supabase Auth + JWT — sem implementação custom de autenticação
- **Pagamentos**: Stripe — padrão de mercado, SDK maduro
- **Multi-tenancy**: isolamento obrigatório via RLS no Supabase — dado jurídico é sensível
- **Minimo Android**: API 27 (Android 8.1) — cobre 95%+ dos dispositivos ativos no Brasil

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| DataJud como única fonte jurídica | Gratuito, oficial CNJ, cobre todos os tribunais, sem necessidade de scraping | — Pending |
| Claude API para tradução e chat | Qualidade superior para PT-BR jurídico, prompt caching reduz custo de repetição | — Pending |
| Supabase como backend-as-a-service | Auth + banco + RLS + storage em um só lugar, reduz overhead de infra | — Pending |
| Node.js para API REST | Ecossistema maduro, integração natural com Supabase JS client | — Pending |
| Dois apps Android separados (cliente + escritório) | Experiências muito distintas, roles diferentes, evita UI condicional complexa | — Pending |
| Stripe para monetização | SDK maduro, suporte a assinaturas recorrentes, fácil integração com Node.js | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-14 after initialization*
