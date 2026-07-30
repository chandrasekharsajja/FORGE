# FORGE Testing Strategy - Implementation Guide

## Overview

This document specifies the testing framework, patterns, and procedures for validating the FORGE AI Engineering Platform. All tests follow the testing pyramid approach with increasing coverage as we move from unit → integration → E2E.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Unit Tests** | Vitest | Fast, TypeScript-native unit testing |
| **Component Tests** | @testing-library/react | React component interaction testing |
| **Integration Tests** | Node.js native test runner | Service integration validation |
| **E2E Tests** | Playwright | Full browser automation and user journeys |
| **Coverage Reporting** | Istanbul (c8) | HTML/lcov/text coverage reports |
| **Mocking** | vi (Vitest mock API) | Dependency mocking in unit tests |

## Test Directory Structure

```
tests/
├── unit/                    ← Vitest unit tests for packages/services
│   ├── core-agent/
│   │   ├── graph.test.ts
│   │   ├── prompts.test.ts
│   │   ├── streaming.test.ts
│   │   ├── model-registry.test.ts
│   │   └── tool-calling.test.ts
│   └── ... other packages
├── integration/             ← Integration tests for backend services
│   ├── memory-service.test.ts
│   ├── policy-engine.test.ts
│   ├── artifact-service.test.ts
│   └── ...
├── e2e/                     ← Playwright end-to-end tests
│   ├── home.spec.ts
│   ├── agent-panel.spec.ts
│   └── ...
├── vitest.setup.ts          ← Vitest global setup file
├── playwright.config.ts     ← Playwright configuration
└── testing-utils.ts         ← Shared test utilities
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
pnpm test

# Run in watch mode (recommended during development)
pnpm test:watch

# Run with coverage report
pnpm test:coverage

# Run specific test file
pnpm test -- tests/unit/core-agent/graph.test.ts
```

### Integration Tests

Create integration test files under `tests/integration/`:

```bash
# Run integration tests (using Node.js native test runner)
node --experimental-test-runner tests/integration/**/*.test.ts
```

### E2E Tests (Playwright)

```bash
# Install dependencies first (requires Node environment):
pnpm add -D @playwright/test

# Run E2E tests
npx playwright test

# Run in headed browser for debugging
npx playwright test --headed

# Generate HTML coverage report
npx playwright show-report
```

## Testing Patterns

### Unit Testing Pattern

Each test file should contain:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Import module under test

describe('Module Name', () => {
  let instance: ReturnType<typeof moduleName>;

  beforeEach(() => {
    instance = moduleName.create();
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do expected thing', () => {
    // Arrange
    const result = instance.method(arg);

    // Act + Assert
    expect(result).toBe(expected);
  });
});
```

### Mocking External Dependencies

```typescript
// In your test file
vi.mock('../src/real-module', () => ({
  someFunction: vi.fn().mockReturnValue('mocked value'),
}));

// Or inline mocking within a test
const originalFetch = global.fetch;
vi.spyOn(global, 'fetch').mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' }),
});
```

### Testing Async Code

```typescript
it('should handle async operations correctly', async () => {
  const result = await instance.asyncMethod();
  expect(result).toBe(true);
});

it('should throw errors appropriately', async () => {
  await expect(instance.failingMethod()).rejects.toThrow('expected error');
});
```

### Testing with Fixtures

Create reusable fixtures in `tests/fixtures/`:

```typescript
// tests/fixtures/test-fixtures.ts
export function createTestMission(id: string, goal: string) {
  return { id, title: '', goal, organizationId: 'org-123', status: 'draft' };
}

export function createMockPolicyEngine() {
  return {
    evaluateAction: vi.fn().mockResolvedValue({ allowed: true }),
  };
}

// Usage in test
import { createTestMission } from '@/tests/fixtures/test-fixtures';
const mission = createTestMission('m1', 'Build something');
```

## Coverage Requirements

| Component | Minimum Coverage | Target |
|-----------|------------------|--------|
| Core Agent Package | ≥ 70% | ≥ 85% |
| Memory Service | ≥ 65% | ≥ 80% |
| Policy Engine | ≥ 75% | ≥ 90% |
| Artifact Service | ≥ 70% | ≥ 85% |
| Workspace Service | ≥ 65% | ≥ 80% |
| Event Bus | ≥ 70% | ≥ 85% |
| API Routes | ≥ 60% | ≥ 75% |
| Frontend Components | ≥ 50% | ≥ 65% |

## Quality Gates for Pull Requests

Every PR must pass these automated checks before merging:

1. ✅ Unit tests pass (Vitest)
2. ✅ No linting errors (ESLint with --fix applied)  
3. ✅ Code formats correctly (Prettier check passes)
4. ✅ Type checking passes (tsc --noEmit)
5. ✅ Coverage doesn't decrease (maintain or improve)
6. ✅ No circular dependency violations (architecture validation hook)
7. ✅ Commit message follows Conventional Commits format

## CI Pipeline Integration

Add to `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on: [push, pull_request]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: '18.19.0'
        cache: 'npm'
      
    - name: Install dependencies
      run: npm ci
      
    - name: Run linter
      run: npm run lint
      
    - name: Format check
      run: npm run format:check
      
    - name: Type check
      run: npm run type-check
      
    - name: Run unit tests with coverage
      run: npm run test:coverage --workspace @sajja/forge-core-agent
      
    - name: Check coverage threshold
      run: |
        COVERAGE=$(npx vitest run --coverage --reporter=text | grep Statements | awk '{print $2}' | cut -d'%' -f1)
        if [ "$COVERAGE" -lt 70 ]; then
          echo "❌ Coverage below threshold: ${COVERAGE}% (required: 70%)"
          exit 1
        fi
        echo "✅ Coverage meets minimum threshold: ${COVERAGE}%"
      
    - name: Architecture validation
      run: node .husky/validate-architecture.js
      
    - name: Build all packages
      run: npm run build --workspaces --if-present
```

## Test Data Management

Use test fixtures to avoid hardcoded values throughout tests. Create separate fixture modules for different domains:

```typescript
// tests/fixtures/mock-data.ts
export const MOCK_MISSION = {
  id: 'test-mission',
  title: 'Test Mission',
  goal: 'Create a test endpoint',
  organizationId: 'org-test',
  status: 'draft',
  createdAt: new Date().toISOString(),
};

export const MOCK_USER = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'developer',
};

export const MOCK_POLICY_RESULT = {
  allowed: true,
  ruleId: null,
  reason: undefined,
};
```

## Performance Considerations

- Unit tests should execute in < 5 seconds per file
- Integration tests may take longer but should still complete within reasonable time
- E2E tests are run on push to main branch only (not on every PR via caching)
- Use mock implementations heavily for unit tests to keep them isolated and fast
- Parallelize independent test suites where possible

## Debugging Tests

When tests fail:

1. **Unit tests**: Add console.log statements inside the test or use VS Code debugger
2. **Integration tests**: Check network call mocks, verify database connections are properly mocked/reset
3. **E2E tests**: Use `--headed` flag to see what's happening in the browser, take screenshots on failure with `test.expect(...).toHaveScreenshot()`

## Future Enhancements

Once the basic testing infrastructure is established, consider adding:

- 🔴 Snapshot testing for critical UI components
- 🔴 Visual regression testing with Percy/Chromatic  
- 🔴 Load/stress testing for high-throughput scenarios
- 🔴 Security scanning of test dependencies
- 🔴 Test data generation library for realistic test scenarios
- 🔴 Mutation testing to ensure test quality
- 🔴 Contract testing between frontend and backend APIs

---

*Testing Strategy v1.0 — Part of FORGE Engineering Excellence Audit Phase 9*