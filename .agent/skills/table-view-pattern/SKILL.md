---
name: table-view-pattern
description: Provides patterns for building and optimizing large frontend tabular views across the eridu-services monorepo. Use when building or refactoring server-driven tables, dense tabular UIs, virtualized grids, inline editing, saved views, and table URL state in erify_creators, erify_studios, or shared @eridu/ui.
---
# Table View Pattern

Use this skill for **all large tabular views on the frontend in this monorepo**, not just `erify_studios`.

This skill adapts the article’s decomposition of a high-performance data explorer into repo-local decisions: **state modelling, rendering, backend sync, editing flows, and production constraints**. In this monorepo, the default solution is **not** a custom spreadsheet grid. Start from the shared table stack in `@eridu/ui`, preserve route-driven URL state, and only escalate to virtualization or richer explorer behavior when the problem actually requires it.

## Monorepo Scope
This skill applies to:
- `apps/erify_studios`
- `apps/erify_creators`
- `packages/ui` when changing shared table primitives or URL-state helpers

It should be used alongside the repo-wide guidance in `AGENTS.md` and the closest feature skill for the target surface.

## Use This Skill When
- Adding or refactoring a large table route in `erify_studios` or `erify_creators`
- Migrating a plain list into a searchable/filterable/sortable table
- Optimizing a slow, dense, or re-render-heavy tabular UI
- Adding row actions, row selection, lightweight inline editing, or saved-table-view behavior
- Introducing virtualization for row-heavy or cell-heavy views
- Modifying shared table primitives in `@eridu/ui`

## Do Not Use This Skill When
- The surface is better represented as a studio infinite-card list. Use `studio-list-pattern` instead.
- The work is backend-only list/filter/pagination work. Use backend list and API skills instead.
- The screen is small CRUD with trivial row counts and no performance problem. Reuse the existing shared `DataTable` path without adding complexity.

## Read These First
Always inspect the target module before changing code.

### Repo-wide source of truth
- `AGENTS.md`

### Shared table foundation
- `packages/ui/src/components/data-table/data-table-core.tsx`
- `packages/ui/src/components/data-table/data-table-toolbar.tsx`
- `packages/ui/src/components/data-table/data-table-pagination.tsx`
- `packages/ui/src/hooks/use-table-url-state.ts`

### Current concrete route examples
These are verified examples of the current route composition pattern for large admin-style tables:
- `apps/erify_studios/src/routes/system/users/index.tsx`
- `apps/erify_studios/src/routes/system/task-templates/index.tsx`

### Query and persistence behavior shared across frontend apps
- `apps/erify_studios/src/lib/api/query-client.ts`
- `apps/erify_studios/src/lib/api/persister.ts`
- `apps/erify_creators/src/lib/api/query-client.ts`
- `apps/erify_creators/src/lib/api/persister.ts`

If working in `erify_creators`, search that app for the nearest existing route/hook/config shape and preserve its conventions. Do not copy `erify_studios` literally if the target app already has a better local pattern.

## Core Monorepo Principles

### 1. Shared primitives first, custom explorers second
The default path for large tables in this repo is:
- `@eridu/ui` `DataTable`
- `@eridu/ui` `DataTableToolbar`
- `@eridu/ui` `DataTablePagination`
- `@eridu/ui` `useTableUrlState`
- TanStack Query for server state
- TanStack Router search validation in the route

Do not jump to a custom spreadsheet-style grid unless the task explicitly requires spreadsheet behavior.

### 2. Large tables are route-driven views over data
Treat the table as a **view over server data**, not a giant local state blob.

Keep concerns separated:
- **Server state**: TanStack Query
- **URL-shareable state**: `useTableUrlState`
  - pagination
  - search
  - filters
  - sorting
  - date ranges
- **Local UI state**: dialogs, drawers, selected row id, inline draft state

Do not collapse all of these into one component state object.

### 3. Preserve route/search contracts
For route-based tables, search params are part of the feature contract.

Each large table route should:
- validate search params in the route file
- keep URL behavior shareable and bookmarkable
- reset page to 1 when search/filter inputs change
- avoid ad hoc hidden client-only filters for server-backed data unless explicitly needed

### 4. Follow repo decomposition rules
Per `AGENTS.md`, large frontend route components should be decomposed instead of mixing everything in one file.

Preferred shape:

```text
src/
├── routes/.../index.tsx                         # route composition boundary
├── features/{feature}/hooks/use-{feature}.ts   # query + URL state owner
├── features/{feature}/config/*-columns.tsx     # column defs
├── features/{feature}/config/*-search-schema.ts
└── features/{feature}/components/              # optional cells, dialogs, panels, virtualized view
```

If virtualization is needed, isolate it in a feature-local component instead of bloating the route.

## Decision Order
Decide in this order before writing code.

### 1. Choose the right list primitive
- **Default for large admin/system tables**: shared `DataTable` with server-driven pagination/filtering/sorting
- **Use a virtualized table** only when the view is actually dense or slow
- **Use card grids / infinite browsing patterns** only when the UX is not fundamentally tabular
- **Do not replace server pagination with client-side accumulation** just to imitate Notion-like behavior

### 2. Choose the right ownership boundary
- Route owns composition and search validation
- Feature hook owns query params, refresh, and mutation wiring
- Column config owns render definitions and filter metadata
- Shared package owns reusable table primitives

### 3. Decide whether the task really needs explorer features
The article is useful because it frames the problem correctly, but do not over-implement.

Only add advanced explorer behavior when the product actually needs it:
- saved views
- inline cell editing
- custom column visibility management
- spreadsheet-like keyboard flows
- deep virtualization
- real-time collaborative state

For routine CRUD/admin screens, the repo’s standard route + hook + shared table path is preferred.

## Standard Table Pattern
Use this as the baseline across frontend apps.

### Route
- Use `createFileRoute(... )({ validateSearch, component })`
- Keep the route focused on composition, action wiring, dialogs, and layout
- Do not build API params inline across multiple unrelated sections of the route

### Feature hook
The feature hook is the source of truth for table state.

It should own:
- `useTableUrlState(...)`
- mapping URL table state to API params
- query execution
- refresh/invalidation callbacks
- mutation hooks when the route needs them
- page-count synchronization when applicable

The route should consume the hook result rather than rebuild query state itself.

### Columns
- Keep base columns in feature config files
- Prefer pure render logic in column defs
- Append action columns with `useMemo` only when closure values are required
- Keep column ids stable
- Use `getRowId` for selection/edit flows that depend on stable row identity

### Toolbar
Use `DataTableToolbar` unless the UX materially differs.

Guidelines:
- primary search maps to URL-backed filter state
- additional filters come through searchable/filterable column config
- let the shared toolbar own debounced search behavior
- put route-specific actions in toolbar children
- manual refresh controls should follow repo rules: icon-only, explicit `aria-label`, visible loading state

### Pagination
Use `DataTablePagination` for standard server-driven tables.

Do not create per-feature pagination controls unless the feature has a materially different UX.

## Virtualized Table Pattern
Use this only when the shared server-paginated table is not enough.

### When to escalate
Virtualization is justified when one or more of these are true:
- more than roughly 100 visible rows inside the scroll region
- wide tables with expensive custom cells
- measurable scroll jank
- sticky headers/columns plus dense rendering costs
- a product requirement for large continuous table browsing

### Rules
1. Keep TanStack Query and `useTableUrlState` unchanged.
2. Virtualize the rendering layer, not the entire state model.
3. Virtualize rows before columns.
4. Prefer predictable row heights.
5. Use a bounded scroll container rather than document scrolling.
6. Keep sticky header logic local to the virtualized component.
7. Measure first; do not add virtualization speculatively.

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

## State Modelling Rules
These are the article’s biggest ideas translated into this repo.

### Server state
Use TanStack Query. In both frontend apps, query clients are configured with:
- `staleTime: 0`
- retry for non-4xx failures
- persisted cache support via IndexedDB persisters

Build table UX around stale-while-revalidate rather than assuming every interaction starts from an empty screen.

### URL state
Use `useTableUrlState` for:
- page / limit
- sortBy / sortOrder
- search
- date ranges
- dynamic filter params

Do not fork a second URL-state abstraction for table pages unless the shared hook is demonstrably insufficient.

### Local interaction state
Keep this local and keyed by stable ids:
- selected row id
- open drawer/dialog state
- draft inline edits
- transient view mode toggles

Prefer storing ids rather than whole row objects unless a dialog intentionally edits a snapshot.

## Sorting, Filtering, and Saved Views

### Filtering
- Filters should serialize cleanly into URL params
- Search/filter changes should reset pagination to page 1
- Avoid mixing server filters with extra hidden client-only post-filters unless explicitly required

### Sorting
- Prefer server-side sorting for large datasets
- Keep sorting contract aligned with `sortBy` / `sortOrder`
- Default to single-sort unless product requirements clearly justify multi-sort

### Saved views
If the feature introduces saved views:
- keep the active view id separate from raw filter/sort state
- store a serializable payload that matches URL semantics
- keep direct-linkability intact
- do not bury the active effective state in opaque local component state

## Editing Flows

### Default interaction model
Prefer dialogs or side panels for create/update/delete and secondary actions.

This is lower risk and matches the repo’s current admin-table examples.

### Inline editing
Use inline cell editing only when all of these are true:
- the value is scalar and low-risk
- the mutation path is fast and deterministic
- failure recovery is straightforward
- the UX benefit is meaningfully higher than the focus/keyboard complexity

### Draft state
For inline editing, key drafts by stable row id and column id.

Example:

```ts
type CellDraftKey = `${string}:${string}`;
```

Do not create one giant mutable table-edit blob for routine CRUD views.

## Performance Rules
Apply these before adding clever optimizations.

### 1. Start from the shared table stack
Reuse `@eridu/ui` primitives before building a custom explorer shell.

### 2. Derive, do not synchronize copies
If something can be derived from props, URL state, or query data, derive it during render instead of syncing duplicate state with effects.

### 3. Memoize narrowly
Use `useMemo` / `useCallback` when there is a real reason:
- expensive computation on large data
- stable dependency required by a child optimization boundary
- action columns capturing handlers
- stable query-key references used outside the `queryKey` field itself

Do not blanket-memoize every handler or column array.

### 4. Keep hot render paths cheap
Avoid heavyweight work inside cell renderers:
- repeated parsing/formatting work
- large option generation
- mounting complex menus/popovers for every row up front
- nested controlled forms in hot cells

### 5. Preserve fetch-state UX
Differentiate:
- `isLoading`: initial load
- `isFetching`: background refresh / transition

The shared `DataTable` already surfaces a background fetching indicator. Keep that behavior instead of masking it.

## Backend Sync and Cache Rules

### Query invalidation
After successful mutations:
- invalidate the relevant list query key
- keep invalidation scoped to the feature when practical
- escalate to cache patching only when latency visibly matters and the patch is straightforward

### Persisted cache safety
Because both frontend apps use IndexedDB persisters, large table work must account for cached data reuse:
- do not leak persisted data across logout boundaries
- keep first-render-from-cache behavior understandable
- do not assume fresh network data has already arrived before the UI renders

## Accessibility and Interaction Rules
High-density tables become fragile quickly if accessibility is ignored.

- preserve semantic table markup unless virtualization forces another structure
- keep icon-only buttons labeled
- preserve visible focus states
- avoid focus loss during refetch, dialog transitions, or inline edits
- ensure empty/loading/error states are explicit
- keep sticky headers/toolbars from obscuring focus targets

If spreadsheet-like keyboard navigation is added, scope it to the table container and define a clear escape path.

## Anti-Patterns
Do not introduce these without explicit justification.

- custom ad hoc table state when `useTableUrlState` already fits
- fetching all rows just to page/filter/sort locally on large server-backed views (Exception: ad-hoc reporting views where immediate whole-dataset CSV export is a primary requirement, provided the rendering layer is properly virtualized).
- route files that mix query logic, dialogs, render code, and feature state into one monolith
- speculative virtualization without evidence of rendering cost
- blanket `useMemo` / `useCallback` use with no concrete benefit
- spreadsheet-style inline editing for routine CRUD screens
- storing drifting selected row objects when ids are sufficient
- bypassing shared `@eridu/ui` table primitives for cosmetic reasons alone

## Implementation Recipe
1. Identify the target workspace: `erify_studios`, `erify_creators`, or `@eridu/ui`.
2. Read `AGENTS.md` and the nearest local table route/hook/config.
3. Reuse the shared `DataTable` stack first.
4. Validate route search params.
5. Put table URL/query logic into a feature hook.
6. Keep columns/config separate from route composition.
7. Add dialogs/drawers before considering inline editing.
8. Measure before optimizing.
9. Add virtualization only when rendering is the real bottleneck.
10. Verify URL behavior, cache behavior, refresh behavior, and mutation invalidation.

## Verification Checklist
- [ ] Scope is correct for the target frontend workspace
- [ ] Route search params are validated where applicable
- [ ] URL state is owned by `useTableUrlState`
- [ ] Feature hook owns query/filter/refresh state
- [ ] Shared `DataTable` primitives are reused unless there is a justified exception
- [ ] Stable row ids are used where selection/editing depends on identity
- [ ] `isLoading` and `isFetching` are both handled correctly
- [ ] Mutation invalidation is scoped correctly
- [ ] Virtualization is isolated and justified if present
- [ ] Refresh controls follow repo accessibility rules
- [ ] Persisted-cache behavior is still safe across logout/session changes
- [ ] Route decomposition remains clean and maintainable

## Verification Commands
Run for the touched workspace and any changed shared package.

If changing `erify_studios`:

```bash
pnpm --filter erify_studios lint
pnpm --filter erify_studios typecheck
pnpm --filter erify_studios test
```

If changing `erify_creators`:

```bash
pnpm --filter erify_creators lint
pnpm --filter erify_creators typecheck
pnpm --filter erify_creators test
```

If changing shared table code in `@eridu/ui`:

```bash
pnpm --filter @eridu/ui lint
pnpm --filter @eridu/ui typecheck
pnpm --filter @eridu/ui test
```

If multiple workspaces were touched, verify each impacted dependent workspace as well.

## Related Skills
- `frontend-tech-stack`
- `frontend-ui-components`
- `frontend-state-management`
- `frontend-performance`
- `frontend-code-quality`
- `admin-list-pattern`
- `studio-list-pattern`
