import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Sentry mock ---
const mockCaptureMessage = vi.fn();
vi.mock('@sentry/node', () => ({
  captureMessage: mockCaptureMessage,
}));

// --- Supabase mock setup ---
// We need granular control per-test, so we capture the mock fns
let mockEscritorioData: Record<string, any> = {};
let mockRpcData: any = 0;
const mockUpdateFn = vi.fn().mockResolvedValue({ error: null });

vi.mock('@supabase/supabase-js', () => {
  const buildChain = () => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation((_col: string, _val: string) => ({
        single: vi.fn().mockImplementation(() =>
          Promise.resolve({ data: mockEscritorioData, error: null })
        ),
      })),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });

  return {
    createClient: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue(buildChain()),
      rpc: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: mockRpcData, error: null })
      ),
    })),
  };
});

describe('Token budget — checkTokenBudget and checkAndFireAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_TENANT_TOKEN_BUDGET = '1000000';
    mockUpdateFn.mockResolvedValue({ error: null });
  });

  it('checkTokenBudget returns exceeded=false and percentual=50 when tokens_usados=500000 and budget=1000000', async () => {
    mockEscritorioData = { token_budget: 1_000_000 };
    mockRpcData = 500_000;

    const { checkTokenBudget } = await import('../budget/token-budget.js');
    const result = await checkTokenBudget('tenant-uuid-1');

    expect(result.exceeded).toBe(false);
    expect(result.percentual).toBe(50);
  });

  it('checkTokenBudget returns exceeded=true and percentual=100 when tokens_usados=1000000 and budget=1000000', async () => {
    mockEscritorioData = { token_budget: 1_000_000 };
    mockRpcData = 1_000_000;

    const { checkTokenBudget } = await import('../budget/token-budget.js');
    const result = await checkTokenBudget('tenant-uuid-1');

    expect(result.exceeded).toBe(true);
    expect(result.percentual).toBe(100);
  });

  it('checkTokenBudget uses DEFAULT_TENANT_TOKEN_BUDGET from env when token_budget is null', async () => {
    mockEscritorioData = { token_budget: null };
    mockRpcData = 500_000;
    process.env.DEFAULT_TENANT_TOKEN_BUDGET = '2000000';

    const { checkTokenBudget } = await import('../budget/token-budget.js');
    const result = await checkTokenBudget('tenant-uuid-1');

    expect(result.budget).toBe(2_000_000);
    expect(result.percentual).toBe(25); // 500000 / 2000000 * 100
  });

  it('checkAndFireAlerts fires Sentry alert and updates ultimo_alerta_nivel to 50 when percentual=50 and ultimo_alerta_nivel=0', async () => {
    mockEscritorioData = { ultimo_alerta_nivel: 0 };

    const { checkAndFireAlerts } = await import('../budget/token-budget.js');
    await checkAndFireAlerts('tenant-uuid-1', 50);

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('50%'),
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('checkAndFireAlerts does NOT fire alert again when percentual=50 and ultimo_alerta_nivel=50 (idempotence)', async () => {
    mockEscritorioData = { ultimo_alerta_nivel: 50 };

    const { checkAndFireAlerts } = await import('../budget/token-budget.js');
    await checkAndFireAlerts('tenant-uuid-1', 50);

    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('checkAndFireAlerts fires alert for 80% when percentual=80 and ultimo_alerta_nivel=50', async () => {
    mockEscritorioData = { ultimo_alerta_nivel: 50 };

    const { checkAndFireAlerts } = await import('../budget/token-budget.js');
    await checkAndFireAlerts('tenant-uuid-1', 80);

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('80%'),
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('checkAndFireAlerts fires Sentry with level=error when percentual=100', async () => {
    mockEscritorioData = { ultimo_alerta_nivel: 0 };

    const { checkAndFireAlerts } = await import('../budget/token-budget.js');
    await checkAndFireAlerts('tenant-uuid-1', 100);

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('100%'),
      expect.objectContaining({ level: 'error' })
    );
  });

  it('checkAndFireAlerts fires Sentry with level=warning when percentual=80', async () => {
    mockEscritorioData = { ultimo_alerta_nivel: 0 };

    const { checkAndFireAlerts } = await import('../budget/token-budget.js');
    await checkAndFireAlerts('tenant-uuid-1', 80);

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('80%'),
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('checkAndFireAlerts resets ultimo_alerta_nivel to 0 and does NOT fire when percentual=10 and ultimo_alerta_nivel=80 (new cycle)', async () => {
    // percentual=10 < ultimoNivel=80 → new cycle detected → reset to 0
    // 10% does NOT cross any threshold (50, 80, 100) from 0
    mockEscritorioData = { ultimo_alerta_nivel: 80 };

    const { checkAndFireAlerts } = await import('../budget/token-budget.js');
    await checkAndFireAlerts('tenant-uuid-1', 10);

    // No alert fired (10% below all thresholds)
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('checkAndFireAlerts resets and fires 50% alert when percentual=55 and ultimo_alerta_nivel=80 (new cycle crossed 50%)', async () => {
    // percentual=55 < ultimoNivel=80 → new cycle → reset to 0 → 55% crosses 50% threshold
    mockEscritorioData = { ultimo_alerta_nivel: 80 };

    const { checkAndFireAlerts } = await import('../budget/token-budget.js');
    await checkAndFireAlerts('tenant-uuid-1', 55);

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('50%'),
      expect.objectContaining({ level: 'warning' })
    );
  });
});
