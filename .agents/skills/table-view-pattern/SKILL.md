---
name: table-view-pattern
description: Build shared server-driven tables, URL state, grids, editing, and saved views, not card-based Studio lists.
---

# Table View Pattern

Standard patterns for large tabular views in `erify_studios`, `erify_creators`, and `@eridu/ui`.

> See [references/table-view-details.md](references/table-view-details.md) for extended guidance, code examples, virtualization patterns, CRUD consistency rules, current-view export details, and anti-patterns.

## Read First

- Tech debt register: `apps/erify_studios/docs/FRONTEND_TECH_DEBT.md`
- Nearest existing table route in target app before changing code

## When to Use / Not Use

**Use**: Large table routes, migrating lists to tables, optimizing dense UIs, adding row actions/selection/editing, modifying `@eridu/ui` table primitives.

**Don't use**: Card-based studio lists → `studio-list-pattern`. Backend-only pagination → backend skills. Trivial CRUD with small row counts → use shared `DataTable` without extra complexity.

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

**Reference implementation**: `apps/erify_studios/src/routes/studios/$studioId/task-review/index.tsx`

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

`DataTable` (`packages/ui/src/components/data-table/data-table-core.tsx`) accepts an optional `getRowClassName?: (row: TData) => string | undefined` prop for per-row conditional styling (e.g. dimming a resolved row). It composes with the existing `onRowClick`-conditional class via `cn()` — pass a function, don't hand-roll a wrapper `<tr>` or a parallel row-styling mechanism. Precedent: `schedule-publish-impacts.tsx` dims resolved `stale_conflict` rows with it.

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

See [references/table-view-details.md](references/table-view-details.md) for reference implementations.

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

## Related Skills

- [operations-review-surface](../operations-review-surface/SKILL.md) — Multi-tab operational-day review screens composed on top of these table primitives
- [studio-list-pattern](../studio-list-pattern/SKILL.md) — Card-based infinite scroll
- [frontend-ui-components](../frontend-ui-components/SKILL.md) — Shared UI primitives
- [frontend-state-management](../frontend-state-management/SKILL.md) — State patterns
- [frontend-performance](../frontend-performance/SKILL.md) — Virtualization, memoization
- [admin-list-pattern](../admin-list-pattern/SKILL.md) — Admin table lists
