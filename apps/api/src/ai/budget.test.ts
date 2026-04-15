import { describe, it } from 'vitest';

describe('Token budget — checkTokenBudget and checkAndFireAlerts', () => {
  it.todo('checkTokenBudget returns exceeded=false and percentual=50 when tokens_usados=500000 and budget=1000000');
  it.todo('checkTokenBudget returns exceeded=true and percentual=100 when tokens_usados=1000000 and budget=1000000');
  it.todo('checkTokenBudget uses DEFAULT_TENANT_TOKEN_BUDGET from env when token_budget is null');
  it.todo('checkAndFireAlerts fires Sentry alert and updates ultimo_alerta_nivel to 50 when percentual=50 and ultimo_alerta_nivel=0');
  it.todo('checkAndFireAlerts does NOT fire alert again when percentual=50 and ultimo_alerta_nivel=50 (idempotence)');
  it.todo('checkAndFireAlerts fires alert for 80% when percentual=80 and ultimo_alerta_nivel=50');
  it.todo('checkAndFireAlerts fires Sentry with level=error when percentual=100');
  it.todo('checkAndFireAlerts fires Sentry with level=warning when percentual=80');
  it.todo('checkAndFireAlerts resets ultimo_alerta_nivel to 0 and does NOT fire when percentual=10 and ultimo_alerta_nivel=80 (new cycle)');
  it.todo('checkAndFireAlerts resets and fires 50% alert when percentual=55 and ultimo_alerta_nivel=80 (new cycle crossed 50%)');
});
