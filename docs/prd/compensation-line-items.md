# PRD: Compensation Line Items

> **Status**: Active
> **Phase**: 4 — Post-Wave 1 (Economics Cost Model Review)
> **Workstream**: P&L cost visibility — supplemental compensation beyond base rates
> **Depends on**: Studio Member Roster — ✅ **Complete** (PR #28), Studio Creator Roster — **In progress** (Wave 1)

## Problem

Base rates alone do not capture the full cost of studio labor:

- **Studio members** have a single `baseHourlyRate` on `StudioMembership`, but real operations involve bonuses (show completion, performance), special allowances (transport, meals, equipment), overtime premiums, and deductions. These supplemental items are invisible to the economics endpoint, which underreports true L-side cost.
- **Studio creators** have a 3-field compensation model (`defaultRate`, `defaultRateType`, `defaultCommissionRate`) with per-show overrides on `ShowCreator`, but no mechanism for bonuses, allowances, or ad-hoc adjustments beyond the base compensation type.
- **Dual-role individuals** — a person can be both a studio member (staff) and a studio creator (talent) in the same studio. Their compensation in each capacity is independent and must be tracked separately.

Key questions unanswered today:

- *"What is the true total cost of this show, including bonuses and allowances?"*
- *"How much did this member earn beyond their hourly rate this month?"*
- *"What supplemental costs are attached to this creator for this show?"*
- *"How do I communicate to a member what they're being compensated for?"*

Members and creators currently have no way to review their full compensation breakdown. The economics endpoint has no mechanism to include supplemental cost items in its aggregation.

## Users

- **Studio ADMIN** (primary): create, update, and remove compensation line items for any member or creator
- **Studio MANAGER** (secondary): read-only view of compensation line items for operational awareness
- **Studio members** (self-review): view their own compensation breakdown (base rate + line items) for a given period
- **Studio creators** (self-review via TALENT_MANAGER): view compensation summary through roster page

## Existing Infrastructure

| Model / Endpoint | Fields / Behavior | Status |
| --- | --- | --- |
| `StudioMembership` | `baseHourlyRate` — sole member cost input | ✅ Exists |
| `StudioCreator` | `defaultRate`, `defaultRateType`, `defaultCommissionRate` — creator cost defaults | ✅ Exists |
| `ShowCreator` | `agreedRate`, `compensationType`, `commissionRate` — per-show overrides | ✅ Exists |
| `StudioShift` | `hourlyRate` (snapshot), `projectedCost` (hours × rate), `calculatedCost` (optional override) | ✅ Exists |
| `TaskTarget` | Polymorphic pattern: `targetType` + `targetId` + nullable FK columns | ✅ Exists (reference pattern) |
| Economics endpoints | Developed, merge deferred to after Wave 1 cost model review | ⏸️ Deferred |

## Design Decisions

### Single-Entry Journal, Not Double-Entry Ledger

This system is an operations platform tracking **cost inputs for P&L visibility**, not a financial accounting system. The question it answers is "what did this show cost us?" — not "where did money flow between accounts?"

| Concern | Double-Entry Ledger | Our System |
|---------|-------------------|------------|
| Core invariant | Debits = Credits across all accounts | Cost items sum correctly per show/schedule |
| Account structure | Chart of accounts (assets, liabilities, equity) | None — costs attributed to shows/schedules |
| Transaction model | Every entry touches 2+ accounts | A line item is a standalone cost fact |
| Correction model | Reversing journal entries | Soft-delete + new line item, or PATCH |

If the studio needs full accounting, they push data to external accounting software (QuickBooks, Xero). This system does not become a general ledger.

### Unified Model with Single Intermediate Table

Following the existing `TaskTarget` polymorphic pattern, compensation line items use:
- A **base table** (`CompensationLineItem`) holding the compensation fact (amount, type, scope)
- A **single intermediate table** (`CompensationTarget`) handling the polymorphic link to the association record

This keeps CRUD, validation, and economics aggregation DRY across all engagement types while maintaining Prisma referential integrity.

### Flat Amounts Only — No Calculation Rules

Each line item is a flat monetary amount entered by a human (or written by a future rule engine). The `CompensationLineItem` model stores **outcomes**, not **rules**. OT multipliers, tiered commission formulas, and automated bonus calculations are Phase 5 scope ("Advanced Compensation Engine"). The architecture guardrail is unchanged: `metadata` is not a compensation rule engine.

## Requirements

### In Scope

1. **Compensation line item CRUD** — ADMIN can create, update, and soft-delete line items. Each item has: `itemType` (BONUS, ALLOWANCE, OVERTIME, DEDUCTION, OTHER), `amount` (positive for additions, negative for deductions), optional `label`, optional `note`, optional `effectiveDate`.

2. **Polymorphic target via CompensationTarget** — each line item links to exactly one association record via an intermediate table following the TaskTarget pattern. Current target types: `MEMBERSHIP` (→ `StudioMembership`) and `STUDIO_CREATOR` (→ `StudioCreator`). Extensible to future types (contractor, agency talent) by adding a nullable FK column.

3. **Optional scope** — line items can be scoped to a specific `Show` (show-based bonus), a specific `Schedule` (schedule-based OT premium), or left unscoped (standing/global adjustment like monthly transport allowance).

4. **Dual-role support** — a person who is both a studio member and a studio creator has independent line items under each association record. These are separate P&L cost buckets.

5. **Economics integration** — the economics service sums line items alongside base costs during aggregation. Member cost = `projectedCost + SUM(line items)`. Creator cost = `computedCost + SUM(line items)`.

6. **Self-review endpoint** — members can view their own compensation breakdown (base rate + line items) for a date range. Read-only, scoped to their own membership.

### Out of Scope

- Calculation rules, formulas, automated OT detection — Phase 5 "Advanced Compensation Engine"
- Formula storage in metadata — architecture guardrail unchanged
- Revenue-based commission computation — P&L Revenue Workflow (Wave 3)
- Double-entry accounting / general ledger
- Payroll generation — line items are cost visibility, not payment instructions
- Bulk import of line items (CSV upload)
- Compensation history / audit trail beyond soft-delete

## Data Model

### CompensationLineItem (base table)

The compensation fact — amount, type, scope, audit fields.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `uid` | String | Yes | Public identifier (prefix: `cli`) |
| `studio_id` | FK → Studio | Yes | Studio scope |
| `item_type` | String | Yes | `BONUS`, `ALLOWANCE`, `OVERTIME`, `DEDUCTION`, `OTHER` |
| `amount` | Decimal(10,2) | Yes | Positive = cost addition, negative = deduction |
| `label` | String | No | Human-readable override (null → derive from `item_type`) |
| `note` | String | No | Free-text context |
| `effective_date` | DateTime | No | When this applies (null = immediate/one-off) |
| `show_id` | FK → Show | No | Show-scoped (null = standing/global) |
| `schedule_id` | FK → Schedule | No | Schedule-scoped |
| `metadata` | Json | No | Descriptive context only |
| `deleted_at` | DateTime | No | Soft-delete |

### CompensationTarget (intermediate table)

Polymorphic link following TaskTarget pattern. One table handles all target types.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `line_item_id` | FK → CompensationLineItem | Yes | 1:1 unique link |
| `target_type` | String | Yes | `MEMBERSHIP`, `STUDIO_CREATOR`, future types |
| `target_id` | BigInt | Yes | Generic reference to target record |
| `membership_id` | FK → StudioMembership | No | Set when `target_type = MEMBERSHIP` |
| `studio_creator_id` | FK → StudioCreator | No | Set when `target_type = STUDIO_CREATOR` |

Exactly one typed FK column is set per record, matching `target_type`. New engagement types add a nullable FK column — additive migration only.

## API Contract

### Routes

| Method | Route | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/studios/:studioId/compensation-items` | List line items (filterable by targetType, showId, scheduleId, dateRange) | ADMIN, MANAGER |
| `POST` | `/studios/:studioId/compensation-items` | Create a line item with target | ADMIN |
| `PATCH` | `/studios/:studioId/compensation-items/:uid` | Update amount, label, note, effectiveDate | ADMIN |
| `DELETE` | `/studios/:studioId/compensation-items/:uid` | Soft-delete | ADMIN |
| `GET` | `/studios/:studioId/members/:membershipId/compensation` | Member self-review: base rate + line items for date range | ADMIN, self |
| `GET` | `/studios/:studioId/creators/:creatorId/compensation` | Creator compensation summary: defaults + line items | ADMIN, MANAGER, TALENT_MANAGER |

### Request DTO (POST — create line item)

```json
{
  "target_type": "MEMBERSHIP",
  "target_id": "smb_abc123",
  "item_type": "BONUS",
  "amount": 200.00,
  "label": "Show completion bonus",
  "note": "March 25 live show",
  "effective_date": "2026-03-25T00:00:00Z",
  "show_id": "show_xyz789"
}
```

### Request DTO (PATCH — update line item)

All fields optional.

```json
{
  "amount": 250.00,
  "label": "Show completion bonus (adjusted)",
  "note": "Updated per manager review"
}
```

### Response DTO (GET list)

```json
{
  "uid": "cli_abc123",
  "item_type": "BONUS",
  "amount": 200.00,
  "label": "Show completion bonus",
  "note": "March 25 live show",
  "effective_date": "2026-03-25T00:00:00Z",
  "show_id": "show_xyz789",
  "schedule_id": null,
  "target": {
    "target_type": "MEMBERSHIP",
    "target_id": "smb_abc123",
    "membership": {
      "uid": "smb_abc123",
      "user_name": "Alice Chen",
      "role": "MANAGER"
    }
  },
  "created_at": "2026-03-25T10:00:00Z"
}
```

### Error Codes

| Code | HTTP Status | Condition |
| --- | --- | --- |
| `TARGET_NOT_FOUND` | 404 | Target UID does not resolve to an active association record |
| `INVALID_TARGET_TYPE` | 400 | Unknown target type |
| `INVALID_AMOUNT_SIGN` | 400 | DEDUCTION type requires negative amount; others require non-negative |
| `LINE_ITEM_NOT_FOUND` | 404 | Compensation line item UID not found in studio |

All error codes to be defined in `@eridu/api-types`.

### Validation Rules

- `item_type`: one of `BONUS`, `ALLOWANCE`, `OVERTIME`, `DEDUCTION`, `OTHER`
- `amount`: non-zero decimal. DEDUCTION requires `< 0`; all others require `>= 0`
- `target_type`: one of `MEMBERSHIP`, `STUDIO_CREATOR` (extensible)
- `target_id`: must resolve to an active (non-deleted) association record in the same studio
- `show_id`: if provided, must be a valid show in the same studio
- `schedule_id`: if provided, must be a valid schedule in the same studio

### Edge Cases

- **Dual-role person**: Alice is both `smb_alice` (member) and `smc_alice` (creator). A show bonus for her shift work targets `smb_alice`; a show bonus for her creator work targets `smc_alice`. These are independent line items in different P&L cost buckets.
- **Standing adjustment**: line item with `show_id=null` and `schedule_id=null` applies globally. Economics service includes it in aggregation for the relevant date window using `effective_date`.
- **Target deactivation**: if a StudioMembership is soft-deleted or StudioCreator is deactivated, existing line items are preserved (historical cost data). New line items cannot be created for inactive targets.

## Frontend Route

`/studios/$studioId/compensation` — main compensation management page.

Additionally, compensation line items surface as inline sections on:
- `/studios/$studioId/members` — member roster page shows compensation summary per member
- `/studios/$studioId/creators` — creator roster page shows compensation summary per creator

`hasStudioRouteAccess` key to add: `compensation` — roles: `[ADMIN, MANAGER]`.

## Acceptance Criteria

- [ ] ADMIN can create a compensation line item targeting a studio membership or studio creator.
- [ ] ADMIN can update amount, label, note, and effectiveDate of an existing line item.
- [ ] ADMIN can soft-delete a line item.
- [ ] Line items can be scoped to a show, a schedule, or left unscoped (standing).
- [ ] Dual-role individuals have independent line items under their membership and creator records.
- [ ] Economics service aggregates line items alongside base costs (member `projectedCost` + line items; creator `computedCost` + line items).
- [ ] Member self-review endpoint returns base rate + all line items for a date range.
- [ ] MANAGER can view line items (read-only); PATCH/POST/DELETE return 403 for MANAGER.
- [ ] Invalid target type or inactive target returns appropriate error code.
- [ ] DEDUCTION type enforces negative amount; other types enforce non-negative amount.
- [ ] CompensationTarget follows TaskTarget polymorphic pattern with `targetType` + `targetId` + nullable FK columns.

## Product Decisions

- **Single-entry cost journal** — not double-entry. If full accounting is needed, integrate with external software.
- **Flat amounts only** — no formulas or calculation rules. The model stores outcomes, not rules. Phase 5 "Advanced Compensation Engine" will write line items as its output.
- **Soft-delete only** — line item removal uses `deletedAt`, not hard delete, to preserve historical cost data integrity.
- **Label is optional** — can be derived from `itemType` when not explicitly set. UI can provide sensible defaults.
- **Metadata is descriptive only** — architecture guardrail unchanged. No compensation logic in metadata.
- **Extensible target types** — new engagement types (contractor, agency talent) add a nullable FK column to `CompensationTarget`. No rewrite of existing data.

## Design Reference

- TaskTarget polymorphic pattern: `apps/erify_api/prisma/schema.prisma` (line 636)
- Economics baseline: `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md`
- Studio member roster: `docs/prd/studio-member-roster.md`
- Studio creator roster: `docs/prd/studio-creator-roster.md`
- Shift cost calculation: `apps/erify_api/src/models/studio-shift/studio-shift.service.ts`
- Phase 4 roadmap: `docs/roadmap/PHASE_4.md`
