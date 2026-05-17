---
name: table-view-pattern
description: Provides patterns for building and optimizing large frontend tabular views across the eridu-services monorepo. Use when building or refactoring server-driven tables, dense tabular UIs, virtualized grids, inline editing, saved views, and table URL state in erify_creators, erify_studios, or shared @eridu/ui.
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

1. **Choose primitive**: Default `DataTable` → virtualized only if measurably slow → card grids only if not tabular
2. **Choose ownership**: Route owns composition, feature hook owns query, column config owns renders, shared package owns primitives
3. **Decide explorer features**: Only add saved views, inline editing, column visibility, virtualization when product actually needs it

## Standard Table Pattern

- **Route**: `createFileRoute(...)({ validateSearch, component })` — focused on composition
- **Feature hook**: Owns `useTableUrlState`, maps to API params, executes queries, handles refresh/invalidation, feeds `setPageCount`
- **Columns**: In feature config files, pure render logic, stable column ids, action columns via `useMemo`
- **Toolbar**: Use `DataTableToolbar` — primary search maps to URL-backed filter, debounced, manual refresh with icon-only button + `aria-label`
- **Pagination**: Use `DataTablePagination` — `useTableUrlState` owns `page`/`pageSize`, `placeholderData: keepPreviousData`, never clamp against fallback during loading

## Pagination Review Gate

- Manual `page`/`limit` reads → ask why not `useTableUrlState`
- Missing `keepPreviousData` → ask why
- Custom pagination buttons → ask why not `DataTablePagination`
- Fallback clamps during loading → correctness bug

## State Rules

- **Server state**: TanStack Query with stale-while-revalidate
- **URL state**: `useTableUrlState` for page, limit, sortBy, sortOrder, search, date ranges, filters
- **Local state**: Selected row id (not full objects), dialog/drawer open state, draft inline edits
- Row selection surviving page changes: use `useSelectedRowSnapshots` feature hook

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
- [ ] Current-view export (if present) uses shared params + `AbortSignal` + shared CSV/download helpers + concurrency cap (no `Promise.all` fan-out) + spinner on trigger
- [ ] Route decomposition clean and maintainable
- [ ] Layout compared against nearest canonical table

## Related Skills

- [studio-list-pattern](../studio-list-pattern/SKILL.md) — Card-based infinite scroll
- [frontend-ui-components](../frontend-ui-components/SKILL.md) — Shared UI primitives
- [frontend-state-management](../frontend-state-management/SKILL.md) — State patterns
- [frontend-performance](../frontend-performance/SKILL.md) — Virtualization, memoization
- [admin-list-pattern](../admin-list-pattern/SKILL.md) — Admin table lists
