# Unified IDE Component Architecture Design System Strategy

**Version**: 1.0  
**Status**: Draft - Roadmap for Component Library Extraction  
**Last Updated**: July 30, 2026

---

## Current State Assessment

The `apps/unified-ide` contains several panel components that are currently implemented as inline page-specific components. While functional, they lack reusability and consistency across potential future pages or extensions.

### Existing Components Observed:
| Component | File | Role | Status |
|-----------|------|------|--------|
| ExplorerPanel | `/components/ExplorerPanel.tsx` | Workspace navigation explorer | ✅ Working |
| MissionBoard | `/components/MissionBoard.tsx` | Release timeline/checklist | ✅ Working |
| AgentSidePanel | `/components/AgentSidePanel.tsx` | Command center with form | ✅ Working (client-side) |
| MonacoEditorContainer | `/components/Editor/MonacoEditorContainer.tsx` | Editor area (using textarea placeholder) | ⚠️ Placeholder |
| TerminalPanel | `/components/Terminal/TerminalPanel.tsx` | Terminal interface | ⚠️ TBD |
| SystemMap | `/components/SystemMap.tsx` | Visual status map | ⚠️ TBD |
| RunbookPanel | `/components/RunbookPanel.tsx` | Guidance/help panel | ⚠️ TBD |

---

## Recommended Component Library Structure

Extract common UI patterns into a shared component library under `packages/ui/` or `libs/shared-ui/`. This enables consistency across all FORGE surfaces and provides a single source of truth for design tokens, accessibility patterns, and responsive behavior.

```text
/packages/
├── ui/                    ← Shared component library (extract here)
│   ├── src/
│   │   ├── components/    ← Reusable atomic components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Link.tsx
│   │   │   └── ...       ← All primitive components
│   │   ├── hooks/         ← Custom React hooks
│   │   │   └── useMediaQuery.ts
│   │   ├── styles/        ← Global styles, theme variables
│   │   │   ├── globals.css
│   │   │   └── theme.ts
│   │   ├── types/         ← Shared type definitions
│   │   └── index.ts       ← Public API export
│   ├── package.json
│   └── tsconfig.json
└── ... (other packages)
```

---

## Phase 1: Extract Atomic Components (Priority)

These should be extracted first as they form the foundation for all other components:

### 1. Button Component

**Why used extensively**: Topbar actions, form submit buttons, panel actions.

**Props Required**:
- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `disabled?: boolean`
- `type?: 'button' | 'submit' | 'reset'`
- `onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void`
- Children (text or icon)

**Accessibility**: Proper button semantics, keyboard focus, ARIA disabled state.

---

### 2. Card Component

**Why used in**: Explorer sections, mission track items, release checklist items.

**Props Required**:
- `children?: React.ReactNode`
- `header?: { title?: string; subtitle?: string }`
- `action?: { label: string; onClick: () => void }`
- `variant?: 'elevated' | 'plain' | 'bordered'`
- `loading?: boolean`

**Implementation**: Should support header/footer slots, consistent padding, elevation/shadow variants.

---

### 3. Input/TextArea Component

**Why used in**: Agent prompt input, any future form inputs.

**Props Required**:
- `value?: string`
- `onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void`
- `label?: string`
- `placeholder?: string`
- `error?: string`
- `description?: string`
- `disabled?: boolean`
- `required?: boolean`

**Accessibility**: Proper label association, error messaging, ARIA live regions for errors.

---

### 4. Link Component

**Why used in**: Navigation, external references, internal routing.

**Props Required**:
- `href?: string`
- `target?: '_blank'`
- `rel?: string` (automatically add `'noopener noreferrer'` for external)
- `children?: ReactNode`
- `variant?: 'default' | 'underline' | 'icon'`

**Security**: Sanitize `href` to prevent XSS, always set `rel="noopener"` for external links.

---

## Phase 2: Composite Components

Once atomic components exist, composite higher-level components can be built consistently:

### Panel Component (Wrapper for ExplorerPanel, MissionBoard, etc.)

**Why needed**: Consistent styling for all side panels/workspace columns.

**Structure**:
```tsx
export function Panel({
  children,
  header,
  eyebrow,
}: {
  children: ReactNode;
  header?: { title: string; subtitle?: string };
  eyebrow?: string;
}) {
  return (
    <div className="panel">
      {header && (
        <div className="panel-header">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{header.title}</h2>
          {header.subtitle && <p>{header.subtitle}</p>}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  );
}
```

### Tab Component (For MonacoEditorContainer tabs)

**Why needed**: Consistent tab switching pattern for open files.

---

## Phase 3: State Management Pattern

Current frontend uses component-local `useState` only. For a complex IDE-like application, implement a global state management solution:

### Recommended Approach: Zustand + Context API Mix

**Why**: Lightweight, TypeScript-friendly, easy learning curve, integrates well with Next.js.

**Setup**:
```bash
npm install zustand @zustand/skywalkers
```

**Example Store** (`packages/ui/src/store/ide-store.ts`):
```typescript
import { create } from 'zustand';

interface IDEState {
  activeFileId?: string;
  setActiveFile: (id: string) => void;
  fileDrafts: Record<string, string>;
  updateDraft: (fileId: string, content: string) => void;
}

export const useIDStore = create<IDEState>((set) => ({
  activeFileId: undefined,
  fileDrafts: {},
  setActiveFile: (id) => set({ activeFileId: id }),
  updateDraft: (fileId, content) => 
    set((state) => ({
      fileDrafts: { ...state.fileDrafts, [fileId]: content },
    })),
}));
```

**Integration**: Wrap `apps/unified-ide` app with Provider component.

---

## Phase 4: Monaco Editor Replacement

The current `MonacoEditorContainer` uses a `<textarea>` placeholder. Replace with actual Monaco editor integration:

**Recommended Implementation**:

1. Use `@monaco-editor/react` wrapper for Next.js compatibility
2. Ensure lazy loading to reduce bundle size
3. Implement proper Monaco configuration (theme matching the dark IDE theme)

```tsx
// packages/ui/src/components/MonacoEditor.tsx
'use client';

import MonacoEditor from '@monaco-editor/react';
import { useTheme } from 'next-intl'; // or similar theme context

export function MonacoEditor({ value, onChange, language }: {
  value: string;
  onChange?: (v: string | undefined) => void;
  language?: 'typescript' | 'javascript' | 'json' | 'plaintext';
}) {
  return (
    <MonacoEditor
      height="600px"
      value={value}
      language={language || 'typescript'}
      options={{
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
      }}
      onChange={onChange}
    />
  );
}
```

---

## Responsive Design Breakpoint Standardization

Current implementation has two breakpoints (1220px, 760px). Standardize on mobile-first breakpoints:

### Recommended Breakpoints (in `packages/ui/src/styles/theme.ts`):

```typescript
export const BREAKPOINTS = {
  SM: 'max-width: 639px',   /* Mobile phones */
  MD: 'min-width: 640px' AND 'max-width: 1023px', /* Tablets */
  LG: 'min-width: 1024px', /* Desktops */
  XL: 'min-width: 1280px', /* Large desktops */
  XXL: 'min-width: 1536px', /* Extra large / ultrawide */
};
```

### Usage Pattern:

```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';

function ResponsiveLayout({ children }) {
  const isMobile = useMediaQuery(BREAKPOINTS.SM);
  const isDesktop = useMediaQuery(BREAKPOINTS.LG);

  return (
    <div className={`layout ${isMobile ? 'mobile' : isDesktop ? 'desktop' : ''}`}>
      {children}
    </div>
  );
}
```

---

## Testing Strategy for Frontend Components

### Component Tests (Vitest + Testing Library)

**Framework Recommendation**: Vitest (fast, Jest-compatible) + @testing-library/react

**Setup File** (`tests/vitest.setup.ts`):
```typescript
import { configure } from '@testing-library/react';
import '@testing-library/jest-dom';

configure({
  testEnvironment: 'jsdom',
  // Customize as needed
});
```

**Example Test** (`packages/ui/src/components/Button.test.tsx`):
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button onClick={() => {}}>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const mockClick = vi.fn();
    render(<Button onClick={mockClick}>Submit</Button>);
    fireEvent.click(screen.getByText('Submit'));
    expect(mockClick).toHaveBeenCalled();
  });

  it('disables button when disabled prop passed', () => {
    render(<Button onClick={() => {}} disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});
```

### E2E Tests (Playwright)

**Framework**: Playwright (better than Cypress for modern Next.js apps)

**Example E2E Test** (`tests/e2e/agent-panel.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Agent Side Panel', () => {
  test('allows running a mission prompt', async ({ page }) => {
    await page.goto('/');
    
    // Fill prompt
    await page.fill('#mission-prompt', 'Create a new API endpoint');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Verify status change
    await expect(page.locator('.status-indicator').toHaveText('running'));
  });
});
```

---

## Implementation Roadmap

| Phase | Timeline | Effort | Deliverables |
|-------|----------|--------|--------------|
| **Phase 1: Atomic Components** | Week 1-2 | Medium | Button, Card, Input, Link exported from `@sajja/ui` |
| **Phase 2: State Management** | Week 3 | Medium | Zustand store integrated into unified-ide app shell |
| **Phase 3: Component Integration** | Week 4 | High | Replace existing panel imports with UI library versions |
| **Phase 4: Monaco Integration** | Week 5-6 | High | Actual Monaco editor replace textarea in editor container |
| **Phase 5: Testing Infrastructure** | Ongoing | Continuous | Component tests growing weekly, E2E framework setup |
| **Phase 6: Accessibility Audit** | Parallel | Medium | Full WCAG AA compliance verification |

---

## Migration Strategy

When moving from inline components to shared library:

1. Create `packages/ui` directory with atomic components first
2. Update `apps/unified-ide/package.json` to add dependency on `@sajja/ui`
3. Gradually replace imports in components (start with Button, then Card, etc.)
4. Write tests as you migrate each component
5. Maintain backward compatibility during transition period

This phased approach prevents breaking changes and allows gradual adoption while keeping the UI functional throughout the migration.

---

*Component Architecture Design System Roadmap — Part of FORGE Engineering Excellence Audit Phase 3*