# Compensation Line Items + Freeze + Actuals + Approval + Grace — Backend Design (2.2)

> **Status: Visioning — may be misaligned.** This design doc was written against the pre-simplification version of the Phase 4 cost model. The Phase 4 stack has since been narrowed to a read-only viewer (see [`economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)). The corresponding sibling PRD is itself visioning. Treat this document as roadmap reference: it is **not committed**, may contain assumptions that no longer hold (freeze guards, settlement, grace windows, separate audit table — none of these are in Phase 4), and will be rewritten when this workstream activates.

> **Status**: 🔲 Planned — design fills in when 2.2 starts
> **Phase scope**: Phase 4 — Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
> **Cost-model authority**: [`docs/prd/economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)
> **Depends on**: 1.2 Studio creator roster ✅ · 1.3 Studio member roster ✅ · 1.5 Studio show management ✅ · 2.1 Economics Cost Model 🔲

## Scope

Backend implementation for 2.2:

1. `CompensationLineItem` + `CompensationTarget` data model + CRUD.
2. Per-entity service-layer **freeze guards** at the entity-time boundary (`Show.endTime` for show agreements, shift end for shift agreements).
3. Schema additions on `Show` (`actualStartTime`, `actualEndTime`, `actualsApprovedAt`, `actualsApprovedBy`), `StudioShift` (`actualsApprovedAt`, `actualsApprovedBy`), and `StudioShiftBlock` (`actualStartTime`, `actualEndTime`).
4. Drop `StudioShift.projectedCost` (compute live).
5. Actuals priority cascade resolution — show-time and shift-block-time, both forward-compatible (cost-model §4).
6. Actuals approval flow — `approve` and `reopen` routes; approval gates compensation calculation.
7. Audit log: `ActualsAuditLog` table records every actuals write, every approval, every reopen.
8. Grace-time settings on `Studio` — four int fields for show + shift-block × late + early-leave.
9. `Studio.allowManagerCorrections` setting.
10. Per-target compensation views: cross-user under `/studios/:studioId/...`; self-access under the existing `/me/` module (`apps/erify_api/src/me/`) as a new `me-compensation` submodule.

Per Architecture Guardrails: `Prisma.Decimal` end-to-end, Prisma enum discriminator on `CompensationTarget.targetType`, fixture-based tests covering all worked examples in [cost-model §12](../../../../docs/prd/economics-cost-model.md#12-worked-examples), `/me/` self-access pattern (no decorators).

## API Surface

### Line items

| Method   | Endpoint                                                                       | Purpose                                                                  |
| -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `GET`    | `/studios/:studioId/compensation-items`                                         | List/filter line items                                                    |
| `POST`   | `/studios/:studioId/compensation-items`                                         | Create line item + target link                                            |
| `PATCH`  | `/studios/:studioId/compensation-items/:uid`                                    | Update mutable fields (subject to freeze)                                 |
| `DELETE` | `/studios/:studioId/compensation-items/:uid`                                    | Soft-delete (subject to freeze)                                           |

### Cross-user compensation views

| Method   | Endpoint                                                                       | Purpose                                                                  |
| -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `GET`    | `/studios/:studioId/creators/:creatorId/compensation?from&to`                   | Cross-user creator view                                                   |
| `GET`    | `/studios/:studioId/members/:membershipId/compensation?from&to`                 | Cross-user operator view                                                  |

### Self-access views (new `me-compensation` submodule)

| Method   | Endpoint                                          | Purpose                                                  |
| -------- | ------------------------------------------------- | -------------------------------------------------------- |
| `GET`    | `/me/compensation/creator?studioId&from&to`       | Authed user's own creator compensation in the studio     |
| `GET`    | `/me/compensation/operator?studioId&from&to`      | Authed user's own operator compensation in the studio    |

Both `/me/...` handlers resolve `studioCreatorId` / `membershipId` from the auth context plus `studioId`. Returns `404 SELF_NOT_FOUND_IN_STUDIO` when no association exists.

### Actuals + approval

| Method  | Endpoint                                                                | Purpose                                            | Access         |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------- | -------------- |
| `PATCH` | `/studios/:studioId/shows/:showId/actuals`                              | Set / update show actual start/end times           | ADMIN, MANAGER |
| `PATCH` | `/studios/:studioId/shifts/:shiftId/blocks/:blockId/actuals`            | Set / update block actual times                    | ADMIN, MANAGER |
| `POST`  | `/studios/:studioId/shows/:showId/actuals/approve`                      | Sign off on the show's actuals                     | ADMIN, MANAGER |
| `POST`  | `/studios/:studioId/shows/:showId/actuals/reopen`                       | Clear show approval; allow further edits (logged reason) | ADMIN          |
| `POST`  | `/studios/:studioId/shifts/:shiftId/actuals/approve`                    | Sign off on the shift's block actuals              | ADMIN, MANAGER |
| `POST`  | `/studios/:studioId/shifts/:shiftId/actuals/reopen`                     | Clear shift approval; allow block-actual edits (logged reason) | ADMIN          |

Show actuals writes return `409 ACTUALS_APPROVED` when the show's actuals are approved. Shift-block actuals writes return `409 ACTUALS_APPROVED` when the parent shift's actuals are approved. Reopen requires a non-empty `reason`.

## Persistence Plan

### New tables

- `CompensationLineItem` (cost fact).
- `CompensationTarget` (polymorphic join, Prisma enum `CompensationTargetType { MEMBERSHIP, STUDIO_CREATOR }`).
- `ActualsAuditLog` (append-only audit; Prisma enum `ActualsAuditEntityType { SHOW_ACTUALS, SHIFT_BLOCK_ACTUALS, APPROVAL, REOPEN }`).

### New nullable fields

- `Show.actualStartTime`, `Show.actualEndTime`, `Show.actualsApprovedAt`, `Show.actualsApprovedBy`.
- `StudioShift.actualsApprovedAt`, `StudioShift.actualsApprovedBy`.
- `StudioShiftBlock.actualStartTime`, `StudioShiftBlock.actualEndTime`.
- `Studio.allowManagerCorrections` (Boolean, default false).
- `Studio.graceLateShowMinutes`, `Studio.graceEarlyLeaveShowMinutes`, `Studio.graceLateShiftBlockMinutes`, `Studio.graceEarlyLeaveShiftBlockMinutes` (Int, default 0).

### Schema removal

- Drop `StudioShift.projectedCost` (column drop migration). Projection arithmetic is computed live by the economics service in 2.3.

All other additions are additive, soft-delete aware where applicable.

## Freeze Guard Plan

Per-entity freeze helper used at write time on:

| Mutation                                                                         | Frozen by                                       | Error code     |
| -------------------------------------------------------------------------------- | ----------------------------------------------- | -------------- |
| `ShowCreator.{agreedRate, compensationType, commissionRate}`                      | `Show.endTime ≤ now`                            | `SHOW_FROZEN`   |
| `Show.endTime`                                                                    | The moment it first reaches `now`               | `SHOW_FROZEN`   |
| `CompensationLineItem` PATCH/DELETE on items where `linkedShow.endTime ≤ now`     | `Show.endTime ≤ now`                            | `LINE_ITEM_FROZEN` |
| `StudioShift.hourlyRate`                                                          | Shift end (last block's `endTime ≤ now`)         | `SHIFT_FROZEN`  |
| `StudioShiftBlock.{startTime, endTime}` (scheduled)                               | Parent shift's end                               | `SHIFT_FROZEN`  |

Creator agreement snapshot rule: normal assignment writes persist resolved `ShowCreator` terms immediately. If the request omits explicit terms, resolve current `StudioCreator.defaultRate`, `defaultRateType`, and `defaultCommissionRate` and store the assignment snapshot at write time. Nullable DB fields may remain for import/backfill flexibility, but 2.3 must not calculate existing assignments by reading mutable roster defaults.

Roster update UX/API support should make default-rate edits forward-looking by default. If managers want updated terms on already-assigned future shows, expose an explicit bulk-update path that rewrites only unfrozen future assignment snapshots.

## Actuals + Approval Plan

### Cascade resolution

Per [cost-model §4](../../../../docs/prd/economics-cost-model.md#4-actuals-priority-cascade). Two cascades:

**Show-time cascade** (used for HOURLY creator hours, show audit):

1. Platform feed via API (future)
2. Platform feed via manual upload (future)
3. `Show.actualStartTime` / `actualEndTime` (Phase 4)
4. Creator-app self-record (future)
5. `Show.startTime` / `endTime` (fallback)

**Shift-block-time cascade** (used for operator labor):

1. Punch-clock / biometric (future)
2. `StudioShiftBlock.actualStartTime` / `actualEndTime` (Phase 4)
3. Scheduled block times (fallback)

Response includes `actuals_source` and `available_sources` (the values from each present source).

### Approval gating

- Compensation calculation reaches `cost_state = ACTUALIZED` only when the relevant owner actuals are approved (show-time components require `Show.actualsApprovedAt`; shift-block components require `StudioShift.actualsApprovedAt`) and other inputs resolve per cost-model §2.
- Pre-approval, computed values render with `actuals_approval_state = PENDING_APPROVAL` and the row is `PARTIAL_ACTUAL`.
- After approval, actuals writes owned by that entity return `409 ACTUALS_APPROVED`. ADMIN must `reopen` the relevant show or shift first.

### Audit log

Every actuals write, every approve, and every reopen produces an `ActualsAuditLog` row with `before` / `after` snapshots and `actorUserId`. The audit table is internal; it backs admin/forensic surfaces, not the public economics response.

## Grace-Time Plan

Service helper `applyGrace(actualStart, actualEnd, scheduledStart, scheduledEnd, lateGrace, earlyGrace)` returns `{ effectiveStart, effectiveEnd, effectiveMinutes, graceApplied }`:

- If actual start is before scheduled start, clamp effective start to scheduled start. Early arrival does not increase base paid duration.
- If actual start is after scheduled start and within `lateGrace`, normalize effective start to scheduled start; otherwise use actual start.
- If actual end is after scheduled end, clamp effective end to scheduled end. Late departure does not increase base paid duration.
- If actual end is before scheduled end and within `earlyGrace`, normalize effective end to scheduled end; otherwise use actual end.

Applied separately for show duration (using `graceLateShowMinutes` + `graceEarlyLeaveShowMinutes`) and per shift block (using `graceLateShiftBlockMinutes` + `graceEarlyLeaveShiftBlockMinutes`).

The actuals values themselves are not mutated; only the derived `effectiveMinutes` is used for cost.

## Validation Plan

- `itemType` ∈ `{BONUS, ALLOWANCE, OVERTIME, DEDUCTION, OTHER}`.
- `amount` non-zero `Decimal(10,2)`. `DEDUCTION` requires `< 0`; others require `> 0`.
- `targetType` ∈ `{MEMBERSHIP, STUDIO_CREATOR}` (Prisma enum).
- `targetId` resolves to active association in same studio.
- `showId` / `scheduleId` validity checks; if both provided, show must belong to the schedule (else `SCOPE_MISMATCH`).
- New items for inactive targets rejected; historical items on inactive targets preserved.
- Reopen `reason` non-empty (else `REOPEN_REASON_REQUIRED`).
- Grace settings: int ≥ 0.

## Authorization

| Operation                                          | Roles                                              |
| -------------------------------------------------- | -------------------------------------------------- |
| List / read line items                             | `ADMIN`, `MANAGER`                                 |
| Create / update / delete line items (pre-freeze)   | `ADMIN`, `MANAGER`                                 |
| Create line items (post-freeze)                    | `ADMIN`; `MANAGER` if `Studio.allowManagerCorrections` |
| Update / delete line items (post-freeze)            | Blocked entirely (use new line item to correct)    |
| Show / shift-block actuals writes (pre-approval)    | `ADMIN`, `MANAGER`                                 |
| Approve actuals                                     | `ADMIN`, `MANAGER`                                 |
| Reopen actuals                                      | `ADMIN`                                             |
| Studio settings (grace + allowManagerCorrections)   | `ADMIN`                                             |
| Cross-user creator compensation view                | `ADMIN`, `MANAGER`, `TALENT_MANAGER`               |
| Cross-user operator compensation view               | `ADMIN`, `MANAGER`                                 |
| `/me/compensation/...`                              | Authenticated; identity from auth context           |

Self-access does **not** use a decorator. It uses the existing `/me/` module pattern at `apps/erify_api/src/me/`. Per Architecture Guardrail 6.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Fixture tests: every worked example from [cost-model §12](../../../../docs/prd/economics-cost-model.md#12-worked-examples), plus deduction-driven negative target, late-actuals entry, freeze-gated mutations on show + shift, assignment-time agreement snapshot, show vs shift approval gating, grace-applied case, reopen audit, dual-role isolation.

## Traceability

- Product PRD: [`compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
- Cost model: [`economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)
- Architecture guardrails: [`PHASE_4.md#architecture-guardrails`](../../../../docs/roadmap/PHASE_4.md#architecture-guardrails)
- Roadmap: [`PHASE_4.md`](../../../../docs/roadmap/PHASE_4.md)
- `/me/` module: `apps/erify_api/src/me/`
