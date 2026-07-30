# FORGE Unified IDE - Accessibility Implementation Guide

**Version**: 1.0  
**Target**: WCAG 2.1 AA Compliance  
**Status**: Implementation Reference  

---

## 1. Screen Reader Support

### Screen Reader Only Text (`.sr-only`)

Already defined in `globals.css`:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Usage Pattern**: Add this class to labels that should be visible only to screen readers when the visual label is already present on-screen but context needs clarification for assistive technology.

```tsx
{/* Example: Search input with clear visual label but screen reader benefit from adding aria-label */}
<label htmlFor="search" className="visually-hidden">Search workspace</label>
<input 
  id="search" 
  type="text" 
  placeholder="Search..."
  aria-label="Search workspace"
/>
```

### Skip Navigation Link

Already implemented in `page.tsx`:
```tsx
<a href="#main-content" className="skip-link">
  Skip to content
</a>
```

**Enhancement**: Ensure the skip link appears when focused (CSS animation from `-3rem` to `1rem` top position as currently coded). This is correct.

---

## 2. Form Accessibility

### Required Input Labeling

**Problem**: Forms lack proper `<label>` associations.

**Solution**: Use explicit label-for relationships or `aria-label` attributes.

```tsx
// ❌ INACCESSIBLE (screen reader users won't know what to enter)
<form onSubmit={handleSubmit}>
  <textarea placeholder="Enter mission prompt" />
  <button type="submit">Run Mission</button>
</form>

// ✅ ACCESSIBLE Option 1: Explicit <label>
<form onSubmit={handleSubmit}>
  <label htmlFor="mission-prompt" className="visually-hidden">
    Mission Prompt
  </label>
  <textarea
    id="mission-prompt"
    name="missionPrompt"
    placeholder="Describe your engineering task..."
    rows={4}
  />
  <button type="submit">Execute Mission</button>
</form>

// ✅ ACCESSIBLE Option 2: Using fieldset/legend for grouped inputs
<fieldset>
  <legend>Agent Command</legend>
  <div>
    <label htmlFor="prompt-input">Task description</label>
    <input type="text" id="prompt-input" name="taskDescription" required />
  </div>
</fieldset>
```

### Error Messaging

**Requirement**: When form validation fails, communicate errors clearly to screen readers.

```tsx
<Form onSubmit={handleSubmit}>
  {error && (
    <div 
      role="alert" 
      aria-live="assertive"
      className="error-message"
    >
      {error}
    </div>
  )}
  
  <label htmlFor="prompt">Mission Prompt</label>
  <input
    id="prompt"
    type="text"
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    aria-invalid={!!error}
    aria-describedby={error ? "error-message" : undefined}
  />
  
  <button type="submit">Submit</button>
</Form>
```

Use `role="alert"` and `aria-live="assertive"` for urgent errors, or `polite` for non-critical feedback.

---

## 3. Focus Management

### Focus Visible Styling

Already implemented in `globals.css`:
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
```

This is good—ensures keyboard users see where focus is. Enhance it slightly for better visibility:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  box-shadow: 0 0 0 3px rgba(240, 129, 78, 0.3); /* Subtle glow for extra clarity */
}
```

### Focus Trapping for Modals/Diags

When implementing modals (future work), trap focus within the modal:

```tsx
function Modal({ children, onClose }) {
  const dialogRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  useEffect(() => {
    // Trap focus within modal on open
    const firstElement = dialogRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const lastElement = Array.from(dialogRef.current?.children || [])
      .reverse()
      .find(el => el.tagName !== 'BUTTON' && el.tagName !== 'A' && el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA' && !el.hasAttribute('tabIndex') || el.getAttribute('tabIndex') !== '-1');

    firstFocusableRef.current = firstElement;
    lastFocusableRef.current = lastElement || firstElement;

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        // Shift + Tab: move to last element
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastFocusableRef.current?.focus();
        }
      } else {
        // Tab: move to first element
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstFocusableRef.current?.focus();
        }
      }
    };

    dialogRef.current?.addEventListener('keydown', handleTabKey);
    return () => dialogRef.current?.removeEventListener('keydown', handleTabKey);
  }, []);

  return (
    <div ref={dialogDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

---

## 4. ARIA Live Regions for Dynamic Content

**Problem**: Status updates (agent running, mission complete) aren't announced to screen readers.

**Solution**: Add `aria-live` regions near dynamic content areas.

```tsx
{/* In AgentSidePanel.tsx, update status section */}
<div 
  aria-live="polite" 
  aria-atomic="true"
  className="status-display"
>
  <span className="status-indicator" aria-hidden="true">
    {status === 'running' ? '⚡' : status === 'verified' ? '✅' : status === 'error' ? '❌' : '⏸️'}
  </span>
  <span className="status-text" className="sr-only">
    Agent status: {status}
  </span>
  <span>{message}</span>
</div>

{/* In MissionBoard for timeline updates */}
<div 
  aria-live="polite" 
  aria-atomic="true"
  className="mission-status"
  id="mission-status-region"
>
  {/* Mission track items rendered here */}
</div>
```

Use:
- `aria-live="assertive"` for critical errors or urgent changes
- `aria-live="polite"` for informational updates (preferred default)
- `aria-atomic="true"` announce entire region when any change occurs

---

## 5. Interactive Element Accessibility

### Buttons vs Links

Ensure interactive elements use correct semantic tags:

```tsx
// ❌ WRONG: Using div/link for button-like action
<div 
  onClick={handleDelete}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
>
  Delete
</div>

// ✅ CORRECT: Use actual button element
<button type="button" onClick={handleDelete}>
  Delete
</button>
```

Same principle applies to menu items, tabs, toggles—use native HTML elements whenever possible. Then enhance with ARIA only if custom widget behavior is needed beyond native capabilities.

### Keyboard Navigation Custom Widgets

For custom controls like tab panels, tree views, etc., implement following keyboard patterns:

| Control | Keybindings |
|---------|-------------|
| Tab panel | ←/→ switch tabs, Enter/Space activate tab |
| Tree view | Right expand, Left collapse, Up/Down navigate, Enter activate |
| Dialog | Esc closes, Tab traps inside dialog, Shift+Tab reverse tab order |

Implement using wai-aria authoring practices guidelines.

---

## 6. Color Contrast Verification

### Design Token Audit Required

Review all color variables in `globals.css` against contrast requirements:

**Variables needing verification**:
- `--text` (#f5ecdc) on `--bg` (#0d1314) – likely OK (light on dark)
- `--text-soft` (#b5c0bc) on dark background – **Needs check** (may fail ratio)
- `--muted` (#80918e) on dark – **Needs check**
- Accent colors (`--accent`, `--ok`, `--warn`, `--danger`) require both foreground/background mode testing

**Tools to verify**:
1. Browser extension (Stark axe-core DevTools)
2. Online contrast checker (webaim.org/contrast-checker)
3. Automated CI check using Pa11y or similar

**Minimum ratios**:
- Normal text: 4.5:1 (AA) or 7:1 (AAA)
- Large text (18pt+ bold): 3:1 (AA) or 4.5:1 (AAA)
- UI components & graphics: 3:1 (AA)

If contrast fails, adjust colors—typically lightening dark backgrounds or darkening foreground text within design system constraints.

---

## 7. Reduced Motion Support

Respect user's preference for reduced motion. Add to `globals.css`:

```css
/* Respect prefers-reduced-motion setting */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Remove subtle gradient bg pattern if animated */
  body::before {
    opacity: 0;
  }
}
```

This ensures users who request motion reduction get a fully functional experience without distracting animations.

---

## 8. Testing Checklist for Screen Readers

Once implemented, test with actual assistive technologies:

### macOS VoiceOver
- Enable: Cmd+F5 or Accessibility → VoiceOver
- Navigate through page using Tab, Arrow keys
- Verify: Skip link works, forms labeled correctly, announcements read aloud

### Windows NVDA (Free)
- Install from nvaccess.org
- Test same scenarios as above

### Browser Developer Tools
- Chrome/Firefox built-in accessibility inspectors
- Lighthouse Accessibility audit (target score ≥95)

### axe-core Browser Extension
- Quick visual scan of issues on page
- Fix all "critical" violations before shipping

---

## 9. Accessibility Commitment Statement

Add to README and CONTRIBUTING documents:

> "FORGE is committed to making our IDE accessible to all developers. We follow WCAG 2.1 Level AA guidelines throughout development. All new features must pass automated accessibility checks and manual keyboard/screen-reader verification before merging."

Include an accessibility statement page at `/accessibility` documenting conformance status and contact method for reporting accessibility barriers.

---

*Accessibility Implementation Guide — Part of FORGE Engineering Excellence Audit Phase 3*