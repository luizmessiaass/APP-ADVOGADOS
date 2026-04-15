import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/api/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
    setupFiles: ['apps/api/src/tests/setup.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@api': '/apps/api/src',
    },
  },
})
