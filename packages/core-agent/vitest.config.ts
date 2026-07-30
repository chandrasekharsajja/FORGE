import { defineConfig } from 'vitest';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    mockModules: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.next', 'coverage'],
    coverage: {
      provider: 'istanbul',
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', 'tests/**/*.ts'],
      reporting: ['text', 'lcov', 'html'],
    },
  },
  resolve: {
    alias: {
      '@sajja/contracts': resolve(__dirname, '../contracts/src'),
      '@platform/memory-service': resolve(__dirname, '../../services/memory-service/src'),
      '@platform/policy-engine': resolve(__dirname, '../../services/policy-engine/src'),
      '@platform/artifact-service': resolve(__dirname, '../../services/artifact-service/src'),
      '@platform/workspace-service': resolve(__dirname, '../../services/workspace-service/src'),
      '@platform/event-bus': resolve(__dirname, '../../services/event-bus/src'),
    },
  },
});