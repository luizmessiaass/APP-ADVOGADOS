---
phase: 02-datajud-integration-sync-worker
plan: "03"
subsystem: database/supabase
tags: [datajud, migration, supabase, schema, rls]
---
# Plan 02-03 Summary — [BLOCKING] Schema DataJud aplicado no Supabase

**Status:** Complete
**Commits:** sem commit de código (operação de infra)

---

## O que foi feito

A migration `0006_datajud_schema.sql` foi aplicada no banco Supabase remoto (`ydhntdhmtdxvzfdktjtf`).

### Tabelas criadas

| Tabela | Propósito | RLS |
|--------|-----------|-----|
| `processos` | Processos jurídicos por tenant, tier de refresh, staleness | ✓ |
| `movimentacoes` | Movimentações processuais com idempotência (DATAJUD-05) | ✓ |
| `sync_errors` | Log de erros do worker de sincronização | ✓ |

### Verificação

```
Local | Remote | Time (UTC)
0006  | 0006   | 0006       ← aplicada
```

API REST confirmada via `/processos`, `/movimentacoes`, `/sync_errors`.

### Desvios documentados

**[Rule 3 - Blocking]** O plano referenciava `backend/supabase/migrations/002_datajud_schema.sql`, mas a estrutura real é `supabase/migrations/0006_datajud_schema.sql`. A migration correta foi encontrada e aplicada.

**[Infra]** Histórico de migrations (0001-0005) estava dessincronizado entre CLI e banco (remote sem registro). Corrigido via `supabase migration repair --status applied` antes do push.

---

## Resultado

Plans 04 e 05 podem prosseguir — schema disponível no banco remoto.
