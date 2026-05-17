# Compensation Line Items + Actuals Backend Design

> **Status**: In Progress — Tasks 1-6 merged; Task 7 shift cost cleanup is next
> **Phase scope**: Phase 4 Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_api`
> **Tracker**: [`docs/roadmap/PHASE_4.md`](../../../../docs/roadmap/PHASE_4.md) — PRs 1-7 cover the remaining 2.2 work; PRs 1-6 shipped (this design doc covers shipped + remaining).
> **Canonical semantics**: [`docs/domain/economics-cost-model.md`](../../../../docs/domain/economics-cost-model.md)
> **Depends on**: 1.2 Studio Creator Roster ✅ · 1.3 Studio Member Roster ✅ · 1.5 Studio Show Management ✅ · 2.1 Economics Cost Model ✅
> **Gates**: 2.3 Economics Service

## Purpose

2.2 persists the cost inputs that the 2.3 economics service will read. It is **not** a calculator and **not** a payment workflow.

This backend design covers:

- a polymorphic `CompensationLineItem` model for event-attached supplemental cost rows;
- system-admin CRUD for support and reconciliation;
- studio target-scoped line-item APIs where the target is inferred from the route;
- nullable show actuals (`Show.actualStartTime` / `Show.actualEndTime`) added to the existing `PATCH /studios/:studioId/shows/:showId` route;
- nullable shift-block actuals (`StudioShiftBlock.actualStartTime` / `StudioShiftBlock.actualEndTime`) added to the existing shift-block update route;
- snapshot-override audit append on future `ShowCreator` agreement edits and `StudioShift.hourlyRate` edits;
- a separate cleanup PR for `StudioShift.projectedCost` and `StudioShift.calculatedCost` (✅ shipped via Phase 4 PR 3 — [#72](https://github.com/allenlin90/eridu-services/pull/72)).

This design does **not** introduce cost arithmetic, settlement state, freeze guards, grace windows, dedicated audit tables, sign enforcement, generated base-compensation rows, standing/schedule-scoped/global/recurring line items, notifications, or historical snapshot backfill.

Task 5 adds one backend read model for creator mapping UX: a per-show creator compensation summary derived from `ShowCreator` assignment snapshots plus active `SHOW_CREATOR` line items. This read model is backend-calculated and exists to keep `/studios/:studioId/creator-mapping/:showId` from doing frontend money arithmetic. It does not create persisted base-compensation line items.

## Workstream Breakdown

| Slice      | Backend scope                                                                           | Status                                            |
| ---------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| PR 1A      | `CompensationLineItem` schema/contracts plus `/admin/compensation-line-items` CRUD      | ✅ Merged (#59)                                   |
| PR 2       | Studio target-scoped line-item APIs                                                     | ✅ Merged (#62)                                   |
| PR 3       | Show actuals, shift-block actuals, and snapshot audit append helper                     | ✅ Merged (#63)                                   |
| PR 4       | Creator mapping compensation summary and assignment snapshot defaults                   | ✅ Merged (#64)                                   |
| PR 5       | Shift workflow contracts consumed by the frontend shift workflow UI                     | ✅ Merged (#65)                                   |
| Cleanup PR | Drop `StudioShift.projectedCost` / `StudioShift.calculatedCost`; add live `planned_cost` / `actual_cost` per cost-model §2 | ✅ Merged ([#72](https://github.com/allenlin90/eridu-services/pull/72)) |

Frontend workflow slices consume these backend contracts in their corresponding PRs.

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

1. **Polymorphic attachment via strict 1:1 side table.** `CompensationLineItem` stays narrow (business fields only). Polymorphism lives in `CompensationLineItemTarget`, a 1:1 child table whose PK is `lineItemId` — the row's identity is the parent. The target table holds the `targetType` enum discriminator, a `targetId BigInt`, and nullable typed FK columns (`showId`, `showCreatorId`, `studioShiftId`, `studioShiftBlockId`). It has no own audit fields and no own `deletedAt`; lifecycle follows the parent. Unsupported target types are rejected at write time. `targetType` is a Prisma enum (not `String` like `TaskTarget.targetType`) because this is financial data and the discriminator set is closed.
2. **Money is `Prisma.Decimal` end-to-end.** `amount` is signed `Decimal(12, 2)` and serialized as a string at the API boundary. No sign enforcement ships in Phase 4.
3. **`reason` is required.** Stored as plain text and returned in read responses. Empty or whitespace-only values are rejected.
4. **Date inclusion derives from the attached event.** The model has no `effectiveDate`; 2.3 filters line items by the attached event's time.
5. **Base compensation is never persisted as a line item.** 2.3 generates base rows from `ShowCreator` and `StudioShift` snapshots.
6. **Show/block actuals are nullable, free-write facts.** No approval, freeze, settlement, or grace fields ship in 2.2.
7. **Snapshot override audits append to `metadata.audit.snapshot_overrides[]` as an array** of `{field, old_value, new_value, actor_ext_id, at, reason?}` entries, snake_case keys, in chronological order. No internal BigInt IDs are written into `metadata`. The array shape deviates from the single-object `metadata.audit.last_transition` pattern in [task.service.ts](../../src/models/task/task.service.ts) because snapshot edits benefit from full history.
8. **External APIs use UIDs only.** Internal BigInt IDs never leave the service boundary, including persisted `metadata` payloads.
9. **Reads exclude soft-deleted rows by default.** `includeDeleted` is permitted only on admin/audit support surfaces.
10. **Mutations run inside `@Transactional()`.** Snapshot audit append, target resolution, and the underlying write are atomic.
11. **Studio scope is required.** `CompensationLineItem.studioId` is `NOT NULL`. Targets whose own studio scope cannot be resolved (currently: `Show.studioId IS NULL`) are rejected with `LINE_ITEM_TARGET_NOT_FOUND`. Client-only-show finance is out of scope; revisit only if a real product need lands.

## Actuals Scope Reference

This design follows [`economics-cost-model.md` actual ownership and scope](../../../../docs/domain/economics-cost-model.md#actual-ownership-and-scope): actual timestamps are recorded facts stored on the narrowest entity whose fact they represent. This 2.2 wave only adds overall show actuals and shift-block labor actuals. Future creator-participation actuals belong on `ShowCreator`; future platform stream/performance actuals belong on `ShowPlatform` or a platform metrics child model.

## Schema Direction

All migrations are generated through Prisma tooling per repo rule; no new migration file is hand-written.

### PR 1A: new models and enums

`CompensationLineItem` (parent — business fields only):

| Column                                  | Type                          | Notes                                                                 |
| --------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `id`                                    | `BigInt`                      | PK, internal only                                                     |
| `uid`                                   | `String`                      | `cli_<nanoid>`; unique; external ID                                   |
| `studioId`                              | `BigInt`                      | FK to `Studio`; required                                              |
| `amount`                                | `Decimal(12, 2)`              | Signed; required                                                      |
| `itemType`                              | `CompensationItemType`        | enum                                                                  |
| `reason`                                | `String`                      | required, trimmed, non-empty                                          |
| `createdById`                           | `BigInt`                      | FK to `User`                                                          |
| `metadata`                              | `Json @default("{}")`         | reserved for future flags                                             |
| `target`                                | `CompensationLineItemTarget?` | 1:1 side table; Prisma requires `?` but app always creates in same tx |
| `createdAt` / `updatedAt` / `deletedAt` | timestamps                    | soft-delete support                                                   |

`CompensationLineItemTarget` (strict 1:1 polymorphism-only side table):

| Column               | Type                             | Notes                                                               |
| -------------------- | -------------------------------- | ------------------------------------------------------------------- |
| `lineItemId`         | `BigInt`                         | **PK** and FK to `CompensationLineItem`; row identity is the parent |
| `targetType`         | `CompensationLineItemTargetType` | discriminator enum                                                  |
| `targetId`           | `BigInt`                         | generic reference; matches the typed FK that is set                 |
| `showId`             | `BigInt?`                        | set iff `targetType = SHOW`                                         |
| `showCreatorId`      | `BigInt?`                        | set iff `targetType = SHOW_CREATOR`                                 |
| `studioShiftId`      | `BigInt?`                        | set iff `targetType = STUDIO_SHIFT`                                 |
| `studioShiftBlockId` | `BigInt?`                        | set iff `targetType = STUDIO_SHIFT_BLOCK`                           |

No own `id`, no own `createdAt`/`updatedAt`/`deletedAt` — lifecycle follows the parent. `ON DELETE CASCADE` from the parent ensures cleanup.

Indexes on `CompensationLineItem`:

- `@@unique([uid])`
- `@@index([uid])`
- `@@index([studioId, deletedAt])`
- `@@index([createdById])`
- `@@index([deletedAt])`

Indexes on `CompensationLineItemTarget`:

- `@@index([targetType, targetId])`
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

Both follow the existing `startTime` / `endTime` storage convention on the same models. Time-zone semantics match the existing scheduled fields (Prisma `DateTime`, UTC at the storage layer; client/serializer behavior unchanged).

### Cleanup PR: shift cost fields — ✅ shipped ([#72](https://github.com/allenlin90/eridu-services/pull/72))

Both stored cost columns were removed in Phase 4 PR 3:

- `StudioShift.projectedCost` (was `Decimal NOT NULL`) — dropped.
- `StudioShift.calculatedCost` (was `Decimal?`) — dropped.

Replaced by two live-computed response fields per cost-model §2:

- `planned_cost: string` (always non-null) = `hourlyRate × Σ planned block-duration + Σ attached STUDIO_SHIFT(_BLOCK) line-item amounts`.
- `actual_cost: string | null` = same formula on actual block timestamps; **null when any block on the shift has an incomplete actual pair**. Strict-null per cost-model §2.

The `calculated_cost` request input on `POST/PATCH /studios/:id/shifts` was also removed — overrides now flow through `STUDIO_SHIFT` compensation line items per cost-model §1, and `hourly_rate` changes still write a snapshot-audit entry justified by `override_reason`. The shift-calendar summary departs from strict null-bubbling in favor of partial-sum + explicit pending counts (`total_actual_cost` + `actual_cost_resolved_shift_count` + `actual_cost_pending_shift_count`) so manager rollups stay usable when some shifts are still pending. Per-day per-shift `actual_cost` is attributed by actual-interval-per-day split (not planned ratio), so cross-midnight blocks correctly skip days with no actual overlap.

For any future grep audit: `rg 'projectedCost|calculatedCost|projected_cost|calculated_cost'` against the working tree should match only this design doc, the FE design doc, and migration files — no live code references remain.

## API Surface

### PR 1A: system-admin CRUD

| Endpoint                                            | Purpose                                                                                                                                     | Auth         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `POST /admin/compensation-line-items`               | Create a line item by supplying `studio_id`, `target_type`, and `target_id`                                                                | system admin |
| `GET /admin/compensation-line-items`                | List with filters: `studio_id`, `target_type`, `target_id`, `item_type`, `from`, `to`, `created_by_uid`, pagination, optional deleted rows | system admin |
| `GET /admin/compensation-line-items/:lineItemId`    | Read one                                                                                                                                    | system admin |
| `PATCH /admin/compensation-line-items/:lineItemId`  | Update `amount`, `item_type`, `reason`, `metadata`; target is immutable                                                                     | system admin |
| `DELETE /admin/compensation-line-items/:lineItemId` | Soft delete                                                                                                                                 | system admin |

The admin route is support tooling. It is not the primary studio workflow.

### PR 2: studio line-item APIs

| Endpoint                                                       | Purpose                                                                                         | Roles              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------ |
| `POST /studios/:studioId/compensation-line-items`              | Create a line item by supplying `target_type` and `target_id`; route `studioId` is authoritative | `ADMIN`, `MANAGER` |
| `GET /studios/:studioId/compensation-line-items`               | List with optional `target_type`, `target_id`, `item_type`, date, and pagination filters         | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/compensation-line-items/:lineItemId` | Update `amount`, `item_type`, `reason`, `metadata`; target is immutable                          | `ADMIN`, `MANAGER` |
| `DELETE /studios/:studioId/compensation-line-items/:lineItemId` | Soft delete                                                                                    | `ADMIN`, `MANAGER` |

The studio API is flat because compensation line items are the resource being created and mutated. Show, show-creator, shift, and shift-block workflows still mount target-scoped panels, but those panels call the same studio collection with explicit target fields instead of using deeply nested parent routes.

All studio line-item routes restrict access to `STUDIO_ROLE.ADMIN` and `STUDIO_ROLE.MANAGER` regardless of who can read the parent target. `TALENT_MANAGER` may read assignments today but does not get write access to compensation line items in 2.2; widening the role surface is a Phase 5 product call.

### Task 5: creator mapping contracts

| Endpoint | Change | Roles |
| -------- | ------ | ----- |
| `GET /studios/:studioId/creators/catalog` and availability lookup | Include roster defaults (`default_rate`, `default_rate_type`, `default_commission_rate`) so new assignments can snapshot creator defaults server-side and future compensation review views can display defaults | existing creator mapping roles |
| `POST /studios/:studioId/shows/:showId/creators/bulk-assign` | Accept `creators[]` objects for assignment membership only. The endpoint must not create initial compensation line items from assignment payloads. | existing creator mapping write roles |
| `GET /studios/:studioId/shows/:showId/creators` | Return `id` as the `ShowCreator` assignment UID for `SHOW_CREATOR` line-item targeting | existing creator mapping read roles |
| `GET /studios/:studioId/shows/:showId/creators/compensation-summary` | Return backend-calculated base, adjustment, creator total, show total, and unresolved reason data for assigned MCs | existing creator mapping read roles |

Task 5 does not add `SHOW`, task, shift, or shift-block compensation UI contracts. Those targets remain available at the flat line-item API layer for future workflow slices, but the creator mapping UX uses only `target_type=SHOW_CREATOR` with `target_id=<showCreatorAssignmentUid>`.

Bulk creator assignment is intentionally not a compensation edit contract. Base compensation snapshots come from creator roster defaults unless a dedicated assignment-compensation edit workflow supplies explicit terms. A later creator-based compensation review can add date-ranged read/write contracts for one creator's show assignments without overloading the multi-show assignment endpoint.

### PR 3: actuals and snapshot readiness

Actuals are added to the existing update routes rather than introduced as separate sub-resources. This keeps a single write path per resource and avoids two endpoints racing on the same row.

| Endpoint                                                   | Change                                                                                                          | Roles                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `PATCH /studios/:studioId/shows/:showId`                   | Accept optional `actual_start_time` / `actual_end_time` in `UpdateStudioShowDto`; null clears the field         | `STUDIO_SHOW_WRITE_ACCESS_ROLES` (ADMIN, MANAGER) |
| `PATCH /studios/:studioId/shifts/:shiftId/blocks/:blockId` | Accept optional `actual_start_time` / `actual_end_time` on the existing block update DTO; null clears the field | `ADMIN`, `MANAGER`                                |
| existing show-creator assignment update                    | Append audit when `agreed_rate`, `compensation_type`, or `commission_rate` changes                              | existing roles                                    |
| existing shift update                                      | Append audit when `hourly_rate` changes                                                                         | existing roles                                    |

If the existing shift-block update route does not yet exist in `apps/erify_api/src/studios/studio-shift/`, this PR introduces it as a normal block update endpoint that includes actuals fields in its DTO. There is no separate `/actuals` sub-resource.

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
- `createStudioCompensationLineItemInputSchema`
- `listStudioCompensationLineItemsQuerySchema`
- `updateCompensationLineItemInputSchema`
- `listCompensationLineItemsQuerySchema`
- `compensationLineItemApiResponseSchema`
- `compensationLineItemListResponseSchema`

Show and shift actuals are folded into the existing update DTOs in their resource folders:

- `packages/api-types/src/shows/schemas.ts` — `updateStudioShowInputSchema` gains optional `actual_start_time` / `actual_end_time` (nullable to support clear).
- `packages/api-types/src/studio-shifts/schemas.ts` — the shift-block update schema gains the same two fields.

Field names stay resource-specific in their containing schema. Future `ShowCreator` participation actuals or `ShowPlatform` performance actuals get their own scoped fields on those resources when introduced; they are not aliases of show actuals.

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

- `apps/erify_api/src/studios/studio-compensation-line-item/` owns the flat studio line-item collection.
- `apps/erify_api/src/studios/studio-show/` extends the existing `PATCH /shows/:id` route to accept show actuals.
- `apps/erify_api/src/studios/studio-shift/` extends the existing block update route (or adds it if absent) to accept block actuals.
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
3. Resolve the target through `LineItemTargetResolver`. Each target type traverses to its owning studio:
   - `SHOW` → load `Show` and read `Show.studioId`. Reject if `studioId IS NULL` (orphan / client-only show) with `LINE_ITEM_TARGET_NOT_FOUND`.
   - `SHOW_CREATOR` → load `ShowCreator`, then its `Show`, then `Show.studioId`. Same orphan rule.
   - `STUDIO_SHIFT` → load `StudioShift` and read its `studioId` (NOT NULL).
   - `STUDIO_SHIFT_BLOCK` → load `StudioShiftBlock`, then its `StudioShift`, then `studioId`.
4. Reject missing, soft-deleted, or cross-studio (resolved studio ≠ caller scope) targets with `LINE_ITEM_TARGET_NOT_FOUND`.
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

### Set/clear actuals (within the existing show / shift-block update routes)

1. Load the show or shift block scoped to the route studio.
2. If `actual_start_time` or `actual_end_time` is present in the payload, treat it as a write (including explicit `null` to clear).
3. Allow either side to be `null` independently.
4. If both actual timestamps end up non-null after the update, reject `actual_end_time <= actual_start_time`.
5. Persist the actual fields directly. No actuals audit table ships in 2.2.
6. Actuals writes coexist with other field writes in the same `PATCH` because there is one update path per resource. Snapshot-audit append (below) still triggers only on snapshot fields.

### Snapshot edit on assignment / shift

1. Load the row in the transaction.
2. Diff incoming payload against the loaded snapshot fields. Use `Prisma.Decimal.equals()` for `agreedRate`, `commissionRate`, and `hourlyRate` to avoid string/precision false positives:
   - `ShowCreator.{agreedRate, compensationType, commissionRate}`
   - `StudioShift.hourlyRate`
3. For each changed snapshot field, append one entry to `metadata.audit.snapshot_overrides[]` (array, chronological):

   ```jsonc
   {
     "field": "agreed_rate",
     "old_value": "120.00",          // Decimal serialized as string; null if cleared
     "new_value": "150.00",
     "actor_ext_id": "user_abc123",  // string ext id, never internal BigInt
     "at": "2026-05-09T08:30:00.000Z",
     "reason": "operator note text"  // optional; only present if supplied
   }
   ```
4. Persist field changes and metadata in one update.
5. Non-snapshot fields update normally with no audit append.
6. The single-object `metadata.audit.last_transition` pattern from `task.service.ts` is intentionally not reused here. Snapshot edits benefit from full ordered history, and the array shape is documented as the canonical snapshot-audit format.
7. **Service-layer guard on explicit `StudioShift.hourly_rate` edits (PR 3.5):** in `studio-shift.service.ts#updateShift`, if `payload.hourlyRate !== undefined` AND the resulting `snapshotChanges` is non-empty AND `payload.overrideReason` is missing or blank, throw `HttpError.badRequest('override_reason is required when hourly_rate changes')`. The narrow `payload.hourlyRate !== undefined` predicate excludes reassignment-driven rate changes (different `user_id` with no explicit rate) — those continue to flow through and silently append the audit entry without a reason.
8. **Helper no-op tolerance (PR 3.5):** `appendSnapshotAudit` no longer throws when a reason is supplied alongside zero changes. It silently ignores the reason and returns metadata unchanged. The audit log has nothing to append to in that case, so rejecting the call was hostile to a common no-op edit shape (manager re-submits an unchanged value with a justification). This affects both shift and `ShowCreator` agreement edit flows.

## No Historical Repair

2.2 does not normalize or backfill existing `ShowCreator` rows. Rows without reliable snapshots remain unresolved or pending for later economics reads. New assignment writes should persist explicit/resolved snapshots when available; if a snapshot cannot be resolved, the write can mark `metadata.flags.agreement_snapshot_missing = true` so 2.3 can report a precise unresolved reason.

## Error Contract

| Code                           | HTTP | Meaning                                                                                                                   |
| ------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| `LINE_ITEM_NOT_FOUND`          | 404  | UID missing, soft-deleted, or outside caller scope                                                                        |
| `LINE_ITEM_TARGET_NOT_FOUND`   | 404  | Attached entity missing, soft-deleted, outside studio, or unable to resolve a studio scope (e.g. `Show.studioId IS NULL`) |
| `LINE_ITEM_AMOUNT_REQUIRED`    | 422  | Missing or non-numeric `amount`                                                                                           |
| `LINE_ITEM_REASON_REQUIRED`    | 422  | Missing or whitespace-only `reason`                                                                                       |
| `SHOW_NOT_FOUND`               | 404  | Show missing or outside studio                                                                                            |
| `SHIFT_BLOCK_NOT_FOUND`        | 404  | Block missing or outside studio                                                                                           |
| `SHOW_ACTUALS_INVERTED`        | 422  | `actual_end_time <= actual_start_time` when both present                                                                  |
| `SHIFT_BLOCK_ACTUALS_INVERTED` | 422  | Same for block actuals                                                                                                    |

Unsupported `target_type` values are rejected by Zod enum validation as `400` before reaching the service, so a dedicated business-error code is unnecessary.

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
- Cleanup PR ([#72](https://github.com/allenlin90/eridu-services/pull/72)): shift create/update/calendar flows no longer read or write `projectedCost` / `calculatedCost`; `planned_cost` / `actual_cost` are computed at serialize time from current shift inputs.
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
- Cleanup PR ([#72](https://github.com/allenlin90/eridu-services/pull/72)) removed `StudioShift.projectedCost` / `StudioShift.calculatedCost` via migration `20260516094040_drop_studio_shift_cost_columns`.

## Rollout Notes

- **PR dependency order is not flat.** PR 1A is a hard prerequisite for PR 2 (studio line-item APIs reuse the model and contracts) and for PR 3 only where line items appear in actuals-related tests. PR 4 depends on PR 2 + PR 3. PR 5 depends on PR 2 + PR 3.
- PR 1A and PR 3 can land in either order; both are independent of each other once contracts are merged.
- Frontend workflow PRs (PR 1B, PR 4, PR 5) follow the corresponding backend API PRs.
- The shift cost cleanup PR ([#72](https://github.com/allenlin90/eridu-services/pull/72)) coordinated the `NOT NULL` removal of `StudioShift.projectedCost` with every BE writer, every FE consumer, and the matching fixture cleanup in a single migration.
- No data backfill command exists for 2.2.
