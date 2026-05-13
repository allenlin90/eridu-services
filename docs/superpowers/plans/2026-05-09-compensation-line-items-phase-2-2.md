# Compensation Line Items Phase 2.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Compensation Line Items + Actuals 2.2 as independent, reviewable PRs that can merge to `master` separately.

**Architecture:** The backend owns persistence, UID scoping, Decimal serialization, target resolution, and future economics inputs. The frontend owns target-scoped input workflows and system-admin support tooling. Calculated money comes from later backend economics read models, not frontend arithmetic or stored operational-row totals.

**Tech Stack:** Prisma, NestJS, `@eridu/api-types`, TanStack Query/Router, `@eridu/ui`, Vitest/Jest.

**Spec:** `docs/superpowers/specs/2026-05-09-compensation-line-items-phase-2-2-breakdown.md`.

**PR dependency order:**

```
Task 1 (PR 1A backend system CRUD)  ──┬──▶  Task 3 (PR 2 studio line-item APIs)  ──┬──▶  Task 5 (PR 4 creator mapping compensation UX)
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

- [ ] Add shared contracts for item type, target type, admin create input, update input, list query, response, and paginated response.
- [ ] Generate a Prisma migration for `CompensationLineItem`, the strict-1:1 polymorphism-only side table `CompensationLineItemTarget`, and the two enums using Prisma tooling. `targetType` is a Prisma enum (`CompensationLineItemTargetType`), not a `String` like `TaskTarget.targetType`. The target row uses `lineItemId` as PK and inherits its lifecycle from the parent (no own `deletedAt`), so soft-delete and queries always go through `CompensationLineItem`.
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
- [x] Commit with a studio API message.

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

- [ ] Revise this plan plus `docs/prd/compensation-line-items.md` and frontend/backend design docs before implementation so Task 5 scope is explicit.
- [ ] Extend creator catalog/availability lookup responses with roster defaults (`default_rate`, `default_rate_type`, `default_commission_rate`) so backend assignment snapshots and later compensation review views can reference defaults.
- [ ] Add `id` to `StudioShowCreatorListItem`; it is the `ShowCreator` assignment UID and is the required `SHOW_CREATOR` `target_id`.
- [ ] Keep bulk mapping assignment-only: submit selected creator IDs for selected shows, with no rate, commission, compensation item, or total-cost controls.
- [ ] Ensure bulk assignment does not auto-create initial compensation line items from assignment payloads.
- [ ] In `/creator-mapping/$showId`, add a compensation drawer/dialog per assigned MC row.
- [ ] Show assignment base compensation from the `ShowCreator` snapshot plus `SHOW_CREATOR` adjustment items.
- [ ] Add a backend-calculated creator compensation summary endpoint/response for the per-show creator mapping view. Frontend renders returned totals only.
- [ ] Allow create/update/delete of `SHOW_CREATOR` compensation items with `target_type=SHOW_CREATOR` and `target_id=<showCreatorAssignmentUid>`.
- [ ] Widen the compensation dialog desktop layout so amount/type/reason inputs do not collapse into a cramped three-field row.
- [ ] Add a 2.3 design note: broader costs review does not belong in bulk assignment; a future creator-based date-range review can reuse the creator mapping calculation/read model and provide bulk compensation edits for one creator's shows.
- [ ] Test bulk/add dialogs do not expose compensation fields, assignment UID usage, line-item management, and total rendering.
- [ ] Test backend assignment creation ignores initial compensation line-item payloads and summary calculation comes from assignment snapshots plus line items.
- [ ] Verify frontend lint, typecheck, tests, and build.
- [ ] Verify backend lint, typecheck, tests, and build.
- [ ] Commit with a creator-mapping-compensation message.

## Task 6: Shift workflow UI

**Depends on:** Task 3 (studio line-item APIs) and Task 4 (block actuals fields on the existing block update route).

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
