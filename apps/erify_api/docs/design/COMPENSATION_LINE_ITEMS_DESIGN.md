# Compensation Line Items + Actuals Backend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
> **Canonical semantics**: [`docs/prd/economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)
> **Depends on**: 1.2 Studio Creator Roster ✅ · 1.3 Studio Member Roster ✅ · 1.5 Studio Show Management ✅ · 2.1 Economics Cost Model ✅
> **Gates**: 2.3 Economics Service

## Purpose

2.2 persists the cost inputs that the 2.3 economics service will read. It is **not** a calculator and **not** a payment workflow.

This design covers:

- A polymorphic `CompensationLineItem` model with event-attached supplemental cost rows.
- Nullable show actuals (`Show.actualStartTime`/`Show.actualEndTime`) and shift-block actuals (`StudioShiftBlock.actualStartTime`/`StudioShiftBlock.actualEndTime`).
- Snapshot-override audit append on existing `ShowCreator` agreement edits and `StudioShift.hourlyRate` edits, using the existing `metadata` JSON column.
- One-time normalization of legacy `ShowCreator` rows missing snapshot fields, plus a write-path fix so future assignments persist resolved snapshots.
- Removal of `StudioShift.projectedCost` and `StudioShift.calculatedCost` (2.3 computes projection live).

This design does **not** introduce: cost arithmetic, settlement state, freeze guards, grace windows, dedicated audit tables, sign enforcement, generated base-compensation rows, standing/schedule-scoped/global/recurring line items, or notifications. Each is deferred per [`economics-cost-model.md §4`](../../../../docs/prd/economics-cost-model.md#4-future-extensions).

## Out of Scope (restated from PRD)

To keep the implementation aligned with Phase 4:

- No `effectiveDate` column; date inclusion derives from the attached event.
- No `CompensationLineItem` rows for normal base show compensation or normal base shift labor.
- No actuals approval, settlement, freeze, or grace fields.
- No dedicated actuals audit table.
- No type-based sign enforcement (`DEDUCTION < 0`, etc.).
- No standing, schedule-scoped, global, recurring, HR, or payment-system line items.
- No payment processing, bank reconciliation, acknowledgement, dispute, or recipient adjustment.

## Hard Invariants

1. **Polymorphic attachment with typed FKs.** `CompensationLineItem` uses a `targetType` enum discriminator plus a generic `targetId BigInt` *and* nullable typed FK columns (`showId`, `showCreatorId`, `studioShiftId`, `studioShiftBlockId`). Unsupported target types are rejected at write time. Pattern mirrors `TaskTarget`.
2. **Money is `Prisma.Decimal` end-to-end.** `amount` is signed `Decimal(12, 2)`, serialized as a string at the API boundary. **No sign enforcement** in Phase 4.
3. **`reason` is required.** Stored as plain text and returned in read responses. Empty/whitespace is rejected.
4. **Date inclusion derives from the attached event.** No `effectiveDate` column. The 2.3 calculator filters line items by the attached event's time.
5. **Base compensation is never persisted as a line item.** 2.3 generates base rows from `ShowCreator` and `StudioShift` snapshots. 2.2 must reject any client attempt to label a base amount as a line item by virtue of having no API surface for it.
6. **Show/block actuals are nullable, free-write.** No approval, freeze, settlement, or grace fields ship in 2.2.
7. **Snapshot-override audits append to `metadata.audit.snapshot_overrides[]`.** No separate audit table. The array carries `{field, old, new, actorId, at, reason?}` per edit. The existing `metadata` column is the audit.
8. **External APIs use UIDs only.** Internal BigInt IDs never leave the service boundary. Path params and request bodies use `*_uid` fields and pass through `UidValidationPipe`.
9. **Aggregation reads exclude soft-deleted rows by default.** `includeDeleted` is permitted only on admin/audit surfaces (2.2 does not introduce one).
10. **Mutations run inside `@Transactional()`.** Snapshot-override audit append, target resolution, and the underlying write are atomic.

## Actuals Scope Reference

This design follows [`economics-cost-model.md` actual ownership and scope](../../../../docs/prd/economics-cost-model.md#actual-ownership-and-scope): actual timestamps are recorded facts stored on the narrowest entity whose fact they represent. This 2.2 wave only adds overall show actuals and shift-block labor actuals. Future creator-participation actuals belong on `ShowCreator`; future platform stream/performance actuals belong on `ShowPlatform` or a platform metrics child model.

## Schema Additions

All migrations are generated through Prisma tooling per repo rule; no hand-written SQL.

### New model: `CompensationLineItem`

| Column               | Type                             | Notes                                               |
| -------------------- | -------------------------------- | --------------------------------------------------- |
| `id`                 | `BigInt`                         | PK, internal only                                   |
| `uid`                | `String`                         | `cli_<nanoid>`; unique; external ID                 |
| `studioId`           | `BigInt`                         | FK to `Studio`; required                            |
| `amount`             | `Decimal(12, 2)`                 | Signed; required                                    |
| `itemType`           | `CompensationItemType`           | enum                                                |
| `reason`             | `String`                         | required, trimmed, non-empty                        |
| `targetType`         | `CompensationLineItemTargetType` | discriminator enum                                  |
| `targetId`           | `BigInt`                         | generic reference; matches the typed FK that is set |
| `showId`             | `BigInt?`                        | typed FK; set iff `targetType = SHOW`               |
| `showCreatorId`      | `BigInt?`                        | typed FK; set iff `targetType = SHOW_CREATOR`       |
| `studioShiftId`      | `BigInt?`                        | typed FK; set iff `targetType = STUDIO_SHIFT`       |
| `studioShiftBlockId` | `BigInt?`                        | typed FK; set iff `targetType = STUDIO_SHIFT_BLOCK` |
| `createdById`        | `BigInt`                         | FK to `User`                                        |
| `metadata`           | `Json @default("{}")`            | reserved for future flags                           |
| `createdAt`          | `DateTime`                       |                                                     |
| `updatedAt`          | `DateTime`                       |                                                     |
| `deletedAt`          | `DateTime?`                      | soft-delete                                         |

Constraints and indexes:

- `@@unique([uid])`
- `@@index([studioId, deletedAt])`
- `@@index([targetType, targetId, deletedAt])` — generic polymorphic lookup
- single-column index on each typed FK for relation-aware reads
- check (application-level, not DB) that exactly one typed FK is non-null and matches `targetType`

Relations:

- `studio Studio @relation(...)`
- `show Show? @relation(fields: [showId], references: [id])`
- `showCreator ShowCreator? @relation(fields: [showCreatorId], references: [id])`
- `studioShift StudioShift? @relation(fields: [studioShiftId], references: [id])`
- `studioShiftBlock StudioShiftBlock? @relation(fields: [studioShiftBlockId], references: [id])`
- `createdBy User @relation(fields: [createdById], references: [id])`

### New enums

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

### `Show` (additions)

- `actualStartTime DateTime?`
- `actualEndTime DateTime?`

### `StudioShiftBlock` (additions)

- `actualStartTime DateTime?`
- `actualEndTime DateTime?`

### `StudioShift` (removals)

- Drop `projectedCost`.
- Drop `calculatedCost`.

Both columns are removed in the same migration. Producers and consumers are updated in the same change set (see §Mutation Rules and §Implementation Shape).

## API Surface

| Endpoint                                                           | Purpose                                                                                                 | Roles              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------ |
| `POST /studios/:studioId/compensation-line-items`                  | Create line item                                                                                        | `ADMIN`, `MANAGER` |
| `GET /studios/:studioId/compensation-line-items`                   | List with filters: `target_type`, `target_uid`, `item_type`, `from`, `to`, `created_by_uid`, pagination | `ADMIN`, `MANAGER` |
| `GET /studios/:studioId/compensation-line-items/:lineItemId`       | Read one                                                                                                | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/compensation-line-items/:lineItemId`     | Update `amount`, `item_type`, `reason` (target is immutable)                                            | `ADMIN`, `MANAGER` |
| `DELETE /studios/:studioId/compensation-line-items/:lineItemId`    | Soft delete                                                                                             | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/shows/:showId/actuals`                   | Set/clear `actual_start_time`/`actual_end_time`                                                         | `ADMIN`, `MANAGER` |
| `PATCH /studios/:studioId/shifts/:shiftId/blocks/:blockId/actuals` | Set/clear block actuals                                                                                 | `ADMIN`, `MANAGER` |

Existing endpoints that gain audit-append behavior (no path/role change):

| Endpoint                                                        | Audit trigger                                                         |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `PATCH /studios/:studioId/shows/:showId/creators/:assignmentId` | When `agreed_rate`, `compensation_type`, or `commission_rate` changes |
| `PATCH /studios/:studioId/shifts/:shiftId`                      | When `hourly_rate` changes                                            |

All paths use `@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])` and `@StudioParam()`. UID path params pass through `UidValidationPipe` with the appropriate prefix.

## Contract Strategy

Add a new shared resource folder:

- `packages/api-types/src/compensation-line-items/`
  - `schemas.ts` — Zod schemas:
    - `compensationLineItemTargetSchema` (discriminated union of `{target_type, target_uid}`)
    - `createCompensationLineItemInputSchema`
    - `updateCompensationLineItemInputSchema`
    - `listCompensationLineItemsQuerySchema`
    - `compensationLineItemApiResponseSchema`
    - `compensationLineItemListResponseSchema`
  - `index.ts`

Show and shift actuals reuse the existing show/shift schema folders by adding:

- `packages/api-types/src/shows/schemas.ts` → `setShowActualsInputSchema`
- `packages/api-types/src/studio-shifts/schemas.ts` → `setStudioShiftBlockActualsInputSchema`

NestJS DTOs created via `createZodDto()` live next to the controllers, per repo convention.

`amount` round-trips as a `string` at the API boundary; the schema accepts a numeric string and the response serializer emits a numeric string from the underlying `Prisma.Decimal`.

## Mutation Rules

### Create line item

1. Resolve studio scope from route + `@StudioProtected`.
2. Validate body schema. Reject empty/whitespace `reason` and missing `amount` with the typed errors below.
3. Resolve target via `LineItemTargetResolver.resolve(studioId, targetType, targetUid)`:
   - Look up the typed entity by UID with the matching repository.
   - Reject when the entity is missing, soft-deleted, or scoped to a different studio.
   - Reject `targetType` values outside the supported enum.
4. In one transaction: insert the line-item row with both `targetId` and the matching typed FK populated, and the un-set typed FKs as `null`.
5. Return the freshly read row through the standard response shape.

### Update line item

1. Load the line item scoped to studio. Return `LINE_ITEM_NOT_FOUND` if missing/soft-deleted.
2. Apply allowed field changes only: `amount`, `item_type`, `reason`. Target columns are immutable.
3. Persist and return.

### Soft delete

1. Load + studio scope check.
2. Set `deletedAt = now()`. Soft-deleted rows are excluded from default reads and from any 2.3 calculator inputs.

### Set/clear show actuals

1. Load show scoped to studio. Return `SHOW_NOT_FOUND` if missing.
2. If both new actuals are provided, reject when `actual_end_time <= actual_start_time` with `SHOW_ACTUALS_INVERTED`. Either side may be `null` independently.
3. Persist `actualStartTime`/`actualEndTime` directly on `Show`. No audit append in 2.2 (PRD-aligned: actuals are plain nullable facts).

### Set/clear shift-block actuals

1. Load block scoped to studio (via parent shift). Return `SHIFT_BLOCK_NOT_FOUND` if missing.
2. Validate inverted-range as above with `SHIFT_BLOCK_ACTUALS_INVERTED`.
3. Persist on `StudioShiftBlock`.

### Snapshot edit on existing assignment / shift

Applies inside the existing `PATCH /studios/:studioId/shows/:showId/creators/:assignmentId` and `PATCH /studios/:studioId/shifts/:shiftId` flows.

1. Load the row inside the transaction.
2. Diff incoming payload against the loaded row for the snapshot fields:
   - `ShowCreator.{agreedRate, compensationType, commissionRate}`
   - `StudioShift.hourlyRate`
3. For each changed snapshot field, build an entry: `{field, old, new, actorId, at: now, reason?}` (reason comes from an optional `override_reason` body field).
4. Call `appendSnapshotAudit(row.metadata, entries)` to produce the new metadata JSON.
5. Persist the field change *and* the new metadata in the same `update`.
6. Non-snapshot fields update normally with no audit append.

If no snapshot field changed, the transaction does not write to `metadata`.

## Polymorphic Attachment Resolution

Implement `LineItemTargetResolver` inside the line-item repository module, mirroring how `task-target.repository.ts` encapsulates cross-model joins.

Resolution table:

| `targetType`         | Lookup repository                      | Typed FK column populated |
| -------------------- | -------------------------------------- | ------------------------- |
| `SHOW`               | `ShowRepository.findByUid`             | `showId`                  |
| `SHOW_CREATOR`       | `ShowCreatorRepository.findByUid`      | `showCreatorId`           |
| `STUDIO_SHIFT`       | `StudioShiftRepository.findByUid`      | `studioShiftId`           |
| `STUDIO_SHIFT_BLOCK` | `StudioShiftBlockRepository.findByUid` | `studioShiftBlockId`      |

In every case, resolution must:

- assert the resolved entity belongs to the calling studio (transitively for `SHOW_CREATOR` / `STUDIO_SHIFT_BLOCK`);
- reject soft-deleted entities;
- reject unsupported target types with `LINE_ITEM_TARGET_UNSUPPORTED`.

The resolver returns `{targetId, showId?, showCreatorId?, studioShiftId?, studioShiftBlockId?}` with exactly one typed FK set. The line-item write composes those columns directly.

## Snapshot-Override Audit Helper

New utility:

- `apps/erify_api/src/lib/audit/snapshot-audit.helper.ts`
  - `appendSnapshotAudit(metadata: Prisma.JsonValue | null, entries: SnapshotAuditEntry[]): Prisma.JsonObject`
  - Reads existing `metadata.audit.snapshot_overrides` (defaults to `[]` if absent), pushes new entries in order, returns the merged object preserving any other `metadata` keys.
  - Pure function; no DB access.

`SnapshotAuditEntry`:

```ts
type SnapshotAuditEntry = {
  field: string;          // e.g., "agreedRate"
  old: string | number | null;
  new: string | number | null;
  actorId: string;        // user external id
  at: string;             // ISO timestamp
  reason?: string;
};
```

The shape mirrors the existing task `metadata.audit.last_transition` precedent in [`apps/erify_api/src/models/task/task.service.ts`](../../src/models/task/task.service.ts#L257-L278) but uses an array under `metadata.audit.snapshot_overrides` because multiple edits per row are expected.

`Decimal` values are serialized to string before append so the JSON column stays stable across re-reads.

## Existing Assignment Normalization

Some `ShowCreator` rows pre-date the requirement to persist resolved snapshot fields. They must be normalized once before 2.3 reads them.

Implementation:

- New script: `apps/erify_api/src/scripts/normalize-show-creator-snapshots.ts`
- Runnable as a one-shot NestJS commander command (`pnpm --filter erify_api exec ts-node src/scripts/normalize-show-creator-snapshots.ts`).
- Behavior:
  1. Find all `ShowCreator` rows where any of `agreedRate`/`compensationType`/`commissionRate` is `null` and `deletedAt IS NULL`.
  2. For each, look up the matching `StudioCreator` (same `studioId` + `creatorId`).
  3. If `StudioCreator` defaults exist:
     - Backfill the missing snapshot fields from `defaultRate` / `defaultRateType` / `defaultCommissionRate`.
     - Append `{source: "wave_2_normalization", at, reason: "backfilled from current StudioCreator defaults"}` to `metadata.audit.snapshot_overrides[]`.
  4. If defaults are absent or partial:
     - Leave `null` values in place.
     - Set `metadata.flags.agreement_snapshot_missing = true` so 2.3 emits `agreement_snapshot_missing` for the row.
- Idempotent: rows already carrying the `wave_2_normalization` audit entry or the `agreement_snapshot_missing` flag are skipped.
- Outputs a summary report: total scanned, backfilled, marked unresolved, skipped.

This is **not** wired into application boot. It runs once per environment and is documented in the deployment runbook for the 2.2 release.

## Snapshot Persistence on New Assignments

Today, `apps/erify_api/src/show-orchestration/show-orchestration.service.ts` (lines 193–312, 418–459, 469–511) passes `agreedRate` / `compensationType` / `commissionRate` straight through from input. Defaults are not auto-applied. 2.2 must close that gap so future `ShowCreator` rows are written with resolved snapshots.

Required changes:

- In `bulkAssignCreatorsToShow`, `createShowPayload`, and `syncShowCreators`:
  - When the caller omits any of the three snapshot fields, resolve from the matching `StudioCreator` defaults.
  - When defaults are partial/absent for a particular creator, persist the explicit nulls **and** set `metadata.flags.agreement_snapshot_missing = true` on that `ShowCreator` row.
  - When the caller explicitly provides a value (including explicit `null` if the API allows it), use the provided value and do not auto-default.

The same `StudioCreator` lookup helper feeds both the normalization script and the orchestration write path.

## Drop `StudioShift.projectedCost` / `calculatedCost`

Migration removes both columns. Producers and consumers updated in the same PR:

- `apps/erify_api/src/models/studio-shift/studio-shift.service.ts` (currently lines 43–78) — drop `projectedCost` calculation and persistence; drop `calculatedCost` references.
- `apps/erify_api/src/models/studio-shift/studio-shift.repository.ts` — drop both columns from create/update payloads and selectors.
- Any service or controller surfacing those values in responses — remove the field from the response schema in `@eridu/api-types/studio-shifts/schemas.ts`.
- Any frontend consumer (handled in the FE design).

`StudioShift.hourlyRate` snapshot-from-membership behavior is unchanged and correct.

## Error Contract

| Code                           | HTTP | Meaning                                                  |
| ------------------------------ | ---- | -------------------------------------------------------- |
| `LINE_ITEM_NOT_FOUND`          | 404  | UID missing, soft-deleted, or outside studio             |
| `LINE_ITEM_TARGET_NOT_FOUND`   | 404  | Attached entity missing, soft-deleted, or outside studio |
| `LINE_ITEM_TARGET_UNSUPPORTED` | 422  | `target_type` outside the supported enum                 |
| `LINE_ITEM_AMOUNT_REQUIRED`    | 422  | Missing or non-numeric `amount`                          |
| `LINE_ITEM_REASON_REQUIRED`    | 422  | Missing or whitespace-only `reason`                      |
| `SHOW_NOT_FOUND`               | 404  | Existing code; reused for actuals route                  |
| `SHIFT_BLOCK_NOT_FOUND`        | 404  | Block missing or outside studio                          |
| `SHOW_ACTUALS_INVERTED`        | 422  | `actual_end_time <= actual_start_time` when both present |
| `SHIFT_BLOCK_ACTUALS_INVERTED` | 422  | Same for block actuals                                   |

Validation library errors are mapped through the existing `HttpError` utility per repo convention.

## Authorization

- All 2.2 surfaces use `@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])` plus `@StudioParam()`.
- No new roles, decorators, or self-access endpoints are introduced — recipient `/me/` reads ship with 2.3.
- Snapshot-override audit append is allowed for both `ADMIN` and `MANAGER` per PRD.

## Implementation Shape

```text
apps/erify_api/src/models/compensation-line-item/
  ├── compensation-line-item.module.ts
  ├── compensation-line-item.service.ts
  ├── compensation-line-item.repository.ts
  ├── line-item-target.resolver.ts
  └── schemas/
        ├── line-item-payload.schema.ts
        └── ...

apps/erify_api/src/studios/studio-compensation-line-item/
  ├── studio-compensation-line-item.controller.ts
  ├── studio-compensation-line-item.module.ts
  └── schemas/

apps/erify_api/src/lib/audit/snapshot-audit.helper.ts

apps/erify_api/src/scripts/normalize-show-creator-snapshots.ts
```

Modifications, not new modules:

- `apps/erify_api/src/studios/studio-show/` — add the `PATCH .../actuals` route; thread snapshot-audit append through the existing assignment edit flow.
- `apps/erify_api/src/studios/studio-shift/` — add the `PATCH .../blocks/:blockId/actuals` route; thread snapshot-audit append through the existing shift edit flow.
- `apps/erify_api/src/models/studio-shift/` — drop projection/calculated cost.
- `apps/erify_api/src/show-orchestration/show-orchestration.service.ts` — close the snapshot-resolution gap.

Reuse, do not fork:

- `TaskTargetRepository` patterns for cross-model lookup encapsulation.
- `UidValidationPipe`, `@StudioProtected`, `@StudioParam`, `@CurrentUser` from existing infrastructure.
- Existing soft-delete helpers and `@Transactional()` flow (do not thread `tx` manually).

## Testing

Per Architecture Guardrail 7, fixture-based tests must cover the line-item polymorphic write/read paths and the snapshot-audit append. 2.3 calculator tests in the next workstream will consume fixtures produced here.

Unit / integration coverage targets:

- Line item create/list/update/soft-delete per supported `target_type`.
- Reject unsupported target type, cross-studio target, missing target.
- Signed amount round-trips as string at the API boundary; negative `BONUS` and positive `DEDUCTION` are accepted.
- Required-reason and required-amount validation.
- Show actuals: set both, set one, clear both, clear one, inverted range.
- Block actuals: same matrix.
- Snapshot edit on `ShowCreator.agreedRate` appends a single audit entry with `old`/`new` decimals serialized as strings.
- Snapshot edit that touches multiple snapshot fields appends one entry per field in deterministic order.
- Non-snapshot edit on the same row does not append.
- Optional `override_reason` body field flows through to the audit entry.
- Normalization script: idempotent on re-run; backfills when defaults exist; flags as missing when defaults absent.
- Orchestration write path: omit-snapshot creates with default-resolved values; omit-snapshot creates flags `agreement_snapshot_missing` when defaults absent; explicit input overrides defaults.
- `StudioShift` writes no longer touch `projectedCost`/`calculatedCost`.
- Soft-deleted line items are excluded from default reads.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api test`
- `pnpm --filter erify_api build`

Migration smoke (local):

- `pnpm --filter erify_api prisma:generate`
- Apply the new migration on a clean test DB; confirm `Show.actualStartTime/EndTime`, `StudioShiftBlock.actualStartTime/EndTime`, `CompensationLineItem`, both new enums exist, and `StudioShift.projectedCost`/`calculatedCost` are gone.
- Run `normalize-show-creator-snapshots.ts` against a seeded fixture twice; confirm idempotency.
