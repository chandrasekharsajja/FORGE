# FORGE Unified IDE - WCAG AA Compliance Checklist

**Version**: 1.0  
**Target Level**: WCAG 2.1 AA (Web Content Accessibility Guidelines)  
**Status**: Draft - Implementation Plan

---

## 1. Current Accessibility Status

| Feature | Implemented? | Notes |
|---------|--------------|-------|
| Keyboard Navigation | ⚠️ Partial | Basic tab navigation, no full keyboard shortcuts |
| Screen Reader Support | ⚠️ Minimal | `.sr-only` class exists, skip link present |
| Focus Management | ⚠️ Basic | `:focus-visible` styling applied, no focus trapping |
| ARIA Labels | ⚠️ Some | Only on tab row (`aria-label="Open files"`), missing elsewhere |
| Color Contrast | ❓ Unknown | Need audit against design tokens |
| Alt Text for Images | ❓ Unknown | No images currently using `next/image` |
| Form Labels | ❓ Unknown | Need verification across forms |
| Error Messages | ⚠️ Basic | Console messages but not user-accessible |
| Skip Links | ✅ Present | Implemented in `page.tsx` |

---

## 2. Critical Accessibility Issues to Fix

### Priority 1 (Blocker)

#### Missing Form Label Associations

**Files**: `apps/unified-ide/src/components/AgentSidePanel.tsx`

**Issue**: The agent prompt form does not have proper label association for the input field.

```tsx
// Before (incomplete):
<form onSubmit={handleSubmit}>
  <textarea 
    value={prompt} 
    onChange={(e) => setPrompt(e.target.value)}
    placeholder="Enter mission prompt"
  />
  <button type="submit">Run Mission</button>
</form>
```

**Fix**: Add explicit `<label>` with `for` attribute or use `aria-label`.

```tsx
// After (corrected):
<form onSubmit={handleSubmit}>
  <label htmlFor="mission-prompt" className="visually-hidden">
    Mission Prompt
  </label>
  <textarea
    id="mission-prompt"
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    placeholder="Describe your engineering task..."
    rows={4}
  />
  <button type="submit">Execute Mission</button>
</form>
```

---

#### Missing Focus Trapping in Modals/Dialogs

**File**: Potential future implementation

**Issue**: When dialog/modals are opened, focus can escape them making the UI inaccessible to keyboard users.

**Recommendation**: Implement focus trap patterns when adding modal dialogs later.

---

#### Insufficient Color Contrast

**Risk**: Design colors in `globals.css` need WCAG contrast verification.

```css
:root {
  --text: #f5ecdc;        /* Light text on dark background */
  --text-soft: #b5c0bc;   /* Secondary text - may fail contrast */
  --muted: #80918e;       /* May fail contrast ratios */
  --bg: #0f1516;          /* Dark background */
}
```

**Action Required**: Run contrast check tool (axe-core, Stark, or similar) on all color combinations. Ensure:
- Text vs background ≥ 4.5:1 ratio for normal text
- Large text (18pt+ or 14pt bold+) ≥ 3:1 ratio
- Interactive elements have clear visual distinction

---

### Priority 2 (High)

#### Missing ARIA Live Regions for Dynamic Updates

**File**: `apps/unified-ide/src/components/AgentSidePanel.tsx`, `MissionBoard.tsx`

**Issue**: When agent status changes or mission progress updates, screen reader users won't be notified.

**Fix**: Add `aria-live` regions where content changes dynamically:

```tsx
{/* Add near mission status updates */}
<div aria-live="polite" aria-atomic="true">
  <span className="status-indicator">Status: {status}</span>
  <span className="status-message">{message}</span>
</div>
```

Use:
- `aria-live="assertive"` for urgent errors
- `aria-live="polite"` for informational updates

---

#### Missing Landmark Roles

**File**: `apps/unified-ide/src/app/page.tsx`, layout structure

**Issue**: The shell layout lacks semantic landmark roles that help screen reader users navigate.

**Fix**: Add appropriate ARIA landmarks:

```tsx
<header role="banner" className="topbar">...</header>
<nav role="navigation" aria-label="Main navigation">...</nav>
<main role="main" id="main-content" className="workspace-column">...</main>
<aside role="complementary" className="panel explorer-panel">...</aside>
<footer role="contentinfo">...</footer>
```

---

#### Image Accessibility

**Current**: No image optimization used yet (`next/image` not present)

**Future Requirement**: When adding `next/image`, provide meaningful `alt` attributes. For decorative images, use `alt=""`.

```tsx
import Image from 'next/image';

<Image
  src="/icons/forge-icon.svg"
  alt="FORGE logo - monogram FG in orange circle"
  width={60}
  height={60}
  priority
/>
```

---

### Priority 3 (Medium)

#### Keyboard Shortcuts Documentation

**Current**: Keyboard shortcuts documented nowhere visible in UI

**Recommendation**: Create accessible "Keyboard Help" modal/documentation page that:
- Lists available shortcuts with descriptions
- Is discoverable via `/` key or dedicated help button
- Documents screen reader friendly operation

---

#### Reduce Motion Preference Respect

**Current**: No respect for user's `prefers-reduced-motion` setting

**Fix**: Add CSS support:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

#### Skip Link Enhancement

**Current**: Skip link exists but needs better visibility patterns

**Enhancement**: Make skip link appear only on focus:

```css
.skip-link {
  position: absolute;
  left: -999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
  width: auto;
  height: auto;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  background: var(--text);
  color: #0c1112;
  z-index: 1000;
}
```

---

## 3. Component-Level Accessibility Requirements

For every interactive component added to the unified IDE:

| Element | Requirement |
|---------|-------------|
| Buttons | Properly labeled, use `<button type="...">` not div+click |
| Links | Descriptive text, avoid "click here", add `rel="noopener"` for external |
| Forms | All inputs have associated `<label>`, error messages clearly linked |
| Modals/Focus | Focus trapped, escape closes, return focus to trigger |
| Tables | Use `<thead>`, `<tbody>`, scope headers correctly |
| Menus | Arrow key navigation, ARIA menu/dialog roles |
| Icons | Decorative icons have `aria-hidden="true"`, functional icons have labels |
| Dynamic Content | Live regions where appropriate, announce status changes |

---

## 4. Testing Strategy

| Tool | Purpose | Frequency |
|------|---------|-----------|
| axe-core browser extension | Quick manual checks | Daily |
| Lighthouse CI | Automated baseline checks | Every PR |
| Manual keyboard-only testing | Full flow verification | Weekly |
| VoiceOver/NVDA screen reader test | Real user experience | Bi-weekly |
| Color contrast auditing | Token validation | On design changes |

---

## 5. Monitoring & Maintenance

Add accessibility checks to CI pipeline:

```yaml
# In .github/workflows/ci.yml add:
- name: Accessibility Check
  uses: pa11y/pa11y-ci-action@v4
  with:
    urls: http://localhost:3000
    thresholds: 0
```

---

**Note**: This checklist should be reviewed quarterly as the IDE evolves. New components must pass these accessibility requirements before merge.

---
*Generated as part of FORGE Engineering Excellence Audit Phase 3*