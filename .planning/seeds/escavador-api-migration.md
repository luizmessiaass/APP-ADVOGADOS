---
name: Migração DataJud → Escavador API
trigger_condition: Quando o primeiro cliente pagar / orçamento disponível para custo variável por consulta
planted_date: 2026-04-16
---

## Ideia

Substituir DataJud (CNJ) como fonte de dados processuais pelo Escavador API.

## Por que fazer

- Escavador tem busca por CPF + OAB — descobre automaticamente os processos do cliente com aquele escritório específico, sem o advogado informar CNJ manualmente
- DataJud busca por CPF retorna TODOS os processos da pessoa no Brasil inteiro (outros escritórios, outras épocas) — inútil sem o filtro por OAB do advogado
- Cobertura maior (~95% vs ~80% do DataJud)
- Dados mais normalizados e completos
- Documentação e SLA definidos (empresa privada vs API do governo)

## Fluxo desejado (pós-migração)

```
advogado cadastra cliente → informa só o CPF
     ↓
backend busca Escavador: processos onde
  parte = CPF do cliente
  AND advogado = OAB do escritório
     ↓
lista retornada para confirmação do advogado
     ↓
processos vinculados ao cliente automaticamente
```

## Pré-requisito

- Perfil do escritório precisa ter o número OAB cadastrado (campo novo na tabela `tenants`)

## Impacto na arquitetura

- O adapter DataJud em `core-data` / `core-network` precisa ser substituído por um adapter Escavador
- A migração SQL 002 (processos/movimentacoes) provavelmente não muda — só a camada de sync
- Cadastro de cliente no app_escritorio elimina campo CNJ obrigatório — substitui por busca automática CPF + OAB
- Campo `oab_numero` adicionado à tabela `tenants`

## Custo estimado

Escavador cobra por consulta — repassar como custo variável na assinatura do escritório (ex: limite de processos por plano).

## Quando acionar

- Primeiro cliente pagante confirmado, OU
- Feedback de que o preenchimento manual de CNJ é fricção no onboarding do escritório
