# FORGE Frontend Testing Strategy

**Version**: 1.0  
**Framework Selection**: Vitest + @testing-library/react + Playwright  
**Status**: Implementation Plan  

---

## 1. Testing Pyramid for Frontend

```
                          E2E Tests (Top)
                         /         |         \
                        /          |          \
                       ↓           ↓           ↓
                     Browser    Integration   Component Tests
                     Tests       Tests         Tests (Bottom)
                      (Playwright)     (RTL)      (Vitest/RTL)
                    
                     Coverage: 5-10%     Coverage: 15-20%   Coverage: 60-70%
                    (User flows)        (Component combos) (Individual units)
```

---

## 2. Technology Stack Recommendation

### Unit/Component Tests: **Vitest + @testing-library/react**

Why Vitest?
- ✅ Faster than Jest (uses Vite under the hood)
- ✅ Native TypeScript support (no ts-jest overhead)
- ✅ Jest-compatible API (easy migration path if needed)
- ✅ Great dev experience with HMR and watch mode

Setup commands (once Node environment available):
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom ts-node
pnpm add -D eslint-plugin-vitest @typescript-eslint/parser
```

**Example `vite.config.ts`** (for testing):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/vitest.setup.ts',
    restoreMocks: true,
    mockModules: true,
  },
});
```

### Integration/API Tests: **Node.js test runner** (built-in)

FORGE already has a Node.js test harness using `node:test`. Enhance it with proper fixtures and mocking.

### E2E/Browser Tests: **Playwright**

Why Playwright over Cypress?
- ✅ Faster execution (headless by default, parallelizable)
- ✅ Better TypeScript support out-of-the-box
- ✅ Built-in screenshot/video capture on failure
- ✅ Automatic waiting and retry logic
- ✅ Works with modern frameworks (Next.js, React) better

Setup:
```bash
pnpm add -D @playwright/test
npx playwright install
```

---

## 3. Component Test Setup Structure

```
tests/
├── unit/                  ← Vitest component tests
│   ├── Button.test.tsx
│   ├── Card.test.tsx
│   └── ...
├── integration/           ← Component composition tests
│   └── AgentPanel.test.tsx
└── e2e/                   ← Playwright end-to-end
    ├── home.spec.ts
    ├── agent-panel.spec.ts
    └── ...
tests/
├── vitest.setup.ts        ← Vitest global setup
├── playwright.config.ts   ← Playwright config
└── mock-data.ts           ← Test fixtures/fake data
```

---

## 4. Testing Utility Library

Create shared test utilities in `tests/testing-utils.ts`:

```typescript
// tests/testing-utils.ts
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, jest } from 'vitest';

// Custom render that provides context/providers
const customRender = (ui: React.ReactElement, options?: Parameters<typeof render>[1]) =>
  render(ui, { ...options, });

// Export everything from @testing-library/react + custom render
export * from '@testing-library/react';
export { customRender as render };

// Mocked fetch helper
export const mockFetch = (response: ResponseInit) => {
  const originalFetch = global.fetch;
  vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(response));
  return () => {
    (global.fetch as jest.MockFn).mockRestore();
  };
};
```

---

## 5. Example Component Tests

### Button Component Test (`packages/ui/src/components/Button.test.tsx`)

```typescript
import { render, screen, fireEvent } from '@/testing-utils';
import { Button } from './Button';

describe('Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button text correctly', () => {
    render(<Button onClick={() => {}}>Submit</Button>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    fireEvent.click(screen.getByText('Submit'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has correct aria attributes', () => {
    render(<Button onClick={() {}} disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('supports different variants', () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('variant-primary');
  });
});
```

---

### Agent Panel Component Test (`apps/unified-ide/src/components/AgentSidePanel.test.tsx`)

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { AgentSidePanel } from './AgentSidePanel';

describe('AgentSidePanel', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows error message when API fails', async () => {
    // Mock fetch to return error
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    render(<AgentSidePanel promptSuggestions={['test']} />);

    fireEvent.change(screen.getByPlaceholderText('Enter mission prompt'), {
      target: { value: 'Write code' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  it('allows submitting valid prompts', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'verified', summary: 'Mission complete' }),
    });

    render(<AgentSidePanel promptSuggestions={['test']} />);
    fireEvent.change(screen.getByPlaceholderText('Enter mission prompt'), {
      target: { value: 'Write code' },
    });
    fireEvent.submit(screen.getByRole('form'));

    expect(fetch).toHaveBeenCalledWith('/api/mission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Write code' }),
    });
  });
});
```

---

## 6. E2E Test Example (Playwright)

```typescript
// tests/e2e/agent-panel.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Agent Side Panel E2E', () => {
  test.beforeAll(async ({ browser }) => {
    // Launch local development server
    // This would typically run npm run dev:studio first
  });

  test('should allow mission submission and show response', async ({ page }) => {
    // Navigate to unified IDE
    await page.goto('http://localhost:3000');

    // Find agent panel
    const panel = page.locator('.panel.agent-panel');
    
    // Fill prompt
    await page.fill('#mission-prompt', 'Generate API endpoint for user auth');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for loading state
    await page.waitForSelector('.status-indicator', { state: 'visible' });
    
    // Verify success
    await expect(page.locator('.status-indicator')).toHaveText('verified');
  });

  test('should show error for empty prompt', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.status-message')).toContainText('Enter a mission before running the agent lane.');
  });
});
```

---

## 7. CI Integration

Add testing to GitHub Actions CI pipeline:

```yaml
# In .github/workflows/ci.yml add after lint/steps:

- name: Run Unit Tests
  run: npx vitest run --coverage

- name: Coverage Threshold Check
  run: |
    # Ensure minimum coverage levels
    if [ $(npx vitest run --coverage --reporter=text | grep "Statements" | awk '{print $2}' | cut -d'%' -f1) -lt 30 ]; then
      echo "❌ Coverage below threshold!"
      exit 1
    fi
    echo "✅ Coverage meets minimum threshold"

- name: Run E2E Tests
  run: npx playwright test --workers=2
  env:
    NODE_ENV: test
```

---

## 8. Initial Test Coverage Targets

| Component | Target Coverage | Priority |
|-----------|-----------------|----------|
| Atomic components (Button, Card, Input, Link) | ≥ 90% | High (Phase 1) |
| State management (Zustand stores) | ≥ 80% | Medium (Phase 2) |
| Panel components (Explorer, Mission, Agent) | ≥ 70% | Medium (Phase 3) |
| Application routes/API handlers | ≥ 60% | Low (Phase 4) |
| **Overall Project Average** | **≥ 60%** | Blocker for PRs |

---

## 9. Test Data & Fixtures

Create reusable test data generators for realistic scenarios:

```typescript
// tests/fixtures/mission-fixtures.ts
export function generateMissions(count: number = 3): MissionTrack[] {
  return Array.from({ length: count }, (_, i) => ({
    stage: `Stage ${i + 1}`,
    owner: `Reviewer ${i + 1}`,
    detail: `Task description ${i + 1}: Implement ${['auth', 'db', 'api'][i % 3]} functionality`,
    state: i === 0 ? 'complete' : i === 1 ? 'running' : 'queued' as RunState,
  }));
}

export function generateServices(count: number = 5): ServiceHealth[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${i === 0 ? 'policy' : ['memory', 'artifact', 'workspace', 'scheduler'][i-1]}-service`,
    state: i === 0 ? 'stable' : 'attention' as HealthState,
    signal: `Health check ${i + 1}`,
    detail: i === 0 ? 'Operational normally' : 'Needs investigation',
  }));
}
```

Use these fixtures consistently across tests for stable, predictable data.

---

## 10. Continuous Improvement

As the project matures:
- Increase coverage thresholds each quarter
- Add snapshot tests for critical UI states
- Implement visual regression testing (Percy Chromatic)
- Add accessibility testing to CI (axe-core)
- Record performance metrics during tests
- Create "happy path" and "edge case" test suites per major feature

---

*Frontend Testing Strategy — Part of FORGE Engineering Excellence Audit Phase 3*