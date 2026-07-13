---
name: frontend-state-management
description: Design React server, URL, form, and local state boundaries with correct TanStack Query caching and invalidation.
---

# Frontend State Management

Patterns for managing state in React applications.

> See [references/infinite-cache-patterns.md](references/infinite-cache-patterns.md) for detailed infinite query cache helpers.

## Canonical Examples

- **URL State**: [use-table-url-state.ts](../../../packages/ui/src/hooks/use-table-url-state.ts)
- **Feature Hook**: [use-task-templates.ts](../../../apps/erify_studios/src/features/task-templates/hooks/use-task-templates.ts)

## Decision Tree

```
Is it from an API?
├─ YES → TanStack Query (server state)
└─ NO → Should it be in the URL?
    ├─ YES → TanStack Router search params (URL state)
    └─ NO → Does it need to be global?
        ├─ YES → Zustand (global client state)
        └─ NO → useState (local component state)
```

## State Categories

### 1. Server State (TanStack Query)
Data from APIs. Global `staleTime: 0` enforces stale-while-revalidate. NEVER override per-query unless guaranteed static reference data.

### 2. URL State (TanStack Router)
Filters, pagination, search, tabs — anything shareable via URL. Use `useTableUrlState`.

### 3. Local Component State
UI state: modals, dropdowns, form inputs. Use `useState`.

### 4. Global Client State (Zustand)
Truly global: auth user, theme, sidebar state. Minimal usage.

## Key Patterns

### Derive Don't Store
Store only IDs in local state; derive full objects from server state. Prevents stale references after background refetches.

### Keyed State Entry
When showing different items (e.g., detail sheet), key state by item ID and derive "current" inline — never use reset effects.

### Impure Values (React Compiler)
`Date.now()` and `Math.random()` are impure. Use `useState(() => Date.now())` lazy initializer, not `useMemo`.

### Timer State Scope
Keep interval-driven state in the smallest component subtree that needs it. Avoid minute/second timers in route containers.

## Infinite Query Cache Management

### 1. Compact on Unmount
On unmount, compact to page 1 so remount triggers single revalidation.

### 2. Targeted Cache Updates
After mutation: `setQueriesData` for active queries (immediate), `invalidateQueries` for inactive (background).

### 3. Immutable Page Helpers
Pure utility functions: `upsertItemInPages`, `removeItemFromPages`, `compactToFirstPage`. Place in `features/{feature}/lib/cache-helpers.ts`.

## Checklist

- [ ] Server state = TanStack Query
- [ ] Filters/search/pagination = URL state
- [ ] Local UI = `useState`
- [ ] Global = Zustand (minimal)
- [ ] Selected items stored as IDs, derived from server state
- [ ] Keyed state entries (no reset effects)
- [ ] Infinite query cache compacted on unmount
- [ ] Mutations: active queries updated immediately, inactive invalidated

## Related Skills

- [frontend-api-layer](../frontend-api-layer/SKILL.md) — API integration
- [studio-list-pattern](../studio-list-pattern/SKILL.md) — List state management
