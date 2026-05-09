# Design: Compensation Line Items Phase 2.2 Breakdown

> **Status:** Spec - implementation pending.
> **Scope:** Phase 4 Wave 2 compensation line items, scoped actuals, snapshot readiness, and shift-cost cleanup split.
> **Product source:** [docs/prd/compensation-line-items.md](../../prd/compensation-line-items.md)
> **Backend design:** [apps/erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md](../../../apps/erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md)
> **Frontend design:** [apps/erify_studios/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md](../../../apps/erify_studios/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md)

## Goal

Phase 2.2 lands as independent, value-producing PRs instead of one large integration PR. Each PR can merge to `master` when its workflow is complete, tested, and safe to deploy.

## Decisions

### Target-scoped studio workflows are primary

Studio users manage compensation line items from the target being adjusted: show, show creator assignment, shift, or shift block. The target explains why the line item exists, so normal studio workflows should not start from a generic line-item model page.

### System CRUD is support tooling

`/system/compensation-line-items` backed by `/admin/compensation-line-items` is useful for system admins who need cross-studio support, correction, or reconciliation. It is not the studio operator workflow.

### A future compensation workspace needs calculator context

A studio `compensation/line-items` or economics review workspace can be introduced with 2.3 when it is tied to calculator review, unresolved rows, or adjustment workflows. It should not ship in 2.2 as generic CRUD.

### No historical backfill

2.2 does not normalize existing `ShowCreator` rows. Calculators can calculate only when required facts exist after the feature starts working. Missing historical snapshots or actuals remain unresolved or pending in later read models.

### Shift cost columns are a separate cleanup

Dropping `StudioShift.projectedCost` and `StudioShift.calculatedCost` affects existing backend responses, frontend UI, and fixtures. That cleanup is intentionally isolated from the line-item and actuals workflows.

## PR Breakdown

| PR | Name | Scope | Value |
| -- | ---- | ----- | ----- |
| 1A | Backend system CRUD foundation | Prisma model/enums, shared contracts, `/admin/compensation-line-items` CRUD/list | System admins can inspect and correct compensation line items across studios. |
| 1B | Frontend system CRUD | `/system/compensation-line-items` support UI | Support tooling is usable before studio workflow UIs ship. |
| 2 | Studio target-scoped APIs | Contextual line-item endpoints for show, show creator assignment, shift, and shift block | Backend contracts match real studio workflows. |
| 3 | Actuals and snapshot readiness | Show actuals, shift-block actuals, future-only snapshot audit append | 2.3 can consume scoped actuals and snapshot audit facts. |
| 4 | Show workflow UI | Show and show-creator panels plus show actuals | Operators can manage show-side compensation inputs in context. |
| 5 | Shift workflow UI | Shift and shift-block panels plus block actuals | Operators can manage shift-side compensation inputs in context. |
| cleanup | Shift cost columns | Remove stored shift cost columns across DB/API/FE | Stored live-reference totals leave operational rows. |

## Interface Direction

Backend:

- `/admin/compensation-line-items` accepts explicit `studio_id`, `target_type`, and `target_uid`.
- Studio routes infer the target from the route and do not ask the client to select a target on create.
- Actuals mutations are resource-specific: `setShowActualsInputSchema` and `setStudioShiftBlockActualsInputSchema`.
- Snapshot audit append uses existing row `metadata`; no new audit table ships.

Frontend:

- `/system/compensation-line-items` is system-admin support tooling.
- Studio workflow UI mounts target-scoped panels in show and shift workflows.
- Future economics review screens consume backend read models and do not calculate money locally.

## Rollout Strategy

- Merge each PR independently when it has isolated product value and verification.
- Include minimal contract-sync changes in a PR only when needed to keep the monorepo compiling.
- Group intentionally breaking shared-contract removals with affected consumers, especially the shift cost cleanup.
- Use PR descriptions for rollout evidence and manual smoke notes.
- Keep this spec and the implementation plan as the cross-session trace of the phase breakdown.

## Non-goals

- No payment, settlement, freeze, approval, or grace workflow.
- No historical backfill or repair.
- No generated base-compensation line items.
- No generic studio-wide CRUD page in 2.2.
- No frontend money calculation.
