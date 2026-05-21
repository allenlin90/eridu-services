# Compensation Line Items + Actuals Backend Reference

> **Status**: ✅ Implemented — Phase 4
> **Owner app**: `apps/erify_api`
> **Canonical semantics**: [`docs/domain/economics-cost-model.md`](../../../docs/domain/economics-cost-model.md)
> **Depends on**: Studio Creator Roster · Studio Member Roster · Studio Show Management · Economics Cost Model

## Purpose

This system persists the cost inputs that the economics service reads. It is **not** a calculator and **not** a payment workflow.

This backend functionality covers:
- A polymorphic `CompensationLineItem` model for event-attached supplemental cost rows;
- System-admin CRUD for support and reconciliation;
- Studio target-scoped line-item APIs where the target is inferred from the route;
- Nullable show actuals (`Show.actualStartTime` / `Show.actualEndTime`) added to the existing `PATCH /studios/:studioId/shows/:showId` route;
- Nullable shift-block actuals (`StudioShiftBlock.actualStartTime` / `StudioShiftBlock.actualEndTime`) added to the existing shift-block update route;
- Snapshot-override audit entries on future `ShowCreator` agreement edits and `StudioShift.hourlyRate` edits;
- Shift cost columns dropped in favor of live-computed `planned_cost` and `actual_cost` fields.

This system does **not** introduce cost arithmetic, settlement state, freeze guards, grace windows, sign enforcement, generated base-compensation rows, standing/schedule-scoped/global/recurring line items, notifications, or historical snapshot backfill.

A per-show creator compensation summary derived from `ShowCreator` assignment snapshots plus active `SHOW_CREATOR` line items is calculated by the backend to keep `erify_studios` from doing frontend money arithmetic. It does not create persisted base-compensation line items.

## Out of Scope

- No `effectiveDate`; date inclusion derives from the attached event.
- No `CompensationLineItem` rows for normal base show compensation or normal base shift labor.
- No historical `ShowCreator` normalization or backfill.
- No actuals approval, settlement, freeze, or grace fields.
- No settlement or payment audit state.
- No type-based sign enforcement (`DEDUCTION < 0`, etc.).
- No standing, schedule-scoped, global, recurring, HR, or payment-system line items.
- No payment processing, bank reconciliation, acknowledgement, dispute, or recipient adjustment.
- No generic studio-wide line-item CRUD API for the normal operator workflow.

## Hard Invariants

1. **Polymorphic attachment via strict 1:1 side table.** `CompensationLineItem` stays narrow (business fields only). Polymorphism lives in `CompensationLineItemTarget`, a 1:1 child table whose PK is `lineItemId` — the row's identity is the parent. The target table holds the `targetType` enum discriminator, a `targetId BigInt`, and nullable typed FK columns (`showId`, `showCreatorId`, `studioShiftId`, `studioShiftBlockId`). It has no own audit fields and no own `deletedAt`; lifecycle follows the parent. Unsupported target types are rejected at write time. `targetType` is a Prisma enum because this is financial data and the discriminator set is closed.
2. **Money is `Prisma.Decimal` end-to-end.** `amount` is signed `Decimal(12, 2)` and serialized as a string at the API boundary. No sign enforcement is applied.
3. **`reason` is required.** Stored as plain text and returned in read responses. Empty or whitespace-only values are rejected.
4. **Date inclusion derives from the attached event.** The model has no `effectiveDate`; the calculator filters line items by the attached event's time.
5. **Base compensation is never persisted as a line item.** The system generates base rows from `ShowCreator` and `StudioShift` snapshots.
6. **Show/block actuals are nullable, free-write facts.** No approval, freeze, settlement, or grace fields are active.
7. **Snapshot overrides use the standard audit history once PR 12 lands.** New override paths write old value, new value, actor, timestamp, and optional reason through `Audit` / `AuditTarget`. Legacy metadata audit arrays are compatibility-only.
8. **External APIs use UIDs only.** Internal BigInt IDs never leave the service boundary, including persisted audit or metadata payloads.
9. **Reads exclude soft-deleted rows by default.** `includeDeleted` is permitted only on admin/audit support surfaces.
10. **Mutations run inside `@Transactional()`.** Snapshot audit writes, target resolution, and the underlying write are atomic.
11. **Studio scope is required.** `CompensationLineItem.studioId` is `NOT NULL`. Targets whose own studio scope cannot be resolved are rejected.

## Actuals Scope Reference

This system follows the cost model's actual ownership and scope: actual timestamps and performance inputs are recorded facts stored on the narrowest entity whose fact they represent. Show actuals and shift-block labor actuals are stored directly on the resource. Creator participation actuals on `ShowCreator`, platform stream/performance facts on `ShowPlatform`, and platform violations as child records are added as distinct facts.

## Schema Reference

### Models and Enums

`CompensationLineItem` (parent — business fields only):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `BigInt` | PK, internal only |
| `uid` | `String` | `cli_<nanoid>`; unique; external ID |
| `studioId` | `BigInt` | FK to `Studio`; required |
| `amount` | `Decimal(12, 2)` | Signed; required |
| `itemType` | `CompensationItemType` | enum |
| `reason` | `String` | required, trimmed, non-empty |
| `createdById` | `BigInt` | FK to `User` |
| `metadata` | `Json @default("{}")` | reserved for future flags |
| `target` | `CompensationLineItemTarget?` | 1:1 side table |
| `createdAt` / `updatedAt` / `deletedAt` | timestamps | soft-delete support |

`CompensationLineItemTarget` (strict 1:1 polymorphism-only side table):

| Column | Type | Notes |
| --- | --- | --- |
| `lineItemId` | `BigInt` | **PK** and FK to `CompensationLineItem`; row identity is the parent |
| `targetType` | `CompensationLineItemTargetType` | discriminator enum |
| `targetId` | `BigInt` | generic reference; matches the typed FK that is set |
| `showId` | `BigInt?` | set iff `targetType = SHOW` |
| `showCreatorId` | `BigInt?` | set iff `targetType = SHOW_CREATOR` |
| `studioShiftId` | `BigInt?` | set iff `targetType = STUDIO_SHIFT` |
| `studioShiftBlockId` | `BigInt?` | set iff `targetType = STUDIO_SHIFT_BLOCK` |

No own `id`, no own `createdAt`/`updatedAt`/`deletedAt` — lifecycle follows the parent. `ON DELETE CASCADE` from the parent ensures cleanup.

Enums:

```prisma
enum CompensationItemType {
  BONUS
  ALLOWANCE
  OVERTIME
  DEDUCTION
  OTHER
}

enum CompensationLineItemTargetType {
  SHOW
  SHOW_CREATOR
  STUDIO_SHIFT
  STUDIO_SHIFT_BLOCK
}
```

### Actuals Fields

`Show` additions:
- `actualStartTime DateTime?`
- `actualEndTime DateTime?`

`StudioShiftBlock` additions:
- `actualStartTime DateTime?`
- `actualEndTime DateTime?`

### Shift Cost Fields

Both stored cost columns were removed:
- `StudioShift.projectedCost` — dropped.
- `StudioShift.calculatedCost` — dropped.

Replaced by two live-computed response fields:
- `planned_cost: string` (always non-null) = `hourlyRate × Σ planned block-duration + Σ attached STUDIO_SHIFT(_BLOCK) line-item amounts`.
- `actual_cost: string | null` = same formula on actual block timestamps; **null when any block on the shift has an incomplete actual pair**. Strict-null evaluation.

## API Surface

### System-Admin CRUD

| Endpoint | Purpose | Auth |
| --- | --- | --- |
| `POST /admin/compensation-line-items` | Create a line item by supplying `studio_id`, `target_type`, and `target_id` | system admin |
| `GET /admin/compensation-line-items` | List with filters: `studio_id`, `target_type`, `target_id`, `item_type`, `from`, `to`, `created_by_uid`, pagination, optional deleted rows | system admin |
| `GET /admin/compensation-line-items/:lineItemId` | Read one | system admin |
| `PATCH /admin/compensation-line-items/:lineItemId` | Update `amount`, `item_type`, `reason`, `metadata`; target is immutable | system admin |
| `DELETE /admin/compensation-line-items/:lineItemId` | Soft delete | system admin |

The admin route is support tooling and is not the primary studio workflow.

### Studio Line-Item APIs

| Endpoint | Purpose | Roles |
| --- | --- | --- |
| `POST /studios/:studioId/compensation-line-items` | Create a line item by supplying `target_type` and `target_id`; route `studioId` is authoritative | `ADMIN`, `MANAGER` |
| `GET /studios/:studioId/compensation-line-items` | List with optional `target_type`, `target_id`, `item_type`, date, and pagination filters | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/compensation-line-items/:lineItemId` | Update `amount`, `item_type`, `reason`, `metadata`; target is immutable | `ADMIN`, `MANAGER` |
| `DELETE /studios/:studioId/compensation-line-items/:lineItemId` | Soft delete | `ADMIN`, `MANAGER` |

The studio API is flat because compensation line items are the resource being created and mutated. Show, show-creator, shift, and shift-block workflows still mount target-scoped panels, but those panels call the same studio collection with explicit target fields instead of using deeply nested parent routes.

All studio line-item routes restrict access to `STUDIO_ROLE.ADMIN` and `STUDIO_ROLE.MANAGER`.

### Creator Mapping Contracts

| Endpoint | Change | Roles |
| --- | --- | --- |
| `GET /studios/:studioId/creators/catalog` and availability lookup | Include roster defaults (`default_rate`, `default_rate_type`, `default_commission_rate`) so new assignments can snapshot creator defaults server-side and future compensation review views can display defaults | existing creator mapping roles |
| `POST /studios/:studioId/shows/:showId/creators/bulk-assign` | Accept `creators[]` objects for assignment membership only. The endpoint must not create initial compensation line items from assignment payloads. | existing creator mapping write roles |
| `GET /studios/:studioId/shows/:showId/creators` | Return `id` as the `ShowCreator` assignment UID for `SHOW_CREATOR` line-item targeting | existing creator mapping read roles |
| `GET /studios/:studioId/shows/:showId/creators/compensation-summary` | Return backend-calculated base, adjustment, creator total, show total, and unresolved reason data for assigned MCs | existing creator mapping read roles |

### Actuals and Snapshot Readiness

Actuals are added to the existing update routes rather than introduced as separate sub-resources. This keeps a single write path per resource and avoids two endpoints racing on the same row.

| Endpoint | Change | Roles |
| --- | --- | --- |
| `PATCH /studios/:studioId/shows/:showId` | Accept optional `actual_start_time` / `actual_end_time` in `UpdateStudioShowDto`; null clears the field | `STUDIO_SHOW_WRITE_ACCESS_ROLES` (ADMIN, MANAGER) |
| `PATCH /studios/:studioId/shifts/:shiftId/blocks/:blockId` | Accept optional `actual_start_time` / `actual_end_time` on the existing block update DTO; null clears the field | `ADMIN`, `MANAGER` |
| existing show-creator assignment update | Append audit when `agreed_rate`, `compensation_type`, or `commission_rate` changes | existing roles |
| existing shift update | Append audit when `hourly_rate` changes | existing roles |

## Contract Strategy

Shared resource folder: `packages/api-types/src/compensation-line-items/`
- `schemas.ts`
- `types.ts`
- `index.ts`

Required schemas:
- `compensationLineItemTargetTypeSchema`
- `compensationItemTypeSchema`
- `createAdminCompensationLineItemInputSchema`
- `createStudioCompensationLineItemInputSchema`
- `listStudioCompensationLineItemsQuerySchema`
- `updateCompensationLineItemInputSchema`
- `listCompensationLineItemsQuerySchema`
- `compensationLineItemApiResponseSchema`
- `compensationLineItemListResponseSchema`

Show and shift actuals are folded into the existing update DTOs in their resource folders:
- `packages/api-types/src/shows/schemas.ts` — `updateStudioShowInputSchema` gains optional `actual_start_time` / `actual_end_time` (nullable to support clear).
- `packages/api-types/src/studio-shifts/schemas.ts` — the shift-block update schema gains the same two fields.

## Backend Architecture

### Responsibilities

- **StudioScheduleController** — Role-gated studio routes and request/response DTO mapping.
- **StudioScheduleManagementService** — Studio-scoped CRUD, assign, unassign, duplicate, delete.
- **StudioSchedulePublishingService** — Validation + snapshot serialization + publish transaction.
- **StudioScheduleValidationService** — Live show validation, operational-day boundary, warning/error shaping.

## Mutation Rules

### Create Line Item

1. Resolve the actor from `@CurrentUser().ext_id` to an internal `User`.
2. Resolve studio scope from either admin body `studio_id` or the studio route param.
3. Resolve the target through `LineItemTargetResolver`. Each target type traverses to its owning studio:
   - `SHOW` → load `Show` and read `Show.studioId`. Reject if `studioId IS NULL` (orphan / client-only show) with `LINE_ITEM_TARGET_NOT_FOUND`.
   - `SHOW_CREATOR` → load `ShowCreator`, then its `Show`, then `Show.studioId`. Same orphan rule.
   - `STUDIO_SHIFT` → load `StudioShift` and read its `studioId` (NOT NULL).
   - `STUDIO_SHIFT_BLOCK` → load `StudioShiftBlock`, then its `StudioShift`, then `studioId`.
4. Reject missing, soft-deleted, or cross-studio targets with `LINE_ITEM_TARGET_NOT_FOUND`.
5. Insert one row with `targetId` and exactly one typed FK populated.
6. Return the freshly read row through the shared response schema.

### Update Line Item

1. Load the line item scoped to the caller's route/admin authority.
2. Apply only mutable fields: `amount`, `item_type`, `reason`, and allowed `metadata`.
3. Keep target columns immutable.
4. Return the updated row.

### Soft Delete

1. Load the line item scoped to the caller's route/admin authority.
2. Set `deletedAt = now()`.
3. Exclude soft-deleted rows from default reads.

### Set/Clear Actuals

1. Load the show or shift block scoped to the route studio.
2. If `actual_start_time` or `actual_end_time` is present in the payload, treat it as a write (including explicit `null` to clear).
3. Allow either side to be `null` independently.
4. If both actual timestamps end up non-null after the update, reject `actual_end_time <= actual_start_time`.
5. Persist the actual fields directly.

### Snapshot Edit on Assignment / Shift

1. Load the row in the transaction.
2. Diff incoming payload against the loaded snapshot fields. Use `Prisma.Decimal.equals()` for `agreedRate`, `commissionRate`, and `hourlyRate` to avoid string/precision false positives.
3. For each changed snapshot field, write one standard audit entry with field, old value, new value, actor UID, timestamp, and optional reason.
4. Persist field changes and audit history atomically.
5. Service-layer guard on explicit `StudioShift.hourly_rate` edits requires `override_reason` when `hourly_rate` changes.
6. Supplying an override reason with zero changes is tolerated as a no-op edit shape.

## Error Codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `LINE_ITEM_NOT_FOUND` | 404 | UID missing, soft-deleted, or outside caller scope |
| `LINE_ITEM_TARGET_NOT_FOUND` | 404 | Attached entity missing, soft-deleted, outside studio, or unable to resolve a studio scope |
| `LINE_ITEM_AMOUNT_REQUIRED` | 422 | Missing or non-numeric `amount` |
| `LINE_ITEM_REASON_REQUIRED` | 422 | Missing or whitespace-only `reason` |
| `SHOW_NOT_FOUND` | 404 | Show missing or outside studio |
| `SHIFT_BLOCK_NOT_FOUND` | 404 | Block missing or outside studio |
| `SHOW_ACTUALS_INVERTED` | 422 | `actual_end_time <= actual_start_time` when both present |
| `SHIFT_BLOCK_ACTUALS_INVERTED` | 422 | Same for block actuals |
