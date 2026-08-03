# List and Table View Pattern

Procedure for every list surface in `erify_studios`, `erify_creators`, `@eridu/ui`, and the `erify_api` endpoints that back them. Canonical principles, the three surface stacks, decision order, pagination gate, row-selection rules, and export contract live in [`knowledge/engineering/table-view-pattern`](../../../../knowledge/engineering/table-view-pattern.md).

**Don't use for**: operational-day review screens → [`operations-review-surface`](../../operations-review-surface/SKILL.md).

## Select The Surface

| Surface | Pagination | Read |
| --- | --- | --- |
| Studio or creator data table | Server `page`/`limit` via `useTableUrlState` | § Standard Table Pattern |
| Erify Admin table (`/system/*`) | Server `page`/`limit`, `@AdminPaginatedResponse` | § Admin Table Stack — includes the backend DTO → repository → service → controller chain |
| Card grid with infinite scroll | Offset `useInfiniteQuery` + sentinel | § Card Infinite-Scroll Lists |

All three share `useTableUrlState` for URL state. Do not invent a fourth stack.

## Procedure

1. Read the nearest existing list route of the same surface kind in the target app and match its layout, toolbar density, and search/filter contract before inventing a variant.
2. Compose the shared primitives: `DataTable` + `DataTableToolbar` + `DataTablePagination` + `useTableUrlState` (`@eridu/ui`) for tables, `ResponsiveCardGrid` + `useInfiniteScroll` for card grids. No custom grid without a justified exception.
3. Split ownership: route = composition + `validateSearch`, feature hook = query + URL state + `setPageCount`, `*-columns.tsx` = render config.
4. Any row action column — including a single action — goes behind a `DataTableActions` dropdown in a `<feature>-actions-cell.tsx`, never a bare `Button`.
5. Consolidate two or more secondary filters into one responsive filter surface with an active count and reset; keep page size, refresh, and export outside it.
6. For an admin table, build the backend chain in the same change: query DTO → repository `where` → pass-through service → `@AdminPaginatedResponse` controller (§ Admin Table Stack).
7. For a card grid, handle every state — loading, error, empty, fetching-next — and compact the infinite cache to page 1 on unmount (§ Card Infinite-Scroll Lists).
8. Walk the knowledge doc's § Pagination Review Gate and § Checklist before opening the PR.

## Verification

```bash
pnpm --filter <app> lint && pnpm --filter <app> typecheck && pnpm --filter <app> test && pnpm --filter <app> build
```

Admin table work also verifies `erify_api`. Also run the refactor-parity checks in [`.agents/workflows/verification.md`](../../../workflows/verification.md#steps) — loading/empty/data states, route and search-param contracts, pagination stack parity.

## Canonical Knowledge

- [`knowledge/engineering/table-view-pattern`](../../../../knowledge/engineering/table-view-pattern.md) — principles, the three surface stacks, decision order, pagination gate, selection eligibility, export contract, checklist
- [`table-view-details.md`](table-view-details.md) — code examples, virtualization, CRUD consistency, anti-patterns
- [`studio-list-examples.md`](studio-list-examples.md) — card infinite-scroll hook, toolbar, and cache-helper code
