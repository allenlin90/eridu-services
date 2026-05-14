# Design: Compensation Line Items Phase 2.2 Breakdown

> **Status:** In progress — Tasks 1-5 merged to `master` (PR #59, #60, #62, #63, #64). Task 6 (shift workflow UI), Task 7 (shift cost cleanup), and the post-Task-5 expansion Tasks 8/9/10 are still ahead.
> **Scope:** Phase 4 Wave 2 compensation line items, scoped actuals, snapshot readiness, shift-cost cleanup, and the post-Task-5 expansion (assignment-compensation editability, actuals input UX, per-perspective cost review).
> **Product source:** [docs/prd/compensation-line-items.md](../../prd/compensation-line-items.md)
> **Implementation plan:** [docs/superpowers/plans/2026-05-09-compensation-line-items-phase-2-2.md](../plans/2026-05-09-compensation-line-items-phase-2-2.md) — task-by-task checklist, authoritative for execution order.
> **Backend design:** [apps/erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md](../../../apps/erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md)
> **Frontend design:** [apps/erify_studios/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md](../../../apps/erify_studios/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md)
> **Plan completeness audit:** This spec was audited per [`.agent/skills/plan-workflow-completeness/`](../../../.agent/skills/plan-workflow-completeness/SKILL.md) after Task 5 shipped, which surfaced the editability / actuals-input / per-perspective-review gaps now addressed by Tasks 8/9/10. Future revisions should re-run the audit before sign-off.

## Goal

Phase 2.2 lands as independent, value-producing PRs instead of one large integration PR. Each PR can merge to `master` when its workflow is complete, tested, and safe to deploy.

## Decisions

### Target-scoped studio workflows use a flat studio API

Studio users manage compensation line items from the target being adjusted: show, show creator assignment, shift, or shift block. The target explains why the line item exists, so normal studio workflows should not start from a generic line-item model page.

The backend route still treats compensation line items as the resource: `/studios/:studioId/compensation-line-items`. Studio create requests submit `target_type` and `target_id`; list requests can filter by those fields. This avoids deeply nested route families while preserving target-scoped UI workflows.

### System CRUD is support tooling

`/system/compensation-line-items` backed by `/admin/compensation-line-items` is useful for system admins who need cross-studio support, correction, or reconciliation. It is not the studio operator workflow.

### A future compensation workspace needs calculator context

A studio `compensation/line-items` or economics review workspace can be introduced with 2.3 when it is tied to calculator review, unresolved rows, or adjustment workflows. It should not ship in 2.2 as generic CRUD.

### No historical backfill

2.2 does not normalize existing `ShowCreator` rows. Calculators can calculate only when required facts exist after the feature starts working. Missing historical snapshots or actuals remain unresolved or pending in later read models.

### Shift cost columns are a separate cleanup

Dropping `StudioShift.projectedCost` (currently `Decimal NOT NULL`) and `StudioShift.calculatedCost` affects existing backend responses, frontend UI, and fixtures. That cleanup is intentionally isolated from the line-item and actuals workflows. Because `projectedCost` is `NOT NULL`, the cleanup PR removes every writer in the same change set; a partial PR cannot land first.

The cleanup preserves the admin shift table's monetary read by replacing the stored `Projected Cost` column with a backend-provided `Total Cost` column. That replacement value is live, not persisted: it is calculated from shift base labor plus active `STUDIO_SHIFT` and `STUDIO_SHIFT_BLOCK` line items and serialized as a money string for frontend display. The frontend does not calculate or sum the total locally.

### Actuals fold into existing update routes

Show actuals and shift-block actuals are added as optional fields on the existing `PATCH /studios/:studioId/shows/:showId` and shift-block update routes. There is no separate `/actuals` sub-resource. This keeps a single write path per resource and avoids two endpoints racing on the same row.

### Studio scope is required on attached targets

`CompensationLineItem.studioId` is `NOT NULL`. Targets whose owning studio cannot be resolved (currently: `Show.studioId IS NULL`, i.e. orphan / client-only shows) are rejected with `LINE_ITEM_TARGET_NOT_FOUND`. Client-only-show finance is intentionally out of scope; revisit only if a real product need lands.

### Snapshot audit shape is an array

`metadata.audit.snapshot_overrides` is an array of `{field, old_value, new_value, actor_ext_id, at, reason?}` entries with snake_case keys, in chronological order. This deviates from the single-object `metadata.audit.last_transition` pattern in `task.service.ts` because snapshot edits are rare and full history matters. Internal BigInt IDs are never written into `metadata`; `actor_ext_id` is the user's string ext id.

### Bulk creator assignment is assignment-only

`POST /studios/:studioId/shows/:showId/creators/bulk-assign` accepts `{ creator_id, note?, metadata? }` per creator and **does not** accept `agreed_rate`, `compensation_type`, `commission_rate`, or `override_reason`. Each show-creator assignment can carry different compensation terms; encoding them on a multi-show bulk write is the wrong place. New assignments resolve their compensation snapshot server-side from `StudioCreator` roster defaults; per-assignment edits (and per-creator bulk edits across a creator's shows) ship in Task 8 via a dedicated `PATCH` endpoint with snapshot-audit append. (Shipped in PR #64.)

### Per-show creator compensation summary is a tighter-guarded read endpoint

`GET /studios/:studioId/shows/:showId/creators/compensation-summary` is restricted to `STUDIO_ROLE.ADMIN` and `STUDIO_ROLE.MANAGER` — narrower than the surrounding creator-mapping endpoints, which include `TALENT_MANAGER`. Money totals are not part of talent-management read access; assignment lists are. Future per-creator and per-member summary endpoints (Tasks 8 and 10) follow the same ADMIN/MANAGER guard.

### HYBRID is unresolved like COMMISSION

The per-show compensation summary returns `total_amount: null` and `unresolved_reason: COMMISSION_REVENUE_NOT_AVAILABLE` for `HYBRID` rows, same as `COMMISSION`. The base portion is computable but the row total depends on commission revenue that 2.2 does not collect. Returning `agreedRate + adjustments` for `HYBRID` would mask the missing commission and silently understate cost. Unresolved rows do not contribute to the show total.

### Read views share one rendering pattern

Every cost-review read view ships with the same response shape and the same frontend rendering pattern: row-level `base_amount`, `adjustment_total`, `total_amount` (nullable), `unresolved_reason`, plus container-level `total_amount` and `unresolved_count`. Per-show creator summary (Task 5, shipped), per-creator summary (Task 8), and per-member shift summary (Task 10) all conform. Diverging shapes are a planning bug.

### Money input normalization happens at the form boundary

The frontend normalizes typed money strings via regex + BigInt rounding (half-away-from-zero on the cent boundary) rather than `Number.parseFloat().toFixed(2)`. `1.239` becomes `1.24`, not `1.23`. Cents carry into the whole part (`0.999` → `1.00`). This keeps the "no frontend money calculation" rule intact at the boundary — the value sent over the wire is a normalized decimal string the backend can parse losslessly into `Prisma.Decimal`.

## PR Breakdown

Task numbers here align with the implementation plan. PRs already merged are noted with their GitHub PR number.

| Task / PR | Name | Scope | Value | Status |
| --------- | ---- | ----- | ----- | ------ |
| 1 / PR 1A | Backend system CRUD foundation | Prisma model/enums, shared contracts, `/admin/compensation-line-items` CRUD/list | System admins can inspect and correct compensation line items across studios. | ✅ Merged (#59) |
| 2 / PR 1B | Frontend system CRUD | `/system/compensation-line-items` support UI | Support tooling is usable before studio workflow UIs ship. | ✅ Merged (#60) |
| 3 / PR 2 | Studio line-item APIs | Flat studio line-item collection with target create fields and list filters | Backend contracts match real studio workflows without over-nested URLs. | ✅ Merged (#62) |
| 4 / PR 3 | Actuals and snapshot readiness | Show actuals, shift-block actuals, snapshot audit helper | 2.3 can consume scoped actuals and snapshot audit facts. | ✅ Merged (#63) |
| 5 / PR 4 | Creator mapping compensation UX | Per-show creator mapping view, `SHOW_CREATOR` line items keyed by assignment UID, assignment-only bulk-assign, per-show compensation summary endpoint | Managers can review and adjust per-show creator compensation in the creator-mapping workflow. | ✅ Merged (#64) |
| 6 / PR 5 | Shift workflow UI | Shift and shift-block panels plus block actuals input | Operators can manage shift-side compensation inputs in context. | 🚧 Planned |
| 7 / cleanup | Shift cost columns | Remove stored shift cost columns across DB/API/FE and replace the shift table money column with backend-provided `Total Cost` | Stored live-reference totals leave operational rows while the table keeps a live total-cost read. | 🚧 Planned |
| 8 / PR 6 | Assignment-compensation edit + per-creator review | `PATCH` on `ShowCreator` assignment with snapshot audit, per-creator compensation summary endpoint, per-show edit panel, per-creator review view with bulk edit | Closes the editability gap so creator assignment terms match the shift-block workflow. | 🆕 Added post-Task-5 |
| 9 / PR 7 | Actuals input workflows | `ShowActualsInput` and `ShiftBlockActualsInput` on existing update mutations; optional manager collection view | Closes the input-surface gap that Tasks 5 and 6 scoped out; lets actuals get collected so the actuals-vs-planned fallback in 2.3 has data. | 🆕 Added post-Task-5 |
| 10 / PR 8 | Cost review by perspective | Per-member shift compensation summary endpoint + view; documented `actualStart/End → plannedStart/End` fallback contract with `ACTUALS_INCOMPLETE` for partial actuals | Closes the per-perspective read gap so managers can review costs from the operator side and the talent side (creator-side ships in Task 8). | 🆕 Added post-Task-5 |

## Interface Direction

Backend:

- `/admin/compensation-line-items` accepts explicit `studio_id`, `target_type`, and `target_id`.
- `/studios/:studioId/compensation-line-items` accepts `target_type` and `target_id` on create and supports target filters on list. The route `studioId` remains authoritative; clients cannot supply or override `studio_id`.
- Actuals are part of the existing `updateStudioShowInputSchema` and the existing block update schema, not standalone setter schemas.
- Studio line-item write access is restricted to `STUDIO_ROLE.ADMIN` and `STUDIO_ROLE.MANAGER`. `TALENT_MANAGER` may continue to read assignments but does not gain finance write access in 2.2.
- Snapshot audit append uses existing row `metadata`; no new audit table ships. The helper is `appendSnapshotAudit()` and is shared by every snapshot-edit path (creator assignment, shift hourly rate, etc.) so the audit format is consistent across entities.
- `POST /studios/:studioId/shows/:showId/creators/bulk-assign` is assignment-only. The compensation snapshot for a new assignment is resolved server-side from `StudioCreator` roster defaults. Roster defaults travel on the catalog and availability response shapes (`default_rate`, `default_rate_type`, `default_commission_rate`).
- `GET /studios/:studioId/shows/:showId/creators` returns `id` per row — the `ShowCreator` assignment UID — which is the required `target_id` for `SHOW_CREATOR` compensation line items.
- `GET /studios/:studioId/shows/:showId/creators/compensation-summary` is the read endpoint for per-show creator cost. Restricted to ADMIN/MANAGER. Future analogue endpoints (Task 8 per-creator, Task 10 per-member) share the same response shape.
- The per-show creator compensation summary marks any `HYBRID` or `COMMISSION` row as `unresolved_reason: COMMISSION_REVENUE_NOT_AVAILABLE` with `total_amount: null`; rows missing snapshot fields surface as `AGREEMENT_SNAPSHOT_MISSING`. Unresolved rows do not contribute to the container total.
- Editability of `ShowCreator` snapshot fields (`agreedRate`, `compensationType`, `commissionRate`, `note`) post-assignment lives on a separate `PATCH /studios/:studioId/shows/:showId/creators/:showCreatorId` endpoint (Task 8). Bulk-assign never grows compensation fields.
- The actuals-vs-planned-time fallback contract (Task 10): when both `actualStartTime` and `actualEndTime` are present, use them; when both are null, fall back to `startTime` / `endTime`; partial actuals (one side present, one side null) emit `unresolved_reason: ACTUALS_INCOMPLETE` and contribute `null` to the container total.

Frontend:

- `/system/compensation-line-items` is system-admin support tooling.
- Studio workflow UI mounts target-scoped panels in show and shift workflows; those panels call the flat studio collection with explicit target type and UID. `SHOW_CREATOR` line items always use the assignment UID, never the creator UID.
- Show actuals and block actuals UI piggyback on the existing show / shift-block update mutations; no parallel mutation is introduced.
- Money input normalization happens at the form boundary via regex + BigInt half-away-from-zero rounding, not `Number.parseFloat`. The wire payload is a normalized decimal string.
- Read views (per-show, per-creator, per-member) share one frontend rendering pattern — same row shape, same unresolved-reason copy, same container total. New views must conform.
- Future economics review screens consume backend read models and do not calculate money locally.

## Rollout Strategy

PR dependency order (task numbers align with the implementation plan):

```
Task 1 (PR 1A) ──┬──▶ Task 3 (PR 2) ──┬──▶ Task 5 (PR 4, merged)  ──┐
                 │                    ├──▶ Task 6 (PR 5)            │
                 └──▶ Task 2 (PR 1B)                                ├──▶ Task 8 (PR 6: assignment-comp edit + per-creator review)
Task 4 (PR 3) ────────────────────────┘                             ├──▶ Task 9 (PR 7: actuals input workflows)
                                                                    └──▶ Task 10 (PR 8: cost review by perspective)

Task 7 (cleanup PR) is independent of the above once consumers are updated in the same change set.
```

- Tasks 1 and 4 are independent of each other; both can land first. ✅ Both merged.
- Task 3 needs Task 1's model and contracts. ✅ Merged.
- Task 2 needs Task 1's admin endpoints. ✅ Merged.
- Task 5 / 6 need both Task 3 (line-item APIs) and Task 4 (actuals fields on the existing update DTOs). Task 5 ✅ merged; Task 6 pending.
- Task 8 needs Task 5 (per-show summary pattern + assignment UID exposure) and Task 4 (`appendSnapshotAudit()`). Sequenced after Task 6 so the editability pattern is consistent across creator and shift surfaces.
- Task 9 only needs Task 4. It is the input-surface counterpart that Tasks 5 and 6 deliberately scoped out.
- Task 10 needs Tasks 4 + 5 + 6 + 8 + 9 — it's the synthesizing read view that exercises everything below it.
- Merge each PR independently once its workflow is complete, tested, and safe to deploy.
- Include minimal contract-sync changes in a PR only when needed to keep the monorepo compiling.
- Group intentionally breaking shared-contract removals with affected consumers, especially the shift cost cleanup.
- Use PR descriptions for rollout evidence and manual smoke notes.
- Keep this spec and the implementation plan as the cross-session trace of the phase breakdown. Re-run the [plan-completeness audit](../../../.agent/workflows/plan-completeness-audit.md) whenever this breakdown changes.

## Non-goals

- No payment, settlement, freeze, approval, or grace workflow.
- No historical backfill or repair.
- No generated base-compensation line items.
- No generic studio-wide CRUD page in 2.2.
- No frontend money calculation. Form-boundary normalization (string padding + rounding) is not arithmetic.
- No revenue input. `HYBRID` and `COMMISSION` totals stay unresolved across all 2.2 read views until the post-Phase-4 revenue workflow ships.
- No `HOURLY` creator type. Creator pay is `FIXED` / `COMMISSION` / `HYBRID` and is not time-multiplied. Time-multiplied pay is operator-side only (`StudioShift.hourlyRate × shift-block duration`).
- No cross-studio reads outside `/admin/...`. Per-perspective summaries (per-show, per-creator, per-member) are all studio-scoped.
