---
name: table-view-pattern
description: Build shared server-driven tables, URL state, grids, editing, and saved views, not card-based Studio lists.
---

# Table View Pattern

Procedure for large tabular views in `erify_studios`, `erify_creators`, and `@eridu/ui`. Canonical principles, decision order, pagination gate, row-selection rules, and export contract live in [`knowledge/engineering/table-view-pattern`](../../../knowledge/engineering/table-view-pattern.md).

**Don't use for**: card-based studio lists → [`studio-list-pattern`](../studio-list-pattern/SKILL.md); admin tables → [`admin-list-pattern`](../admin-list-pattern/SKILL.md); operational-day review screens → [`operations-review-surface`](../operations-review-surface/SKILL.md).

## Procedure

1. Read the nearest existing table route in the target app and match its layout, toolbar density, and search/filter contract before inventing a variant.
2. Compose the shared primitives: `DataTable` + `DataTableToolbar` + `DataTablePagination` + `useTableUrlState` (`@eridu/ui`). No custom grid without a justified exception.
3. Split ownership: route = composition + `validateSearch`, feature hook = query + URL state + `setPageCount`, `*-columns.tsx` = render config.
4. Any row action column — including a single action — goes behind a `DataTableActions` dropdown in a `<feature>-actions-cell.tsx`, never a bare `Button`.
5. Consolidate two or more secondary filters into one responsive filter surface with an active count and reset; keep page size, refresh, and export outside it.
6. Walk the knowledge doc's § Pagination Review Gate and § Checklist before opening the PR.

## Verification

```bash
pnpm --filter <app> lint && pnpm --filter <app> typecheck && pnpm --filter <app> test && pnpm --filter <app> build
```

Also run the refactor-parity checks in [`.agents/workflows/verification.md`](../../workflows/verification.md#steps) — loading/empty/data states, route and search-param contracts, pagination stack parity.

## Canonical Knowledge

- [`knowledge/engineering/table-view-pattern`](../../../knowledge/engineering/table-view-pattern.md) — principles, decision order, pagination gate, selection eligibility, export contract, checklist
- [`references/table-view-details.md`](references/table-view-details.md) — code examples, virtualization, CRUD consistency, anti-patterns
