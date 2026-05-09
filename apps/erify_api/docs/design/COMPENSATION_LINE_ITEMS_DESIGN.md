# Compensation Line Items + Actuals Backend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
> **Canonical semantics**: [`docs/prd/economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)
> **Implementation breakdown**: [`docs/superpowers/specs/2026-05-09-compensation-line-items-phase-2-2-breakdown.md`](../../../../docs/superpowers/specs/2026-05-09-compensation-line-items-phase-2-2-breakdown.md) and [`docs/superpowers/plans/2026-05-09-compensation-line-items-phase-2-2.md`](../../../../docs/superpowers/plans/2026-05-09-compensation-line-items-phase-2-2.md)
> **Depends on**: 1.2 Studio Creator Roster ✅ · 1.3 Studio Member Roster ✅ · 1.5 Studio Show Management ✅ · 2.1 Economics Cost Model ✅
> **Gates**: 2.3 Economics Service

## Purpose

2.2 persists the cost inputs that the 2.3 economics service will read. It is **not** a calculator and **not** a payment workflow.

This backend design covers:

- a polymorphic `CompensationLineItem` model for event-attached supplemental cost rows;
- system-admin CRUD for support and reconciliation;
- studio target-scoped line-item APIs where the target is inferred from the route;
- nullable show actuals (`Show.actualStartTime` / `Show.actualEndTime`);
- nullable shift-block actuals (`StudioShiftBlock.actualStartTime` / `StudioShiftBlock.actualEndTime`);
- snapshot-override audit append on future `ShowCreator` agreement edits and `StudioShift.hourlyRate` edits;
- a separate cleanup PR for `StudioShift.projectedCost` and `StudioShift.calculatedCost`.

This design does **not** introduce cost arithmetic, settlement state, freeze guards, grace windows, dedicated audit tables, sign enforcement, generated base-compensation rows, standing/schedule-scoped/global/recurring line items, notifications, or historical snapshot backfill.

## Workstream Breakdown

| Slice | Backend scope | Merge shape |
| ----- | ------------- | ----------- |
| PR 1A | `CompensationLineItem` schema/contracts plus `/admin/compensation-line-items` CRUD | Backend-only, system support value |
| PR 2 | Studio target-scoped line-item APIs | Backend-only or minimal contract-sync |
| PR 3 | Show actuals, shift-block actuals, and future-only snapshot audit append | Backend-focused |
| Cleanup PR | Drop `StudioShift.projectedCost` / `StudioShift.calculatedCost` across DB/API/consumers | Coordinated BE/FE because it is contract-breaking |

Frontend implementation lands in separate workflow PRs after the corresponding backend contracts stabilize.

## Out of Scope

- No `effectiveDate`; date inclusion derives from the attached event.
- No `CompensationLineItem` rows for normal base show compensation or normal base shift labor.
- No historical `ShowCreator` normalization or backfill.
- No actuals approval, settlement, freeze, or grace fields.
- No dedicated actuals audit table.
- No type-based sign enforcement (`DEDUCTION < 0`, etc.).
- No standing, schedule-scoped, global, recurring, HR, or payment-system line items.
- No payment processing, bank reconciliation, acknowledgement, dispute, or recipient adjustment.
- No generic studio-wide line-item CRUD API for the normal operator workflow.

## Hard Invariants

1. **Polymorphic attachment with typed FKs.** `CompensationLineItem` uses a `targetType` enum discriminator plus `targetId BigInt` and nullable typed FK columns (`showId`, `showCreatorId`, `studioShiftId`, `studioShiftBlockId`). Unsupported target types are rejected at write time. The pattern mirrors `TaskTarget`.
2. **Money is `Prisma.Decimal` end-to-end.** `amount` is signed `Decimal(12, 2)` and serialized as a string at the API boundary. No sign enforcement ships in Phase 4.
3. **`reason` is required.** Stored as plain text and returned in read responses. Empty or whitespace-only values are rejected.
4. **Date inclusion derives from the attached event.** The model has no `effectiveDate`; 2.3 filters line items by the attached event's time.
5. **Base compensation is never persisted as a line item.** 2.3 generates base rows from `ShowCreator` and `StudioShift` snapshots.
6. **Show/block actuals are nullable, free-write facts.** No approval, freeze, settlement, or grace fields ship in 2.2.
7. **Snapshot override audits append to `metadata.audit.snapshot_overrides[]`.** No separate audit table. The array carries `{field, old, new, actorId, at, reason?}` per edit.
8. **External APIs use UIDs only.** Internal BigInt IDs never leave the service boundary.
9. **Reads exclude soft-deleted rows by default.** `includeDeleted` is permitted only on admin/audit support surfaces.
10. **Mutations run inside `@Transactional()`.** Snapshot audit append, target resolution, and the underlying write are atomic.

## Actuals Scope Reference

This design follows [`economics-cost-model.md` actual ownership and scope](../../../../docs/prd/economics-cost-model.md#actual-ownership-and-scope): actual timestamps are recorded facts stored on the narrowest entity whose fact they represent. This 2.2 wave only adds overall show actuals and shift-block labor actuals. Future creator-participation actuals belong on `ShowCreator`; future platform stream/performance actuals belong on `ShowPlatform` or a platform metrics child model.

## Schema Direction

All migrations are generated through Prisma tooling per repo rule; no new migration file is hand-written.

### PR 1A: new model and enums

`CompensationLineItem`:

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `BigInt` | PK, internal only |
| `uid` | `String` | `cli_<nanoid>`; unique; external ID |
| `studioId` | `BigInt` | FK to `Studio`; required |
| `amount` | `Decimal(12, 2)` | Signed; required |
| `itemType` | `CompensationItemType` | enum |
| `reason` | `String` | required, trimmed, non-empty |
| `targetType` | `CompensationLineItemTargetType` | discriminator enum |
| `targetId` | `BigInt` | generic reference; matches the typed FK that is set |
| `showId` | `BigInt?` | set iff `targetType = SHOW` |
| `showCreatorId` | `BigInt?` | set iff `targetType = SHOW_CREATOR` |
| `studioShiftId` | `BigInt?` | set iff `targetType = STUDIO_SHIFT` |
| `studioShiftBlockId` | `BigInt?` | set iff `targetType = STUDIO_SHIFT_BLOCK` |
| `createdById` | `BigInt` | FK to `User` |
| `metadata` | `Json @default("{}")` | reserved for future flags |
| `createdAt` / `updatedAt` / `deletedAt` | timestamps | soft-delete support |

Indexes:

- `@@unique([uid])`
- `@@index([studioId, deletedAt])`
- `@@index([targetType, targetId, deletedAt])`
- single-column index on each typed FK
- application-level validation that exactly one typed FK is non-null and matches `targetType`

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

### PR 3: actuals fields

`Show` additions:

- `actualStartTime DateTime?`
- `actualEndTime DateTime?`

`StudioShiftBlock` additions:

- `actualStartTime DateTime?`
- `actualEndTime DateTime?`

### Cleanup PR: shift cost fields

Remove both stored cost columns in a separate migration:

- `StudioShift.projectedCost`
- `StudioShift.calculatedCost`

This cleanup PR updates all producers and consumers in the same change set.

## API Surface

### PR 1A: system-admin CRUD

| Endpoint | Purpose | Auth |
| -------- | ------- | ---- |
| `POST /admin/compensation-line-items` | Create a line item by supplying `studio_id`, `target_type`, and `target_uid` | system admin |
| `GET /admin/compensation-line-items` | List with filters: `studio_id`, `target_type`, `target_uid`, `item_type`, `from`, `to`, `created_by_uid`, pagination, optional deleted rows | system admin |
| `GET /admin/compensation-line-items/:lineItemId` | Read one | system admin |
| `PATCH /admin/compensation-line-items/:lineItemId` | Update `amount`, `item_type`, `reason`, `metadata`; target is immutable | system admin |
| `DELETE /admin/compensation-line-items/:lineItemId` | Soft delete | system admin |

The admin route is support tooling. It is not the primary studio workflow.

### PR 2: studio target-scoped line-item APIs

| Endpoint family | Target inferred from | Roles |
| --------------- | -------------------- | ----- |
| `/studios/:studioId/shows/:showId/compensation-line-items` | show | `ADMIN`, `MANAGER` |
| `/studios/:studioId/shows/:showId/creators/:assignmentId/compensation-line-items` | show creator assignment | `ADMIN`, `MANAGER` |
| `/studios/:studioId/shifts/:shiftId/compensation-line-items` | shift | `ADMIN`, `MANAGER` |
| `/studios/:studioId/shifts/:shiftId/blocks/:blockId/compensation-line-items` | shift block | `ADMIN`, `MANAGER` |

Each family supports list, create, update, and soft delete for that route target. Create bodies contain `amount`, `item_type`, `reason`, and optional `metadata`; the client does not send `target_type` or `target_uid` on contextual create.

### PR 3: actuals and snapshot readiness

| Endpoint | Purpose | Roles |
| -------- | ------- | ----- |
| `PATCH /studios/:studioId/shows/:showId/actuals` | Set/clear `actual_start_time` / `actual_end_time` | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/shifts/:shiftId/blocks/:blockId/actuals` | Set/clear block actuals | `ADMIN`, `MANAGER` |
| existing show-creator assignment update | Append audit when `agreed_rate`, `compensation_type`, or `commission_rate` changes | existing roles |
| existing shift update | Append audit when `hourly_rate` changes | existing roles |

Route params use `UidValidationPipe` with the appropriate prefix. Studio routes use the existing `@StudioProtected(...)` guard and the route `studioId` as the scoping authority.

## Contract Strategy

Add a shared resource folder:

- `packages/api-types/src/compensation-line-items/`
  - `schemas.ts`
  - `types.ts` if the local package pattern requires it
  - `index.ts`

Required schemas:

- `compensationLineItemTargetTypeSchema`
- `compensationItemTypeSchema`
- `createAdminCompensationLineItemInputSchema`
- `createTargetCompensationLineItemInputSchema`
- `updateCompensationLineItemInputSchema`
- `listCompensationLineItemsQuerySchema`
- `compensationLineItemApiResponseSchema`
- `compensationLineItemListResponseSchema`

Show and shift actuals reuse existing resource folders:

- `packages/api-types/src/shows/schemas.ts` -> `setShowActualsInputSchema`
- `packages/api-types/src/studio-shifts/schemas.ts` -> `setStudioShiftBlockActualsInputSchema`

`amount` round-trips as a string at the API boundary.

## Backend Implementation Shape

```text
apps/erify_api/src/models/compensation-line-item/
  compensation-line-item.module.ts
  compensation-line-item.service.ts
  compensation-line-item.repository.ts
  line-item-target.resolver.ts
  schemas/compensation-line-item.schema.ts

apps/erify_api/src/admin/compensation-line-items/
  admin-compensation-line-item.controller.ts
  admin-compensation-line-item.module.ts

apps/erify_api/src/studios/studio-compensation-line-item/
  studio-compensation-line-item.controller.ts
  studio-compensation-line-item.module.ts

apps/erify_api/src/lib/audit/snapshot-audit.helper.ts
```

Modifications:

- `apps/erify_api/src/studios/studio-show/` adds show actuals and show/show-creator line-item routes.
- `apps/erify_api/src/studios/studio-shift/` adds shift/shift-block line-item routes and block actuals.
- `apps/erify_api/src/show-orchestration/show-orchestration.service.ts` persists future assignment snapshot fields from explicit input or resolvable current defaults, and marks unresolved rows only at write time.
- `apps/erify_api/src/models/studio-shift/` drops stored cost fields only in the cleanup PR.

Reuse:

- `TaskTargetRepository` patterns for cross-model lookup encapsulation.
- `UidValidationPipe`, `@StudioProtected`, `@CurrentUser`, admin controller patterns, and existing response decorators.
- Existing soft-delete helpers and `@Transactional()` flow.

## Mutation Rules

### Create line item

1. Resolve the actor from `@CurrentUser().ext_id` to an internal `User`.
2. Resolve studio scope from either admin body `studio_id` or the studio route param.
3. Resolve the target through `LineItemTargetResolver`.
4. Reject missing, soft-deleted, or cross-studio targets with `LINE_ITEM_TARGET_NOT_FOUND`.
5. Insert one row with `targetId` and exactly one typed FK populated.
6. Return the freshly read row through the shared response schema.

### Update line item

1. Load the line item scoped to the caller's route/admin authority.
2. Apply only mutable fields: `amount`, `item_type`, `reason`, and allowed `metadata`.
3. Keep target columns immutable.
4. Return the updated row.

### Soft delete

1. Load the line item scoped to the caller's route/admin authority.
2. Set `deletedAt = now()`.
3. Exclude soft-deleted rows from default reads and future 2.3 calculator inputs.

### Set/clear actuals

1. Load the show or shift block scoped to the route studio.
2. Allow either side to be `null` independently.
3. If both actual timestamps are present, reject `actual_end_time <= actual_start_time`.
4. Persist the actual fields directly. No actuals audit table ships in 2.2.

### Snapshot edit on assignment / shift

1. Load the row in the transaction.
2. Diff incoming payload against the loaded snapshot fields:
   - `ShowCreator.{agreedRate, compensationType, commissionRate}`
   - `StudioShift.hourlyRate`
3. For each changed snapshot field, append `{field, old, new, actorId, at, reason?}` to `metadata.audit.snapshot_overrides[]`.
4. Persist field changes and metadata in one update.
5. Non-snapshot fields update normally with no audit append.

## No Historical Repair

2.2 does not normalize or backfill existing `ShowCreator` rows. Rows without reliable snapshots remain unresolved or pending for later economics reads. New assignment writes should persist explicit/resolved snapshots when available; if a snapshot cannot be resolved, the write can mark `metadata.flags.agreement_snapshot_missing = true` so 2.3 can report a precise unresolved reason.

## Error Contract

| Code | HTTP | Meaning |
| ---- | ---- | ------- |
| `LINE_ITEM_NOT_FOUND` | 404 | UID missing, soft-deleted, or outside caller scope |
| `LINE_ITEM_TARGET_NOT_FOUND` | 404 | Attached entity missing, soft-deleted, or outside studio |
| `LINE_ITEM_TARGET_UNSUPPORTED` | 422 | `target_type` outside supported enum |
| `LINE_ITEM_AMOUNT_REQUIRED` | 422 | Missing or non-numeric `amount` |
| `LINE_ITEM_REASON_REQUIRED` | 422 | Missing or whitespace-only `reason` |
| `SHOW_NOT_FOUND` | 404 | Show missing or outside studio |
| `SHIFT_BLOCK_NOT_FOUND` | 404 | Block missing or outside studio |
| `SHOW_ACTUALS_INVERTED` | 422 | `actual_end_time <= actual_start_time` when both present |
| `SHIFT_BLOCK_ACTUALS_INVERTED` | 422 | Same for block actuals |

Validation library errors are mapped through the existing `HttpError` utility per repo convention.

## Testing

Backend coverage targets by PR:

- PR 1A: admin line-item create/list/read/update/soft-delete for each supported `target_type`.
- PR 1A/2: reject unsupported target type, cross-studio target, missing target, and soft-deleted target.
- PR 1A/2: signed amount round-trips as string; negative `BONUS` and positive `DEDUCTION` are accepted.
- PR 1A/2: required reason and required amount validation.
- PR 2: contextual create rejects body-supplied target overrides and infers target from the route.
- PR 3: show actuals set both, set one, clear both, clear one, inverted range.
- PR 3: block actuals same matrix.
- PR 3: snapshot edit appends one audit entry per changed snapshot field in deterministic order.
- PR 3: non-snapshot edit does not append audit.
- PR 3: optional `override_reason` flows to the audit entry.
- Cleanup PR: shift create/update/calendar flows no longer read or write `projectedCost` / `calculatedCost`.
- All PRs: soft-deleted line items are excluded from default reads.

## Verification

Run for backend PRs:

- `pnpm --filter erify_api db:validate`
- `pnpm --filter erify_api db:generate`
- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api test`
- `pnpm --filter erify_api build`

Migration smoke for schema PRs:

- Apply the generated migration on a clean local DB.
- Confirm created tables/columns/enums exist.
- Confirm cleanup PR removes `StudioShift.projectedCost` / `StudioShift.calculatedCost` only when that PR is intentionally shipped.

## Rollout Notes

- PR 1A, PR 2, and PR 3 can ship independently when each passes its own tests.
- Frontend workflow PRs can follow the corresponding backend API PRs.
- The shift cost cleanup PR is coordinated because removing the columns changes existing API responses and FE fixtures.
- No data backfill command exists for 2.2.
