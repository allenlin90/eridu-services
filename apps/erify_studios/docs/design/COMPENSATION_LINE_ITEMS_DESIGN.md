# Compensation Line Items Frontend Design

> **Status**: Planning
> **Phase scope**: Phase 4 post-Wave 1
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
> **Depends on**: Backend compensation APIs 🔲, sidebar navigation update 🔲

## Purpose

Define the operator-facing UI for manual compensation adjustments and the read-only breakdown surfaces for members and creators.

## Route Plan

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/compensation` | Main line-item management page | `ADMIN`, `MANAGER` |
| `/studios/$studioId/members` | Inline member compensation summaries | existing member-roster roles |
| `/studios/$studioId/creators` | Inline creator compensation summaries | existing creator-roster roles |

## Data / Query Plan

- Query key family: `compensation-items`.
- Filters live in URL state: target type, show, schedule, date range.
- Mutations invalidate list/detail and roster summary queries.
- FE treats `line_item_cost` and `resolved_total_cost` as separate fields; it must not invent totals when the backend marks creator base cost unresolved.

## Component Plan

- Management route container with filter bar + table.
- Create/edit dialog for line items.
- Delete confirmation dialog.
- Inline summary cards/sections in member and creator roster views.

## Navigation / Access

- Add `compensation` to the shared route-access policy.
- Sidebar/home placement should be handled in the sidebar redesign design doc rather than duplicated in feature-specific route code.

## UX Rules

- Keep line-item scope explicit in the UI (`Show`, `Schedule`, `Standing`).
- Show unresolved creator totals as a partial-cost state, not a zero amount.
- Manager is read-only throughout the compensation surface.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke: create/edit/delete, scope filtering, member summary, creator partial-cost display

