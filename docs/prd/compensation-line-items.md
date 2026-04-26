# PRD: Compensation Line Items + Freeze + Actuals + Approval + Grace (2.2)

> **Status: Visioning.** This document was drafted before [Phase 4 was simplified to a read-only viewer](./economics-cost-model.md). Treat as roadmap and future-feature reference, not a committed design — it will be redrafted when this workstream activates. Where this document conflicts with [`economics-cost-model.md`](./economics-cost-model.md), the cost model wins for Phase 4 scope. In particular, freeze guards, settlement, grace windows, and a separate audit table are **not** in Phase 4.

> **Status**: 🔲 Planned
> **Phase**: 4 — Wave 2 (Cost Foundation)
> **Workstream**: First L-side code. Compensation line items + service-layer freeze guards + show / shift-block actuals + actuals priority cascade + actuals approval + grace-time settings + three first-class compensation views via the existing `/me/` module.
> **Depends on**: 1.2 Studio Creator Roster ✅ · 1.3 Studio Member Roster ✅ · 1.5 Studio Show Management ✅ · 2.1 Economics Cost Model ([PRD](./economics-cost-model.md)) — canonical contract / freeze / cascade / approval / grace / view semantics
> **Architecture**: Phase 4 [Architecture Guardrails](../roadmap/PHASE_4.md#architecture-guardrails) — Prisma.Decimal, enum discriminators, snapshot-on-write, soft-delete, `/me/` module pattern

## Purpose

Phase 4's first code workstream. It implements the contract model defined in 2.1 by:

1. **Compensation line items** — flat monetary records for bonuses, allowances, OT premiums, deductions, and other supplemental cost items, attached polymorphically to a `StudioMembership` or `StudioCreator` association.
2. **Freeze guards** — service-layer write enforcement that locks agreement fields and pre-existing line items at each entity's time boundary (`Show.endTime` for show agreements; shift end for shift agreements).
3. **Show + shift-block actuals** — `Show.actualStartTime` / `actualEndTime` and `StudioShiftBlock.actualStartTime` / `actualEndTime`.
4. **Actuals priority cascade resolution** — show-time and shift-block-time cascades per 2.1 §4.
5. **Actuals approval** — separate single-flag approval for show actuals (`Show.actualsApprovedAt`) and shift actuals (`StudioShift.actualsApprovedAt`) per 2.1 §6. Compensation calculation uses approved actuals only.
6. **Grace time** — per-entity studio-configurable tolerance windows per 2.1 §7.
7. **Three first-class compensation views** — creator and operator self-review under `/me/`, plus cross-user views under studio-scoped routes.
8. **Drop `StudioShift.projectedCost`** — projection arithmetic is computed live from `hourlyRate × scheduled minutes`, not stored.

The economics service (2.3) consumes this surface to compute per-show / per-schedule / per-client economics. 2.2 does not own the aggregation engine; it owns the data model + per-target views + the freeze + the actuals cascade + approval + grace.

## Non-Goals

- Aggregation engine for per-show / per-schedule / per-client economics — owned by 2.3.
- Manager-facing perspective-based review/export workspace — owned by 3.1.
- Calculation rules / formulas / automated OT detection — Phase 5 (Advanced Compensation Engine).
- Formula storage in `metadata`.
- Revenue-based commission computation — Wave 4.
- Double-entry accounting / general ledger.
- Payroll generation — line items are cost visibility, not payment instructions.
- Bulk import (CSV upload) — deferred.
- Full DRAFT/APPROVED/LOCKED actuals workflow with review inbox — Phase 4 ships single-flag approval only (2.1 §6).
- Payment-term boundary lock for standing/schedule items — Phase 5.
- Platform-feed and creator-app actuals sources — Phase 5+ (forward-compatible API per 2.1 §4).
- Schedule-scoped cost in operational economics — deferred. Schedule-scoped items remain visible in compensation list/breakdown endpoints, but 2.3 does not roll them into schedule/client operational economics in Phase 4.

## Users

- **Studio ADMIN**: full CRUD on line items (pre and post-freeze); enter actuals; approve / reopen actuals; toggle the studio settings; configure grace windows.
- **Studio MANAGER**: create / update line items pre-freeze; create post-freeze line items if studio setting allows; enter actuals; approve actuals (cannot reopen); read-only access to all compensation views.
- **Studio members**: view their own compensation breakdown via `/me/compensation/operator`.
- **Studio creators**: view their own compensation summary via `/me/compensation/creator`. TALENT_MANAGER can view any creator's view via the studio-scoped route.

## Existing Infrastructure

| Model / Endpoint                   | Current Behavior                                                                                  | Status                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `StudioMembership`                 | `baseHourlyRate` — sole member rate input                                                         | ✅ Exists                                                                                         |
| `StudioCreator`                    | `defaultRate`, `defaultRateType`, `defaultCommissionRate` — creator compensation defaults         | ✅ Exists                                                                                         |
| `ShowCreator`                      | `agreedRate`, `compensationType`, `commissionRate` — per-show agreement snapshot fields           | ✅ Exists (nullable fields stay for flexibility; app writes snapshot resolved terms)              |
| `StudioShift` / `StudioShiftBlock` | `hourlyRate`, scheduled `startTime` / `endTime` per block; `projectedCost` field is being dropped | ✅ Exists; needs shift approval + block actuals + drop `projectedCost` (this PRD)                 |
| `Show`                             | Scheduled `startTime` / `endTime`                                                                 | Needs `actualStartTime` / `actualEndTime` + `actualsApprovedAt` / `actualsApprovedBy` (this PRD) |
| `Studio`                           | Settings store (existing or via this PRD)                                                         | Needs `allowManagerCorrections` + 4 grace settings (this PRD)                                    |
| `/me/` module                      | `me-task`, `profile`, `shifts`, `shows`                                                           | ✅ Existing pattern; this PRD adds `me-compensation`                                              |
| `TaskTarget`                       | Polymorphic pattern reference (string discriminator; not migrated)                                | ✅ Exists (grandfathered)                                                                         |
| Economics endpoints                | Implemented greenfield by 2.3 against 2.1 semantics                                               | 🔲 Planned                                                                                        |

## Design Decisions

### Single-entry cost journal, not double-entry ledger

This system tracks **cost inputs for P&L visibility**, not financial accounting. The question is "what did this show cost us?" — not "where did money flow between accounts?"

| Concern           | Double-entry ledger                  | This system                                    |
| ----------------- | ------------------------------------ | ---------------------------------------------- |
| Core invariant    | Debits = Credits across all accounts | Cost items sum correctly per show/target       |
| Account structure | Chart of accounts                    | None — costs attributed to shows/targets       |
| Transaction model | Every entry touches 2+ accounts      | A line item is a standalone cost fact          |
| Correction model  | Reversing journal entries            | Soft-delete + new line item, or new adjustment |

If the studio needs full accounting, they push data to external software (QuickBooks, Xero). This system never becomes a general ledger.

### Polymorphic targets via single intermediate table with Prisma enum discriminator

Following the existing `TaskTarget` shape but using a Prisma enum (per Architecture Guardrail 3, since this is financial data):

- **Base table** (`CompensationLineItem`) holds the cost fact (amount, type, scope, audit).
- **Intermediate table** (`CompensationTarget`) handles the polymorphic link via `targetType` (Prisma enum) + `targetId` + nullable typed FK columns.

`TaskTarget`'s string discriminator is pre-existing and not migrated; new financial tables use enums.

### Flat amounts only — outcomes, not rules

Each line item is a flat monetary amount entered by a human (or written by a future rule engine). The model stores **outcomes**, not **rules**. OT multipliers, tiered commission formulas, and automated bonus calculations are Phase 5 scope. `metadata` is descriptive only — never a rule engine.

### No implicit proration across shows

Phase 4 does not prorate one line item across multiple shows. Operational economics aggregation (2.3) includes show-scoped line items only. Schedule-scoped and standing items remain visible in compensation list/breakdown endpoints but stay out of operational economics aggregation in Phase 4. See [economics-cost-model.md §8](./economics-cost-model.md#8-line-item-composition) for the row terminology and scope→grain table.

### Freeze is a service-layer write guard at the entity-time boundary

Freeze is **per-entity**: each agreement type has its own boundary. See [economics-cost-model.md §5](./economics-cost-model.md#5-freeze-semantics) for the full per-entity rules; the most relevant for 2.2:

| Field                                                               | Frozen by                                |
| ------------------------------------------------------------------- | ---------------------------------------- |
| `ShowCreator.agreedRate`, `compensationType`, `commissionRate`      | Show's `endTime ≤ now`                   |
| `StudioShift.hourlyRate` and `StudioShiftBlock` scheduled timing    | Shift end (last block's `endTime ≤ now`) |
| Existing show-scoped `CompensationLineItem` rows (PATCH and DELETE) | Show's `endTime ≤ now`                   |
| `Show.endTime` itself                                               | The moment it first reaches `now`        |

What stays editable post-freeze: creating new line items (adjustments), writing actual time fields, writing approvals, and Wave 4 revenue inputs.

No new "frozen" schema fields are introduced. The freeze trigger is the timestamp comparison at write time.

### Assignment-time creator agreement snapshot

Creator assignment writes persist the resolved agreement terms immediately. If the manager provides explicit terms, those are stored. If not, the service resolves the current `StudioCreator.defaultRate`, `defaultRateType`, and `defaultCommissionRate` at assignment time and stores the assignment snapshot. The DB fields may stay nullable for import/backfill flexibility, but normal app writes must leave enough persisted data for 2.3 to calculate without reading mutable roster defaults.

Roster update UX must warn managers that default-rate edits affect new assignments only. If a manager wants updated roster terms applied to already-assigned future shows, the UI should offer an explicit "update future assignments" action; past or frozen assignments remain unchanged.

### Actuals approval gates compensation calculation

A manager must approve the owner entity's actuals before compensation calculation treats them as the basis for `ACTUALIZED` cost. Show-time actuals are approved on `Show`; shift-block actuals are approved on the parent `StudioShift`. Pre-approval values render with a "pending review" tag. Post-approval, actuals are read-only for that owner entity; ADMIN can `reopen` (logged) to allow further edits.

This is a single approval flag per owner entity, not a multi-state workflow. See [economics-cost-model.md §6](./economics-cost-model.md#6-actuals-approval) for the rule and audit log.

### Grace time normalizes near-on-schedule actuals

Studios configure four tolerance windows (late / early-leave × show / shift-block). Grace only prevents small late starts or early departures from reducing paid duration. Early arrival and late departure do not increase base paid duration; preparation and overrun are not automatically paid. The actuals values themselves are not mutated; only the derived effective duration changes. See [economics-cost-model.md §7](./economics-cost-model.md#7-grace-time-configuration).

### Drop `StudioShift.projectedCost`

The legacy `projectedCost` field on `StudioShift` is removed. Projection arithmetic is `hourlyRate × scheduled minutes`, computed live by callers (the economics service in 2.3). This eliminates cache-drift risk and gives a single source of truth.

### Actuals-first computation

Cost is `rate × actual`, not `rate × scheduled minus deduction`. The legal framing matters: an HOURLY creator who worked 1.5 of 2 scheduled hours is paid for 1.5 hours, not paid for 2 then deducted 0.5. Variances are captured by accurate actuals, not by deduction line items. Line items are reserved for *supplemental* cost (bonuses, allowances, OT premiums, contractual amendments).

### Dual-role person: independent line items per role

A person can be both a `StudioMembership` (staff) and a `StudioCreator` (talent) in the same studio. Their compensation in each capacity is independent. Line items attach to the **association record** via `CompensationTarget` — separate target records, independent cost buckets, independent self-review surfaces.

### Self-access uses the existing `/me/` module

Self-access endpoints land under `/me/compensation/{creator,operator}` (a new submodule under `apps/erify_api/src/me/`). Identity is derived from auth context. Cross-user access stays under studio-scoped routes with role guards. Per Architecture Guardrail 6.

## Requirements

### In Scope

1. **Compensation line item CRUD** — same as before; `Decimal(10,2)` non-zero amount; sign per type; optional show/schedule scope.
2. **`CompensationTarget` polymorphic table** with Prisma enum discriminator.
3. **Optional scope** — show / schedule / standing.
4. **`Show.actualStartTime` / `actualEndTime`** — operator post-production record (priority 3 in show-time cascade).
5. **`StudioShiftBlock.actualStartTime` / `actualEndTime`** — operator manual entry (priority 2 in shift-block cascade).
6. **Actuals priority cascade resolution** — service helper resolves both cascades per [cost-model §4](./economics-cost-model.md#4-actuals-priority-cascade); response includes `actuals_source` and `available_sources`.
7. **Freeze guards** — per-entity boundaries per the table above.
8. **`Show.actualsApprovedAt` / `actualsApprovedBy`** — single-flag approval per show.
9. **`StudioShift.actualsApprovedAt` / `actualsApprovedBy`** — single-flag approval per shift for its block actuals.
10. **Approve / reopen routes** — explicit endpoints for show actuals and shift actuals; reopen is ADMIN-only and logged.
11. **Actuals audit log table** — every actuals write, every approve, every reopen.
12. **Grace settings on `Studio`** — four int fields (default 0).
13. **`Studio.allowManagerCorrections`** — boolean (default false).
14. **`/me/compensation/creator` and `/me/compensation/operator` self-access endpoints** — under the existing `/me/` module.
15. **Cross-user compensation views** — `GET /studios/:studioId/creators/:creatorId/compensation` and `GET /studios/:studioId/members/:membershipId/compensation`.
16. **Drop `StudioShift.projectedCost`** — schema migration.

### Out of Scope

See Non-Goals.

## Data Model

### `CompensationLineItem` (base)

| Field           | Type                               | Required | Description                                                                                                                                                          |
| --------------- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uid`           | String                             | Yes      | Public identifier (prefix `cli`)                                                                                                                                     |
| `studioId`      | FK → `Studio`                      | Yes      | Studio scope                                                                                                                                                         |
| `itemType`      | Prisma enum `CompensationItemType` | Yes      | `BONUS` / `ALLOWANCE` / `OVERTIME` / `DEDUCTION` / `OTHER`                                                                                                           |
| `amount`        | `Decimal(10, 2)`                   | Yes      | Non-zero. `< 0` for `DEDUCTION`; `> 0` for all other types                                                                                                           |
| `label`         | String                             | No       | Human-readable override (null → derive from `itemType`)                                                                                                              |
| `note`          | String                             | No       | Free-text context                                                                                                                                                    |
| `effectiveDate` | DateTime                           | No       | Informational metadata (not used for freeze discrimination)                                                                                                          |
| `showId`        | FK → `Show`                        | No       | Show-scoped. If combined with `scheduleId`, the schedule must match the show's.                                                                                      |
| `scheduleId`    | FK → `Schedule`                    | No       | Schedule-scoped. May be provided alone or alongside a show in the same schedule. Visible in compensation views; excluded from Phase 4 operational economics rollups. |
| `metadata`      | Json                               | No       | Descriptive context only                                                                                                                                             |
| `createdBy`     | FK → `User`                        | Yes      | Who entered this line item                                                                                                                                           |
| `createdAt`     | DateTime                           | Yes      | Used as the freeze discriminator: `createdAt ≤ Show.endTime` ⇒ pre-freeze; `> Show.endTime` ⇒ adjustment                                                             |
| `updatedAt`     | DateTime                           | Yes      |                                                                                                                                                                      |
| `deletedAt`     | DateTime                           | No       | Soft-delete                                                                                                                                                          |

### `CompensationTarget` (intermediate, polymorphic with enum)

| Field             | Type                                 | Required | Description                            |
| ----------------- | ------------------------------------ | -------- | -------------------------------------- |
| `lineItemId`      | FK → `CompensationLineItem`          | Yes      | 1:1 unique link                        |
| `targetType`      | Prisma enum `CompensationTargetType` | Yes      | `MEMBERSHIP` or `STUDIO_CREATOR`       |
| `targetId`        | BigInt                               | Yes      | Generic reference to target record     |
| `membershipId`    | FK → `StudioMembership`              | No       | Set when `targetType = MEMBERSHIP`     |
| `studioCreatorId` | FK → `StudioCreator`                 | No       | Set when `targetType = STUDIO_CREATOR` |

Exactly one typed FK column is set per record, matching `targetType`. New engagement types add a nullable FK column and an enum value — additive migration only.

### `Show` additions

| Field               | Type        | Required | Description                                                       |
| ------------------- | ----------- | -------- | ----------------------------------------------------------------- |
| `actualStartTime`   | DateTime    | No       | Operator post-production record (priority 3 in show-time cascade) |
| `actualEndTime`     | DateTime    | No       | Operator post-production record                                   |
| `actualsApprovedAt` | DateTime    | No       | When a manager signed off on the show's actuals                   |
| `actualsApprovedBy` | FK → `User` | No       | Who approved                                                      |

`actualsApprovedAt` / `actualsApprovedBy` are cleared on reopen.

### `StudioShiftBlock` additions

| Field             | Type     | Required | Description                                               |
| ----------------- | -------- | -------- | --------------------------------------------------------- |
| `actualStartTime` | DateTime | No       | Operator manual entry (priority 2 in shift-block cascade) |
| `actualEndTime`   | DateTime | No       | Operator manual entry                                     |

Editable by ADMIN/MANAGER until the parent `StudioShift` actuals are approved. Approval gating is tied to `StudioShift.actualsApprovedAt`, not to any overlapping show. When a shift's blocks span multiple shows, 2.3 can still allocate approved shift labor by proportional overlap, but editability and approval ownership stay with the shift.

### `StudioShift` change

- **Drop** `projectedCost` field. Migration: drop the column. Any consumer reading it (the deferred branch's economics service) is replaced by 2.3 which computes `hourlyRate × scheduled minutes` live.
- `calculatedCost` field, if present, becomes informational-only (not consumed by cost computation in 2.3 — actuals fields drive cost). Decision on whether to drop it can ride alongside this migration; default plan is to leave for now and revisit when the field has no readers.
- **Add** `actualsApprovedAt` / `actualsApprovedBy` on `StudioShift`. These approve the shift's block actuals independently from any overlapping show. Shifts can exist without shows for cleaning, equipment organization, facilitation, and other studio work, so shift approval cannot depend on `Show.actualsApprovedAt`.

### `ShowCreator` (no schema change; service rule)

Normal app writes snapshot resolved creator agreement terms at assignment time. If explicit terms are omitted, the service reads current `StudioCreator` defaults and persists them onto `ShowCreator` as the assignment snapshot. Nullable DB fields remain allowed for import/backfill flexibility, but 2.3 must not calculate existing assignments by reading mutable roster defaults.

### `Studio` settings additions

| Field                              | Type    | Default | Description                                                           |
| ---------------------------------- | ------- | ------- | --------------------------------------------------------------------- |
| `allowManagerCorrections`          | Boolean | `false` | Whether MANAGER can create post-freeze correction line items          |
| `graceLateShowMinutes`             | Int     | 0       | Tolerance for `Show.actualStartTime` later than `Show.startTime`      |
| `graceEarlyLeaveShowMinutes`       | Int     | 0       | Tolerance for `Show.actualEndTime` earlier than `Show.endTime`        |
| `graceLateShiftBlockMinutes`       | Int     | 0       | Tolerance for `StudioShiftBlock.actualStartTime` later than scheduled |
| `graceEarlyLeaveShiftBlockMinutes` | Int     | 0       | Tolerance for `StudioShiftBlock.actualEndTime` earlier than scheduled |

### `ActualsAuditLog` (new table)

| Field         | Type                                 | Required | Description                                                    |
| ------------- | ------------------------------------ | -------- | -------------------------------------------------------------- |
| `uid`         | String                               | Yes      | Public identifier                                              |
| `studioId`    | FK → `Studio`                        | Yes      | Studio scope                                                   |
| `entityType`  | Prisma enum `ActualsAuditEntityType` | Yes      | `SHOW_ACTUALS` / `SHIFT_BLOCK_ACTUALS` / `APPROVAL` / `REOPEN` |
| `entityId`    | BigInt                               | Yes      | The show or shift-block id                                     |
| `before`      | Json                                 | No       | Snapshot of the relevant fields before the change              |
| `after`       | Json                                 | Yes      | Snapshot after the change                                      |
| `actorUserId` | FK → `User`                          | Yes      | Who made the change                                            |
| `createdAt`   | DateTime                             | Yes      | When                                                           |

This table is internal/audit; it is not part of the economics response shape. Admin/forensic surfaces query it directly.

## API Contract

### Line item routes

| Method   | Route                                        | Description                                                                     | Access                                                                       |
| -------- | -------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `GET`    | `/studios/:studioId/compensation-items`      | List line items (filterable by `targetType`, `showId`, `scheduleId`, dateRange) | ADMIN, MANAGER                                                               |
| `POST`   | `/studios/:studioId/compensation-items`      | Create a line item with target                                                  | ADMIN; MANAGER (pre-freeze always; post-freeze if `allowManagerCorrections`) |
| `PATCH`  | `/studios/:studioId/compensation-items/:uid` | Update mutable fields (subject to freeze)                                       | ADMIN; MANAGER (pre-freeze only)                                             |
| `DELETE` | `/studios/:studioId/compensation-items/:uid` | Soft-delete (subject to freeze)                                                 | ADMIN; MANAGER (pre-freeze only)                                             |

### Cross-user compensation view routes

| Method | Route                                                           | Description                                                             | Access                         |
| ------ | --------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| `GET`  | `/studios/:studioId/creators/:creatorId/compensation?from&to`   | Creator compensation view: agreement + line items + (Wave 4) commission | ADMIN, MANAGER, TALENT_MANAGER |
| `GET`  | `/studios/:studioId/members/:membershipId/compensation?from&to` | Operator compensation view: agreement + line items                      | ADMIN, MANAGER                 |

### Self-access routes (`/me/` module)

| Method | Route                                        | Description                                           | Access                       |
| ------ | -------------------------------------------- | ----------------------------------------------------- | ---------------------------- |
| `GET`  | `/me/compensation/creator?studioId&from&to`  | Authed user's own creator compensation in the studio  | Authenticated; auto-resolves |
| `GET`  | `/me/compensation/operator?studioId&from&to` | Authed user's own operator compensation in the studio | Authenticated; auto-resolves |

These resolve `studioCreatorId` / `membershipId` from the authed user + `studioId`. Returns 404 if the user has no such association in the studio.

### Actuals routes

| Method  | Route                                                        | Description                                      | Access         |
| ------- | ------------------------------------------------------------ | ------------------------------------------------ | -------------- |
| `PATCH` | `/studios/:studioId/shows/:showId/actuals`                   | Set / update `actualStartTime` / `actualEndTime` | ADMIN, MANAGER |
| `PATCH` | `/studios/:studioId/shifts/:shiftId/blocks/:blockId/actuals` | Set / update block actual times                  | ADMIN, MANAGER |

Show actuals writes are blocked once the show has been approved (`Show.actualsApprovedAt` set). Shift-block actuals writes are blocked once the parent shift has been approved (`StudioShift.actualsApprovedAt` set). To edit after approval, ADMIN must `reopen` the relevant owner entity first. Both routes write to `ActualsAuditLog`.

### Approval routes

| Method | Route                                                | Description                                         | Access         |
| ------ | ---------------------------------------------------- | --------------------------------------------------- | -------------- |
| `POST` | `/studios/:studioId/shows/:showId/actuals/approve`   | Set `actualsApprovedAt` / `actualsApprovedBy`       | ADMIN, MANAGER |
| `POST` | `/studios/:studioId/shows/:showId/actuals/reopen`    | Clear approval; allow further actuals edits         | ADMIN          |
| `POST` | `/studios/:studioId/shifts/:shiftId/actuals/approve` | Set shift `actualsApprovedAt` / `actualsApprovedBy` | ADMIN, MANAGER |
| `POST` | `/studios/:studioId/shifts/:shiftId/actuals/reopen`  | Clear shift approval; allow block-actual edits      | ADMIN          |

Both routes write to `ActualsAuditLog`. Reopen requires a non-empty reason field.

The `Show.endTime` itself remains **not** writable through any route once it's past — even ADMIN — per the freeze rule.

### Request DTO (POST — create line item)

```json
{
  "target_type": "MEMBERSHIP",
  "target_id": "smb_abc123",
  "item_type": "BONUS",
  "amount": "200.00",
  "label": "Show completion bonus",
  "note": "March 25 live show",
  "effective_date": "2026-03-25T00:00:00Z",
  "show_id": "show_xyz789"
}
```

### Request DTO (POST — reopen actuals)

```json
{
  "reason": "Operator typo in actual end time"
}
```

### Response DTO (compensation view, abbreviated)

```json
{
  "target": { "target_type": "STUDIO_CREATOR", "uid": "smc_alice", "display_name": "Alice Chen" },
  "from": "2026-04-01T00:00:00Z",
  "to": "2026-04-30T23:59:59Z",
  "agreement": {
    "shows": [
      {
        "show_uid": "show_x",
        "show_end_time": "2026-04-20T16:00:00Z",
        "compensation_type": "HOURLY",
        "agreed_rate": "100.00",
        "actuals_source": "OPERATOR_RECORD",
        "actuals_minutes": 115,
        "scheduled_minutes": 120,
        "grace_applied": true,
        "actuals_approval_state": "APPROVED",
        "base_cost": "200.00",
        "is_frozen": true,
        "available_sources": {
          "planned": { "start": "2026-04-20T14:00:00Z", "end": "2026-04-20T16:00:00Z" },
          "operator_record": { "start": "2026-04-20T14:05:00Z", "end": "2026-04-20T16:00:00Z" }
        }
      }
    ],
    "frozen_line_items": [],
    "agreement_total_cost": "200.00"
  },
  "adjustments": {
    "post_freeze_line_items": [],
    "adjustment_total_cost": "0.00"
  },
  "resolved_total_cost": "200.00",
  "unresolved_reason": []
}
```

### Error codes

| Code                            | HTTP | Condition                                                                                             |
| ------------------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| `TARGET_NOT_FOUND`              | 404  | Target uid does not resolve to an active association record                                           |
| `INVALID_TARGET_TYPE`           | 400  | Unknown target type                                                                                   |
| `INVALID_AMOUNT_SIGN`           | 400  | DEDUCTION requires `amount < 0`; other types require `> 0`. Zero rejected.                            |
| `SCOPE_MISMATCH`                | 400  | `show_id` and `schedule_id` provided but the show isn't part of that schedule                         |
| `LINE_ITEM_NOT_FOUND`           | 404  | Line item uid not found in studio                                                                     |
| `LINE_ITEM_FROZEN`              | 409  | PATCH/DELETE attempted on a line item attached to a frozen show                                       |
| `SHOW_FROZEN`                   | 409  | Mutation attempted on `Show.endTime` or `ShowCreator` agreement fields after freeze                   |
| `SHIFT_FROZEN`                  | 409  | Mutation attempted on `StudioShift.hourlyRate` or `StudioShiftBlock` scheduled timing after shift end |
| `MANAGER_CORRECTION_DISALLOWED` | 403  | MANAGER attempted post-freeze line-item creation when studio setting is off                           |
| `ACTUALS_APPROVED`              | 409  | Actuals write attempted on an owner entity whose actuals are already approved (use reopen first)      |
| `REOPEN_REASON_REQUIRED`        | 400  | Reopen attempted without a non-empty `reason`                                                         |
| `SELF_NOT_FOUND_IN_STUDIO`      | 404  | `/me/compensation/...` called for a studio where the user has no association of the requested kind    |

All error codes defined in `@eridu/api-types`.

### Validation rules

- `itemType` ∈ `{BONUS, ALLOWANCE, OVERTIME, DEDUCTION, OTHER}`.
- `amount`: non-zero `Decimal(10, 2)`. `DEDUCTION` requires `< 0`; all other types require `> 0`.
- `targetType` ∈ `{MEMBERSHIP, STUDIO_CREATOR}` (Prisma enum).
- `targetId` resolves to active association in same studio.
- `showId` / `scheduleId` validity checks; if both provided, show must belong to the schedule (else `SCOPE_MISMATCH`).
- New items for inactive targets rejected; historical items on inactive targets preserved.
- Grace settings: int ≥ 0.

## Authorization

- Self-access via `/me/` module — identity from auth context, no decorator. Architecture Guardrail 6.
- Cross-user views: ADMIN / MANAGER (both views); TALENT_MANAGER (creator view only).
- Line item create / update / delete pre-freeze: ADMIN, MANAGER.
- Line item create post-freeze: ADMIN; MANAGER iff `Studio.allowManagerCorrections`.
- Line item update / delete post-freeze: blocked entirely (use new line item to correct).
- Actuals writes: ADMIN, MANAGER (pre-approval).
- Approve actuals: ADMIN, MANAGER.
- Reopen actuals: ADMIN only.
- Studio settings (grace + allowManagerCorrections): ADMIN.

Every line item records `createdBy`. Every actuals write / approval / reopen writes to `ActualsAuditLog`.

## Frontend

### Routes

| Route                                                   | Purpose                                             | Access                         |
| ------------------------------------------------------- | --------------------------------------------------- | ------------------------------ |
| `/studios/$studioId/compensation`                       | ADMIN/MANAGER compensation management workspace     | ADMIN, MANAGER                 |
| `/studios/$studioId/creators/$creatorId/compensation`   | Creator compensation drill-in (cross-user)          | ADMIN, MANAGER, TALENT_MANAGER |
| `/studios/$studioId/members/$membershipId/compensation` | Operator compensation drill-in (cross-user)         | ADMIN, MANAGER                 |
| `/me/studios/$studioId/compensation`                    | Authed user's own compensation (auto-resolves role) | Authenticated                  |
| `/studios/$studioId/settings/grace-and-corrections`     | ADMIN-only studio settings page                     | ADMIN                          |

The `/me/...` FE route is the single self-review surface; if the authed user is a member-only it shows operator view, creator-only it shows creator view, dual-role it shows both with tabs.

### Inline summaries

- `/studios/$studioId/creators` (creator roster) — per-row compensation summary.
- `/studios/$studioId/members` (member roster) — per-row compensation summary.
- `/studios/$studioId/shows/$showId` — show detail; compact post-production show-actuals form + approval/reopen action + frozen-state indicator on agreement fields.
- `/studios/$studioId/shifts/$shiftId` — shift detail; compact block-actuals form + shift approval/reopen action.

`hasStudioRouteAccess` adds: `compensation`, `studio-settings-grace`. Self routes inherit auth-only access.

## Acceptance Criteria

- [ ] ADMIN can create / update / soft-delete a pre-freeze line item targeting a `StudioMembership` or `StudioCreator`.
- [ ] MANAGER can create pre-freeze line items; can create post-freeze adjustments only when `Studio.allowManagerCorrections = true`.
- [ ] ADMIN can create post-freeze adjustments unconditionally.
- [ ] PATCH / DELETE on a line item attached to a frozen show returns `409 LINE_ITEM_FROZEN`.
- [ ] Mutations to `ShowCreator.agreedRate` / `compensationType` / `commissionRate` after the show's `endTime` return `409 SHOW_FROZEN`.
- [ ] Mutations to `StudioShift.hourlyRate` or `StudioShiftBlock` scheduled `startTime` / `endTime` after the shift's end return `409 SHIFT_FROZEN`.
- [ ] Mutation to `Show.endTime` after it is past returns `409 SHOW_FROZEN`.
- [ ] Normal app assignment writes persist resolved `ShowCreator` agreement terms from explicit input or current `StudioCreator` defaults; existing assignments do not recalculate from mutable roster defaults.
- [ ] Roster default-rate update UX warns that existing assignments are unchanged and offers an explicit update path for already-assigned future shows.
- [ ] `Show.actualStartTime` / `actualEndTime` and `StudioShiftBlock` actuals are writable by ADMIN/MANAGER pre-approval; show actuals return `409 ACTUALS_APPROVED` after show approval, and shift-block actuals return `409 ACTUALS_APPROVED` after parent shift approval.
- [ ] `POST /shows/:showId/actuals/approve` sets `actualsApprovedAt` / `actualsApprovedBy`. ADMIN or MANAGER can call.
- [ ] `POST /shows/:showId/actuals/reopen` clears the approval and accepts a required reason. ADMIN only.
- [ ] `POST /shifts/:shiftId/actuals/approve` sets `StudioShift.actualsApprovedAt` / `actualsApprovedBy`. ADMIN or MANAGER can call.
- [ ] `POST /shifts/:shiftId/actuals/reopen` clears the shift approval and accepts a required reason. ADMIN only.
- [ ] Every actuals write, every approval, every reopen writes a row to `ActualsAuditLog`.
- [ ] Compensation calculation in views uses approved actuals only. Pre-approval values render with `actuals_approval_state = PENDING_APPROVAL`.
- [ ] Cost computation uses the actuals priority cascade per [cost-model §4](./economics-cost-model.md#4-actuals-priority-cascade); response includes `actuals_source` and `available_sources`.
- [ ] Grace windows applied per [cost-model §7](./economics-cost-model.md#7-grace-time-configuration); response surfaces `grace_applied: true` when active.
- [ ] `/me/compensation/creator` and `/me/compensation/operator` return the authed user's own breakdown for the requested studio.
- [ ] Compensation views split frozen agreement cost from adjustment line items; both surface separately.
- [ ] Dual-role person has independent line items under their `StudioMembership` and `StudioCreator` records, surfacing in their respective views.
- [ ] DEDUCTION enforces `amount < 0`; other types enforce `amount > 0`; zero amount rejected.
- [ ] Mismatched `showId` / `scheduleId` returns `400 SCOPE_MISMATCH`.
- [ ] `CompensationTarget.targetType` is a Prisma enum (`MEMBERSHIP`, `STUDIO_CREATOR`).
- [ ] `StudioShift.projectedCost` field is dropped (migration). Projection arithmetic computed live.
- [ ] Studio settings (`allowManagerCorrections`, four grace fields) editable by ADMIN; grace fields default to 0.
- [ ] Schema additions are additive nullable migrations except for `StudioShift.projectedCost` (drop column).
- [ ] Fixture-based tests cover the worked examples in [cost-model §12](./economics-cost-model.md#12-worked-examples), plus deduction-driven negative target, late-actuals entry, approval gating, grace-applied case, reopen audit, and dual-role isolation.

## Product Decisions

- **Single-entry cost journal.** Not double-entry. External accounting integrations push to QuickBooks / Xero.
- **Outcomes, not rules.** Phase 5's Advanced Compensation Engine will write line items as its output. The model never stores formulas.
- **`metadata` is descriptive only.** No compensation logic in metadata.
- **Soft-delete preserves history.** Removed line items use `deletedAt`, not hard delete. Deactivating a target does not scrub historical items.
- **No implicit proration in Phase 4.** Schedule-scoped and standing items are not spread across shows automatically. Schedule-scoped items remain visible in compensation views but stay out of operational economics rollups until a schedule-level cost use case and boundary behavior are defined.
- **Freeze is per-entity, service-layer only.** Per-entity boundaries (show end, shift end). No new schema fields.
- **Pre/post-freeze discriminator is `createdAt`, not `effectiveDate`.**
- **Assignment-time creator agreement snapshots.** Normal app writes persist resolved terms immediately. Roster default edits do not rewrite existing assignments unless a manager explicitly updates future assignments.
- **Drop `projectedCost`.** Computed live; no cache.
- **Approval is a single flag per owner entity.** Show actuals are approved on `Show`; shift-block actuals are approved on `StudioShift`. Not a multi-state workflow.
- **Reopen, don't mutate.** Post-approval edits require ADMIN reopen with a logged reason. All actuals writes audited.
- **Grace windows are per-entity, default 0.** Studios opt into tolerance for late starts and early leave. Early arrival and late departure do not increase base paid duration.
- **Actuals-first computation.** Variance from the schedule is captured by recording accurate actuals, not by deduction line items.
- **Three first-class compensation views.** Cross-user under studio routes; self-access under `/me/`. Single FE self route handles dual-role.
- **Manager corrections studio-configurable, with audit.** Default ADMIN-only; opt-in MANAGER per studio. Every line item records `createdBy`.
- **Forward-compatible actuals API.** Phase 4 ships operator post-production records and shift-block manual entry; future cascade priorities (platform feed, creator app, punch-clock) slot in by extending the source enum without API restructure.

## Design Reference

- 2.1 Economics Cost Model: [economics-cost-model.md](./economics-cost-model.md)
- 2.3 Economics Service: [SHOW_ECONOMICS_DESIGN.md](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md) (lands when 2.3 starts)
- 3.1 Studio Economics Review: [studio-economics-review.md](./studio-economics-review.md)
- Backend design: [COMPENSATION_LINE_ITEMS_DESIGN.md](../../apps/erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md)
- Frontend design: [COMPENSATION_LINE_ITEMS_DESIGN.md](../../apps/erify_studios/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md)
- Studio member roster: [studio-member-roster.md](../features/studio-member-roster.md)
- Studio creator roster: [studio-creator-roster.md](../features/studio-creator-roster.md)
- Architecture Guardrails: [PHASE_4.md#architecture-guardrails](../roadmap/PHASE_4.md#architecture-guardrails)
- Phase 4 Roadmap: [PHASE_4.md](../roadmap/PHASE_4.md)
- `/me/` module: `apps/erify_api/src/me/`
