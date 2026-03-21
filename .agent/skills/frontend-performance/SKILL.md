---
name: frontend-performance
description: Provides performance optimization patterns for React applications. This skill should be used when optimizing bundle size, implementing code splitting, reducing re-renders, or improving web vitals.
---

# Frontend Performance

This skill provides patterns for optimizing React application performance.

## Canonical Examples

Study these real implementations:
- **Code Splitting**: [router.tsx](../../../apps/erify_studios/src/router.tsx)
- **Lazy Loading**: Route-level lazy loading with TanStack Router

---

## Core Optimization Strategies

### 1. Code Splitting & Lazy Loading

**Route-level code splitting** (automatic with TanStack Router):

```typescript
// Routes are automatically code-split
export const Route = createFileRoute('/studios/$studioId/tasks')({
  component: TasksPage,  // Automatically lazy-loaded
});
```

**Component-level lazy loading**:

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 2. Memoization

**Rule**: Default to NOT memoizing — see `engineering-best-practices-enforcer` for the full decision rules on `useCallback` and `useMemo`. Use the patterns below only when a genuine dependency or performance need is identified.

**useMemo for expensive computations** (sort, filter, map on large arrays):

```typescript
const sortedItems = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

**React.memo for component memoization** (only when parent re-renders frequently with stable props):

```typescript
export const ItemCard = React.memo(({ item }: ItemCardProps) => {
  return <div>{item.name}</div>;
});
```

### 3. Derive State During Render, Not Effects

**Rule**: If a value can be computed from existing props or state, compute it inline during render. Never store derived values in separate state or sync them via `useEffect`.

```typescript
// ❌ Unnecessary state + effect — causes double render on every name change
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Derived inline — always in sync, zero extra renders
const fullName = `${firstName} ${lastName}`;
```

**When to use `useEffect` for state**: only when the value requires an async operation, a DOM read, or an external subscription — not for prop-to-state derivations.

### 4. Functional setState for Stable Callbacks

**Rule**: When the new state depends on the previous value, use the function form of `setState`. This keeps callbacks stable and prevents stale closure bugs.

```typescript
// ❌ Callback must depend on items — recreated on every change, stale closure risk
const addItem = useCallback((item: Item) => {
  setItems([...items, item]);
}, [items]);

// ✅ Callback is stable — always receives current state
const addItem = useCallback((item: Item) => {
  setItems(curr => [...curr, item]);
}, []);  // No dependency on items
```

Apply this in `useCallback`, event handlers, and any callback passed to a child component.

### 5. Lazy State Initialization

**Rule**: For expensive initial state values (reading `localStorage`, building data structures, parsing), pass a function to `useState` so the cost runs only once.

```typescript
// ❌ localStorage.getItem() runs on every render
const [settings, setSettings] = useState(
  JSON.parse(localStorage.getItem('settings') ?? '{}')
);

// ✅ Initializer runs only on mount
const [settings, setSettings] = useState(() => {
  const stored = localStorage.getItem('settings');
  return stored ? JSON.parse(stored) : {};
});
```

Use for: `localStorage`/`sessionStorage` reads, building index Maps from arrays, DOM reads, or heavy transformations. For simple primitives (`useState(0)`), skip it.

### 6. Defer State Reads to Usage Point

**Rule**: If state is only needed inside a callback or event handler — not in the render output — read it there directly instead of subscribing via a hook. Subscriptions cause re-renders even when nothing visible changes.

```typescript
// ❌ Subscribes to searchParams — component re-renders on every URL change
const searchParams = useSearchParams();
const handleSubmit = () => {
  track({ params: searchParams.toString() });
};

// ✅ Read on demand inside the handler — no subscription, no re-renders
const handleSubmit = () => {
  track({ params: new URLSearchParams(window.location.search).toString() });
};
```

Also applies to TanStack Router's `useSearch()` — if the search value is only needed in a submit handler, access `router.state.location.search` inside the handler instead.

### 7a. Virtual Scrolling

For long lists (>100 items), use `@tanstack/react-virtual`:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ItemCard item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 7c. High-Noise Selection Panels (Template/Field Catalogs)

When a picker can include thousands of options (for example, report columns across many client-dedicated templates), apply progressive disclosure before considering full virtualization:

1. **Telemetry first**: show counts for templates, submitted records, and option totals so users understand scale.
2. **Collapse by default**: if template groups exceed a threshold (for example `>10`), collapse groups and expand only top-N by relevance (for example highest submitted volume).
3. **Narrowing controls**: include
   - text search across group + option metadata (`name`, `key`, `label`, `type`)
   - `Selected only` mode
   - `Groups with selection` mode
4. **Bulk visibility controls**: explicit `Expand all` / `Collapse all` actions for power users.
5. **Keep canonical options visible**: shared/cross-template options should remain in a dedicated section and not be hidden by template collapse.
6. **Selection guardrails**: enforce hard caps and show soft warnings when UX/readability degrades at higher counts.

This pattern reduces initial DOM/render load and user cognitive load while preserving access to the full catalog.

### 7b. Image Optimization

```tsx
// Use native lazy loading
<img src={url} loading="lazy" alt={alt} />

// Use responsive images
<img
  srcSet={`${url}-small.jpg 400w, ${url}-medium.jpg 800w, ${url}-large.jpg 1200w`}
  sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  src={url}
  alt={alt}
/>
```

### 7. Bundle Size Optimization

**Analyze bundle**:
```bash
pnpm --filter erify_studios build
# Then inspect dist/ with vite-bundle-visualizer or rollup-plugin-visualizer output
```

**Barrel file imports**: Libraries like Radix UI, Lucide React, and date-fns re-export thousands of modules from their root entry. Importing from the root barrel forces the bundler to load everything.

```typescript
// ❌ Root barrel import — loads all Radix UI primitives (~10k re-exports)
import { Dialog, Popover, Tooltip } from '@radix-ui/react-primitives';

// ✅ Direct package imports — each Radix primitive is a separate package
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';

// ✅ Named icon import instead of full Lucide barrel
import { Check } from 'lucide-react';  // Tree-shaken by Vite with ESM
```

**`@eridu/ui` components** are already pre-composed and safe to import by name:
```typescript
import { Button, Input } from '@eridu/ui';  // ✅ — built package, not a raw Radix barrel
```

**`@eridu/api-types` subpath exports** — always use the documented subpath, not the root:
```typescript
import { STUDIO_ROLE } from '@eridu/api-types/memberships';  // ✅
import { STUDIO_ROLE } from '@eridu/api-types';              // ❌ root barrel
```

---

## Performance Checklist

- [ ] Routes are code-split (automatic with TanStack Router)
- [ ] Heavy components use `lazy()` + `Suspense`
- [ ] Derived values computed inline during render — no `useEffect` to sync derived state
- [ ] `setState` depending on previous value uses functional form: `setState(curr => ...)`
- [ ] Expensive initial state uses lazy init: `useState(() => expensiveOp())`
- [ ] State only needed inside callbacks is read on demand, not subscribed via hook
- [ ] Expensive computations use `useMemo` (genuinely expensive — large sort/filter/map)
- [ ] `useCallback` only when identity stability is provably required — see `engineering-best-practices-enforcer`
- [ ] `React.memo` only on components with demonstrably stable props and frequent parent re-renders
- [ ] Long lists (>100 items) use virtual scrolling
- [ ] Images use `loading="lazy"`
- [ ] Bundle analyzed — no root barrel imports from Radix UI or Lucide
- [ ] `@eridu/api-types` imported via subpath exports, never root

---

## Related Skills

- [frontend-tech-stack](../frontend-tech-stack/SKILL.md) - Tech stack configuration
- [studio-list-pattern](../studio-list-pattern/SKILL.md) - Infinite scroll patterns
