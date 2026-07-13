---
name: studio-list-pattern
description: Build card-based infinite-scroll Studio lists. Use admin-list-pattern for admin tables or table-view-pattern for grids.
---

# Studio List Pattern

Standard pattern for infinite scroll lists in `erify_studios`. Unlike admin lists (table-based server pagination), studio lists use offset-based pagination with `useInfiniteQuery` and card grids.

## Canonical Examples

- **Route**: [task-templates/index.tsx](../../../apps/erify_studios/src/routes/studios/$studioId/task-templates/index.tsx)
- **Hook**: [use-task-templates.ts](../../../apps/erify_studios/src/features/task-templates/hooks/use-task-templates.ts)
- **Toolbar**: [task-templates-toolbar.tsx](../../../apps/erify_studios/src/features/task-templates/components/task-templates-toolbar.tsx)

> See [references/studio-list-examples.md](references/studio-list-examples.md) for full code examples.

## Architecture

```
Route Component
├─ useFeature() hook              → Owns all query state
├─ Sticky Toolbar                 → Search + Actions
├─ ResponsiveCardGrid             → Auto-fill grid layout
│  └─ Card components             → Individual items
└─ useInfiniteScroll() sentinel  → Triggers fetchNextPage
```

## Pattern Summary

| Concern | Owner | Pattern |
|---|---|---|
| Query state | Feature hook | `useInfiniteQuery` + `useTableUrlState` |
| Search | Toolbar | Debounced (300ms) local state → URL sync |
| Pagination | Sentinel div | `IntersectionObserver` with 400px margin |
| Layout | Route | Sticky toolbar + scrollable content |
| Actions | Toolbar | Responsive: desktop buttons → mobile dropdown |

## Key Rules

1. `useInfiniteQuery` with offset pagination (`page` + `limit`), `initialPageParam: 1`
2. `getNextPageParam`: `meta.page < meta.totalPages ? page + 1 : undefined`
3. Expose `isFetching` (not just `isLoading`) for refresh button state
4. Flatten pages: `useMemo(() => data?.pages.flatMap(p => p.data) ?? [], [data])`
5. Handle all states: loading, error, empty, fetching next page

## Query State Ownership

Feature hooks own all query state. UI components receive callbacks, not query internals.

```tsx
// Hook exposes callbacks
return { items, isLoading, isFetching, refetch };
// Toolbar receives callbacks
<FeatureToolbar onRefresh={refetch} isRefreshing={isFetching} />
```

## Cache Management

- **Query key memoization**: Wrap in `useMemo` when used outside `queryKey` option
- **Compact on unmount**: `compactToFirstPage` on cleanup — prevents N-page burst on remount
- **Manual refresh**: Compact first, then refetch

See [frontend-state-management references](../frontend-state-management/references/infinite-cache-patterns.md) for full cache helper implementations.

## Checklist

- [ ] Feature hook uses `useInfiniteQuery` with offset pagination
- [ ] Hook exposes `isFetching` for refresh state
- [ ] Sticky toolbar with `backdrop-blur-sm`
- [ ] Responsive actions (desktop buttons → mobile dropdown)
- [ ] Debounced search (300ms) with local state
- [ ] `ResponsiveCardGrid` for layout
- [ ] `useInfiniteScroll` hook with sentinel div
- [ ] All loading/error/empty states handled
- [ ] Query key calls memoized when used outside `queryKey`
- [ ] Cache compacted to page 1 on unmount

## Related Skills

- [admin-list-pattern](../admin-list-pattern/SKILL.md) — Table-based admin lists
- [frontend-state-management](../frontend-state-management/SKILL.md) — State patterns
- [frontend-ui-components](../frontend-ui-components/SKILL.md) — UI component patterns
