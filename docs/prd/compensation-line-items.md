# PRD: Compensation Line Items + Actuals (2.2)

> **Status**: Planned - design breakdown recorded
> **Phase**: 4 - Wave 2 (Cost Foundation)
> **Workstream**: Persist compensation adjustment inputs, scoped actuals, and snapshot-readiness facts that later economics read models consume.
> **Depends on**: 1.2 Studio Creator Roster ✅ · 1.3 Studio Member Roster ✅ · 1.5 Studio Show Management ✅ · 2.1 Economics Cost Model ([PRD](./economics-cost-model.md))
> **Canonical semantics**: [economics-cost-model.md](./economics-cost-model.md) owns Phase 4 cost rules: read-only reference views, live calculation, nullable unresolved components, actuals priority, no freeze/settlement/grace workflow.
> **Implementation breakdown**: [Phase 2.2 breakdown spec](../superpowers/specs/2026-05-09-compensation-line-items-phase-2-2-breakdown.md) and [implementation plan](../superpowers/plans/2026-05-09-compensation-line-items-phase-2-2.md).

## Purpose

2.2 delivers the persisted inputs required by the 2.3 economics service. It is not a calculator and not a payment workflow.

The required Phase 4 slice is:

1. **Compensation line items** - flat signed supplemental adjustment records attached to concrete show or shift events / event participation.
2. **Show actuals** - nullable `Show.actualStartTime` / `Show.actualEndTime` entered by studio operators.
3. **Shift-block actuals** - nullable `StudioShiftBlock.actualStartTime` / `StudioShiftBlock.actualEndTime`.
4. **Snapshot override audit** - ADMIN/MANAGER updates to intended-immutable snapshot fields append to the row's existing `metadata` audit trail.
5. **Shift cost storage cleanup** - removal of `StudioShift.projectedCost` and `StudioShift.calculatedCost` is a separate cleanup PR because it affects existing shift APIs and UI.

2.3 consumes these inputs to produce the creator, operator, and operational cost views defined in [economics-cost-model.md §3](./economics-cost-model.md#3-three-views-read-only).

## Workflow Model

### Primary studio workflow: target-scoped adjustments

Studio users create and review line items from the entity being adjusted:

- show-level line items on a show;
- creator-assignment line items on a show creator assignment;
- shift-level line items on a shift;
- shift-block line items on a shift block.

The target context owns the workflow. Studio operators should not need a generic model-management screen to understand why a line item exists.

### System support workflow

System admins can use `/system/compensation-line-items` backed by `/admin/compensation-line-items` for support, reconciliation, and cross-studio inspection. This is administrative tooling, not the normal studio operator flow.

### Future economics adjustment workflow

A future `compensation/line-items` or economics-adjacent workspace can be introduced with 2.3 when it is tied to calculator review, unresolved compensation rows, or reconciliation. It should not ship as a generic 2.2 studio CRUD workspace.

## Scope Boundary

### In Scope

- Backend support for active compensation line items.
- Soft delete for line items.
- Signed decimal `amount` with no type-based sign enforcement in Phase 4.
- Required free-text `reason`.
- Event-scoped attachment to show, show creator assignment, shift, or shift block.
- Event-attached line items included by the 2.3 direct compensation and operational calculators according to the attached event's date/time.
- No separate `effectiveDate`; date inclusion comes from the attached event.
- Explicit separation between calculated base compensation and persisted supplemental line items.
- Show and shift-block actual time fields, as the Phase 4 implementation slice of the broader actual-ownership rule in the cost model.
- Metadata-column audit append for snapshot field overrides.
- Existing soft-delete behavior respected by reads.
- No historical backfill or repair of existing `ShowCreator` rows.

### Out of Scope

- Economics aggregation, rollups, unresolved reason composition, and monetary formulas - owned by 2.3.
- Generic studio-wide line-item CRUD workspace in 2.2.
- Studio economics review/export workspace - owned by 3.1.
- Show planning export - owned by 3.2.
- Revenue, commission resolution, and contribution margin - future target.
- Settlement state machine, approval, reopen, or lock workflow.
- Freeze write guards at show/shift end.
- Grace-window settings or duration normalization.
- Dedicated actuals audit table.
- Historical assignment snapshot normalization or backfill.
- Type-based sign enforcement (`DEDUCTION < 0`, others `> 0`).
- Payment processing, bank reconciliation, acknowledgement, dispute, or recipient-initiated adjustments.
- Rule-engine formulas, overtime multipliers, tiered commission, or payroll generation.
- Generated line-item snapshots for base show compensation or base shift labor.
- Standing/null-scope, schedule-scoped, global, recurring, HR, or payment-system line items.

## Users

| User                     | Need |
| ------------------------ | ---- |
| Studio ADMIN             | Maintain target-scoped line items, enter actuals, update snapshot fields when operationally necessary, and understand values affect read-only references. |
| Studio MANAGER           | Maintain target-scoped line items and actuals for shows/shifts they operate, with the same reference-only framing. |
| System admin             | Inspect and correct line-item records across studios for support and reconciliation. |
| Studio creators          | Later read their own creator compensation view through 2.3 `/me/` endpoints. |
| Studio members/operators | Later read their own operator compensation view through 2.3 `/me/` endpoints. |

## Existing Infrastructure

| Model / Endpoint   | Current Behavior | Required Change |
| ------------------ | ---------------- | --------------- |
| `StudioMembership` | `baseHourlyRate` source for `StudioShift.hourlyRate` snapshots | No schema change; snapshot override audit uses metadata when edited. |
| `StudioCreator` | Default creator compensation fields | No schema change; assignment snapshots remain on `ShowCreator`. |
| `ShowCreator` | `agreedRate`, `compensationType`, `commissionRate` assignment snapshot fields | No schema change; future assignment writes should persist explicit/resolved terms when available. Override edits append metadata audit entries. |
| `Show` | Scheduled `startTime` / `endTime` | Add nullable `actualStartTime` / `actualEndTime`. |
| `StudioShift` | `hourlyRate`; legacy stored cost columns may exist | Separate cleanup removes stored cost columns. Override edits to `hourlyRate` append metadata audit entries. |
| `StudioShiftBlock` | Scheduled `startTime` / `endTime` | Add nullable `actualStartTime` / `actualEndTime`. |
| `/me/` module | Existing self-access pattern | 2.3 uses this for read-only compensation views; 2.2 does not invent a new identity pattern. |

## Product Decisions

### Event-scoped adjustments, not a ledger

`CompensationLineItem` stores a supplemental cost input attached to a concrete show or shift event / event participation. It is not a double-entry accounting transaction, payment instruction, payroll record, recurring HR cost, or generated base-compensation row. Phase 4 does not support free-floating line items that need their own effective date.

### Base compensation is calculated from snapshots

Normal creator/show base compensation is calculated from `ShowCreator` snapshot fields plus show planned/actual duration. Normal operator/shift base labor is calculated from `StudioShift.hourlyRate` plus shift-block planned/actual duration. 2.2 must not create `CompensationLineItem` rows to represent those base amounts. If the UI needs a breakdown table, 2.3 can return generated read-model rows for base components alongside persisted supplemental line items.

### Existing rows are not repaired

The feature is forward-looking. Calculators may calculate only when the required facts exist. Existing rows that lack reliable snapshots or actuals remain unresolved or pending in later read models; 2.2 does not backfill them from mutable current defaults.

### Store outcomes, not rules

Line items are flat amounts entered by a user or a future rule engine. Phase 4 does not store formulas in `metadata`, infer overtime, or calculate bonus rules.

### Signed amounts are allowed without type enforcement

`amount` is a signed decimal. UI should make direction obvious, but Phase 4 does not reject a positive `DEDUCTION` or negative `BONUS`. Sign validation can be added later without reshaping storage.

### Actuals are plain nullable facts

Actuals can be entered any time by authorized studio users. There is no approval flag, settlement flag, freeze gate, or grace normalization in Phase 4. The 2.3 calculator chooses actual time only when both actual timestamps are present. If actuals are absent or incomplete, it falls back to planned time when planned timestamps exist and emits calculation warnings. If planned time is also missing, the row is unresolved.

Actuals must be stored on the narrowest entity whose fact they describe. In this 2.2 slice, the persisted inputs are overall show actuals (`Show`) and operator/member labor actuals (`StudioShiftBlock`). If later work needs creator-specific attendance for multi-creator shows, that belongs on `ShowCreator`; if later work needs platform stream or performance windows, that belongs on `ShowPlatform` or a dedicated platform metrics child model. Those future fields can coexist with show actuals because they have different meanings.

### Snapshot fields are intended-immutable, not locked

`ShowCreator` agreement fields and `StudioShift.hourlyRate` are snapshots. ADMIN/MANAGER may update them through normal update routes when needed, but the FE must warn that historical reference values and rollups recompute. Each override appends `{field, old, new, actorId, at, reason?}` to the row's existing `metadata` audit trail.

## Conceptual Model

### Compensation line item

A compensation line item is a studio-scoped supplemental cost fact:

- It has a signed amount, item label (`BONUS`, `ALLOWANCE`, `OVERTIME`, `DEDUCTION`, or `OTHER`), required human-readable reason, creator/updater audit metadata, and soft-delete behavior.
- It attaches to exactly one supported operational event or event participation in the same studio.
- Required Phase 4 attachment concepts are show, show creator assignment, shift, and shift block.
- It is included by date through the attached event. It does not carry its own `effectiveDate`.
- It is never generated for normal base show compensation or normal base shift labor.

### Polymorphic attachment direction

The model remains polymorphic because the same supplemental cost concept can attach to multiple operational entities. The implementation design follows the codebase's Prisma-friendly polymorphism pattern, using `TaskTarget` as the local reference: a discriminator plus target identity, with optional typed FK columns where referential integrity, indexing, and query ergonomics justify them.

The product constraints are:

- external APIs use UIDs, not internal DB IDs;
- unsupported attachment types are rejected;
- line items cannot be free-floating, standing, schedule-scoped, global, recurring, HR, or payment-system records in Wave 2;
- date inclusion comes from the attached event;
- normal base compensation remains calculated from snapshots by 2.3, not persisted as line items.

## API Direction

2.2 is implemented as independent PRs:

| Slice | API direction | Purpose |
| ----- | ------------- | ------- |
| System support CRUD | `/admin/compensation-line-items` | System-admin support and reconciliation across studios. |
| Studio target APIs | Contextual show/show-creator/shift/shift-block line-item collections | Studio operator workflows where the target is known from the route. |
| Actuals APIs | Show actuals and shift-block actuals mutations | Persist scoped actual facts for later calculators. |
| Snapshot readiness | Existing assignment and shift update routes append audit on snapshot edits | Preserve future calculation traceability without a new audit table. |
| Shift cost cleanup | Separate DB/API/FE cleanup | Remove stored calculated/reference cost columns after consumers are updated. |

## Frontend Requirements

| Surface | Requirement |
| ------- | ----------- |
| System line-item support | System admins can inspect, filter, create, correct, and soft-delete line items across studios. |
| Target-scoped studio panels | ADMIN/MANAGER can create, edit, and soft-delete line items from the show, show creator assignment, shift, or shift block being adjusted. |
| Base vs supplemental display | Breakdown UI separates calculated base compensation from supplemental line items; users must not see generated base rows as editable line items. |
| Actuals entry | Show detail and shift-block surfaces expose compact actual-time inputs for ADMIN/MANAGER. |
| Planned fallback warnings | Admin/manager surfaces display warnings when costs are calculated from planned time because actuals are missing or incomplete. |
| Recipient pending state | Creator/operator/helper self-views show acknowledged events as pending when actuals are missing or incomplete, and do not show compensation amounts or include pending rows in recipient monetary totals. |
| Snapshot overrides | Existing assignment/shift edit flows warn before changing snapshot fields and collect optional reason text for metadata audit. |
| Read-only compensation views | 2.3 exposes calculated read views; FE must not compute money locally. |

## Acceptance Criteria

- [ ] System admins can manage line items through `/system/compensation-line-items` / `/admin/compensation-line-items`.
- [ ] Studio ADMIN and MANAGER can create, update, list, and soft-delete compensation line items from supported target-specific workflows.
- [ ] Line item API uses UIDs externally and never exposes internal DB IDs.
- [ ] The line-item attachment model remains polymorphic and follows the repo's Prisma-friendly pattern.
- [ ] `CompensationItemType` supports `BONUS`, `ALLOWANCE`, `OVERTIME`, `DEDUCTION`, and `OTHER`.
- [ ] `amount` is stored as decimal and serialized as a string at the API boundary.
- [ ] Type-based sign enforcement is not implemented in Phase 4.
- [ ] `reason` is required and returned in read responses.
- [ ] Line items cannot be created without a supported show/shift event attachment.
- [ ] No `effectiveDate`, standing/null scope, schedule-scoped, global, recurring, HR, or payment-system line items are introduced in Wave 2.
- [ ] Normal base show compensation and base shift labor are not persisted as `CompensationLineItem` records.
- [ ] Soft-deleted line items are excluded from default reads.
- [ ] `Show.actualStartTime` and `Show.actualEndTime` are nullable and writable by ADMIN/MANAGER.
- [ ] `StudioShiftBlock.actualStartTime` and `StudioShiftBlock.actualEndTime` are nullable and writable by ADMIN/MANAGER.
- [ ] Missing or incomplete actual pairs are persisted as entered and may resolve through planned fallback for admin/manager 2.3 views when planned time exists.
- [ ] Creator/operator/helper self-views do not show compensation amounts for rows with missing or incomplete actuals, including fixed-compensation rows.
- [ ] Creator/operator/helper self-view totals exclude pending rows and pending-row line items until actuals are complete.
- [ ] No actuals approval, reopen, settlement, or freeze fields are added.
- [ ] Existing `ShowCreator` rows with missing snapshot fields are not backfilled by 2.2.
- [ ] Normal app assignment writes persist explicit/resolved `ShowCreator` agreement snapshot fields when available; unresolved rows remain calculably unresolved.
- [ ] Roster default-rate update UX states that existing assignment snapshots are unchanged unless a manager explicitly edits those assignments.
- [ ] ADMIN/MANAGER changes to `ShowCreator` snapshot fields and `StudioShift.hourlyRate` append metadata audit entries with field, old value, new value, actor, timestamp, and optional reason.
- [ ] `StudioShift.projectedCost` and `StudioShift.calculatedCost` are removed only in the dedicated cleanup PR.
- [ ] 2.3 calculator tests can consume fixtures containing line items, show actuals, shift-block actuals, and snapshot override history without needing extra Phase 4 workflow state.

## Design Reference

- 2.1 Economics Cost Model: [economics-cost-model.md](./economics-cost-model.md)
- 2.2 Breakdown Spec: [2026-05-09-compensation-line-items-phase-2-2-breakdown.md](../superpowers/specs/2026-05-09-compensation-line-items-phase-2-2-breakdown.md)
- 2.2 Implementation Plan: [2026-05-09-compensation-line-items-phase-2-2.md](../superpowers/plans/2026-05-09-compensation-line-items-phase-2-2.md)
- 2.3 Economics Service: [economics-service.md](./economics-service.md)
- Architecture Guardrails: [PHASE_4.md#architecture-guardrails](../roadmap/PHASE_4.md#architecture-guardrails)
