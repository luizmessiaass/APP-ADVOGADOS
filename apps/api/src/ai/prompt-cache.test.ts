import { describe, it, expect, vi } from 'vitest';
import { validateCacheThreshold } from './translation-prompt.js';

describe('Prompt cache threshold', () => {
  it('validateCacheThreshold passes when countTokens mock returns 5000 tokens', async () => {
    const mockClient = {
      messages: {
        countTokens: vi.fn().mockResolvedValue({ input_tokens: 5000 }),
      },
    } as any;

    await expect(validateCacheThreshold(mockClient)).resolves.not.toThrow();
  });

  it('validateCacheThreshold throws mentioning 4096 when countTokens mock returns 3000 tokens', async () => {
    const mockClient = {
      messages: {
        countTokens: vi.fn().mockResolvedValue({ input_tokens: 3000 }),
      },
    } as any;

    await expect(validateCacheThreshold(mockClient)).rejects.toThrow('4096');
  });
});
