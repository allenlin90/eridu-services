# Compensation Line Items + Actuals Frontend Design

> **Status**: In Progress — Tasks 1-6 merged; Task 7 shift cost cleanup is next
> **Phase scope**: Phase 4 Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_studios`
> **Tracker**: [`docs/roadmap/PHASE_4.md`](../../../../docs/roadmap/PHASE_4.md) — PRs 3-10 are the remaining 2.2 work; PRs 1-6 shipped (this design doc covers shipped + remaining).
> **Backend design**: [`apps/erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md`](../../../erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md)
> **Canonical semantics**: [`docs/domain/economics-cost-model.md`](../../../../docs/domain/economics-cost-model.md)
> **Depends on**: 2.2 backend contracts; 1.5 Studio Show Management ✅; 1.3 Studio Member Roster ✅
> **Gates**: 3.1 Studio Economics Review (read-only consumer)

## Purpose

2.2 ships input surfaces for Phase 4 cost reconciliation: supplemental compensation line items, show / shift-block actual times, and snapshot-override warnings on existing assignment edits.

This design covers data input only. Calculator-driven money displays land with 2.3 (`/me/` recipient self-views and manager read models) and 3.1 (studio economics review). 2.2 must not compute monetary totals locally.

Task 5 is the exception only in the sense that the per-show creator mapping view renders a backend-calculated creator compensation summary. The frontend still does not calculate money: it submits `SHOW_CREATOR` line-item mutations, then renders totals returned by `/studios/:studioId/shows/:showId/creators/compensation-summary`.

Actuals surfaces follow the cost model's [actual ownership and scope](../../../../docs/domain/economics-cost-model.md#actual-ownership-and-scope). This 2.2 UI exposes show actuals and shift-block actuals only; future creator participation actuals and platform performance actuals must be labeled, keyed, and mutated as distinct resources.

## Workflow Model

### Primary studio workflow: target-scoped panels

Studio users add and review line items where the adjustment belongs:

- Task 5: show-creator line items on the creator mapping workflow only;
- later 2.2/2.3 work: show, shift, and shift-block line items when their product workflow is explicitly scheduled.

The target context is the product explanation. The studio workflow should not depend on a generic line-item management page.

Bulk creator mapping is assignment-only. It does not collect rates, commission, or initial compensation items because those values are per-show creator compensation terms, not multi-show assignment controls. Per-show creator mapping shows the backend summary for assigned MCs and manages `SHOW_CREATOR` adjustment items. A broader 2.3 cost review can reuse that summary/read model when it introduces an economics review workflow.

Task 8 adds a creator-based compensation review that lists shows for one creator over a date range and lets managers review or bulk-edit the per-show assignment terms and `SHOW_CREATOR` items from that creator-centered context. That workflow is distinct from assigning creators to shows.

### System support workflow

System admins can use `/system/compensation-line-items` as support tooling backed by `/admin/compensation-line-items`. This page is for cross-studio inspection, correction, and reconciliation. It is not exposed as a studio operator route.

### Future economics review workflow

A studio `compensation/line-items` or economics-adjacent workspace can land with 2.3 when it is tied to calculator review, unresolved rows, or adjustment workflows. It should not ship as a generic 2.2 CRUD workspace.

## UX Goals

- Operators attach line items from the target they are already reviewing.
- Sign of `amount` is visually obvious without enforcing direction server-side.
- Snapshot-override edits warn before commit and capture an optional reason for the audit append.
- Actuals input is compact, inline, and resilient to one-sided entry.
- Support tooling can inspect all records, but studio workflows remain contextual.

## Out of Scope

- Recipient self-view money displays - ship with 2.3.
- Date-ranged economics review and export - ship with 3.1.
- Sidebar Finance group - lands with 3.1 per Phase 4 Definition of Done.
- Generic studio-wide line-item CRUD workspace in 2.2.
- Optimistic monetary updates - Phase 4 has no FE-computed money.
- Historical repair or backfill UX.

## PR Split

| PR | Frontend scope | Status |
| -- | -------------- | ------ |
| PR 1B | `/system/compensation-line-items` support UI | ✅ Merged (#60) |
| PR 4 | Show-creator workflow UI and backend-calculated per-show creator compensation summary | ✅ Merged (#64) |
| PR 5 | Shift and shift-block workflow UI, including block actuals input and snapshot warning | ✅ Merged (#65) |
| Cleanup PR | Remove shift stored-cost UI and fixture assumptions; replace the shift table money display with API-backed `Total Cost` | Next coordinated BE/FE cleanup |

## Surfaces & Routes

| Surface | Location | Audience |
| ------- | -------- | -------- |
| System line-item support | `/system/compensation-line-items` | system admin |
| Bulk creator assignment | `/studios/$studioId/creator-mapping` | studio `ADMIN`, `MANAGER` |
| Show-creator line-item dialog and cost summary | `/studios/$studioId/creator-mapping/$showId` | studio `ADMIN`, `MANAGER` |
| Creator-based compensation review | Task 8 date-ranged creator compensation review route | studio `ADMIN`, `MANAGER` |
| Show line-item panel | later show operational/detail surface, not Task 5 | studio `ADMIN`, `MANAGER` |
| Shift line-item panel | later shift operational/detail surface, not Task 5 | studio `ADMIN`, `MANAGER` |
| Shift-block line-item panel | later shift block surface, not Task 5 | studio `ADMIN`, `MANAGER` |
| Show actuals input | show workflow | studio `ADMIN`, `MANAGER` |
| Shift-block actuals input | shift block workflow | studio `ADMIN`, `MANAGER` |
| Snapshot override warning dialog | existing assignment / shift edit forms | studio `ADMIN`, `MANAGER` |

If a target lacks a focused detail route, the implementation should extend the closest existing operational surface before introducing a new route. New routes must follow the existing `PageLayout` / route-shell conventions.

## Component Plan

```text
apps/erify_studios/src/features/compensation-line-items/
  api/
    compensation-line-items.api.ts
  components/
    CompensationLineItemsTable.tsx
    CompensationLineItemFormDialog.tsx
    TargetScopedLineItemsPanel.tsx
    SignedAmountCell.tsx
  hooks/
    use-compensation-line-items.ts

apps/erify_studios/src/features/studio-show-creators/
  api/
    get-show-creators.ts
    bulk-assign-creators-to-shows.ts
  components/
    BulkCreatorAssignmentDialog.tsx
    AddCreatorDialog.tsx
    ShowCreatorList.tsx
    ShowCreatorCompensationDialog.tsx

apps/erify_studios/src/routes/system/compensation-line-items/
  index.tsx

apps/erify_studios/src/components/finance/
  ShowActualsInput.tsx
  ShiftBlockActualsInput.tsx
  SnapshotOverrideWarningDialog.tsx
```

Component responsibilities:

- **SystemCompensationLineItemsRoute** - support page with table, filters, and create/edit dialogs. Uses `useTableUrlState`, `DataTablePagination`, real API metadata, and `placeholderData: keepPreviousData`.
- **TargetScopedLineItemsPanel** - reusable panel mounted by show, show-creator, shift, and shift-block workflows. The target is passed by props and sent to the flat studio line-item API as `target_type` / `target_id`.
- **BulkCreatorAssignmentDialog** - assigns selected creators to selected shows. It does not expose rates, commission, compensation items, or total-cost previews. New assignment snapshots resolve from creator roster defaults on the backend.
- **ShowCreatorCompensationDialog** - mounted from `/creator-mapping/$showId` rows. Uses the row's `ShowCreator` assignment UID as `target_id`, manages `SHOW_CREATOR` line items, and renders backend summary values.
- **CompensationLineItemFormDialog** - shared create/edit form. Target fields are controlled by the mounted workflow in target-scoped panels and selectable only in system-admin support tooling.
- **CompensationLineItemsTable** - columns: target summary, item type, amount (`SignedAmountCell`), reason, created by, created at, actions.
- **ShowActualsInput / ShiftBlockActualsInput** - paired datetime inputs with clear controls and client-side inverted-range guard.
- **SnapshotOverrideWarningDialog** - confirmation gate around changes to `ShowCreator.{agreedRate, compensationType, commissionRate}` or `StudioShift.hourlyRate`.
- **SignedAmountCell** - string-decimal-safe renderer. Negative, positive, and zero values are visually distinct. Rendering must not require frontend finance arithmetic.

## State / Query Plan

Query key families:

```ts
['compensation-line-items', 'system', filters]
['compensation-line-items', 'studio', studioUid, targetType, targetUid]
['compensation-line-item', lineItemUid]
['show-creators', 'compensation-summary', studioUid, showUid]
```

Mutation invalidation:

| Mutation | Invalidates |
| -------- | ----------- |
| System create/update/delete | system list + target list when target is known |
| Target-scoped create/update/delete | studio target-filtered list + parent target detail; `SHOW_CREATOR` invalidates the per-show creator compensation summary |
| Bulk creator assignment | selected show creator lists and show details/lists |
| Show update (now includes actuals) | existing show detail / list keys |
| Shift-block update (now includes actuals) | existing shift detail / list / calendar keys |
| Snapshot edit on assignment | assignment/creator list key + show detail key |
| Snapshot edit on shift `hourlyRate` | existing shift key |

Show actuals and block actuals do not get their own mutations on the FE; they ride the existing show / shift-block update mutations and inherit those invalidation surfaces.

No optimistic updates. Compensation inputs feed read-only economics views downstream, so consistency outranks perceived latency.

## Filter & Search Contracts

System support filters:

- `studio_id`
- `target_type`
- `target_id`
- `item_type`
- created date range
- `created_by_uid`
- deleted-row visibility if the backend exposes it for support

Target-scoped panels:

- no target picker;
- call `/studios/:studioId/compensation-line-items` with explicit `target_type` and `target_id`;
- optional local item-type filter only when the panel has enough rows to justify it;
- server state keyed by studio UID, target type, and target UID.

Searchable inputs must hit real scoped APIs. No no-op `onSearch` handlers or silent fallback to preloaded bundles.

## Permissions / Visibility

- System support route is visible only to system admins.
- Studio target-scoped line-item and actuals surfaces are visible to studio `ADMIN` and `MANAGER`.
- `TALENT_MANAGER` may continue to read show-creator assignments but does not see compensation-line-item write controls in 2.2; the role surface for finance writes stays narrow.
- Other studio roles do not see 2.2 input surfaces.
- Recipient self-views for creator/operator/helper ship with 2.3.

## Snapshot-Override Edit Flow

When a user submits an existing assignment edit or shift edit form:

1. The form detects dirty snapshot fields:
   - assignment: `agreed_rate`, `compensation_type`, `commission_rate`;
   - shift: `hourly_rate`.
2. If any snapshot field is dirty, submit opens `SnapshotOverrideWarningDialog`.
3. The dialog lists changed fields with old and new values, explains that reference values can recompute, and accepts optional `override_reason`.
4. Confirm posts the original payload plus `override_reason`.
5. Cancel returns to the form without losing input.
6. Non-snapshot edits skip the dialog.

The backend records each confirmed override as one entry in `metadata.audit.snapshot_overrides[]` (array, chronological, snake_case keys, `actor_ext_id` as a string). The FE does not need to read this audit array in 2.2 — read-side rendering of override history lands with 2.3 economics views.

## Actuals Input Flow

- Show actuals fields are part of the existing `PATCH /studios/:studioId/shows/:showId` payload (`UpdateStudioShowDto`); shift-block actuals fields are part of the existing block update payload. There is no separate `/actuals` sub-resource.
- Show actuals represent the overall show window.
- Shift-block actuals represent operator/member labor time.
- Either side can be cleared independently by sending `null`.
- If both values are present, the client blocks `end <= start` before submit and the backend enforces the same rule.
- Missing or incomplete actuals are allowed; later economics reads decide whether a row is pending, unresolved, or planned-fallback.
- Editing actuals from a workflow surface uses the standard show / shift-block update mutation and reuses its TanStack Query invalidation; FE does not maintain a parallel "actuals only" mutation.

## Shift Cost Cleanup

Removal of `projected_cost` and `calculated_cost` from shift contracts is a dedicated cleanup PR. That PR removes:

- shift list/detail cost cells;
- shift calendar summary cost cards;
- shift form fields or fixtures that submit/read calculated cost;
- tests and mocks that assume `projected_cost` or `calculated_cost`.

The shift table's replacement monetary display comes from the Task 7 backend `total_cost` response field. Broader economics review screens still come from 2.3 backend economics/read-model APIs, never frontend recomputation.

## Error Mapping

| Backend code | UX response | Surface |
| ------------ | ----------- | ------- |
| `LINE_ITEM_NOT_FOUND` | Toast "This compensation line item is no longer available." and refresh the relevant list | system and target panels |
| `LINE_ITEM_TARGET_NOT_FOUND` | Inline target error in system tooling; toast in target-scoped panels. Includes the orphan-show case (`Show.studioId IS NULL`). | form dialog |
| `LINE_ITEM_AMOUNT_REQUIRED` | Inline field error on amount | form dialog |
| `LINE_ITEM_REASON_REQUIRED` | Inline field error on reason | form dialog |
| `SHOW_ACTUALS_INVERTED` | Inline error on end-time field | show actuals input |
| `SHIFT_BLOCK_ACTUALS_INVERTED` | Inline error on end-time field | block actuals input |
| `SHOW_NOT_FOUND` / `SHIFT_BLOCK_NOT_FOUND` | Toast "This entity is no longer available." | actuals input |
| Auth / permission errors | Existing studio/system auth handling | all |

All visible strings live in `@eridu/i18n` when implementation reaches UI copy.

## Verification

Run for each frontend PR:

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios test`
- `pnpm --filter erify_studios build`

Manual smoke by PR:

- PR 1B: system admin can filter line items by studio, target type, target UID, item type, date range, and creator; create/update/delete round trips.
- PR 4 / Task 5: bulk creator mapping assigns creators only; per-show creator mapping renders backend totals and creates/updates/deletes `SHOW_CREATOR` line items against the assignment UID. The compensation dialog is wide enough on desktop that amount/type/reason controls do not collapse into a cramped three-field row.
- PR 5: shift and shift-block panels create/update/delete line items without a target picker; block actuals set/clear/inverted paths work.
- Snapshot dialog appears only for snapshot-field edits and preserves form input on cancel.
- Cleanup PR: no `projected_cost` / `calculated_cost` UI, mocks, or fixtures remain; the shift table renders backend-provided `total_cost`.
