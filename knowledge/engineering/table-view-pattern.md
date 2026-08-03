---
type: engineering_standard
title: Table View Pattern
description: Standard patterns for list surfaces in erify_studios, erify_creators, and @eridu/ui — server-driven tables, admin paginated tables, and card-based infinite scroll.
status: stable
stale_after: "2027-01-01"
sources:
  - title: Shared DataTable primitives
    path: packages/ui/src/components/data-table/index.ts
  - title: erify_studios frontend tech debt register
    path: apps/erify_studios/docs/FRONTEND_TECH_DEBT.md
  - title: Merged-dataset pagination reference route
    path: apps/erify_studios/src/routes/studios/$studioId/task-review/index.tsx
---

# Table View Pattern

Standard patterns for list surfaces in `erify_studios`, `erify_creators`, and `@eridu/ui`. Selected by the [`table-view-pattern`](../../.agents/skills/frontend-ui-components/references/table-view-pattern.md) skill.

> See [references/table-view-details.md](../../.agents/skills/frontend-ui-components/references/table-view-details.md) for extended guidance, code examples, virtualization patterns, CRUD consistency rules, current-view export details, and anti-patterns.

## Read First

- Tech debt register: [`apps/erify_studios/docs/FRONTEND_TECH_DEBT.md`](../../apps/erify_studios/docs/FRONTEND_TECH_DEBT.md)
- Nearest existing list route of the same surface kind in target app before changing code

## Three Surface Stacks

One skill owns three list stacks. They share `useTableUrlState` for URL state and differ in pagination and layout:

| Surface | Pagination | Section |
| --- | --- | --- |
| Studio or creator data table | Server `page`/`limit` | § Standard Table Pattern |
| Erify Admin table (`/system/*`) | Server `page`/`limit`, `@AdminPaginatedResponse` | § Admin Table Stack |
| Card grid with infinite scroll | Offset `useInfiniteQuery` + sentinel | § Card Infinite-Scroll Lists |

**Don't use**: operational-day review screens → `operations-review-surface`. Trivial CRUD with small row counts → use shared `DataTable` without extra complexity.

## Core Principles

1. **Shared primitives first**: `DataTable` + `DataTableToolbar` + `DataTablePagination` + `useTableUrlState` + TanStack Query + TanStack Router search validation. No custom grids unless justified.
2. **Route-driven views over data**: Server state (TanStack Query), URL state (`useTableUrlState`), local UI state (dialogs, selected row id). Never collapse all into one component state object.
3. **Preserve route/search contracts**: Validate search params in route, keep URLs shareable, reset page to 1 on filter change.
4. **Follow repo decomposition**: Route = composition boundary, feature hook = query + URL state, columns = config files.
5. **Match nearest canonical table**: Reuse layout, toolbar density, search/filter contract from closest existing table before inventing a new variant.

## Decision Order

Table-specific instance of `frontend-ui-components`'s general Decision Priority (requirement → project convention → framework best practice → preference):

1. **Choose primitive**: Default `DataTable` → virtualized only if measurably slow → card grids only if not tabular
2. **Choose ownership**: Route owns composition, feature hook owns query, column config owns renders, shared package owns primitives
3. **Decide explorer features**: Only add saved views, inline editing, column visibility, virtualization when product actually needs it

## Standard Table Pattern

- **Route**: `createFileRoute(...)({ validateSearch, component })` — focused on composition
- **Feature hook**: Owns `useTableUrlState`, maps to API params, executes queries, handles refresh/invalidation, feeds `setPageCount`
- **Nested routes**: When a table renders in an index child but the search schema lives on the parent route, pass the parent route id to `useTableUrlState.from` so validated URL filters (for example `platform_name`) are read and preserved.
- **Navigating into a search-validated route**: A parent/layout route's `validateSearch` (e.g. a `shows.tsx` list schema with `page`/`limit` and other required-with-`.catch()` fields) governs every descendant route under it, even leaf routes with no `validateSearch` of their own. Any `<Link to>`/`navigate({ to })` targeting a route inside that subtree — including bare tab links and dialog "view details" links — must supply a `search` object matching the full ancestor-cascaded output shape (not just the leaf's own fields), or the call silently mistypes in a way `tsc -b` (not `tsc --noEmit`) catches. This is the single most common typecheck failure surfaced when fixing a stale typecheck-noop script; check every `<Link>`/`navigate()` into a nested route tree for this before assuming a build/lint pass means the search contract is correct.
- **Columns**: In feature config files, pure render logic, stable column ids, action columns via `useMemo`
- **Row actions**: any row action column — including a single action — goes behind a `MoreHorizontal` dropdown trigger, not a standalone `Button` in the cell. Extract a `<feature>-actions-cell.tsx` component (e.g. `studio-member-actions-cell.tsx`, `studio-creator-actions-cell.tsx`) that composes the shared `DataTableActions` primitive (`@eridu/ui`) — pass `onEdit`/`onDelete` as named props, everything else via `renderExtraActions` (toggle-style actions like retire/reactivate, navigation links, custom mutations). The actions column's `cell` in the `*-columns.tsx` file just renders that component. Don't start with a bare `Button` "because there's only one action today" — a second action getting added later is the common case, and starting with `DataTableActions` costs nothing over a plain `Button`. This applies to hand-rolled `<Table>` markup too, not just `DataTable`-column-config tables — e.g. a dashboard's manually-built table adding its first row action should still reach for `DataTableActions`, matching every other table in the app, rather than rendering a bare trigger because that file predates the primitive. See `mechanic-actions-cell.tsx` for a reference conversion (PR 20.8).
- **Toolbar**: Use `DataTableToolbar` — primary search maps to URL-backed filter, debounced, manual refresh with icon-only button + `aria-label`. Two or more secondary filters belong in one responsive `Filters` Popover/Sheet with an active count and reset action; do not emit one toolbar dropdown per filter. A `*_from` + `*_to` pair representing one interval uses one `DatePickerWithRange` inside that surface. Keep page size, refresh, export, and primary actions outside because they are view controls/actions, not filters. Integrate custom filter triggers as children of `DataTableToolbar` (sizing buttons down to `h-8` to align with the search input).
- **Pagination**: Use `DataTablePagination` — `useTableUrlState` owns `page`/`pageSize`, `placeholderData: keepPreviousData`, never clamp against fallback during loading

## Admin Table Stack

Searchable, paginated lists in admin sections, spanning `erify_studios` (frontend) and `erify_api` (backend).

**Canonical examples**

- Controller: [admin-client.controller.ts](../../apps/erify_api/src/admin/clients/admin-client.controller.ts)
- Repository: [client.repository.ts](../../apps/erify_api/src/models/client/client.repository.ts)

**Integration overview**

```text
Frontend (useTableUrlState → URL params) → API (QueryDto) → Service (pass-through) → Repository (Prisma where)
```

**Backend chain**

1. **Query DTO** — extend base pagination with filters, transform to `take`/`skip`:

   ```typescript
   export const listResourceQuerySchema = z
     .object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).default(10) })
     .and(listResourceFilterSchema)
     .transform((d) => ({ ...d, take: d.limit, skip: (d.page - 1) * d.limit }));
   ```

2. **Repository** — build the `where` clause with `contains` + `insensitive`. Use `Promise.all` for data + count.
3. **Service** — thin pass-through to `repository.findPaginated()`.
4. **Controller** — use the `@AdminPaginatedResponse` decorator, pass the query DTO to the service.

**Frontend**

- Route search schema uses `limit` (not `pageSize`) as the URL param.
- `useTableUrlState` owns URL synchronization and bridges `limit` → TanStack Table's `pageSize`.
- `DataTable` + `DataTableToolbar` with `searchColumn` and a debounced (500ms) input.

**Checklist**

- [ ] Backend: query DTO extends pagination with filters
- [ ] Backend: repository builds `where` with `contains`/`insensitive`
- [ ] Backend: service delegates to `repository.findPaginated()`
- [ ] Frontend: `useTableUrlState` for URL sync
- [ ] Frontend: `searchColumn` passed to `DataTableToolbar`
- [ ] Frontend: debounced search behavior verified

## Card Infinite-Scroll Lists

Card grids in `erify_studios`. Unlike the table stacks above (server pagination), these use offset-based pagination with `useInfiniteQuery`.

**Canonical examples**

- Route: [task-templates/index.tsx](../../apps/erify_studios/src/routes/studios/$studioId/task-templates/index.tsx)
- Hook: [use-task-templates.ts](../../apps/erify_studios/src/features/task-templates/hooks/use-task-templates.ts)
- Toolbar: [task-templates-toolbar.tsx](../../apps/erify_studios/src/features/task-templates/components/task-templates-toolbar.tsx)

> Full code examples: [references/studio-list-examples.md](../../.agents/skills/frontend-ui-components/references/studio-list-examples.md).

**Architecture**

```text
Route Component
├─ useFeature() hook              → Owns all query state
├─ Sticky Toolbar                 → Search + Actions
├─ ResponsiveCardGrid             → Auto-fill grid layout
│  └─ Card components             → Individual items
└─ useInfiniteScroll() sentinel  → Triggers fetchNextPage
```

| Concern | Owner | Pattern |
| --- | --- | --- |
| Query state | Feature hook | `useInfiniteQuery` + `useTableUrlState` |
| Search | Toolbar | Debounced (300ms) local state → URL sync |
| Pagination | Sentinel div | `IntersectionObserver` with 400px margin |
| Layout | Route | Sticky toolbar + scrollable content |
| Actions | Toolbar | Responsive: desktop buttons → mobile dropdown |

**Key rules**

1. `useInfiniteQuery` with offset pagination (`page` + `limit`), `initialPageParam: 1`
2. `getNextPageParam`: `meta.page < meta.totalPages ? page + 1 : undefined`
3. Expose `isFetching` (not just `isLoading`) for refresh button state
4. Flatten pages: `useMemo(() => data?.pages.flatMap(p => p.data) ?? [], [data])`
5. Handle all states: loading, error, empty, fetching next page

**Query state ownership** — feature hooks own all query state; UI components receive callbacks, not query internals:

```tsx
// Hook exposes callbacks
return { items, isLoading, isFetching, refetch };
// Toolbar receives callbacks
<FeatureToolbar onRefresh={refetch} isRefreshing={isFetching} />
```

**Cache management**

- **Query key memoization**: wrap in `useMemo` when used outside the `queryKey` option.
- **Compact on unmount**: `compactToFirstPage` on cleanup — prevents an N-page burst on remount.
- **Manual refresh**: compact first, then refetch.

See [`frontend-state-management` references](../../.agents/skills/frontend-state-management/references/infinite-cache-patterns.md) for full cache helper implementations.

**Checklist**

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

## Pagination Review Gate

- Manual `page`/`limit` reads → ask why not `useTableUrlState`
- Missing `keepPreviousData` → ask why
- Custom pagination buttons → ask why not `DataTablePagination`
- Fallback clamps during loading → correctness bug
- **Merged-dataset page count mismatch** — if the route derives `displayedData` from a larger merged dataset than the hook's server query, the hook's `setPageCount` will clamp `pageIndex` to the smaller server range; override it with the merged count (see § Merged-Dataset Pagination below)

## Merged-Dataset Pagination

Use when a route renders a **client-side union** of two server queries (e.g. due-dated tasks + undated tasks) and paginates the combined result locally.

**Problem**: The feature hook calls `setPageCount(data.meta.totalPages)` from its server query. `useTableUrlState` auto-corrects `pageIndex` against that count. When the merged dataset has more rows — and thus more pages — than the server query alone, those extra pages are silently unreachable.

**Fix**: Expose `setPageCount` from the feature hook return, thread it through the controller, then call it from the route once the secondary dataset has resolved:

```typescript
// After computing pageCount from the merged filteredAllData:
useEffect(() => {
  // Guard: only override after the secondary dataset resolves.
  // While loading, leave useTableUrlState on the server count to avoid
  // premature clamping to pageCount=1 (empty dataset).
  if (summaryData !== undefined) {
    setPageCount(pageCount); // pageCount = Math.ceil(mergedData.length / pageSize)
  }
}, [pageCount, summaryData, setPageCount]);
```

**Key rules**:

- The guard (`summaryData !== undefined`) prevents the loading state (merged data = []) from clamping `pageIndex` to 1.
- After the secondary dataset resolves, this effect always wins: it runs after the hook's internal `setPageCount(serverTotalPages)` within the same render cycle.
- `effectivePagination` passed to `DataTable` and `DataTablePagination` must be derived from the merged count, not `tableProps.pagination`.

**Reference implementation**: [`apps/erify_studios/src/routes/studios/$studioId/task-review/index.tsx`](../../apps/erify_studios/src/routes/studios/$studioId/task-review/index.tsx)

## State Rules

- **Server state**: TanStack Query with stale-while-revalidate
- **URL state**: `useTableUrlState` for page, limit, sortBy, sortOrder, search, date ranges, filters
- **Local state**: Selected row id (not full objects), dialog/drawer open state, draft inline edits
- Row selection surviving page changes: use `useSelectedRowSnapshots` feature hook

## Row Selection Eligibility

When a table has both issue badges and bulk actions, keep the two decisions separate:

- Issue helpers can return advisory review signals that explain row state to the user.
- Bulk-action selection must use a dedicated blocker helper that returns only conditions the bulk endpoint cannot process.
- Do not reuse all issue badges as `enableRowSelection`; advisory warnings such as extraction visibility, binding drift, or stale-template context can block a valid backend action.
- If a list payload omits large lazy-loaded fields such as `snapshot.schema`, do not infer a negative condition from absence alone. Run schema-dependent checks only when the field is actually present, or lazy-load detail before making a blocking decision.

## Row-Level Styling

`DataTable` ([`packages/ui/src/components/data-table/data-table-core.tsx`](../../packages/ui/src/components/data-table/data-table-core.tsx)) accepts an optional `getRowClassName?: (row: TData) => string | undefined` prop for per-row conditional styling (e.g. dimming a resolved row). It composes with the existing `onRowClick`-conditional class via `cn()` — pass a function, don't hand-roll a wrapper `<tr>` or a parallel row-styling mechanism. Precedent: `schedule-publish-impacts.tsx` dims resolved `stale_conflict` rows with it.

## Async Combobox Filters

For filters that query large backend collections (e.g., Clients, Memberships/Users, Shows) in dense tables:

- **Combobox Configuration**: Use `type: 'combobox'` inside the `searchableColumns` config. Provide `options`, `isLoading`, `onSearch` listeners, and a `placeholder`.
- **Trigger Label Persistence**: Always implement a secondary query (e.g., a `by-id` or `by-name` query with `limit: 1`) to fetch the full object details of the active filter value. This ensures the correct label remains visible on the trigger button even when the item falls outside the initial page of search results.
- **Client-Side/Server-Side Harmony**: Ensure the option value maps correctly to the column filters state, and that client-side filtering (if applicable) or server-side filtering handles the resolved values cleanly.
- **Reuse the shared hook**: Don't hand-roll the list + selected-label query pair. Use `useAsyncComboboxFilter` (`apps/erify_studios/src/features/tasks/hooks/use-async-combobox-filter.ts`), passing `fetchList`, `fetchSelected` (must return `null`, never `undefined`), and a stable `toOption`. See the task-review filter hooks (`use-task-review-client-filter.ts`, `-user-filter.ts`, `-show-filter.ts`) as reference implementations.

## Current-View Export

When a table supports CSV/JSON export, export the current server-filtered view, not just the visible page:

- Derive export params from the same hook-owned API params as the table query; omit only `page`/`limit`.
- Page through the list endpoint with a fixed export page size and a documented max row cap.
- Cap concurrent page fetches at a small constant (e.g. 4). Do not fan out every remaining page with `Promise.all` — accept some wait time over bursting up to N simultaneous requests at the API.
- Forward an `AbortSignal` to every page request; abort in-flight exports on unmount or new export.
- Show a spinner + "Exporting…" label on the trigger button while pagination runs (do not leave the button silently disabled).
- Use shared primitives (`src/lib/csv.ts`, `src/lib/file-download.ts`) for escaping, UTF-8 BOM, CRLF, and downloads.
- Disable the export action when the matching count is zero or an export is already running.

See [references/table-view-details.md](../../.agents/skills/frontend-ui-components/references/table-view-details.md) for reference implementations.

## Checklist

- [ ] Shared `DataTable` primitives reused unless justified exception
- [ ] URL state owned by `useTableUrlState`
- [ ] Feature hook owns query/filter/refresh state
- [ ] Route search params validated
- [ ] `isLoading` and `isFetching` both handled
- [ ] Mutation invalidation scoped correctly
- [ ] Stable row ids for selection/editing
- [ ] Row-selection eligibility uses hard blockers, not every issue badge or advisory warning
- [ ] Any row action column (including a single action) uses a `DataTableActions` dropdown actions-cell, not a standalone icon/text button — applies to hand-rolled `<Table>` markup too
- [ ] Current-view export (if present) uses shared params + `AbortSignal` + shared CSV/download helpers + concurrency cap (no `Promise.all` fan-out) + spinner on trigger
- [ ] Route decomposition clean and maintainable
- [ ] Layout compared against nearest canonical table
- [ ] Secondary filters are consolidated into one responsive filter surface; semantic date intervals use one range picker and filter reset preserves independent view controls

## Related Concepts

- [`engineering/frontend-tech-stack`](frontend-tech-stack.md) — Stack and project structure
- [`operations-review-surface`](../../.agents/skills/operations-review-surface/SKILL.md) — Multi-tab operational-day review screens composed on top of these table primitives
- [`frontend-ui-components`](../../.agents/skills/frontend-ui-components/SKILL.md) — Shared UI primitives
- [`frontend-state-management`](../../.agents/skills/frontend-state-management/SKILL.md) — State patterns
- [`frontend-performance`](../../.agents/skills/frontend-performance/SKILL.md) — Virtualization, memoization
