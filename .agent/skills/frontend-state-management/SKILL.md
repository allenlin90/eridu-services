---
name: frontend-state-management
description: Provides comprehensive state management patterns for React applications. This skill should be used when deciding how to manage different types of state, choosing state management solutions, or implementing state logic.
---

# Frontend State Management

This skill provides patterns for managing state in React applications.

## Canonical Examples

Study these real implementations:
- **URL State**: [use-table-url-state.ts](../../../packages/ui/src/hooks/use-table-url-state.ts)
- **Feature Hook**: [use-task-templates.ts](../../../apps/erify_studios/src/features/task-templates/hooks/use-task-templates.ts)

---

## State Categories

### 1. Server State (TanStack Query)

**Use for**: Data from APIs that needs caching, synchronization, and background updates.

**Caching Policy (Stale-While-Revalidate)**:
The project is configured globally with `staleTime: 0` to enforce a generic stale-while-revalidate pattern.
- **Rule**: NEVER override `staleTime` on individual `useQuery` hooks unless the data is guaranteed to be static reference data (e.g., country lists, system taxonomies). This ensures users always see fresh data upon navigation while cached data loads instantly in the background.

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// ✅ GOOD: Relies on global staleTime: 0 default
const { data, isLoading } = useQuery({
  queryKey: ['tasks', taskId],
  queryFn: () => fetchTask(taskId),
});
```

**Key Points**:
- ✅ Automatic caching and deduplication
- ✅ Background refetching
- ✅ Optimistic updates via mutations

### 2. URL State (TanStack Router)

**Use for**: Filters, pagination, search queries, tabs - anything that should be shareable via URL.

```typescript
import { useTableUrlState } from '@eridu/ui';

// ✅ GOOD: URL state for filters and search
const { columnFilters, onColumnFiltersChange } = useTableUrlState({
  from: '/studios/$studioId/tasks',
  searchColumnId: 'name',
});
```

**Key Points**:
- ✅ Shareable links
- ✅ Browser back/forward support
- ✅ Persists across page reloads

### 3. Local Component State (useState)

**Use for**: UI state that doesn't need to be shared (modals, dropdowns, form inputs).

```typescript
// ✅ GOOD: Local UI state
const [isOpen, setIsOpen] = useState(false);
const [searchInput, setSearchInput] = useState('');
```

#### Derive Don't Store

When local state relates to server data (e.g. a "selected item"), store only the **ID** and derive the full object from the server state. This avoids stale object references after background refetches.

```typescript
// ❌ AVOID: storing a full server object in local state
// After a background refetch, selectedTask will be stale even though
// the TanStack Query cache is fresh.
const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);

// ✅ GOOD: store only the ID; derive the object from server state
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
const selectedTask = selectedTaskId
  ? (tasks ?? []).find((task) => task.id === selectedTaskId) ?? null
  : null;
```

**When to apply**: Any time you store a reference to an item from a server-fetched list (selected row, active item, detail panel, etc.).

### Keyed State Entry (avoid reset effects)

When a component shows different "items" (e.g. a sheet that shows different tasks), avoid resetting draft state via `useEffect(() => setState(null), [itemId])`. Instead, key the state object by item ID and derive the "current" state inline.

```typescript
// ❌ AVOID: reset effect pattern — causes extra render cycles and setState-in-effect lint errors
const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
const [draftSaveState, setDraftSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
useEffect(() => {
  setDraft(null);         // ← react-hooks/set-state-in-effect lint error
  setDraftSaveState('idle');
}, [task.id]);

// ✅ GOOD: key the state entry by item ID — derived "current" is null when item changes
type DraftStateEntry = {
  taskId: string;
  content: Record<string, unknown>;
  saveState: 'idle' | 'dirty' | 'saving' | 'saved';
};

const [draftState, setDraftState] = useState<DraftStateEntry | null>(null);

// Automatically null when task changes — no reset effect needed
const currentDraft = draftState?.taskId === task.id ? draftState : null;
const draftSaveState = currentDraft?.saveState ?? 'idle';
```

**Why**: Merging state into a single keyed object eliminates reset effects entirely. Changing the active item immediately derives `currentDraft = null` without any effect or extra render.

### Impure Values in State (React Compiler)

The React Compiler (`react-hooks/purity`) rejects impure function calls during render. `Date.now()` and `Math.random()` are impure and must NOT be called in the render body or inside `useMemo`. Use `useState` lazy initializer instead.

```typescript
// ❌ WRONG: impure call during render (caught by react-hooks/purity)
const now = Date.now();

// ❌ WRONG: useMemo does NOT satisfy purity — Date.now() still called during render
const now = useMemo(() => Date.now(), []);

// ✅ CORRECT: useState lazy initializer runs once on mount, not during render
const [now] = useState(() => Date.now());
```

**When to apply**: Any time you need to capture a timestamp at mount time (e.g., computing relative time for "due soon" badges on list cards).

### Timer State Scope (Frequent Updates)

For interval-driven state (`setInterval`, clock ticks, polling UI timers):
- Keep timer state in the smallest component subtree that actually needs it.
- Avoid placing minute/second timers in route/page containers unless the entire page depends on it.
- Pass derived values downward only when necessary.

Why:
- Frequent timer updates in top-level route components cause avoidable whole-page re-renders.
- Localized timer state keeps render impact bounded and reduces regressions during refactors.

### 4. Global Client State (Zustand)

**Use for**: Truly global state like auth user, theme, sidebar state.

```typescript
import { create } from 'zustand';

// ✅ GOOD: Global auth state
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

---

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

---

## Common Patterns

### Debounced Search with URL Sync

```typescript
const [localSearch, setLocalSearch] = useState('');
const debouncedSearch = useDebounce(localSearch, 300);

useEffect(() => {
  onColumnFiltersChange((old) => {
    const newFilters = old.filter((f) => f.id !== 'name');
    if (debouncedSearch) newFilters.push({ id: 'name', value: debouncedSearch });
    return newFilters;
  });
}, [debouncedSearch]);
```

### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateTask,
  onMutate: async (newTask) => {
    await queryClient.cancelQueries({ queryKey: ['tasks'] });
    const previous = queryClient.getQueryData(['tasks']);
    queryClient.setQueryData(['tasks'], (old) => [...old, newTask]);
    return { previous };
  },
  onError: (err, newTask, context) => {
    queryClient.setQueryData(['tasks'], context.previous);
  },
});
```

---

## Infinite Query Cache Management

Infinite scroll lists accumulate many pages in the TanStack Query cache. Three complementary patterns keep this efficient:

### 1. Cache Compaction on Unmount

When a user navigates away from an infinite list, compact the cached pages to page 1. On return, TanStack Query will revalidate a single page instead of N pages simultaneously.

```typescript
import { useEffect, useMemo } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';

// Pure helper — takes InfiniteData and returns a copy with only the first page
function compactToFirstPage<T>(data: InfiniteData<T>): InfiniteData<T> {
  return { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) };
}

// In the feature hook — compact on unmount
const listQueryKey = useMemo(
  () => itemQueryKeys.list(studioId, { search }),
  [studioId, search],
);

useEffect(() => {
  return () => {
    queryClient.setQueryData<InfiniteData<PaginatedResponse<ItemDto>>>(
      listQueryKey,
      (data) => (data ? compactToFirstPage(data) : data),
    );
  };
}, [listQueryKey, queryClient]);
```

### 2. Targeted Cache Updates (active vs inactive)

After a mutation, update the cache surgically:
- **Active queries** (currently rendered): update immediately via `setQueriesData` for zero-latency UI feedback
- **Inactive queries** (other filter combos): invalidate so they refetch on next view

```typescript
onSuccess: (updatedItem) => {
  // 1. Patch all active infinite queries immediately
  queryClient.setQueriesData<InfiniteData<PaginatedResponse<ItemDto>>>(
    { queryKey: itemQueryKeys.listPrefix(studioId), type: 'active' },
    (data) => data ? upsertItemInPages(data, updatedItem) : data,
  );
  // 2. Background-invalidate inactive queries
  queryClient.invalidateQueries({
    queryKey: itemQueryKeys.listPrefix(studioId),
    type: 'inactive',
  });
},
```

### 3. Immutable Infinite Page Helpers

Create pure utility functions for common cache mutations. These take `InfiniteData<Response>` and return a **new** `InfiniteData<Response>` — never mutate in place.

```typescript
import type { InfiniteData } from '@tanstack/react-query';

type Page<T> = { data: T[]; meta: { total: number; nextCursor?: string } };

/** Replace or insert an item in the first matching page position */
export function upsertItemInPages<T extends { uid: string }>(
  infiniteData: InfiniteData<Page<T>>,
  item: T,
): InfiniteData<Page<T>> {
  let inserted = false;
  const pages = infiniteData.pages.map((page) => {
    const idx = page.data.findIndex((i) => i.uid === item.uid);
    if (idx === -1) return page;
    inserted = true;
    return { ...page, data: page.data.map((i) => (i.uid === item.uid ? item : i)) };
  });
  // If not found in any page (new item), prepend to first page
  if (!inserted && pages.length > 0) {
    pages[0] = { ...pages[0]!, data: [item, ...pages[0]!.data] };
  }
  return { ...infiniteData, pages };
}

/** Remove an item by uid from all pages */
export function removeItemFromPages<T extends { uid: string }>(
  infiniteData: InfiniteData<Page<T>>,
  itemUid: string,
): InfiniteData<Page<T>> {
  return {
    ...infiniteData,
    pages: infiniteData.pages.map((page) => ({
      ...page,
      data: page.data.filter((i) => i.uid !== itemUid),
    })),
  };
}

/** Compact to first page only — use in unmount cleanup */
export function compactToFirstPage<T>(
  infiniteData: InfiniteData<T>,
): InfiniteData<T> {
  return {
    pages: infiniteData.pages.slice(0, 1),
    pageParams: infiniteData.pageParams.slice(0, 1),
  };
}
```

**Rules**:
- ✅ Always return a new object — never mutate the existing `InfiniteData`
- ✅ Place helpers in `features/{feature}/lib/cache-helpers.ts`
- ✅ Use `upsertItemInPages` for create/update, `removeItemFromPages` for delete, `compactToFirstPage` in unmount cleanup

See [`references/infinite-cache-patterns.md`](references/infinite-cache-patterns.md) for a complete integration example.

---

## Best Practices Checklist

- [ ] Server state managed by TanStack Query
- [ ] Filters/search/pagination in URL state
- [ ] Local UI state uses useState
- [ ] Global state uses Zustand (minimal usage)
- [ ] Debounced search with URL synchronization
- [ ] Optimistic updates for mutations
- [ ] Query invalidation on mutations
- [ ] Selected item stored as ID, not full object (derive-don't-store)
- [ ] Infinite query cache compacted to page 1 on unmount
- [ ] Mutations update active queries immediately, invalidate inactive queries
- [ ] Infinite page helpers are pure (immutable) functions

---

## Related Skills

- [frontend-api-layer](../frontend-api-layer/SKILL.md) - API integration patterns
- [studio-list-pattern](../studio-list-pattern/SKILL.md) - List state management
