# PRD: Compensation Line Items + Actuals (2.2)

> **Status**: 🔲 Planned - required Phase 4 scope
> **Phase**: 4 - Wave 2 (Cost Foundation)
> **Workstream**: First L-side code. Persist compensation line items, show actuals, shift-block actuals, assignment snapshot overrides, and the data surfaces that the 2.3 economics service consumes.
> **Depends on**: 1.2 Studio Creator Roster ✅ · 1.3 Studio Member Roster ✅ · 1.5 Studio Show Management ✅ · 2.1 Economics Cost Model ([PRD](./economics-cost-model.md))
> **Canonical semantics**: [economics-cost-model.md](./economics-cost-model.md) owns Phase 4 cost rules: read-only reference views, pure live calculation, nullable unresolved components, actuals priority cascade, no freeze/settlement/grace workflow.

## Purpose

2.2 delivers the persisted cost inputs required by the 2.3 economics service. It is not a calculator and not a payment workflow.

The required Phase 4 slice is:

1. **Compensation line items** - flat signed supplemental cost records attached to concrete show or shift events / event participation, not standalone HR or payment records.
2. **Show actuals** - nullable `Show.actualStartTime` / `Show.actualEndTime` entered by studio operators.
3. **Shift-block actuals** - nullable `StudioShiftBlock.actualStartTime` / `StudioShiftBlock.actualEndTime`.
4. **Assignment snapshot override audit** - ADMIN/MANAGER updates to intended-immutable snapshot fields append to the row's existing `metadata` audit trail.
5. **Existing assignment snapshot normalization** - assignments created before resolved `ShowCreator` terms were required are normalized or explicitly marked unresolved before 2.3 reads them.
6. **Drop stored shift projection** - remove `StudioShift.projectedCost`; projection is computed live by 2.3.

2.3 consumes these inputs to produce the creator, operator, and operational cost views defined in [economics-cost-model.md §3](./economics-cost-model.md#3-three-views-read-only).

## Scope Boundary

2.2 is required for Phase 4, but the simplified Phase 4 model excludes several concepts from earlier drafts.

### In Scope

- CRUD for active compensation line items.
- Soft delete for line items.
- Signed decimal `amount` with no type-based sign enforcement in Phase 4.
- Required free-text `reason`.
- Event-scoped attachment to supported show/shift entities such as show-creator assignment, show, shift, or shift block.
- Event-attached line items included by the 2.3 direct compensation and operational calculators according to the attached event's date/time.
- No separate `effectiveDate`; date inclusion comes from the attached event.
- Explicit separation between calculated base compensation and persisted supplemental line items.
- Show and shift-block actual time fields.
- Metadata-column audit append for snapshot field overrides.
- Existing soft-delete behavior respected by reads.

### Out of Scope

- Economics aggregation, rollups, unresolved reason composition, and monetary formulas - owned by 2.3.
- Studio economics review/export workspace - owned by 3.1.
- Show planning export - owned by 3.2.
- Revenue, commission resolution, and contribution margin - future target.
- Settlement state machine, approval, reopen, or lock workflow.
- Freeze write guards at show/shift end.
- Grace-window settings or duration normalization.
- Dedicated actuals audit table.
- Adjustment-vs-agreement discrimination based on `createdAt`.
- Type-based sign enforcement (`DEDUCTION < 0`, others `> 0`).
- Payment processing, bank reconciliation, acknowledgement, dispute, or recipient-initiated adjustments.
- Rule-engine formulas, OT multipliers, tiered commission, or payroll generation.
- Generated line-item snapshots for base show compensation or base shift labor.
- Standing/null-scope, schedule-scoped, global, recurring, HR, or payment-system line items.

## Users

| User                     | Need                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Studio ADMIN             | Maintain line items, enter actuals, update snapshot fields when operationally necessary, and understand that values affect read-only references. |
| Studio MANAGER           | Maintain line items and actuals for shows/shifts they operate, with the same reference-only framing.                                             |
| Studio creators          | Later read their own creator compensation view through 2.3 `/me/` endpoints.                                                                     |
| Studio members/operators | Later read their own operator compensation view through 2.3 `/me/` endpoints.                                                                    |

## Existing Infrastructure

| Model / Endpoint   | Current Behavior                                                              | Required Change                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `StudioMembership` | `baseHourlyRate` source for `StudioShift.hourlyRate` snapshots                | No schema change; snapshot override audit uses metadata pattern when edited.                                          |
| `StudioCreator`    | Default creator compensation fields                                           | No schema change; assignment snapshots remain on `ShowCreator`.                                                       |
| `ShowCreator`      | `agreedRate`, `compensationType`, `commissionRate` assignment snapshot fields | No schema change; normal assignment writes must persist resolved terms. Override edits append metadata audit entries. |
| `Show`             | Scheduled `startTime` / `endTime`                                             | Add nullable `actualStartTime` / `actualEndTime`.                                                                     |
| `StudioShift`      | `hourlyRate`; legacy `projectedCost` may exist                                | Drop `projectedCost`; override edits to `hourlyRate` append metadata audit entries.                                   |
| `StudioShiftBlock` | Scheduled `startTime` / `endTime`                                             | Add nullable `actualStartTime` / `actualEndTime`.                                                                     |
| `/me/` module      | Existing self-access pattern                                                  | 2.3 uses this for read-only compensation views; 2.2 does not invent a new identity pattern.                           |

## Product Decisions

### Event-scoped adjustments, not a ledger

`CompensationLineItem` stores a supplemental cost input attached to a concrete show or shift event / event participation. It is not a double-entry accounting transaction, payment instruction, payroll record, recurring HR cost, or generated base-compensation row. Phase 4 does not support free-floating line items that need their own effective date.

### Base compensation is calculated from snapshots

Normal creator/show base compensation is calculated from `ShowCreator` snapshot fields plus show planned/actual duration. Normal operator/shift base labor is calculated from `StudioShift.hourlyRate` plus shift-block planned/actual duration. 2.2 must not create `CompensationLineItem` rows to represent those base amounts. If the UI needs a breakdown table, 2.3 can return generated read-model rows for base components alongside persisted supplemental line items.

### Store outcomes, not rules

Line items are flat amounts entered by a user or a future rule engine. Phase 4 does not store formulas in `metadata`, infer OT, or calculate bonus rules.

### Signed amounts are allowed without type enforcement

`amount` is a signed decimal. UI should make direction obvious, but Phase 4 does not reject a positive `DEDUCTION` or negative `BONUS`. Sign validation can be added later without reshaping storage.

### Event attachment is the Phase 4 scope

Line items attach to supported show/shift entities. Date-ranged admin/manager direct views include a line item through its attached event. Recipient self-views only show monetary line-item impact when the row is countable under the actuals visibility rule. Operational views include show-attached line items directly; shift-attached line items follow the same show-overlap allocation rule as shift labor when shift cost is allocated across shows. Schedule-scoped, standing, global, and recurring line items are deferred.

### Actuals are plain nullable facts

Actuals can be entered any time by authorized studio users. There is no approval flag, settlement flag, freeze gate, or grace normalization in Phase 4. The 2.3 calculator chooses actual time only when both actual timestamps are present. If actuals are absent or incomplete, it falls back to planned time when planned timestamps exist and emits calculation warnings. If planned time is also missing, the row is unresolved.

Frontend surfaces must handle missing actuals differently by audience:

- Admin/manager surfaces may show planned-fallback values, but must warn that actuals are missing or incomplete and the displayed cost is calculated from planned time.
- Creator and operator/helper self-views must not show compensation amounts for events with missing or incomplete actuals, even if the compensation package is fixed. They show the acknowledged event as pending/not countable yet, so the recipient can follow up with a line manager without forming a wrong expectation.
- Supplemental line items attached to pending recipient events are also hidden from recipient monetary totals until the event has complete actuals and becomes countable. The pending event can still indicate that supplemental items exist if 2.3 exposes that context without revealing a misleading amount.

### Snapshot fields are intended-immutable, not locked

`ShowCreator` agreement fields and `StudioShift.hourlyRate` are snapshots. ADMIN/MANAGER may update them through normal update routes when needed, but the FE must warn that historical reference values and rollups recompute. Each override appends `{field, old, new, actorId, at, reason?}` to the row's existing `metadata` audit trail.

### Existing assignments need explicit normalization

2.2 must handle `ShowCreator` rows created before normal assignment writes resolved default terms. The default product expectation is to backfill missing snapshot fields from the current `StudioCreator` defaults when those defaults exist, append metadata noting the Wave 2 normalization, and leave rows unresolved only when no reliable default is available. 2.3 reads the normalized snapshot fields; it must not apply roster defaults live at read time.

## Conceptual Model

This PRD locks product semantics, not the final Prisma schema, DTO names, or route paths.

### Compensation line item

A compensation line item is a studio-scoped supplemental cost fact:

- It has a signed amount, item label (`BONUS`, `ALLOWANCE`, `OVERTIME`, `DEDUCTION`, or `OTHER`), required human-readable reason, creator/updater audit metadata, and soft-delete behavior.
- It attaches to exactly one supported operational event or event participation in the same studio.
- Required Phase 4 attachment concepts are show, show-creator assignment, shift, and shift block.
- It is included by date through the attached event. It does not carry its own `effectiveDate`.
- It is never generated for normal base show compensation or normal base shift labor.

### Polymorphic attachment direction

The model must remain polymorphic because the same supplemental cost concept can attach to multiple operational entities. The implementation design should follow the codebase's Prisma-friendly polymorphism pattern, using `TaskTarget` as the local reference: a discriminator plus target identity, with optional typed FK columns where referential integrity, indexing, and query ergonomics justify them.

Because this is financial data, new discriminators should use Prisma enum values where the technical design can do so cleanly. Exact enum names, typed FK column names, uniqueness constraints, indexes, route paths, DTO shapes, and error codes belong to the post-sign-off implementation design.

The product constraints are:

- external APIs use UIDs, not internal DB IDs;
- unsupported attachment types are rejected;
- line items cannot be free-floating, standing, schedule-scoped, global, recurring, HR, or payment-system records in Wave 2;
- date inclusion comes from the attached event;
- normal base compensation remains calculated from snapshots by 2.3, not persisted as line items.

### Actuals and snapshot inputs

2.2 also owns the input facts consumed by 2.3:

- nullable show actual start/end timestamps;
- nullable shift-block actual start/end timestamps;
- removal of stored `StudioShift.projectedCost`;
- metadata-audit append when ADMIN/MANAGER updates intended-immutable snapshot fields such as `ShowCreator` agreement fields or `StudioShift.hourlyRate`.

No actuals approval, reopen, settlement, freeze, or dedicated actuals audit table ships in Phase 4.

## API Direction

2.2 must provide ADMIN/MANAGER input surfaces for:

- creating, listing, editing, and soft-deleting supplemental line items;
- setting or clearing show actual timestamps;
- setting or clearing shift-block actual timestamps;
- editing snapshot fields with an explicit warning and metadata-audit append.

This PRD does not lock endpoint names, request DTOs, or error-code names. The technical design should choose those after the product scope is signed off.

## Frontend Requirements

| Surface                      | Requirement                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Compensation item management | ADMIN/MANAGER can create, edit, filter, and soft-delete line items.                                                                       |
| Attachment selection         | Picker distinguishes supported event attachments such as show creator assignment, show, shift, and shift block, and uses UIDs, not internal DB IDs. |
| Base vs supplemental display | Breakdown UI separates calculated base compensation from supplemental line items; users must not see generated base rows as editable line items. |
| Actuals entry                | Show detail and shift-block surfaces expose compact actual-time inputs for ADMIN/MANAGER.                                                 |
| Planned fallback warnings    | Admin/manager surfaces display warnings when costs are calculated from planned time because actuals are missing or incomplete. |
| Recipient pending state      | Creator/operator/helper self-views show acknowledged events as pending when actuals are missing or incomplete, and do not show compensation amounts or include pending rows in recipient monetary totals. |
| Snapshot overrides           | Existing assignment/shift edit flows warn before changing snapshot fields and collect optional reason text for metadata audit.            |
| Read-only compensation views | 2.3 exposes calculated read views; FE must not compute money locally.                                                                     |

## Acceptance Criteria

- [ ] ADMIN and MANAGER can create, update, list, and soft-delete compensation line items attached to supported show/shift event entities.
- [ ] Line item API uses UIDs externally and never exposes internal DB IDs.
- [ ] The line-item attachment model remains polymorphic and follows the repo's Prisma-friendly pattern, using `TaskTarget` as a local reference for discriminator plus target identity with optional typed FKs where needed.
- [ ] New financial discriminators use Prisma enum values where the technical design can do so cleanly.
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
- [ ] Planned fallback rows expose calculation warnings so admin/manager FE surfaces can tell users that actuals are missing/incomplete.
- [ ] Creator/operator/helper self-views do not show compensation amounts for rows with missing or incomplete actuals, including fixed-compensation rows; they show the event as pending/not countable until actuals are complete.
- [ ] Creator/operator/helper self-view totals exclude pending rows and pending-row line items until actuals are complete.
- [ ] No actuals approval, reopen, settlement, or freeze fields are added.
- [ ] `StudioShift.projectedCost` is removed and no replacement cached projection field is introduced.
- [ ] Normal app assignment writes persist resolved `ShowCreator` agreement snapshot fields from explicit input or current `StudioCreator` defaults.
- [ ] Existing `ShowCreator` rows with missing snapshot fields are normalized before 2.3 reads them, or explicitly remain unresolved with `agreement_snapshot_missing` when no reliable default exists.
- [ ] Roster default-rate update UX states that existing assignment snapshots are unchanged unless a manager explicitly edits those assignments.
- [ ] ADMIN/MANAGER changes to `ShowCreator` snapshot fields and `StudioShift.hourlyRate` append metadata audit entries with field, old value, new value, actor, timestamp, and optional reason.
- [ ] 2.3 calculator tests can consume fixtures containing line items, show actuals, shift-block actuals, and snapshot override history without needing extra Phase 4 workflow state.

## Product Decisions

- **2.2 is data input, not economics math.** The pure calculator and read endpoints land in 2.3.
- **Read-only reference framing.** Values are for inspection and reconciliation; they do not authorize payment.
- **Line items are flat signed event-scoped supplemental amounts.** They store add-ons, deductions, and explanations attached to show/shift events, not base compensation, recurring HR costs, payment records, or rules.
- **No Phase 4 freeze/approval/grace.** Those are future extensions documented in [economics-cost-model.md §4](./economics-cost-model.md#4-future-extensions).
- **Metadata audit is enough for snapshot overrides.** A separate audit table waits until settlement/payment workflows need stronger authority.
- **Schedule/standing/global line items are deferred.** This avoids hidden date and allocation rules before the product defines whether those belong in this model or a future HR/payment model.

## Design Reference

Pre-signoff design drafts were removed because they encoded freeze, approval, grace, and broader compensation assumptions that are out of Phase 4 scope. Redraft backend and frontend implementation designs from this PRD before 2.2 implementation starts. Wave 3 PRDs are consumer context only; revise them when Wave 3 starts, not as part of the 2.2 scope.

- 2.1 Economics Cost Model: [economics-cost-model.md](./economics-cost-model.md)
- 2.3 Economics Service: [economics-service.md](./economics-service.md)
- Architecture Guardrails: [PHASE_4.md#architecture-guardrails](../roadmap/PHASE_4.md#architecture-guardrails)
