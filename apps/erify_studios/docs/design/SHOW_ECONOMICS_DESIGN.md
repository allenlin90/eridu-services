# Show Economics Frontend Design

> **Status**: Deferred planning target
> **Phase scope**: Phase 4 Wave 2/3
> **Owner app**: `apps/erify_studios`
> **Product source**: archived branch reference [`docs/features/show-economics.md`](../../../../docs/features/show-economics.md)
> **Depends on**: revised economics endpoints merged to `master` ⏸️

## Purpose

Define the studio-facing economics UI that consumes the deferred backend economics baseline once that contract is revised and merged to `master`.

## Route Plan

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/economics` | Grouped economics summary (`show`, `schedule`, `client`) | `ADMIN`, `MANAGER` |
| `/studios/$studioId/shows/$showId` | Show-level economics drill-in | `ADMIN`, `MANAGER` |

## Data / Query Plan

- Reuse a dedicated `economics` query-key family scoped by studio, route, and grouping params.
- Keep grouped filters in the URL (`group_by`, date range, client/status filters once defined).
- Preserve backend nullability: unresolved commission/hybrid creator totals remain `null`, not zero.
- Display show-scoped compensation line items through the economics response rather than duplicating FE-side aggregation logic.

## UI Plan

- Grouped economics page: summary cards + grouped table + filters.
- Show detail drill-in: creator breakdown, shift labor breakdown, line-item breakdown, null-state explanation for unresolved commission/hybrid paths.
- Finance formatting must be consistent across cards, tables, and exports.

## UX Rules

- Loading and error states must be explicit for all economics panels.
- Preview/null revenue states need explanatory copy, not blank cells only.
- FE must not reproduce finance formulas or line-item allocation logic locally.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke: grouped filters, show drill-in, null commission states, cost formatting
