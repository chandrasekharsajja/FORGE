// Vitest setup file - runs before all tests
import { vi, describe, expect, it, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Global setup

// Mock all external dependencies at setup level if needed

// Add custom matchers if needed
expect.extend({
  toBeInRange(received: number, expected: { min: number; max: number }) {
    const pass = received >= expected.min && received <= expected.max;
    return {
      pass,
      message: () => `expected ${received} not to be in range [${expected.min}, ${expected.max}]`,
    };
  },
});

// Initialize mocks that need to run before all tests
vi.mock('../src/tool-calling', () => ({
  getToolRegistry: () => ({
    getAllTools: vi.fn(() => []),
    findToolForAction: vi.fn(() => null),
    executeTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
    registerTool: vi.fn(),
    deregisterTool: vi.fn(),
  }),
}));

vi.mock('../src/model-registry', () => ({
  getModelRegistry: () => ({
    listModels: vi.fn(() => []),
    selectBestForTask: vi.fn(() => null),
  }),
}));

// Export any global variables needed in tests
export {};