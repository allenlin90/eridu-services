# Studio Economics Review Backend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/studio-economics-review.md`](../../../../docs/prd/studio-economics-review.md)
> **Depends on**: Show economics baseline revision/merge ⏸️, compensation line items 🔲, studio show ownership/read paths 🔲

## Purpose

Define the backend contract for the studio-facing economics review workflow that separates future projected cost from past actualized cost across a required date range.

## API Plan

| Endpoint | Purpose |
| --- | --- |
| `GET /studios/:studioId/economics` | Grouped review by `show`, `schedule`, or `client` with horizon-aware cost semantics |
| `GET /studios/:studioId/shows/:showUid/economics` | Show drill-in plus assignment-side preview card source |

## Query Contract

- Required: `date_from`, `date_to`, `horizon`, `group_by`
- Optional: `client_uid`, `status`, `standard`
- `horizon`: `future | past | all`
- Keep the initial date-span cap aligned with planning export unless later performance work proves a wider default is safe

## Response Semantics

- Expose `projected_total_cost` for future / in-flight review.
- Expose `actual_total_cost` for past / completed review when the occurred cost basis is known.
- Expose a route-friendly `primary_total_cost` selected by the requested horizon.
- Expose `cost_state` and optional `unresolved_reason` so FE can explain `PARTIAL_ACTUAL` and `UNRESOLVED` rows without guessing.
- Preserve existing nullability rules for unresolved `COMMISSION` / `HYBRID` creator base cost.

## Calculation Rules

- **Projected** means current persisted projection from:
  - `ShowCreator.agreedRate` → `StudioCreator.defaultRate`
  - creator compensation type precedence
  - shift projected cost inputs
  - applicable show-scoped compensation line items already recorded
- **Actual** means current occurred cost basis from:
  - member shift cost `calculatedCost ?? projectedCost`
  - creator base cost when resolvable under the current model
  - applicable show-scoped compensation line items
- Schedule-scoped and standing/global line items keep the same inclusion rules defined in compensation-line-items design; do not invent new allocation rules here.
- Phase 4 does **not** persist a frozen "planned at assignment time" snapshot. Do not expose fake variance fields that imply historical budget locking.

## Service / Repository Shape

- Reuse shared economics calculators between grouped review and show drill-in.
- Keep the horizon selection and cost-state shaping in the economics domain layer, not controllers.
- Query helpers should return lean slices for shows, assignments, shifts, and line-item aggregates only.
- Build grouped review so planning export can consume the same future-horizon contract instead of re-implementing cost semantics.

## Revenue Extension Boundary

- Revenue workflow later adds contribution margin and resolves commission/hybrid creator cost paths.
- Until then, grouped review must keep unresolved shows explicit and exclude unknown amounts from derived totals rather than treating them as zero.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke: future horizon, past horizon, mixed grouped rows, partial actuals, assignment-preview refresh source
