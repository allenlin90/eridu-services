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

Dropping `StudioShift.projectedCost` (currently `Decimal NOT NULL`) and `StudioShift.calculatedCost` affects existing backend responses, frontend UI, and fixtures. That cleanup is intentionally isolated from the line-item and actuals workflows. Because `projectedCost` is `NOT NULL`, the cleanup PR removes every writer in the same change set; a partial PR cannot land first.

### Actuals fold into existing update routes

Show actuals and shift-block actuals are added as optional fields on the existing `PATCH /studios/:studioId/shows/:showId` and shift-block update routes. There is no separate `/actuals` sub-resource. This keeps a single write path per resource and avoids two endpoints racing on the same row.

### Studio scope is required on attached targets

`CompensationLineItem.studioId` is `NOT NULL`. Targets whose owning studio cannot be resolved (currently: `Show.studioId IS NULL`, i.e. orphan / client-only shows) are rejected with `LINE_ITEM_TARGET_NOT_FOUND`. Client-only-show finance is intentionally out of scope; revisit only if a real product need lands.

### Snapshot audit shape is an array

`metadata.audit.snapshot_overrides` is an array of `{field, old_value, new_value, actor_ext_id, at, reason?}` entries with snake_case keys, in chronological order. This deviates from the single-object `metadata.audit.last_transition` pattern in `task.service.ts` because snapshot edits are rare and full history matters. Internal BigInt IDs are never written into `metadata`; `actor_ext_id` is the user's string ext id.

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
- Actuals are part of the existing `updateStudioShowInputSchema` and the existing block update schema, not standalone setter schemas.
- Studio target-scoped line-item write access is restricted to `STUDIO_ROLE.ADMIN` and `STUDIO_ROLE.MANAGER`. `TALENT_MANAGER` may continue to read assignments but does not gain finance write access in 2.2.
- Snapshot audit append uses existing row `metadata`; no new audit table ships.

Frontend:

- `/system/compensation-line-items` is system-admin support tooling.
- Studio workflow UI mounts target-scoped panels in show and shift workflows.
- Show actuals and block actuals UI piggyback on the existing show / shift-block update mutations; no parallel mutation is introduced.
- Future economics review screens consume backend read models and do not calculate money locally.

## Rollout Strategy

PR dependency order:

```
PR 1A ──┬──▶  PR 2  ──┬──▶  PR 4 (also depends on PR 3)
        │             └──▶  PR 5 (also depends on PR 3)
        └──▶  PR 1B
PR 3 ─────────────────┘ (PR 4/5 require PR 3 for actuals fields on the existing update DTOs)
cleanup PR is independent of all of the above.
```

- PR 1A and PR 3 are independent of each other; both can land first.
- PR 2 needs PR 1A's model and contracts.
- PR 1B needs PR 1A's admin endpoints.
- PR 4/5 need both PR 2 (line-item APIs) and PR 3 (actuals fields on the existing update DTOs).
- Merge each PR independently once its workflow is complete, tested, and safe to deploy.
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
