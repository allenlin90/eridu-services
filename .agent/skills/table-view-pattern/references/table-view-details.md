# Table View Pattern — Detailed References

Extended guidance for building and optimizing large tabular views.

## File References

### Shared table foundation
- `packages/ui/src/components/data-table/data-table-core.tsx`
- `packages/ui/src/components/data-table/data-table-toolbar.tsx`
- `packages/ui/src/components/data-table/data-table-pagination.tsx`
- `packages/ui/src/hooks/use-table-url-state.ts`

### Concrete route examples
- `apps/erify_studios/src/routes/system/users/index.tsx`
- `apps/erify_studios/src/routes/system/task-templates/index.tsx`
- `apps/erify_studios/src/routes/system/shows/index.tsx`
- `apps/erify_studios/src/routes/studios/$studioId/show-operations/index.tsx`

### Query persistence
- `apps/erify_studios/src/lib/api/query-client.ts`
- `apps/erify_studios/src/lib/api/persister.ts`
- `apps/erify_creators/src/lib/api/query-client.ts`
- `apps/erify_creators/src/lib/api/persister.ts`

## Decomposition Shape

```text
src/
├── routes/.../index.tsx                         # route composition boundary
├── features/{feature}/hooks/use-{feature}.ts   # query + URL state owner
├── features/{feature}/config/*-columns.tsx     # column defs
├── features/{feature}/config/*-search-schema.ts
└── features/{feature}/components/              # optional cells, dialogs, panels, virtualized view
```

## `limit` vs `pageSize` Mapping

| Context | Field name | Why |
|---------|-----------|-----|
| Route search schema | `limit` | Canonical URL param; backend contract |
| TanStack Table `PaginationState` | `pageSize` | Library convention |
| `useTableUrlState` return | `pagination.pageSize` | Hook maps `limit` → TanStack's `PaginationState` |

**Rule**: `pageSize` never appears as a URL param — it only exists as TanStack Table's internal field. The mapping happens at the `useTableUrlState` hook boundary.

```typescript
// ✅ Route schema: use limit
const searchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(10),
});

// ✅ Navigate: use limit
navigate({ to: '/system/foo', search: { page: 1, limit: 10 } });

// ✅ DataTable prop: pageSize is TanStack Table's PaginationState — keep it
paginationState={{ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }}

// ❌ Never write pageSize as a URL param
navigate({ search: { pageSize: 20 } })  // wrong — use limit
```

## Virtualized Table Pattern

Use only when the shared server-paginated table is not enough.

### When to escalate
- More than ~100 visible rows inside the scroll region
- Wide tables with expensive custom cells
- Measurable scroll jank
- Sticky headers/columns plus dense rendering costs

### Rules
1. Keep TanStack Query and `useTableUrlState` unchanged.
2. Virtualize the rendering layer, not the entire state model.
3. Virtualize rows before columns.
4. Prefer predictable row heights.
5. Use a bounded scroll container rather than document scrolling.
6. Measure first; do not add virtualization speculatively.

### Minimum shape

```tsx
function FeatureVirtualizedTable(props: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-16rem)] overflow-auto">
      {/* sticky header */}
      {/* virtual rows */}
    </div>
  );
}
```

## Current-View Export

For server-driven table exports, export the current server-filtered view rather than only the visible page.

Required pattern:
- derive export params from the same hook-owned API params as the table query
- omit only pagination fields (`page`, `limit`) before export
- page through the list endpoint with a fixed export page size and a documented max row cap
- cap concurrent page fetches at a small constant (e.g. 4). Never fan out the full remaining-page list with `Promise.all` — a single user click can burst dozens of identical-shape requests at the API. Use `for (let i = 0; i < pages.length; i += BATCH_SIZE)` and `await Promise.all` on a slice. Some additional wait time is acceptable; bursting the API is not.
- forward an `AbortSignal` to every page request and abort in-flight exports on unmount or a new export; check `signal.aborted` between batches
- show a spinner (`Loader2 animate-spin`) plus "Exporting…" label on the trigger button while pagination runs; set `aria-busy` so screen readers announce the in-progress state
- use shared CSV/download primitives (`src/lib/csv.ts`, `src/lib/file-download.ts`) so escaping, UTF-8 BOM, CRLF line endings, and browser download behavior stay consistent
- make the export action disabled when the matching result count is zero or an export is already running

Reference implementations:
- `apps/erify_studios/src/features/studio-shows/api/get-studio-shows.ts` — concurrency-capped batched pagination (canonical)
- `apps/erify_studios/src/features/studio-shows/utils/studio-shows-export.utils.ts`
- `apps/erify_studios/src/features/studio-show-creators/utils/creator-mapping-export.utils.ts` — assignment-focused fan-out: one row per mapped creator, blank-creator row for unmapped shows; consumes `useCreatorMappingShows` `queryParams` and uses `getAllStudioShowsForExport` for batched pagination
- `apps/erify_studios/src/features/studio-shifts/api/get-studio-shifts.ts` — older fan-out (to be migrated to the batched form)
- `apps/erify_studios/src/features/studio-shifts/utils/studio-shifts-export.utils.ts`

## CRUD Table UX Consistency Rules

Preferred shape:
- one page-level wrapper (`AdminLayout` or `PageLayout`)
- one primary table section
- toolbar with search, shared filters, refresh, and primary create action
- row-level actions for edit/delete
- no duplicate secondary headers, custom filter shells, or alternate action bars

When adding a new CRUD table page:
1. inspect the nearest admin/system table in the same domain
2. inspect the nearest studio-scoped table in the same domain
3. adopt the shared subset of filters and actions first
4. document any intentional divergence in the feature design doc

### Filter consistency policy
- Keep common filter names aligned across pages for the same entity.
- Prefer parity with the nearest canonical table route.
- Only add specialized filters on the page that actually needs them.

## Sorting, Filtering, and Saved Views

### Filtering
- Filters should serialize cleanly into URL params
- Search/filter changes should reset pagination to page 1
- Avoid mixing server filters with extra hidden client-only post-filters

### Sorting
- Prefer server-side sorting for large datasets
- Keep sorting contract aligned with `sortBy` / `sortOrder`
- Default to single-sort unless product requirements clearly justify multi-sort

### Saved views
- Keep the active view id separate from raw filter/sort state
- Store a serializable payload matching URL semantics
- Keep direct-linkability intact

## Editing Flows

### Default interaction model
Prefer dialogs or side panels for create/update/delete.

### Inline editing
Use only when ALL are true:
- the value is scalar and low-risk
- the mutation path is fast and deterministic
- failure recovery is straightforward
- the UX benefit is meaningfully higher than the focus/keyboard complexity

### Draft state
Key drafts by stable row id and column id: `type CellDraftKey = \`${string}:${string}\``

## Performance Rules

1. Start from the shared table stack
2. Derive, do not synchronize copies
3. Memoize narrowly (expensive computation, stable dependency, action columns)
4. Keep hot render paths cheap (no parsing, no large option generation, no nested forms in cells)
5. Preserve fetch-state UX (`isLoading` vs `isFetching`)

## Accessibility

- Preserve semantic table markup unless virtualization forces otherwise
- Keep icon-only buttons labeled
- Preserve visible focus states
- Avoid focus loss during refetch, dialog transitions, or inline edits
- Ensure empty/loading/error states are explicit
- Keep sticky headers/toolbars from obscuring focus targets

## Anti-Patterns

- Custom ad hoc table state when `useTableUrlState` already fits
- Fetching all rows to page/filter/sort locally on server-backed views
- Route files mixing query logic, dialogs, render code, and feature state
- Speculative virtualization without evidence
- Blanket `useMemo` / `useCallback` with no concrete benefit
- Spreadsheet-style inline editing for routine CRUD screens
- Storing drifting selected row objects when ids are sufficient
- Bypassing shared `@eridu/ui` table primitives for cosmetic reasons alone
