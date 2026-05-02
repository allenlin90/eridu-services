# Compensation Line Items + Actuals Frontend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
> **Backend design**: [`apps/erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md`](../../../erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md)
> **Depends on**: 2.2 backend shipped; 1.5 Studio Show Management ✅; 1.3 Studio Member Roster ✅
> **Gates**: 3.1 Studio Economics Review (read-only consumer)

## Purpose

2.2 ships the operator-facing input surfaces required by Phase 4 cost reconciliation: supplemental compensation line items, show / shift-block actual times, and snapshot-override warnings on existing assignment edits.

This design covers data **input** only. Calculator-driven money displays land with 2.3 (`/me/` recipient self-views) and 3.1 (studio economics review). 2.2 must not compute monetary totals locally.

Actuals surfaces must follow the cost model's [actual ownership and scope](../../../../docs/prd/economics-cost-model.md#actual-ownership-and-scope). This 2.2 UI only exposes show actuals and shift-block actuals, but future creator participation actuals and platform performance actuals must be labeled, keyed, and mutated as distinct resources.

## UX Goals

- Operators attach line items wherever they already work — directly from a show, a show-creator assignment, a shift, or a shift block — and from a dedicated workspace when they want to scan or filter across many.
- Sign of `amount` is **visually obvious** (color + ± icon) without enforcing it server-side.
- Snapshot-override edits warn before commit and capture an optional reason for the audit append.
- Actuals input is compact, inline, and resilient to one-sided entry (start without end, end without start).

## Out of Scope (restated)

- Recipient self-view money displays (creator / operator / helper) — ship with 2.3.
- Date-ranged economics review and export — ship with 3.1.
- Sidebar Finance group — lands with 3.1 per Phase 4 Definition of Done.
- Optimistic monetary updates — Phase 4 has no FE-computed money.

## Surfaces & Routes

| Surface                                                         | Location                                            | Audience           |
| --------------------------------------------------------------- | --------------------------------------------------- | ------------------ |
| Compensation line items workspace (list + filters + bulk view)  | `/studios/$studioId/compensation/line-items`        | `ADMIN`, `MANAGER` |
| Inline line items panel on Show detail                          | existing `/studios/$studioId/shows/$showId` route   | `ADMIN`, `MANAGER` |
| Inline line items panel on Shift detail (per-block + per-shift) | existing `/studios/$studioId/shifts/$shiftId` route | `ADMIN`, `MANAGER` |
| Show actuals input                                              | Show detail page                                    | `ADMIN`, `MANAGER` |
| Shift block actuals input                                       | Shift detail page                                   | `ADMIN`, `MANAGER` |
| Snapshot override warning dialog                                | Existing assignment / shift edit forms              | `ADMIN`, `MANAGER` |

The workspace route is new. The other surfaces extend existing show / shift detail pages.

## Component Plan

```text
apps/erify_studios/src/routes/studios/$studioId/compensation/
  ├── line-items.tsx                     # CompensationLineItemsRoute (new route)
  └── _components/
        ├── CompensationLineItemsTable.tsx
        ├── CompensationLineItemFormDialog.tsx
        ├── CompensationLineItemAttachmentPicker.tsx
        └── CompensationLineItemFilters.tsx

apps/erify_studios/src/components/finance/
  ├── ShowActualsInput.tsx
  ├── ShiftBlockActualsInput.tsx
  ├── SnapshotOverrideWarningDialog.tsx
  └── SignedAmountCell.tsx              # signed-decimal renderer with color + sign

apps/erify_studios/src/api/compensation-line-items/
  ├── queries.ts                         # query key factory + hooks
  └── mutations.ts
```

Component responsibilities:

- **CompensationLineItemsRoute** — workspace container; uses `useTableUrlState`, `DataTablePagination`, `placeholderData: keepPreviousData`. Hosts filters, table, and the create-form dialog.
- **CompensationLineItemsTable** — columns: target (entity-typed link to show / assignment / shift / block), item type, amount (`SignedAmountCell`), reason, created by, created at, actions (edit / soft-delete).
- **CompensationLineItemFormDialog** — shared shell for create + edit. On edit, the attachment picker is read-only because target is immutable.
- **CompensationLineItemAttachmentPicker** — segmented control over the four supported `target_type` values; per-segment async lookup combobox keyed on UIDs only. Uses real scoped APIs per repo rule (no no-op `onSearch`).
- **ShowActualsInput / ShiftBlockActualsInput** — paired datetime inputs with explicit clear button per side; client-side inverted-range guard mirrors the BE contract; surfaces `actuals_missing` / `actuals_incomplete` hints inline (the value itself comes from the calculator in later workstreams).
- **SnapshotOverrideWarningDialog** — confirmation gate around any submit that would change `ShowCreator.{agreedRate,compensationType,commissionRate}` or `StudioShift.hourlyRate`. Captures an optional `override_reason` field that posts through to the audit.
- **SignedAmountCell** — string-decimal-safe renderer. Negative → red + `−` icon; positive → green + `+` icon; zero → neutral. Never coerces to `Number()` (Architecture Guardrail 2).

## State / Query Plan

Query key families (TanStack Query):

```ts
['compensation-line-items', studioUid, filters]                    // workspace list
['compensation-line-item', uid]                                    // single
['compensation-line-items', studioUid, { target_type, target_uid }]// inline panel
```

Mutation invalidation:

| Mutation                            | Invalidates                                                                |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Create line item                    | workspace list + matching inline-panel key + parent target detail          |
| Update line item                    | workspace list + single + matching inline-panel key + parent target detail |
| Soft-delete line item               | workspace list + single + matching inline-panel key + parent target detail |
| Set/clear show actuals              | `['show', showUid]` (existing key)                                         |
| Set/clear block actuals             | `['shift', shiftUid]` and any block-specific key                           |
| Snapshot edit on assignment         | existing assignment key + show detail key                                  |
| Snapshot edit on shift `hourlyRate` | existing shift key                                                         |

No optimistic updates: 2.2 changes feed read-only economics views downstream, so consistency outranks perceived latency.

## Filter & URL State

`useTableUrlState` filters on the workspace route:

- `target_type` (multi-select over the four enum values)
- `target_uid` (async-combobox; only enabled once a single `target_type` is selected)
- `item_type` (multi-select)
- `from` / `to` (date range over `created_at` for 2.2; `target_event_time` filtering can be added when 2.3 lands)
- `created_by_uid` (async-combobox)
- pagination via `DataTablePagination` + `setPageCount` from real API metadata

All searchable inputs hit a real scoped API per the repo's pagination + searchable-control rule. No silent local fallback.

## Sidebar Placement

The workspace route is reachable from the existing operations area in 2.2. The Finance sidebar group lands with 3.1 per [`PHASE_4.md` Definition of Done](../../../../docs/roadmap/PHASE_4.md#definition-of-done); 2.2 does not introduce it. When 3.1 ships, the workspace moves under Finance with no route change.

## Permissions / Visibility

- `ADMIN`, `MANAGER` see all 2.2 surfaces.
- All other roles: no UI exposure in 2.2. Recipient self-views (creator / operator / helper) ship with 2.3.

Route guards reuse the existing studio-role guard; the workspace route is not rendered in the navigation for non-eligible roles.

## Snapshot-Override Edit Flow

When a user submits the existing assignment edit or shift edit form:

1. The form computes `dirtyFields` for snapshot-only fields (`agreed_rate`, `compensation_type`, `commission_rate` for assignments; `hourly_rate` for shifts).
2. If any snapshot field is dirty, intercept submit and open `SnapshotOverrideWarningDialog`.
3. Dialog shows: list of changed fields with old → new values, an explanation that "This will recompute historical reference values for this entity," and an optional `override_reason` text input.
4. On confirm, the form posts the original payload **plus** `override_reason`. On cancel, the form returns to its pre-submit state without losing input.
5. Non-snapshot edits skip the dialog.

`override_reason` flows through to the BE audit append per the BE design.

## Drop `projectedCost` / `calculatedCost` from FE

Any frontend consumer of `StudioShift.projectedCost` or `StudioShift.calculatedCost` is removed in the same change set as the BE migration:

- shift detail / list cells that render projected cost
- any sort / filter on those fields
- API type imports in `@eridu/api-types/studio-shifts`

Replacement displays come from 2.3 (calculator output).

## Error Mapping

Maps each backend error code from the BE design to operator-facing copy. All strings live in `@eridu/i18n`.

| Backend code                               | UX response                                                                          | Surface                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------- |
| `LINE_ITEM_NOT_FOUND`                      | Toast "This compensation line item is no longer available." + auto-refresh list      | workspace, inline panel |
| `LINE_ITEM_TARGET_NOT_FOUND`               | Inline error in attachment picker: "Selected target is no longer available."         | form dialog             |
| `LINE_ITEM_TARGET_UNSUPPORTED`             | Inline error in attachment picker: "Pick a show, assignment, shift, or shift block." | form dialog             |
| `LINE_ITEM_AMOUNT_REQUIRED`                | Inline field error on amount                                                         | form dialog             |
| `LINE_ITEM_REASON_REQUIRED`                | Inline field error on reason                                                         | form dialog             |
| `SHOW_ACTUALS_INVERTED`                    | Inline error on end-time field: "End time must be after start time."                 | show actuals input      |
| `SHIFT_BLOCK_ACTUALS_INVERTED`             | Same wording                                                                         | block actuals input     |
| `SHOW_NOT_FOUND` / `SHIFT_BLOCK_NOT_FOUND` | Toast "This entity is no longer available."                                          | actuals input           |
| Auth / permission errors                   | Reuse existing studio-scope auth toast                                               | all                     |

Authz / not-found errors are visually distinct from validation errors per existing house style (toast vs inline).

## i18n

- All visible strings move through `@eridu/i18n`.
- Amount formatting goes through the shared money helpers (string-decimal-safe). No `Number(amount)` conversion anywhere in the render path (Architecture Guardrail 2).
- Date / time formatting respects existing studio-aware helpers.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`

Manual smoke checklist (run end-to-end in the dev server):

- Create line item per supported target type (`SHOW`, `SHOW_CREATOR`, `STUDIO_SHIFT`, `STUDIO_SHIFT_BLOCK`); confirm both workspace list and the parent target's inline panel reflect it.
- Update an existing line item's amount, type, and reason; confirm target picker is disabled.
- Soft-delete a line item; confirm it disappears from default views.
- Workspace filters: `target_type` only, `target_type` + `target_uid`, `item_type`, date range, `created_by_uid`; confirm pagination preserves previous data.
- Signed amount rendering: negative `BONUS`, positive `DEDUCTION`, zero `OTHER`.
- Show actuals: set both, clear both, set start only, set end only, inverted range (rejected inline + by BE).
- Block actuals: same matrix.
- Edit an existing `ShowCreator.agreedRate` → snapshot dialog appears; confirm with reason → audit record persists; cancel → form preserved.
- Edit `StudioShift.hourlyRate` → snapshot dialog appears; confirm without reason allowed.
- Edit a non-snapshot field on the same form → no dialog.
- Confirm any prior `projectedCost` / `calculatedCost` UI is removed.
- Non-eligible role (e.g., MEMBER) hits the workspace route → guarded out per existing pattern.
