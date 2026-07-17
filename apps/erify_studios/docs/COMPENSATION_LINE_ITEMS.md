# Compensation Line Items + Actuals Frontend Reference

> **Status**: ✅ Implemented — Phase 4
> **Phase scope**: Phase 4 Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_studios`
> **Tracker**: [`docs/roadmap/PHASE_4.md`](../../../docs/roadmap/PHASE_4.md)
> **Backend reference**: [`apps/erify_api/docs/COMPENSATION_LINE_ITEMS.md`](../../erify_api/docs/COMPENSATION_LINE_ITEMS.md)
> **Canonical semantics**: [`docs/domain/economics-cost-model.md`](../../../docs/domain/economics-cost-model.md)
> **Depends on**: 2.2 backend contracts; 1.5 Studio Show Management ✅; 1.3 Studio Member Roster ✅
> **Gates**: 3.1 Studio Economics Review (read-only consumer)

## Purpose

This system implements the frontend input surfaces for cost reconciliation: supplemental compensation line items, show / shift-block actual times, and snapshot-override warnings on existing assignment edits.

These surfaces cover data input only. Calculator-driven money displays are managed downstream; the frontend does not compute monetary totals locally.

The per-show creator mapping view renders a backend-calculated creator compensation summary. The frontend submits `SHOW_CREATOR` line-item mutations, then renders totals returned by `/studios/:studioId/shows/:showId/creators/compensation-summary`.

Actuals surfaces follow the cost model's [actual ownership and scope](../../../docs/domain/economics-cost-model.md#actual-ownership-and-scope). This UI exposes show actuals and shift-block actuals only; future creator participation actuals, platform performance actuals, and platform violation records are distinct resources.

## Workflow Model

### Primary studio workflow: target-scoped panels

Studio users add and review line items where the adjustment belongs:
- Show-creator line items on the creator mapping workflow;
- Show, shift, and shift-block line items within their respective workflows.

The target context provides the product context. The studio workflow does not depend on a generic line-item management page.

Bulk creator mapping is assignment-only. It does not collect rates, commission, or initial compensation items because those values are per-show creator compensation terms, not multi-show assignment controls. Per-show creator mapping shows the backend summary for assigned MCs and manages `SHOW_CREATOR` adjustment items.

A creator-based compensation review lists shows for one creator over a date range and lets managers review or bulk-edit the per-show assignment terms and `SHOW_CREATOR` items from that creator-centered context. That workflow is distinct from assigning creators to shows.

### System support workflow

System admins use `/system/compensation-line-items` as support tooling backed by `/admin/compensation-line-items`. This page is for cross-studio inspection, correction, and reconciliation. It is not exposed as a studio operator route.

## UX Goals

- Operators attach line items from the target they are already reviewing.
- Sign of `amount` is visually obvious without enforcing direction server-side.
- Snapshot-override edits warn before commit and capture an optional reason for the audit entry.
- Actuals input is compact, inline, and resilient to one-sided entry.
- Support tooling can inspect all records, but studio workflows remain contextual.

## Out of Scope

- Recipient self-view money displays.
- Date-ranged economics review and export.
- Sidebar Finance group.
- Generic studio-wide line-item CRUD workspace.
- Optimistic monetary updates - Phase 4 has no FE-computed money.
- Historical repair or backfill UX.

## Surfaces & Routes

| Surface | Location | Audience |
| ------- | -------- | -------- |
| System line-item support | `/system/compensation-line-items` | system admin |
| Bulk creator assignment | `/studios/$studioId/creator-mapping` | studio `ADMIN`, `MANAGER` |
| Show-creator line-item dialog and cost summary | `/studios/$studioId/shows/$showId/compensation` | studio `ADMIN`, `MANAGER` |
| Creator-based compensation review | Creator compensation review route | studio `ADMIN`, `MANAGER` |
| Show line-item panel | Show operational/detail surface | studio `ADMIN`, `MANAGER` |
| Shift line-item panel | Shift operational/detail surface | studio `ADMIN`, `MANAGER` |
| Shift-block line-item panel | Shift block surface | studio `ADMIN`, `MANAGER` |
| Show actuals input | Show workflow | studio `ADMIN`, `MANAGER` |
| Shift-block actuals input | Shift block workflow | studio `ADMIN`, `MANAGER` |
| Snapshot override warning dialog | Existing assignment / shift edit forms | studio `ADMIN`, `MANAGER` |

New routes follow the existing `PageLayout` / route-shell conventions.

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
- **ShowCreatorCompensationDialog** - mounted from `/shows/$showId/compensation` rows (the show detail Compensation tab; formerly `/creator-mapping/$showId`, retired in PR 21.7). Uses the row's `ShowCreator` assignment UID as `target_id`, manages `SHOW_CREATOR` line items, and renders backend summary values.
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

No optimistic updates. Consistency outranks perceived latency.

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
- `TALENT_MANAGER` may continue to read show-creator assignments but does not see compensation-line-item write controls; the role surface for finance writes stays narrow.
- Other studio roles do not see input surfaces.

## Snapshot-Override Edit Flow

Snapshot edits live on the surface that owns the field, not in a separate confirmation dialog:

- **Assignment fields** (`agreed_rate`, `compensation_type`, `commission_rate`): on the per-show creator-compensation edit dialog. The form detects dirty snapshot fields; if dirty, the existing `SnapshotOverrideWarningDialog` collects `override_reason` before posting.
- **`StudioShift.hourly_rate`**: inline on the **shift compensation dialog**'s `Hourly rate` tile. The tile flips to a money input + required `override_reason` textarea + Save / Cancel. Save with the unchanged rate just closes the editor without firing a PATCH; a changed rate without a reason keeps Save disabled. The unchanged-rate check compares normalized decimal values, not raw API strings, so equivalent scales such as `20` and `20.00` do not trigger a false override. The edit-shift dialog no longer carries an `hourly_rate` field.

The backend service-layer guard in `studio-shift.service.ts#updateShift` rejects PATCHes where `hourly_rate` is present in the body and differs from the stored value but `override_reason` is missing. Reassignment-driven rate changes (different `user_id` with no explicit `hourly_rate` in the body) flow through.

The backend records each confirmed override in the standard audit history once PR 12 lands. Legacy metadata audit arrays are compatibility-only.

## Actuals Input Flow

- Show actuals fields are part of the existing `PATCH /studios/:studioId/shows/:showId` payload (`UpdateStudioShowDto`); shift-block actuals fields are part of the existing block update payload. There is no separate `/actuals` sub-resource.
- Show actuals represent the overall show window.
- Shift-block actuals represent operator/member labor time.
- Either side can be cleared independently by sending `null`.
- If both values are present, the client blocks `end <= start` before submit and the backend enforces the same rule.
- Missing or incomplete actuals are allowed; later economics reads decide whether a row is pending, unresolved, or planned-fallback.
- Editing actuals from a workflow surface uses the standard show / shift-block update mutation and reuses its TanStack Query invalidation; FE does not maintain a parallel "actuals only" mutation.

## Shift Cost Cleanup

Shift cost fields are computed dynamically:

- Shift list/detail cost cells render `planned_cost` and `actual_cost` (live-computed by the backend);
- Shift calendar summary cards show `Planned: $X` and `Actual: $Y — N of M pending` using `total_planned_cost` / `total_actual_cost` / `actual_cost_pending_shift_count` fields;
- Shift form fields do not submit `calculated_cost` — manager overrides flow through `STUDIO_SHIFT` compensation line items;
- The compensation dialog features a three-tile Hourly Rate / Planned / Actual header;
- Tests and mocks are updated to the new `planned_cost` / `actual_cost` shape across studio-shifts, my-shifts, compensation dialog, and table exports.

The manager `/shifts` page shows both planned and actual columns; the member `/my-shifts` view collapses to a single `Actual Cost` column (showing planned would create expectations the actual rarely meets) with null cells rendered as `Pending — actuals not recorded yet`. The CSV/JSON export has per-block `Block N Planned Start/End` + `Block N Actual Start/End` columns; the legacy combined `Blocks` column was dropped from the export.

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

All visible strings live in `@eridu/i18n`.
