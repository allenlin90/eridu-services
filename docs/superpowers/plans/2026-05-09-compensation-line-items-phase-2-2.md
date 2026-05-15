# Compensation Line Items Phase 2.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Before starting any task** (and before sign-off on any new task added here), run the workflow at [`.agent/workflows/plan-completeness-audit.md`](../../../.agent/workflows/plan-completeness-audit.md) against the latest scope. The five-invariant check in [`.agent/skills/plan-workflow-completeness/`](../../../.agent/skills/plan-workflow-completeness/SKILL.md) keeps actor surfaces, snapshot edit paths, read views, and symmetry gaps represented in Tasks 8/9/10/11.

**Goal:** Implement Compensation Line Items + Actuals 2.2 as independent, reviewable PRs that can merge to `master` separately.

**Architecture:** The backend owns persistence, UID scoping, Decimal serialization, target resolution, and future economics inputs. The frontend owns target-scoped input workflows and system-admin support tooling. Calculated money comes from later backend economics read models, not frontend arithmetic or stored operational-row totals.

**Tech Stack:** Prisma, NestJS, `@eridu/api-types`, TanStack Query/Router, `@eridu/ui`, Vitest/Jest.

**Spec:** `docs/superpowers/specs/2026-05-09-compensation-line-items-phase-2-2-breakdown.md`.

**PR dependency order:**

```
Task 1 (PR 1A backend system CRUD)  ──┬──▶  Task 3 (PR 2 studio line-item APIs)  ──┬──▶  Task 5 (PR 4 creator mapping compensation UX) ✅
                                      │                                          ├──▶  Task 6 (PR 5 shift workflow UI) ✅
                                      └──▶  Task 2 (PR 1B FE system UI)
Task 4 (PR 3 actuals + snapshot)  ────────────────────────────────────────────────┴──▶  Task 5/6/8/9 also depend on this

Task 7 (cleanup PR) is the next independent PR; it may land once the stored shift-cost fields and every consumer are removed in the same change set.

Remaining sequence:
  Task 8  (ShowCreator assignment compensation edit + creator-based compensation review)
  Task 9  (Show actuals input + missing-actuals collection view — block actuals already shipped in Task 6)
  Task 10 (Cost review by perspective — per-member shifts, per-creator shows)
  Task 11 (Recipient escalation affordance + roster default edit warning UX)
```

Tasks 1 and 4 were independent; Tasks 1-6 are merged. Task 7 is the next cleanup PR. Tasks 8/9/10/11 close the editability, input, review, and recipient-loop gaps.

**Status:** Tasks 1 ✅ (PR #59), 2 ✅ (PR #60), 3 ✅ (PR #62), 4 ✅ (PR #63), 5 ✅ (PR #64), and 6 ✅ (PR #65) are merged. Block actuals input shipped in Task 6, so Task 9 is scoped to **show actuals only** plus the missing-actuals collection view. Task 7 is ready to process as the next cleanup PR.

### Remaining Workflow Coverage

Task 5 deliberately kept bulk mapping and the per-show creator mapping view assignment-only — the `ShowCreator` base snapshot (`agreedRate`, `compensationType`, `commissionRate`) is populated from `StudioCreator` roster defaults and is not editable from the per-show UI. That mirrors the v1 product for creator mapping, but it is **not** aligned with the shift-block workflow, where a manager sets explicit `hourlyRate` and per-shift terms at assignment time. The plan now expands to close four gaps:

1. **Assignment-compensation editability for creators** (Task 8). A manager must be able to override `agreedRate` / `compensationType` / `commissionRate` for one `ShowCreator` assignment without going through the bulk-assign endpoint — both from the per-show creator mapping view (after assignment) and from a new per-creator review view that lists one creator's shows over a date range.
2. **Show actuals input UX** (Task 9). Task 4 added `Show.actualStartTime` / `actualEndTime` columns; Task 6 already shipped the block-actuals input (`ShiftBlockActualsInput`). Task 9 now closes the remaining show-side input gap and adds a missing-actuals collection view for managers.
3. **Cost review by perspective** (Task 10). The per-show creator compensation summary added in Task 5 is the only cost read model in 2.2. Managers also need to review costs from the operator side (one member's shifts over a date range) and from the talent side (one creator's shows over a date range). These read models are 2.2-scoped because they only aggregate the snapshots and line items 2.2 already persists; calculator-driven economics still ship with 2.3.
4. **Recipient escalation + roster default warning UX** (Task 11). Closes the recipient-side pending-state loop with an in-product "Flag missing actuals" affordance (consumed by the manager collection view from Task 9), and ships the missing inline notice on roster edit dialogs that existing assignment snapshots are not retroactively rewritten.

Each expansion task remains assignment-only on the bulk endpoint (no regression of the Task 5 boundary). Money totals always come from backend read models, never from frontend arithmetic.

### Locked Phase 4 Constraints (from PRD realignment)

The plan honors three product/legal constraints locked in the realigned 2.1 cost-model PRD:

- **No `HOURLY` creator type.** Creator pay is `FIXED` / `COMMISSION` / `HYBRID` only; `FIXED_BASE` is a flat per-show amount that does not multiply by show duration. This is a legal-compliance product decision, not a Phase 4 deferral. No task in this plan or any sibling adds `HOURLY` to `CREATOR_COMPENSATION_TYPE`.
- **Show actuals are the only creator-attendance source.** All creators on a show inherit the show's actual window; no `ShowCreator.actualStartTime/EndTime` columns or UI ship in Phase 4. The cost model documents `ShowCreator` and `ShowPlatform` as extension points so the calculator can later prefer narrower actuals without breaking the public row shape, but those fields are dormant in Phase 4.
- **Actuals are typed by `ADMIN`/`MANAGER`.** The `actuals_source: OPERATOR_RECORD` label means "typed into the system by an authorized user," not "the operator who was on set." When/if a creator-app or operator-app self-record source ships, the enum's `CREATOR_APP` / `PUNCH_CLOCK` categories cover it without restructuring.

---

## File Structure

| Area | Files | Responsibility |
| ---- | ----- | -------------- |
| Product/design docs | `docs/prd/compensation-line-items.md`, app design docs | Keep product and technical scope aligned. |
| Shared contracts | `packages/api-types/src/compensation-line-items/`, `packages/api-types/src/shows/`, `packages/api-types/src/studio-shifts/` | Zod contracts and inferred types for backend/frontend. |
| Backend model | `apps/erify_api/src/models/compensation-line-item/` | Model service, repository, target resolver, DTO transforms. |
| Backend admin API | `apps/erify_api/src/admin/compensation-line-items/` | System-admin CRUD/list. |
| Backend studio APIs | `apps/erify_api/src/studios/studio-compensation-line-item/`, existing show/shift studio modules | Flat studio line-item collection plus target-scoped actuals. |
| Backend audit helper | `apps/erify_api/src/lib/audit/snapshot-audit.helper.ts` | Pure metadata append helper for snapshot overrides. |
| Frontend line items | `apps/erify_studios/src/features/compensation-line-items/` | API hooks, table, form, target-scoped panel. |
| Frontend system route | `apps/erify_studios/src/routes/system/compensation-line-items/index.tsx` | System-admin support page. |
| Frontend finance inputs | `apps/erify_studios/src/components/finance/` | Actuals inputs and snapshot warning dialog. |
| Shift cleanup | `apps/erify_api/src/models/studio-shift/`, `apps/erify_api/src/orchestration/shift-calendar/`, `packages/api-types/src/studio-shifts/`, `apps/erify_studios/src/features/studio-shifts/` | Remove stored shift cost columns and UI assumptions. |

## Task 1: Backend system CRUD foundation

**Files:**
- Create: `packages/api-types/src/compensation-line-items/`
- Modify: `packages/api-types/src/index.ts` only if the package uses a root barrel for new resources.
- Modify: `apps/erify_api/prisma/schema.prisma`
- Create: `apps/erify_api/src/models/compensation-line-item/`
- Create: `apps/erify_api/src/admin/compensation-line-items/`
- Test: backend model/service/controller specs for admin CRUD.

- [x] Add shared contracts for item type, target type, admin create input, update input, list query, response, and paginated response.
- [x] Generate a Prisma migration for `CompensationLineItem`, the strict-1:1 polymorphism-only side table `CompensationLineItemTarget`, and the two enums using Prisma tooling. `targetType` is a Prisma enum (`CompensationLineItemTargetType`), not a `String` like `TaskTarget.targetType`. The target row uses `lineItemId` as PK and inherits its lifecycle from the parent (no own `deletedAt`), so soft-delete and queries always go through `CompensationLineItem`.
- [x] Implement the model repository/service with soft-delete, UID generation (prefix `cli`, consistent with `ssh`/`ssb`/`smc`/`tgt`), Decimal string serialization, and target immutability.
- [x] Implement `LineItemTargetResolver` with studio ownership checks. Target traversal:
  - `SHOW` → `Show.studioId`; reject when `studioId IS NULL` (orphan / client-only show) with `LINE_ITEM_TARGET_NOT_FOUND`.
  - `SHOW_CREATOR` → `ShowCreator → Show.studioId`; same orphan rule.
  - `STUDIO_SHIFT` → `StudioShift.studioId` (NOT NULL).
  - `STUDIO_SHIFT_BLOCK` → `StudioShiftBlock → StudioShift.studioId`.
- [x] Implement `/admin/compensation-line-items` CRUD/list using admin controller patterns and `@CurrentUser` actor resolution.
- [x] Test every target type, missing/cross-studio target rejection, orphan-show rejection, signed decimal round-trip, reason validation, update, and soft delete.
- [x] Verify with `pnpm --filter erify_api db:validate`, `db:generate`, `lint`, `typecheck`, `test`, and `build`.
- [x] Commit with a backend-scoped message. **Shipped in PR #59.**

## Task 2: Frontend system support UI

**Files:**
- Create: `apps/erify_studios/src/features/compensation-line-items/`
- Create: `apps/erify_studios/src/routes/system/compensation-line-items/index.tsx`
- Modify: system navigation config if required by the existing route/sidebar pattern.
- Test: route/component tests for support CRUD.

- [x] Add typed API hooks and query keys for admin line-item list, create, update, and delete.
- [x] Build the system support table with filters for studio, target type, target UID, item type, created date range, creator, and deleted-row visibility if available.
- [x] Build create/edit dialogs where target is selectable only for system admin support tooling.
- [x] Reuse shared pagination and `placeholderData: keepPreviousData`.
- [x] Test filter state, create/update/delete invalidation, and signed amount rendering.
- [x] Verify with `pnpm --filter erify_studios lint`, `typecheck`, `test`, and `build`.
- [x] Commit with a frontend system-support message. **Shipped in PR #60.**

## Task 3: Studio line-item APIs

**Files:**
- Modify: shared compensation-line-item contracts to add studio-scoped create and list inputs if they are not already present.
- Create/modify: `apps/erify_api/src/studios/studio-compensation-line-item/`
- Test: contextual controller/service specs.

- [x] Add `GET` / `POST` / `PATCH` / `DELETE` under `/studios/:studioId/compensation-line-items`.
- [x] Accept `target_type` and `target_id` on studio create; reject any client body/query attempt to supply `studio_id`.
- [x] Support list filters for `target_type`, `target_id`, `item_type`, created date range, pagination, and deleted-row visibility if exposed.
- [x] Scope create/list/update/delete by the route `studioId`; update/delete address the line-item resource by `lineItemId`.
- [x] Test target create/list filters plus studio-scoped update/delete not-found behavior.
- [x] Verify backend lint, typecheck, tests, and build.
- [x] Commit with a studio API message. **Shipped in PR #62.**

## Task 4: Actuals and snapshot readiness

**Files:**
- Modify: `apps/erify_api/prisma/schema.prisma`
- Modify: `packages/api-types/src/shows/` — extend `updateStudioShowInputSchema` with optional `actual_start_time` / `actual_end_time` (nullable to clear).
- Modify: `packages/api-types/src/studio-shifts/` — extend the existing block update schema with the same two fields.
- Modify: `apps/erify_api/src/studios/studio-show/` — `PATCH /studios/:studioId/shows/:showId` accepts the new fields and runs the inverted-range check on the post-update state.
- Modify: `apps/erify_api/src/studios/studio-shift/` — block update endpoint accepts the new fields. If a dedicated block update endpoint does not yet exist, introduce it as a normal block update route with the actuals fields included.
- Modify: `apps/erify_api/src/show-orchestration/show-orchestration.service.ts`
- Create: `apps/erify_api/src/lib/audit/snapshot-audit.helper.ts`
- Test: actuals and snapshot audit specs.

- [x] Generate a Prisma migration adding `Show.actualStartTime`/`actualEndTime` and `StudioShiftBlock.actualStartTime`/`actualEndTime`. Time-zone semantics match the existing `startTime`/`endTime` columns.
- [x] Extend the existing show and block update DTOs to accept actuals fields. Do **not** add a separate `/actuals` sub-resource.
- [x] Inverted-range validation runs against the post-update state (a partial PATCH may set only one side; do not reject a one-sided write when the other side is null).
- [x] Implement `appendSnapshotAudit()` as a pure helper. Output shape: append one entry per changed snapshot field to `metadata.audit.snapshot_overrides[]` with snake_case keys `{field, old_value, new_value, actor_ext_id, at, reason?}`. Decimal fields use `Prisma.Decimal.equals()` for diffing; `old_value`/`new_value` are serialized as decimal strings (or `null` when cleared). `actor_ext_id` is a string ext id, never an internal BigInt.
- [x] Wire future snapshot edits in the existing show-creator assignment update path and the existing shift update path to call `appendSnapshotAudit()` for changed `ShowCreator.{agreedRate, compensationType, commissionRate}` and `StudioShift.hourlyRate`.
- [x] Persist resolvable future ShowCreator assignment snapshots; mark unresolved new writes when required defaults are unavailable.
- [x] Do not add a backfill script.
- [x] Test set/clear/inverted actuals (including one-sided PATCH), snapshot audit append/no-append (including a no-op same-Decimal edit), override reason, and unresolved new-write metadata. Test that internal BigInt IDs never appear in `metadata`.
- [x] Verify backend lint, typecheck, tests, and build.
- [x] Commit with an actuals/snapshot-readiness message. **Shipped in PR #63.**

## Task 5: Creator mapping compensation UX

**Depends on:** Task 3 (studio line-item APIs) and the Task 4 snapshot/default-readiness work for future assignment writes. This task does **not** implement show actuals, `SHOW` line-item UI, task line-item UI, shift UI, shift-block UI, or shift-block compensation.

**Routes:**
- Bulk mapping: `/studios/$studioId/creator-mapping`
- Per-show creator mapping: `/studios/$studioId/creator-mapping/$showId`

**Files:**
- Modify/create creator mapping components under `apps/erify_studios/src/features/studio-show-creators/`.
- Reuse: `apps/erify_studios/src/features/compensation-line-items/`
- Modify: `packages/api-types/src/studio-creators/` for assignment UID, roster defaults, assignment payloads, and summary response.
- Modify: `apps/erify_api/src/studios/studio-show/`, `apps/erify_api/src/show-orchestration/`, creator lookup schemas/repositories.
- Test: creator mapping component tests and backend creator assignment/summary tests.

- [x] Revise this plan plus `docs/prd/compensation-line-items.md` and frontend/backend design docs before implementation so Task 5 scope is explicit.
- [x] Extend creator catalog/availability lookup responses with roster defaults (`default_rate`, `default_rate_type`, `default_commission_rate`) so backend assignment snapshots and later compensation review views can reference defaults.
- [x] Add `id` to `StudioShowCreatorListItem`; it is the `ShowCreator` assignment UID and is the required `SHOW_CREATOR` `target_id`.
- [x] Keep bulk mapping assignment-only: submit selected creator IDs for selected shows, with no rate, commission, compensation item, or total-cost controls.
- [x] Ensure bulk assignment does not auto-create initial compensation line items from assignment payloads.
- [x] In `/creator-mapping/$showId`, add a compensation drawer/dialog per assigned MC row.
- [x] Show assignment base compensation from the `ShowCreator` snapshot plus `SHOW_CREATOR` adjustment items.
- [x] Add a backend-calculated creator compensation summary endpoint/response for the per-show creator mapping view. Frontend renders returned totals only.
- [x] Allow create/update/delete of `SHOW_CREATOR` compensation items with `target_type=SHOW_CREATOR` and `target_id=<showCreatorAssignmentUid>`.
- [x] Widen the compensation dialog desktop layout so amount/type/reason inputs do not collapse into a cramped three-field row.
- [x] Add a design note: broader costs review does not belong in bulk assignment; Task 8's creator-based date-range review reuses the creator mapping calculation/read model and provides bulk compensation edits for one creator's shows.
- [x] Test bulk/add dialogs do not expose compensation fields, assignment UID usage, line-item management, and total rendering.
- [x] Test backend assignment creation ignores initial compensation line-item payloads and summary calculation comes from assignment snapshots plus line items.
- [x] Verify frontend lint, typecheck, tests, and build.
- [x] Verify backend lint, typecheck, tests, and build.
- [x] Commit with a creator-mapping-compensation message. **Shipped in PR #64.**

## Task 6: Shift workflow UI

**Depends on:** Task 3 (studio line-item APIs) and Task 4 (block actuals fields on the existing block update route).

**Files:**
- Modify/create shift workflow components under `apps/erify_studios/src/features/studio-shifts/`.
- Reuse: `apps/erify_studios/src/features/compensation-line-items/`
- Create/modify: `apps/erify_studios/src/components/finance/ShiftBlockActualsInput.tsx`
- Test: shift workflow component tests.

- [x] Mount target-scoped line-item panels for shift and shift-block contexts.
- [x] Add shift-block actuals fields to the existing block update form; submit goes through the existing block update mutation (no new mutation).
- [x] Add snapshot warning dialog to `hourly_rate` edits.
- [x] Invalidate target list and parent shift queries after mutations.
- [x] Test create/update/delete line items without target picker, block actuals validation, and snapshot warning confirm/cancel.
- [x] Verify frontend lint, typecheck, tests, and build.
- [x] Commit with a shift-workflow message. **Shipped in PR #65.**

## Task 7: Shift DB cost-column cleanup and FE total-cost table column

**Files:**
- Modify: `apps/erify_api/prisma/schema.prisma`
- Modify: `apps/erify_api/src/models/studio-shift/`
- Modify: `apps/erify_api/src/orchestration/shift-calendar/`
- Modify: `packages/api-types/src/studio-shifts/`
- Modify: `apps/erify_studios/src/features/studio-shifts/`
- Test: backend and frontend shift specs/fixtures.

> **Two separate concepts:** this task drops two persisted database columns from the `StudioShift` table: `projected_cost` (`StudioShift.projectedCost`) and `calculated_cost` (`StudioShift.calculatedCost`). Separately, the `erify_studios` frontend shift table gains a display-only `Total Cost` table column backed by a live backend response field. The FE table column is not a replacement database column.
>
> **Why this is one PR, not several:** `StudioShift.projectedCost` is currently `Decimal NOT NULL`. Dropping the DB column requires removing every writer in the same change set, otherwise shift creation fails between the two PRs. Use `rg 'projectedCost|calculatedCost|projected_cost|calculated_cost'` to find the current touchpoints.
>
> **Frontend table column:** the admin shift table keeps a monetary display column, but the FE column changes from stored `Projected Cost` to backend-provided `Total Cost`. The value must come from a live backend read/calculator path and include shift base labor plus active `STUDIO_SHIFT` and `STUDIO_SHIFT_BLOCK` line items for that shift. The frontend renders the returned `total_cost` string only; it does not sum money locally.

- [ ] Generate a Prisma migration removing the `projected_cost` and `calculated_cost` database columns from `StudioShift`.
- [ ] Remove backend create/update/persistence logic and response serialization for the dropped DB fields. Confirm shift creation no longer requires `projectedCost`.
- [ ] Replace shift list/table response cost fields with a backend-calculated `total_cost` string for the shift row. The calculation must use `StudioShift.hourlyRate`, shift-block duration semantics, and active shift/shift-block line items; do not persist the total.
- [ ] Remove shift calendar cost aggregation based on stored shift costs and either replace it with the same live total-cost path or remove calendar money totals if they cannot be made live in the same PR.
- [ ] Remove the stored DB cost fields from `packages/api-types/src/studio-shifts/` schemas and any inferred types; add the live `total_cost` response contract where the shift table consumes it.
- [ ] In `apps/erify_studios`, replace the shift table's `Projected Cost` display column with a `Total Cost` display column backed by the API `total_cost` string.
- [ ] Remove frontend cost cards, cells, form fields, mocks, and tests that assume the dropped stored fields.
- [ ] Verify backend and frontend lint, typecheck, tests, and builds.
- [ ] Commit with a shift-cost-cleanup message.

## Task 8: ShowCreator assignment-compensation edit + creator-based review

**Depends on:** Task 5 (per-show creator mapping UI + summary endpoint), Task 4 (snapshot audit helper + ShowCreator snapshot fields), and Task 6 (sequencing — ships after shift compensation line items so the editability pattern is consistent across both targets).

**Routes:**
- Per-show creator mapping: `/studios/$studioId/creator-mapping/$showId` (extended with per-row edit)
- Per-creator compensation review: `/studios/$studioId/creator-mapping/by-creator/$creatorId?from=...&to=...`

**Files:**
- Modify: `packages/api-types/src/studio-creators/` to add `updateShowCreatorAssignmentInputSchema` (`agreed_rate`, `compensation_type`, `commission_rate`, `note`, `override_reason`).
- Modify/create: `apps/erify_api/src/studios/studio-show/` — add `PATCH /studios/:studioId/shows/:showId/creators/:showCreatorId` (uses `appendSnapshotAudit()` for changed snapshot fields).
- Modify/create: `apps/erify_api/src/studios/studio-creator/` (or a new `studio-creator-compensation-review` module) — add `GET /studios/:studioId/creators/:creatorId/compensation-summary?from=...&to=...` returning the per-show breakdown plus a creator-level total, mirroring the per-show summary shape.
- Modify: `apps/erify_studios/src/features/studio-show-creators/components/show-creator-compensation-dialog.tsx` to add an "Assignment terms" panel above the line-items list, gated on `ADMIN`/`MANAGER`.
- Create: `apps/erify_studios/src/features/studio-creator-compensation-review/` with a date-ranged list view, per-show row edit, and bulk-edit dialog.
- Test: backend assignment-update spec (snapshot audit append, override_reason capture, unresolved → resolved transitions); frontend dialog/view tests for read-only vs editable behavior.

- [ ] Add the assignment-update DTO and PATCH endpoint, restricted to `ADMIN`/`MANAGER`. The bulk-assign endpoint remains assignment-only (no regression of the Task 5 boundary).
- [ ] Wire `appendSnapshotAudit()` so a non-no-op change writes one audit entry per changed field with the supplied `override_reason`.
- [ ] When an assignment was unresolved (`AGREEMENT_SNAPSHOT_MISSING`) and the edit fills in the missing fields, the per-show summary must transition that row out of unresolved on next refetch.
- [ ] Add the per-creator compensation summary endpoint. Result shape reuses `showCreatorCompensationSummaryItemSchema` per show and adds a creator-level total + `unresolved_count`.
- [ ] In the per-show dialog, the assignment-terms panel is editable for `ADMIN`/`MANAGER` and read-only for `TALENT_MANAGER`. Submitting it invalidates `compensationSummary(studioId, showId)`.
- [ ] In the per-creator review view, the row-level edit submits the same assignment-update endpoint; a bulk-edit affordance batches the same call across selected rows with per-row failure reporting (same shape as bulk-assign).
- [ ] Test that bulk-assign still rejects compensation fields, that the PATCH path accepts and audits them, and that the per-creator summary aggregates correctly across multiple shows with mixed unresolved reasons.
- [ ] Verify backend and frontend lint, typecheck, tests, and builds.
- [ ] Commit with an assignment-compensation-edit message.

## Task 9: Show actuals input + missing-actuals collection view

**Depends on:** Task 4 (`Show.actualStartTime`/`EndTime` columns and update DTO). The shift-block actuals counterpart already shipped in Task 6 (PR #65); this task closes the remaining show-side input gap and adds a manager collection view for rows still missing actuals.

**Role contract (from 2.2 PRD and PHASE_4 DoD):** show actuals are entered by `ADMIN`/`MANAGER` only. The wire label `actuals_source: OPERATOR_RECORD` means "typed into the system by an authorized user," not "the operator who was on set." This naming is preserved so future operator-facing or platform-driven sources can slot into the existing `actuals_source` enum.

**Routes:**
- Show actuals input: existing show detail / show operations form (extend, do not introduce a new mutation).
- Missing-actuals collection: `/studios/$studioId/show-operations/actuals` — lists finished shows whose `actualStartTime`/`actualEndTime` are still null, plus shifts/blocks in the same state if product wants a single queue.

**Files:**
- Create: `apps/erify_studios/src/components/finance/ShowActualsInput.tsx` — paired datetime inputs with clear controls and a client-side inverted-range guard, mirroring the shipped `ShiftBlockActualsInput.tsx`.
- Modify: show detail / show operations form to mount the input. Submission goes through the existing show-update mutation.
- Create: `apps/erify_studios/src/routes/studios/$studioId/show-operations/actuals.tsx` (or analogous location) — date-ranged list backed by a backend "missing actuals" query (`GET /studios/:studioId/unresolved-rows?from&to` from 2.3 or a 2.2-shaped precursor). Each row exposes the inline inputs so a manager can clear the queue without page navigation.
- Test: input set/clear/inverted-range paths, mutation invalidation, queue refresh after a successful save, role visibility.

- [ ] Build `ShowActualsInput` with set/clear controls and an inline inverted-range warning that disables submit. Match the API of the existing `ShiftBlockActualsInput`.
- [ ] Mount it on the existing show update form. No new mutation. Restrict to `ADMIN`/`MANAGER` per role contract above.
- [ ] Invalidate `studioShowKeys.detail`, the per-show creator compensation summary, and any show-list keys touched by status filters after a successful actuals write.
- [ ] Add the missing-actuals collection route. Lists rows whose end-time is in the past and whose actuals are still null. Inline submit per row reuses the same input component.
- [ ] Show recipient-flag annotations on rows the recipient has flagged (`metadata.flags.actuals_missing_flagged`) when present so managers can prioritize. The flag itself is written by Task 11 — this row just reads it.
- [ ] Test: valid actual range, clearing one side, inverted range, queue refresh on save, role gating.
- [ ] Verify frontend lint, typecheck, tests, and build.
- [ ] Commit with a show-actuals-input message.

## Task 10: Cost review by perspective

**Depends on:** Task 4 (actuals fields with planned-time fallback), Task 5 (per-show creator compensation summary pattern), Task 6 (shift workflow UI + shift-block compensation), Task 8 (per-creator review for the creator perspective half), and Task 9 (actuals input — required input for the actuals-vs-planned read path to be meaningful).

**Routes:**
- Per-member shift cost review: `/studios/$studioId/shifts/by-member/$studioMembershipId?from=...&to=...`
- Per-creator show cost review: ships in Task 8 (`/creator-mapping/by-creator/$creatorId`). Task 10 only adds cross-cutting roll-ups if the product asks for them.

**Files:**
- Modify/create: `apps/erify_api/src/studios/studio-shift/` (or a new `studio-shift-compensation-review` module) — add `GET /studios/:studioId/shifts/by-member/:studioMembershipId/compensation-summary?from=...&to=...` returning per-shift base labor (`hourlyRate × duration`) using `actualStartTime`/`actualEndTime` when both present, else falling back to `startTime`/`endTime`, plus per-shift `STUDIO_SHIFT` and `STUDIO_SHIFT_BLOCK` line-item totals.
- Mirror the response shape on `showCreatorCompensationSummarySchema` so the frontend has one rendering pattern.
- Create: `apps/erify_studios/src/features/studio-shift-compensation-review/` — date-ranged list view, per-shift row with breakdown drawer, and an "unresolved" badge when actuals are missing.
- Test: backend duration math (actual present, actual partial → unresolved, actual absent → planned fallback), studio-scoping, role gating; frontend rendering and refetch on edit.

- [ ] Decide and document the actuals-fallback contract in the backend: `if (actualStartTime && actualEndTime) use actual; else if both null use planned; else (one-sided) return unresolved_reason='ACTUALS_INCOMPLETE'`. The summary must surface unresolved rows the same way Task 5 does.
- [ ] Implement the per-member shift compensation summary endpoint, restricted to `ADMIN`/`MANAGER`. Cross-studio reads remain admin-only via `/admin/...`.
- [ ] Build the per-member review view, reusing the renderer pattern from the per-show creator summary. Show the unresolved reason inline and link the user to the actuals input surface from Task 9 when the row is `ACTUALS_INCOMPLETE`.
- [ ] If product wants a manager dashboard rolling up the existing per-show, per-creator, and per-member summaries, add it as a final additive view. Otherwise leave that for 2.3.
- [ ] Test: actuals present / partial / absent rows; rows with `STUDIO_SHIFT_BLOCK` line items; date-range edges (inclusive vs exclusive — pick one and test it); role enforcement.
- [ ] Verify backend and frontend lint, typecheck, tests, and builds.
- [ ] Commit with a cost-review-by-perspective message.

## Task 11: Recipient escalation + roster default warning UX

**Depends on:** Task 9 (the manager collection view is the consumer of recipient flags). The escalation endpoint itself is owned by 2.3 in the PRD, but this task ships the in-product loop that closes the recipient-side pending state and the missing roster-default warning copy.

**Files:**
- Modify: `apps/erify_studios/src/features/studio-creator-roster/` (roster edit dialog) — add inline notice on rate/compensation-type/commission-rate edits stating *"Existing assignment snapshots are unchanged unless a manager explicitly edits those assignments."*
- Modify: `apps/erify_studios/src/features/studio-members/` (member-roster edit dialog) — same notice for `baseHourlyRate` edits.
- Add (when 2.3 ships `/me/`): the recipient-side "Flag missing actuals to manager" affordance in `/me/compensation/{creator,operator}` views. The button POSTs to `/me/compensation/pending-events/:eventKey/flag-missing-actuals` (idempotent) and updates local state to show "Manager notified" until the row resolves.
- Modify: Task 9's missing-actuals collection view — surface flagged rows at the top of the queue with a "Recipient flagged" badge.

- [ ] Add the roster-default warning copy on both creator-roster and member-roster edit dialogs. Acceptance: 2.2 PRD criterion at compensation-line-items.md says *"Roster default-rate update UX states that existing assignment snapshots are unchanged unless a manager explicitly edits those assignments"* — must be satisfied.
- [ ] Ship the recipient flag affordance once 2.3 `/me/` endpoints exist. Until then, document the path as a deferred bullet that 2.3 must include.
- [ ] Read the flag in Task 9's queue: rows with `metadata.flags.actuals_missing_flagged` render a "Recipient flagged" badge and sort to the top by default.
- [ ] Test: roster-edit dialog renders the warning, flag affordance POSTs idempotently and updates UI state, manager queue surfaces flagged rows.
- [ ] Verify frontend lint, typecheck, tests, and build.
- [ ] Commit with an escalation-and-roster-warning message.

## Completion Criteria

- Each PR has isolated product value and can merge independently.
- No PR introduces frontend money calculation.
- No PR backfills historical `ShowCreator` snapshots.
- No PR adds `HOURLY` to `CREATOR_COMPENSATION_TYPE`. Creator pay is flat per show by legal-compliance constraint; time-multiplied pay is operator-side only.
- All actuals input is restricted to `ADMIN`/`MANAGER` in Phase 4. `actuals_source: OPERATOR_RECORD` is the *typed-by-authorized-user* category and remains stable across role evolutions.
- Show actuals are the only creator-attendance source in Phase 4; `ShowCreator` and `ShowPlatform` participation-window actuals are extension points only and are not introduced until product needs the distinction.
- Shared-contract breaking removals ship with affected consumers.
- PR descriptions include rollout notes and manual smoke evidence.
- The bulk-assign endpoints stay assignment-only across all tasks; per-assignment compensation editing is a separate write path with snapshot audit.
- Read views (per-show, per-creator, per-member) share one response shape and one frontend rendering pattern.
- Actuals reads always have a documented fallback contract; partial actuals never silently masquerade as complete.
- Every snapshot-field edit surface (creator assignment terms, shift hourly rate, roster defaults) carries the appropriate UX warning per Architecture Guardrail #9.
- Recipient pending-event self-views have an in-product escalation affordance (Task 11) before 2.3 closes.
