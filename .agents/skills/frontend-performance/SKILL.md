---
name: frontend-performance
description: Improve measured React performance through code splitting, render control, and Web Vitals work.
---

# Frontend Performance

Performance optimization patterns for React applications.

> See [references/performance-examples.md](references/performance-examples.md) for detailed code examples.

## Core Optimization Rules

### 1. Code Splitting & Lazy Loading
Routes auto-split with TanStack Router. Use `lazy()` + `Suspense` for heavy components.

### 2. Default: Don't Memoize
Only use `useMemo`/`useCallback`/`React.memo` with genuine need. See `engineering-best-practices-enforcer` for decision rules.

### 3. Derive State During Render
Never store derived values in separate state or sync via `useEffect`. Compute inline.

### 4. Functional setState
When new state depends on previous value: `setState(curr => [...curr, item])`. Keeps callbacks stable.

### 5. Lazy State Initialization
For expensive initial values: `useState(() => JSON.parse(localStorage.getItem('settings') ?? '{}'))`.

### 6. Defer State Reads
If state is only needed inside a callback (not render output), read it there. Avoids subscription re-renders.

### 7. Virtual Scrolling
For >100 items: use `@tanstack/react-virtual`. For high-noise selection panels (thousands of options): progressive disclosure with collapse, search, bulk visibility controls.

### 8. Image Optimization
Use `loading="lazy"` and responsive `srcSet`/`sizes`.

### 9. Bundle Size
- Import from direct package paths, not root barrels (Radix UI, Lucide, date-fns)
- `@eridu/ui` components safe to import by name (pre-composed)
- `@eridu/api-types` via subpath exports, never root
- When one large eager entry/vendor chunk dominates first load, split stable vendors with `build.rollupOptions.output.manualChunks` — see [frontend-bundle-splitting](../frontend-bundle-splitting/SKILL.md) (never a catch-all; it breaks code-splitting)

## Checklist

- [ ] Routes code-split, heavy components lazy-loaded
- [ ] Derived values computed inline (no `useEffect` sync)
- [ ] Functional `setState` for previous-value-dependent updates
- [ ] Expensive initial state uses lazy init
- [ ] State read on demand in callbacks when not needed for render
- [ ] `useMemo`/`useCallback`/`React.memo` only with genuine need
- [ ] Long lists (>100) use virtual scrolling
- [ ] Images use `loading="lazy"`
- [ ] No root barrel imports from Radix/Lucide
- [ ] `@eridu/api-types` via subpath exports

## Related Skills

- [frontend-tech-stack](../frontend-tech-stack/SKILL.md) — Tech stack
- [studio-list-pattern](../studio-list-pattern/SKILL.md) — Infinite scroll
