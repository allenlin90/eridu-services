---
name: studio-list-pattern
description: Provides patterns for implementing infinite scroll lists with sticky toolbars in Erify Studios. This skill should be used when building studio-scoped list pages with card-based layouts, debounced search, and offset-based pagination via useInfiniteQuery.
---

# Studio List Pattern

This skill outlines the standard pattern for implementing infinite scroll lists in the `erify_studios` application. Unlike admin lists (which use server-side pagination with tables), studio lists use offset-based pagination (`page` + `limit`) with `useInfiniteQuery` for append-friendly infinite scroll card grids.

## Canonical Examples

Study these real implementations as the source of truth:
- **Task Templates List**: [index.tsx](../../../apps/erify_studios/src/routes/studios/$studioId/task-templates/index.tsx)
- **Feature Hook**: [use-task-templates.ts](../../../apps/erify_studios/src/features/task-templates/hooks/use-task-templates.ts)
- **Toolbar Component**: [task-templates-toolbar.tsx](../../../apps/erify_studios/src/features/task-templates/components/task-templates-toolbar.tsx)

**Detailed code examples**: See [references/studio-list-examples.md](references/studio-list-examples.md)

---

## Pattern Overview

Studio lists combine several patterns:
1. **Infinite Scroll**: Offset-based pagination (`page` + `limit`) with `useInfiniteQuery` + Intersection Observer
2. **Sticky Toolbar**: Search and actions remain accessible while scrolling
3. **Responsive Actions**: Desktop buttons collapse to mobile dropdown
4. **Debounced Search**: Local state with URL synchronization
5. **Card-Based Layout**: Responsive grid instead of tables

---

## Architecture

```
Route Component (index.tsx)
├─ useFeature() hook                → Owns all query state
├─ Sticky Toolbar                   → Search + Actions
├─ ResponsiveCardGrid               → Auto-fill grid layout
│  └─ Card components                → Individual items
└─ useInfiniteScroll() sentinel     → Triggers fetchNextPage
```

---

## Implementation Steps

### 1. Create Feature Hook

**Pattern**: `features/{feature}/hooks/use-{feature}.ts`

The hook owns all query state and exposes both data and refetching states.

```typescript
export function useFeature({ studioId }: UseFeatureProps): UseFeatureReturn {
  const tableState = useTableUrlState({
    from: '/studios/$studioId/feature',
    searchColumnId: 'name',
    defaultSorting: [{ id: 'updatedAt', desc: true }],
  });

  const { columnFilters } = tableState;
  const searchQuery = (columnFilters.find((f) => f.id === 'name')?.value as string) || '';

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['feature', studioId, searchQuery],
      queryFn: ({ pageParam }) => getItems(studioId, { limit: 20, name: searchQuery, page: pageParam }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    });

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const total = data?.pages[0]?.meta.total ?? 0;

  return { tableState, items, total, isLoading, isFetching, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch };
}
```

**Key Points**:
- ✅ Use `useInfiniteQuery` with offset-based pagination (`page` + `limit`)
- ✅ `initialPageParam: 1` — pages start at 1
- ✅ `getNextPageParam` checks `meta.page < meta.totalPages` to determine if more pages exist
- ✅ Expose `isFetching` for refresh button state (not just `isLoading`)
- ✅ Flatten pages into single items array using `useMemo`
- ✅ Use `useTableUrlState` for URL-synced search

### 2. Create Route Component with Sticky Toolbar

**Pattern**: `routes/_authenticated/studios/$studioId/{feature}/index.tsx`

```tsx
export default function FeatureListRoute() {
  const { studioId } = Route.useParams();
  const { tableState, items, total, isLoading, isFetching, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = 
    useFeature({ studioId });

  const sentinelRef = useInfiniteScroll({ fetchNextPage, hasNextPage, isFetchingNextPage });

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-6 py-4">
        <FeatureToolbar tableState={tableState} onRefresh={refetch} isRefreshing={isFetching} studioId={studioId} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? <LoadingState /> : isError ? <ErrorState /> : items.length === 0 ? <EmptyState /> : (
          <>
            <ResponsiveCardGrid>{items.map((item) => <ItemCard key={item.uid} item={item} />)}</ResponsiveCardGrid>
            <div ref={sentinelRef} className="h-10" />
            {isFetchingNextPage && <LoadingSpinner />}
          </>
        )}
      </div>
    </div>
  );
}
```

**Key Points**:
- ✅ Sticky toolbar with `backdrop-blur-sm` for glass effect
- ✅ Separate scrollable content area
- ✅ Sentinel div at bottom for infinite scroll
- ✅ Handle all states: loading, error, empty, fetching next page

### 3. Create Toolbar with Responsive Actions

**Pattern**: `features/{feature}/components/{feature}-toolbar.tsx`

```tsx
export function FeatureToolbar({ tableState, onRefresh, isRefreshing, studioId }: FeatureToolbarProps) {
  const navigate = useNavigate();
  const { columnFilters, onColumnFiltersChange } = tableState;
  const searchValue = (columnFilters.find((f) => f.id === 'name')?.value as string) || '';

  // Local state for immediate UI updates
  const [localSearch, setLocalSearch] = useState(searchValue);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync local state with URL state
  useEffect(() => setLocalSearch(searchValue), [searchValue]);

  // Update URL state when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== searchValue) {
      onColumnFiltersChange((old) => {
        const newFilters = old.filter((f) => f.id !== 'name');
        if (debouncedSearch) newFilters.push({ id: 'name', value: debouncedSearch });
        return newFilters;
      });
    }
  }, [debouncedSearch, searchValue, onColumnFiltersChange]);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="pl-8 h-9 w-full" />
      </div>

      {/* Desktop Actions */}
      <div className="hidden md:flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh data"
        >
          <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        <Button onClick={handleCreate} size="sm">Create New</Button>
      </div>

      {/* Mobile Actions Dropdown */}
      <div className="md:hidden flex-none">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRefresh}><RotateCw className="mr-2 h-4 w-4" />Refresh</DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreate}>Create New</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
```

**Key Points**:
- ✅ Debounced search (300ms) with local state for immediate UI updates
- ✅ Responsive actions: desktop buttons → mobile dropdown
- ✅ Refresh action uses icon-only button + `aria-label` + `isFetching` spinner state

### 4. Use Infinite Scroll Hook

```tsx
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  rootMargin = '400px',
  enabled = true,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<T>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) fetchNextPage(); },
      { rootMargin }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin, enabled]);

  return sentinelRef;
}
```

**How it works**:
- Attach ref to sentinel element (empty div at bottom of list)
- When sentinel enters viewport (with 400px margin), trigger `fetchNextPage`
- Automatically cleanup on unmount

---

## Query Key Memoization

Query key factory calls (e.g., `taskTemplateQueryKeys.list(studioId, { search })`) create a new array reference on every render. When the query key is used outside the `queryKey` option — such as in a `useEffect` cleanup or a `useCallback` — the new reference causes the effect or callback to re-run on every render.

**Rule**: Wrap query key factory calls in `useMemo` when they are passed to `useEffect`, `useCallback`, or any cache management call outside the `queryKey` option.

```typescript
// ✅ Stable reference — only changes when studioId or searchQuery changes
const listQueryKey = useMemo(
  () => taskTemplateQueryKeys.list(studioId, { search: searchQuery }),
  [studioId, searchQuery],
);

useEffect(() => {
  return () => {
    queryClient.setQueryData(listQueryKey, compactToFirstPage);
  };
}, [listQueryKey, queryClient]);  // ← safe: listQueryKey is stable
```

## Cache Compaction

On unmount, compact the infinite query cache to page 1 so that remount triggers a single revalidation request instead of re-fetching every accumulated page.

```typescript
useEffect(() => {
  return () => {
    queryClient.setQueryData<InfiniteData<PaginatedResponse<ItemDto>>>(
      listQueryKey,
      (data) => (data ? compactToFirstPage(data) : data),
    );
  };
}, [listQueryKey, queryClient]);
```

**Manual refresh**: Compact first, then refetch — prevents a burst of N page requests:

```typescript
const handleRefresh = useCallback(() => {
  queryClient.setQueryData(listQueryKey, (data) =>
    data ? compactToFirstPage(data) : data,
  );
  void query.refetch();
}, [listQueryKey, query, queryClient]);
```

Pass `handleRefresh` as `onRefresh` to the toolbar instead of the raw `query.refetch`.

See [`frontend-state-management/references/infinite-cache-patterns.md`](../frontend-state-management/references/infinite-cache-patterns.md) for the full cache helper implementations.

---

## Query State Ownership Principle

> [!IMPORTANT]
> Feature hooks own all query state. UI components receive callbacks, not query internals.

**✅ GOOD**:
```tsx
// Hook owns query, exposes both data and refetching state
function useFeature({ studioId }) {
  const query = useInfiniteQuery({ ... });
  return {
    items: ...,
    isLoading: query.isLoading,
    isFetching: query.isFetching,  // ✅ Include for refresh button
    refetch: query.refetch,
  };
}

// Toolbar receives callback, doesn't know about React Query
<FeatureToolbar onRefresh={refetch} isRefreshing={isFetching} />
```

**❌ BAD**:
```tsx
// Layout component using useIsFetching
function PageLayout({ refreshQueryKey }) {
  const fetchingCount = useIsFetching({ queryKey: refreshQueryKey });
  // This couples layout to query internals
}
```

---

## Checklist

- [ ] Feature hook uses `useInfiniteQuery` with offset pagination (`page` + `limit`)
- [ ] Hook exposes `isFetching` for refresh button state
- [ ] Route component uses sticky toolbar pattern with backdrop blur
- [ ] Toolbar implements responsive actions (desktop buttons → mobile dropdown)
- [ ] Toolbar uses debounced search (300ms) with local state
- [ ] List component uses `ResponsiveCardGrid` for layout
- [ ] List component uses `useInfiniteScroll` hook
- [ ] All loading, error, and empty states are handled
- [ ] Query state ownership principle is followed
- [ ] Query key factory calls used outside `queryKey` option are wrapped in `useMemo`
- [ ] `useEffect` cleanup compacts the infinite query cache to page 1 on unmount
- [ ] Manual refresh handler compacts cache before calling `refetch`

---

## Related Skills

- [admin-list-pattern](../admin-list-pattern/SKILL.md) - For admin section table-based lists
- [frontend-ui-components](../frontend-ui-components/SKILL.md) - For UI component patterns
- [frontend-state-management](../frontend-state-management/SKILL.md) - For state management patterns
