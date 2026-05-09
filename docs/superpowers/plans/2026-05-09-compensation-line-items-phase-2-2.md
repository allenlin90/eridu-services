# Compensation Line Items Phase 2.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Compensation Line Items + Actuals 2.2 as independent, reviewable PRs that can merge to `master` separately.

**Architecture:** The backend owns persistence, UID scoping, Decimal serialization, target resolution, and future economics inputs. The frontend owns target-scoped input workflows and system-admin support tooling. Calculated money comes from later backend economics read models, not frontend arithmetic or stored operational-row totals.

**Tech Stack:** Prisma, NestJS, `@eridu/api-types`, TanStack Query/Router, `@eridu/ui`, Vitest/Jest.

**Spec:** `docs/superpowers/specs/2026-05-09-compensation-line-items-phase-2-2-breakdown.md`.

**PR dependency order:**

```
Task 1 (PR 1A backend system CRUD)  ──┬──▶  Task 3 (PR 2 studio target APIs)  ──┬──▶  Task 5 (PR 4 show UI)
                                      │                                          ├──▶  Task 6 (PR 5 shift UI)
                                      └──▶  Task 2 (PR 1B FE system UI)
Task 4 (PR 3 actuals + snapshot)  ────────────────────────────────────────────────┴──▶  Task 5/6 also depend on this

Task 7 (cleanup PR) is independent and may land any time once consumers are updated in the same PR.
```

Tasks 1 and 4 are independent; everything else has at least one upstream dependency.

---

## File Structure

| Area | Files | Responsibility |
| ---- | ----- | -------------- |
| Product/design docs | `docs/prd/compensation-line-items.md`, app design docs | Keep product and technical scope aligned. |
| Shared contracts | `packages/api-types/src/compensation-line-items/`, `packages/api-types/src/shows/`, `packages/api-types/src/studio-shifts/` | Zod contracts and inferred types for backend/frontend. |
| Backend model | `apps/erify_api/src/models/compensation-line-item/` | Model service, repository, target resolver, DTO transforms. |
| Backend admin API | `apps/erify_api/src/admin/compensation-line-items/` | System-admin CRUD/list. |
| Backend studio APIs | `apps/erify_api/src/studios/studio-compensation-line-item/`, existing show/shift studio modules | Contextual target-scoped line items and actuals. |
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

- [ ] Add shared contracts for item type, target type, admin create input, update input, list query, response, and paginated response.
- [ ] Generate a Prisma migration for `CompensationLineItem` and its enums using Prisma tooling. `targetType` is a Prisma enum (`CompensationLineItemTargetType`), not a `String` like `TaskTarget.targetType`.
- [ ] Implement the model repository/service with soft-delete, UID generation (prefix `cli`, consistent with `ssh`/`ssb`/`smc`/`tgt`), Decimal string serialization, and target immutability.
- [ ] Implement `LineItemTargetResolver` with studio ownership checks. Target traversal:
  - `SHOW` → `Show.studioId`; reject when `studioId IS NULL` (orphan / client-only show) with `LINE_ITEM_TARGET_NOT_FOUND`.
  - `SHOW_CREATOR` → `ShowCreator → Show.studioId`; same orphan rule.
  - `STUDIO_SHIFT` → `StudioShift.studioId` (NOT NULL).
  - `STUDIO_SHIFT_BLOCK` → `StudioShiftBlock → StudioShift.studioId`.
- [ ] Implement `/admin/compensation-line-items` CRUD/list using admin controller patterns and `@CurrentUser` actor resolution.
- [ ] Test every target type, missing/cross-studio target rejection, orphan-show rejection, signed decimal round-trip, reason validation, update, and soft delete.
- [ ] Verify with `pnpm --filter erify_api db:validate`, `db:generate`, `lint`, `typecheck`, `test`, and `build`.
- [ ] Commit with a backend-scoped message.

## Task 2: Frontend system support UI

**Files:**
- Create: `apps/erify_studios/src/features/compensation-line-items/`
- Create: `apps/erify_studios/src/routes/system/compensation-line-items/index.tsx`
- Modify: system navigation config if required by the existing route/sidebar pattern.
- Test: route/component tests for support CRUD.

- [ ] Add typed API hooks and query keys for admin line-item list, create, update, and delete.
- [ ] Build the system support table with filters for studio, target type, target UID, item type, created date range, creator, and deleted-row visibility if available.
- [ ] Build create/edit dialogs where target is selectable only for system admin support tooling.
- [ ] Reuse shared pagination and `placeholderData: keepPreviousData`.
- [ ] Test filter state, create/update/delete invalidation, and signed amount rendering.
- [ ] Verify with `pnpm --filter erify_studios lint`, `typecheck`, `test`, and `build`.
- [ ] Commit with a frontend system-support message.

## Task 3: Studio target-scoped APIs

**Files:**
- Modify: shared compensation-line-item contracts to add target-scoped create input if it is not already present.
- Create/modify: `apps/erify_api/src/studios/studio-compensation-line-item/`
- Modify: `apps/erify_api/src/studios/studio-show/`
- Modify: `apps/erify_api/src/studios/studio-shift/`
- Test: contextual controller/service specs.

- [ ] Add route families for show, show creator assignment, shift, and shift block line items.
- [ ] Infer target type and target UID from route params on create.
- [ ] Reject any client body attempt to override route target.
- [ ] Scope list/update/delete through the same parent target route.
- [ ] Test contextual create/list/update/delete per target family.
- [ ] Verify backend lint, typecheck, tests, and build.
- [ ] Commit with a studio API message.

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

- [ ] Generate a Prisma migration adding `Show.actualStartTime`/`actualEndTime` and `StudioShiftBlock.actualStartTime`/`actualEndTime`. Time-zone semantics match the existing `startTime`/`endTime` columns.
- [ ] Extend the existing show and block update DTOs to accept actuals fields. Do **not** add a separate `/actuals` sub-resource.
- [ ] Inverted-range validation runs against the post-update state (a partial PATCH may set only one side; do not reject a one-sided write when the other side is null).
- [ ] Implement `appendSnapshotAudit()` as a pure helper. Output shape: append one entry per changed snapshot field to `metadata.audit.snapshot_overrides[]` with snake_case keys `{field, old_value, new_value, actor_ext_id, at, reason?}`. Decimal fields use `Prisma.Decimal.equals()` for diffing; `old_value`/`new_value` are serialized as decimal strings (or `null` when cleared). `actor_ext_id` is a string ext id, never an internal BigInt.
- [ ] Wire future snapshot edits in the existing show-creator assignment update path and the existing shift update path to call `appendSnapshotAudit()` for changed `ShowCreator.{agreedRate, compensationType, commissionRate}` and `StudioShift.hourlyRate`.
- [ ] Persist resolvable future ShowCreator assignment snapshots; mark unresolved new writes when required defaults are unavailable.
- [ ] Do not add a backfill script.
- [ ] Test set/clear/inverted actuals (including one-sided PATCH), snapshot audit append/no-append (including a no-op same-Decimal edit), override reason, and unresolved new-write metadata. Test that internal BigInt IDs never appear in `metadata`.
- [ ] Verify backend lint, typecheck, tests, and build.
- [ ] Commit with an actuals/snapshot-readiness message.

## Task 5: Show workflow UI

**Depends on:** Task 3 (studio target APIs) and Task 4 (actuals + snapshot fields on the existing PATCH route). Show actuals input mounts on the existing show update mutation; without Task 4 those fields do not exist in the contract.

**Files:**
- Modify/create show workflow components under `apps/erify_studios/src/features/studio-shows/` and `apps/erify_studios/src/features/studio-show-creators/`.
- Reuse: `apps/erify_studios/src/features/compensation-line-items/`
- Create/modify: `apps/erify_studios/src/components/finance/ShowActualsInput.tsx`
- Test: show workflow component tests.

- [ ] Mount target-scoped line-item panels for show and show creator assignment contexts.
- [ ] Add show actuals fields to the existing show update form; submit goes through the existing show update mutation (no new mutation).
- [ ] Add snapshot warning dialog to assignment compensation edits; on confirm, the existing assignment update mutation carries the optional `override_reason`.
- [ ] Invalidate target list and parent show/assignment queries after mutations.
- [ ] Test create/update/delete line items without target picker, actuals validation, and snapshot warning confirm/cancel.
- [ ] Verify frontend lint, typecheck, tests, and build.
- [ ] Commit with a show-workflow message.

## Task 6: Shift workflow UI

**Depends on:** Task 3 (studio target APIs) and Task 4 (block actuals fields on the existing block update route).

**Files:**
- Modify/create shift workflow components under `apps/erify_studios/src/features/studio-shifts/`.
- Reuse: `apps/erify_studios/src/features/compensation-line-items/`
- Create/modify: `apps/erify_studios/src/components/finance/ShiftBlockActualsInput.tsx`
- Test: shift workflow component tests.

- [ ] Mount target-scoped line-item panels for shift and shift-block contexts.
- [ ] Add shift-block actuals fields to the existing block update form; submit goes through the existing block update mutation (no new mutation).
- [ ] Add snapshot warning dialog to `hourly_rate` edits.
- [ ] Invalidate target list and parent shift queries after mutations.
- [ ] Test create/update/delete line items without target picker, block actuals validation, and snapshot warning confirm/cancel.
- [ ] Verify frontend lint, typecheck, tests, and build.
- [ ] Commit with a shift-workflow message.

## Task 7: Shift cost column cleanup

**Files:**
- Modify: `apps/erify_api/prisma/schema.prisma`
- Modify: `apps/erify_api/src/models/studio-shift/`
- Modify: `apps/erify_api/src/orchestration/shift-calendar/`
- Modify: `packages/api-types/src/studio-shifts/`
- Modify: `apps/erify_studios/src/features/studio-shifts/`
- Test: backend and frontend shift specs/fixtures.

> **Why this is one PR, not several:** `StudioShift.projectedCost` is currently `Decimal NOT NULL`. Dropping the column requires removing every writer in the same change set, otherwise shift creation fails between the two PRs. Use the search hint `rg 'projectedCost|calculatedCost|projected_cost|calculated_cost'` to find all touchpoints (~98 references at the time of this plan).

- [ ] Generate a Prisma migration removing `StudioShift.projectedCost` and `StudioShift.calculatedCost`.
- [ ] Remove backend create/update/persistence logic and response serialization for the dropped fields. Confirm shift creation no longer requires `projectedCost`.
- [ ] Remove shift calendar cost aggregation based on stored shift costs.
- [ ] Remove the fields from `packages/api-types/src/studio-shifts/` schemas and any inferred types.
- [ ] Remove frontend cost cards, cells, form fields, mocks, and tests that assume the dropped fields.
- [ ] Keep replacement monetary displays out of FE until 2.3 backend economics read models exist.
- [ ] Verify backend and frontend lint, typecheck, tests, and builds.
- [ ] Commit with a shift-cost-cleanup message.

## Completion Criteria

- Each PR has isolated product value and can merge independently.
- No PR introduces frontend money calculation.
- No PR backfills historical `ShowCreator` snapshots.
- Shared-contract breaking removals ship with affected consumers.
- PR descriptions include rollout notes and manual smoke evidence.
