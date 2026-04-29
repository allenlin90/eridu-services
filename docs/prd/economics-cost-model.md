# PRD: Economics Cost Model (2.1)

> **Status**: ✅ Signed off — canonical Phase 4 cost semantics locked
> **Phase**: 4 — Wave 2 critical-path gate
> **Workstream**: L-side P&L visibility — minimal cost reference + extensible foundation
> **Gates**: 2.2 Compensation Line Items, 2.3 Economics Service
> **Future target**: P&L Revenue Workflow (commission resolution + contribution margin)
> **Constraints**: Phase 4 [Architecture Guardrails](../roadmap/PHASE_4.md#architecture-guardrails) — monetary arithmetic, snapshot-on-write, soft-delete, fixture testing, identity-derived self-access

## Purpose

Lock the **minimal** data model and computation rules for studio compensation and operational cost in Phase 4. Phase 4's L-side stack is a **read-only reference viewer**, not a workflow system: it produces structured numbers for stakeholders to consult, and it provides a foundation that future workstreams (settlement, freeze, payment, acknowledgement, advanced compensation rules) can extend without schema reshape.

This document is authoritative for Phase 4 cost semantics. Required Wave 2 downstream PRDs must align to this simplified scope; Wave 3 PRDs are revised later against the implemented 2.3 read shape.

## Scope & Stance

- **Records are notice and reference, not source of truth.** Phase 4 stores enough data to *show* compensation and operational cost. It does not authorize, lock, settle, or pay anything. The real source of truth for "what was paid" lives outside this system (bank records, contracts, conversations) and will be cross-referenced when a payment workstream ships.
- **All views are read-only.** Recipients (creators, members/helpers) inspect actual-backed compensation and pending events; managers inspect operational rollups. No acknowledgement, dispute, or counter-signature exists in Phase 4.
- **Computation is live and pure.** Cost is derived from current persisted inputs at read time. No stored derived totals, no state machine, no transitions to manage.
- **The foundation is extensible.** Settlement gating, freeze guards, grace tolerance, payment processing, acknowledgement / dispute, advanced compensation rules, and bank-statement reconciliation each layer onto this base as additions when their workstream activates. See §4 Future Extensions.

Phase 4's two targets:

1. **Stakeholders refer to compensation and operational cost** — creator/operator self-views show actual-backed or pending event rows, while manager operational rollups can use planned fallback with warnings.
2. **Build a solid extensible foundation** — every dropped concept in the Non-Goals list has a one-paragraph extension sketch in §4 so the foundation can be sanity-checked.

## Non-Goals (Phase 4)

Everything in this list is deferred. Each has an extension sketch in §4.

- Revenue (P-side), commission resolution, and contribution margin — future target.
- Settlement state machine, settled-actuals gating, reopen flow.
- Freeze write guards at the entity-time boundary.
- Grace windows for late-arrival / early-leave tolerance.
- Adjustment-vs-agreement discrimination on line items (no `createdAt > boundary` enforcement).
- Dedicated actuals audit history; rule-engine-driven OT / tiered commission.
- Sign enforcement on line items by `item_type`.
- Cost-state enum (`PROJECTED` / `RESOLVED` / `PARTIAL` / `UNRESOLVED`) with stored transitions.
- Payment processing, bank-statement reconciliation.
- Recipient acknowledgement / dispute flow.
- Recipient-initiated adjustment requests (in-product channel).
- Notifications when manager edits actuals.
- Schedule-scoped, standing, global, or recurring line items.
- HR/payroll-style fixed costs that are not attached to a concrete show or shift event.
- Additive platform cost allocation across multi-platform shows.
- Double-entry ledger, general-ledger export.

## Terminology

| Term                              | Definition                                                                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Agreement**                     | The pre-show / pre-shift terms a creator or operator is paid by — rate, compensation type, commission rate, scheduled times.                                                                                                                     |
| **Agreement snapshot**            | The persisted per-assignment copy of agreement terms, captured at assignment time from explicit input or roster defaults. Roster default edits do not rewrite snapshots.                                                                         |
| **Snapshot-field override audit** | When ADMIN/MANAGER updates a snapshot field (e.g. `ShowCreator.agreedRate`), the change is recorded on the row using the codebase's existing metadata-audit pattern. No separate audit table is introduced in Phase 4.                           |
| **Compensation component**        | One independently-computed part of a creator agreement (`FIXED_BASE` / `HOURLY_BASE` / commission). `HYBRID` = more than one component.                                                                                                          |
| **Actuals**                       | Recorded measurements: actual show time, actual shift block time. Plain nullable timestamps; entered freely. A complete pair is required before actual duration can drive calculation.                                                           |
| **Line item**                     | A `CompensationLineItem` record: a flat supplemental amount attached to a concrete operational event or event participation, such as a show assignment or shift block. It is not the base show/shift compensation snapshot.                      |
| **Unresolved reason**             | A string label on a row identifying why a component has no value (`commission_pending_revenue`, `planned_time_missing`, `agreement_snapshot_missing`). UI surfaces these instead of substituting `0`.                                            |
| **Calculation warning**           | A string label on a row identifying why a computed value is provisional but still calculable, such as `actuals_missing_using_planned` or `actuals_incomplete_using_planned`.                                                                     |
| **Reference figure**              | The reconciled cost view for an assignment / shift / period. Admin/manager surfaces may include planned fallback with warnings; recipient self-views only show monetary values when actuals are complete. No settlement state exists in Phase 4. |
| **Pending recipient event**       | A creator/operator/helper self-view row where the event is acknowledged but complete actuals are not available, so compensation cannot be counted yet and monetary totals are hidden.                                                            |
| **Countable recipient total**     | A self-view total that includes only rows with complete actuals and otherwise resolved monetary components. Pending recipient events are counted separately and never included through planned fallback.                                         |

## 1. Data Model

### Agreement snapshot

When a creator is assigned to a show, `ShowCreator` persists `agreedRate`, `compensationType`, and `commissionRate` from explicit input or `StudioCreator` defaults at the moment of assignment. The same snapshot pattern already exists for `StudioShift.hourlyRate` from `StudioMembership.baseHourlyRate`. After snapshot:

- Reads use the snapshot. Source-table edits (`StudioCreator.defaultRate`, `StudioMembership.baseHourlyRate`) never rewrite existing snapshots.
- Snapshot fields (`ShowCreator.agreedRate`, `compensationType`, `commissionRate`; `StudioShift.hourlyRate`) are **intended-immutable**. ADMIN and MANAGER may update them through normal edit surfaces; the UI shows a warning explaining the downstream impact (historical references and cost rollups will recompute).
- Each update appends an entry to the existing metadata-audit trail capturing `{field, old, new, actorId, at, reason?}`. **No dedicated audit table.** The metadata trail is the audit.

### Compensation components

`compensationType` is the user-facing package label. The economics service resolves the package into components before calculation.

| Package      | Components               | Phase 4 computation                                                                                                                           |
| ------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIXED`      | `FIXED_BASE`             | Fixed amount for the assignment; recipient self-views still wait for complete actuals before showing/counting it.                             |
| `HOURLY`     | `HOURLY_BASE`            | `agreedRate × duration`; admin/manager surfaces may use planned fallback with warnings, while recipient self-views wait for complete actuals. |
| `COMMISSION` | one commission component | `null` until a future revenue/sales input lands.                                                                                              |
| `HYBRID`     | two or more components   | Sum of resolved components; `null` if any commission component pending.                                                                       |

The component model is the extension point for future commission variants and the Phase 5 rule engine.

### Actuals

- `Show.actualStartTime` / `Show.actualEndTime` — nullable, entered any time.
- `StudioShiftBlock.actualStartTime` / `StudioShiftBlock.actualEndTime` — nullable, entered any time.

No state machine, no settlement, no approval. Actuals may be absent, complete, or incomplete:

- If both actual timestamps are absent, computation falls back to scheduled times when scheduled times exist and emits an actuals-missing warning.
- If both actual timestamps are present, computation uses the actual duration.
- If exactly one actual timestamp is present, computation falls back to scheduled times when scheduled times exist and emits an actuals-incomplete warning.
- If planned time is also missing, the row is unresolved with `planned_time_missing`.

Planned fallback is an admin/manager and operational review behavior. Creator/operator/helper self-views must not expose money for any event whose actuals are absent or incomplete, even if the compensation package is fixed and does not mathematically depend on duration. Those rows remain visible as pending recipient events so the recipient can see that the event exists and can follow up with a line manager, but the event cannot be counted as compensation yet. If the self-view shows a period total, that total must be a countable recipient total: complete-actuals, resolved rows only, with pending counts/events shown separately.

Manager edits to past actuals are allowed; if the entity's existing audit pattern covers those fields, edits are appended there. Notifications to recipients are deferred (§4).

### Compensation line items

`CompensationLineItem` is a flat supplemental cost record. It stores add-ons and deductions such as bonus, allowance, overtime adjustment, correction, or other explicit manual costs. It must be attached to a concrete operational event or event participation. It must not be generated from normal base compensation.

Conceptual requirements:

- Attachment target: exactly one supported operational event or event participation in the same studio. Required Phase 4 attachment concepts are show, show-creator assignment, shift, and shift block.
- Polymorphism: follow the repo's Prisma-friendly polymorphic pattern in technical design; exact discriminator, typed FK, and index names do not belong in this cost-model PRD.
- Item label: `BONUS` / `ALLOWANCE` / `OVERTIME` / `DEDUCTION` / `OTHER`. Label-only; no special computation.
- Amount: signed decimal. **No sign enforcement in Phase 4** — UI surfaces direction.
- Reason: free text and required, since this is the human-readable explanation a stakeholder reads.
- Audit metadata: preserve creator and creation time; `createdAt` is not used to discriminate adjustment-vs-agreement in Phase 4.

No standalone, standing, schedule-scoped, global, recurring, or HR/payroll-style line items ship in Phase 4. Date inclusion comes from the attached event, not a separate `effectiveDate`. No freeze, no adjustment-vs-agreement discrimination, no `createdAt > boundary` semantics in Phase 4. The calculator sums line items into the attached event / recipient totals. Phase 5+ may introduce a different model or migration for non-event compensation.

Base compensation remains separate:

- Creator/show base compensation is calculated from `ShowCreator.agreedRate`, `compensationType`, `commissionRate`, and show planned/actual duration.
- Operator/shift base labor is calculated from `StudioShift.hourlyRate` and shift-block planned/actual duration.
- These base components may appear as generated rows in API responses, but they are not persisted as `CompensationLineItem` rows.

### Soft delete

All entities follow the existing soft-delete pattern (Architecture Guardrail 5). Aggregation queries exclude soft-deleted rows by default; admin/audit surfaces may include them when explicitly requested.

### Removed from prior thinking

Things present in earlier drafts of this PRD that Phase 4 explicitly **does not introduce**:

- `Show.actualsSettledAt` / `actualsSettledBy`, `StudioShift.actualsSettledAt` / `actualsSettledBy` — no settlement.
- Dedicated actuals audit history — metadata-audit pattern handles snapshot overrides; actuals edits use the same pattern where applicable.
- Freeze guards on agreement / line-item writes at entity-time boundary.
- `Studio` grace-window settings (`graceLateShowMinutes`, etc.).
- `effectiveDate`, standing/null-scope line items, schedule-scoped line items, global line items, and recurring HR/payroll costs.
- `StudioShift.projectedCost` — drop, compute live at read time.
- Cost-state enum stored or enforced via transitions.

## 2. Computation

The economics service is a **pure calculator** over current persisted state. No stored derived fields, no transitions.

### Per-creator base

Resolve compensation components from the snapshot, evaluate each against available data:

- `FIXED_BASE` → fixed amount; recipient self-view countability still requires complete actuals for the event.
- `HOURLY_BASE` → `agreedRate × duration`. Duration uses `Show.actualStartTime/EndTime` if both are present. If actuals are absent or incomplete, duration falls back to `Show.startTime/endTime` when planned time exists and emits a warning. If neither actual nor planned duration can be resolved, the component is unresolved.
- Commission components → `null` in Phase 4 (future revenue workflow resolves).

### Per-shift labor

`StudioShift.hourlyRate × block-duration`, where block-duration uses `actualStartTime/EndTime` if both are present. If actuals are absent or incomplete, block-duration falls back to scheduled time when scheduled time exists and emits a warning. If neither actual nor scheduled duration can be resolved, the component is unresolved. Existing proportional-overlap allocation by minutes for blocks that span multiple shows is unchanged.

### Event-attached line items

Sum supplemental line items attached to the same show assignment, show event, shift, or shift block being read. Result may be negative — that is intentional and visible in rollups. Do not include generated base compensation as a line item. Shift-attached line items follow the same show-overlap allocation rule as shift labor when the operational view allocates shift cost across shows.

### Cost row semantics

Each row exposes:

- `cost` — nullable decimal. `base + lineItems` if all components resolved; `null` if any component unresolved.
- `base_subtotal` — nullable decimal. The base portion alone (visible even when total is null because line items resolve and need to be shown).
- `line_item_subtotal` — non-nullable decimal. Sum of supplemental line items only; `0` when no line items.
- `unresolved_reasons` — string array. Examples: `["creator:smc_x:commission_pending_revenue"]`, `["show:show_y:planned_time_missing"]`, `["creator:smc_x:agreement_snapshot_missing"]`. UI consumes these instead of seeing `0`.
- `calculation_warnings` — string array. Examples: `["show:show_y:actuals_missing_using_planned"]`, `["shift_block:ssb_z:actuals_incomplete_using_planned"]`. UI surfaces these as provisional-value warnings, not null-cost blockers.
- `actuals_source` — which input category drove time-based components: `OPERATOR_RECORD` / `PLANNED` (Phase 4); the enum extends to `PLATFORM` / `CREATOR_APP` / `PUNCH_CLOCK` later.
- `is_in_future` — boolean derived from entity-time vs request time. UI uses this to label the row "projected" if it likes; Phase 4 does not store a state enum.

Recipient self-view responses must include enough status/reason metadata for FE to show pending events, but must suppress monetary totals whenever actuals are missing or incomplete. Pending rows do not contribute to recipient-facing row amounts, subtotals, or period totals until actuals are complete. Exact DTO names belong to 2.3.

### Null bubbling at rollup grains

- A row's `cost` is null if any component is unresolved.
- A grouping (schedule, client, period) reports `cost` = sum of children where defined; if any child is null, the rollup `cost` is null and `unresolved_reasons` carries the union with counts (e.g. `"3 of 17 shows pending revenue"`).
- Warnings do not null the rollup. Grouped rows carry warning unions/counts so users know totals are calculated from planned values where actuals are missing or incomplete.
- Recipient self-view totals are a separate presentation contract: they include only countable complete-actuals rows and expose pending event counts separately. They must not include planned-fallback values or silently imply that pending events are already compensation.
- Counts (`creator_count`, `show_count`) are always defined.
- **Never silently coerce null to zero at any grain.**

### Actuals priority cascade (extension point)

Time-based computation carries a forward-compatible source category so Phase 4's operator-record source can be augmented later without changing consumer-facing semantics. The product contract only needs the source category; how platform data arrives is an implementation detail.

| Priority | Source                                                           | Phase 4 status       |
| -------- | ---------------------------------------------------------------- | -------------------- |
| 1        | Platform source                                                  | Deferred             |
| 2        | Operator post-production record (`Show.actualStartTime/EndTime`) | ✅ complete pair only |
| 3        | Creator app self-record                                          | Deferred             |
| 4        | Planned show time (`Show.startTime/endTime`)                     | ✅ fallback           |

Same shape for shift blocks (1: punch-clock; 2: operator manual entry — built, complete pair only; 3: scheduled — built). New sources slot into the source resolution order without changing public row semantics. Row response carries `actuals_source` so admin/manager UI can show "calculated from Operator" or "calculated from Planned" without exposing ingestion implementation details. If an operator record is absent or incomplete and planned time exists, admin/manager rows may use planned time with a calculation warning; recipient self-view rows show pending instead.

## 3. Three Views (Read-Only)

All three views read the same data through the same calculator. **All are read-only in Phase 4** — no write endpoints, no acknowledgement, no counter-signature.

### Creator compensation view

- Creator self-view: the current authenticated user can inspect their own actual-backed creator compensation reference. If actuals are missing or incomplete, the row appears as a pending event without a monetary value.
- Creator self-view totals include only countable complete-actuals rows; pending assignment rows are visible but excluded from totals.
- Cross-user view: TALENT_MANAGER can inspect creators in the studio they manage; ADMIN and MANAGER can inspect studio creator compensation, including planned-fallback values with warnings where needed.
- Returns creator-assignment rows over the period (snapshot agreement + actuals where present) + line items attached to those assignments / show events.

### Operator compensation view

- Operator self-view: the current authenticated user can inspect their own actual-backed operator/member/helper compensation reference. If actuals are missing or incomplete, the row appears as a pending event without a monetary value.
- Operator self-view totals include only countable complete-actuals rows; pending shift rows are visible but excluded from totals.
- Cross-user view: ADMIN and MANAGER can inspect studio member/operator compensation, including planned-fallback values with warnings where needed.
- Returns shift rows (rate × actual or scheduled minutes) + line items attached to those shifts / shift blocks.

### Operational cost view

- ADMIN and MANAGER can inspect studio operational cost over a date range.
- Returns roll-up of creator and operator views grouped by show / schedule / client, with platform available as a filter or display dimension where supported.
- This is the engine 3.1 (Studio Economics Review) targets.

### Cross-cutting rules

- Date range required.
- Read-only — no writes accepted on any view.
- Apply the actuals priority cascade (§2) for time-based components; expose `actuals_source` and calculation warnings per row.
- Suppress monetary values on recipient self-views whenever actuals are missing or incomplete. The same underlying event can be visible to managers with planned fallback and visible to recipients as pending.
- Apply null bubbling (§2); never coerce to zero.
- Self-access must derive the recipient identity from auth context. Cross-user access must remain studio-scoped and role-guarded. Exact routes and DTO names belong to the 2.3 Economics Service PRD.

## 4. Future Extensions

The Phase 4 base supports each of the deferred concepts as a clean addition. One paragraph each so the foundation can be sanity-checked. Detailed designs land or are revised when the workstream activates.

**Settlement gating.** When payment processing arrives, manager review of actuals becomes meaningful. The system records when and by whom actuals were settled, and settled views can require that state before treating actuals as authoritative. Phase 4 read-paths remain unaffected by default.

**Freeze write guards at entity-time boundary.** When freeze behavior ships, agreement-field and pre-existing-line-item changes after the show/shift boundary are blocked. New line items remain creatable as adjustments. Pairs with settlement.

**Adjustment-vs-agreement discrimination.** Once freeze ships, line items with `createdAt > entity-time boundary` are derived as adjustments; everything else is part of the frozen agreement. This is a derived field, not stored — `createdAt` is already preserved in Phase 4.

**Grace windows.** `Studio` configuration for late-arrival / early-leave tolerance per entity (show, shift block). The calculator gains a normalization step before duration math. Phase 4 default is no normalization; the addition is non-breaking.

**Dedicated audit history.** When authoritativeness matters (typically with payment processing), the metadata-audit pattern is supplemented (not replaced) with dedicated history for actuals edits, settlement events, and reopen events. The metadata pattern remains for snapshot-field overrides.

**Recipient acknowledgement / dispute.** Add `acknowledgedAt` / `disputedAt` per recipient view. Dispute reopens settlement (once settlement exists). Read-only Phase 4 views become two-party agreement views without changing the underlying computation.

**Sign enforcement on line items.** A future workstream may enforce `DEDUCTION < 0` and `BONUS / ALLOWANCE / OVERTIME > 0` at input validation. Phase 4 keeps `amount` signed and unenforced.

**Future commission resolution.** Revenue / sales input populates commission components. The snapshotted `commissionRate` is what revenue is multiplied by. Rows move from `cost = null` (component unresolved) to a known value as revenue lands. No change to the calculator's public shape — commission components simply stop returning null.

**Schedule/global/recurring compensation.** Phase 4 does not model standalone, schedule-scoped, global, recurring, HR, or payment-system compensation rows. If those needs become real, introduce a separate model or migration with explicit date, allocation, and authority semantics instead of stretching event-attached line items.

**Bank-statement reconciliation.** Once payment processing produces a `PaymentRun` record, future bank-statement integration compares PaymentRun amounts vs reference economics figures and surfaces mismatches as new `CompensationLineItem` adjustments. This is a new feature on top of the cost model, not a change to it.

**Notifications on manager edits to actuals / snapshot fields.** A future notification workflow can alert recipients when audited values change. Out of scope for Phase 4; recipients see edits on next view read.

**Advanced compensation rule engine (Phase 5).** Tiered commission, OT formulas, bonus rules. Future rule-engine output becomes line items or computed components through this same data model. The cost model stores outcomes; the rule engine produces them.

**Cost-state enum.** If downstream UI demands a single-label state per row beyond `is_in_future` and `unresolved_reasons`, a derived enum (`PROJECTED` / `RESOLVED` / `PARTIAL` / `UNRESOLVED`) can be computed in the response without persistence. Phase 4 leaves this to the UI.

## Glossary anchors

For linking from other docs:

- `#1-data-model` — snapshot fields, components, actuals, line items, metadata audit
- `#2-computation` — pure calculator, unresolved reasons, actuals priority cascade
- `#3-three-views-read-only` — creator / operator / operational, identity-derived self-access
- `#4-future-extensions` — extensibility hooks for settlement, freeze, grace, audit, acknowledgement, payment, etc.

## Product Decisions

- **Phase 4 is a viewer, not a workflow.** Records are notice and reference; views are read-only; the calculator is pure.
- **Snapshot at assignment time + metadata audit for snapshot overrides.** Stable historical references without freeze guards or a separate audit table. ADMIN and MANAGER may update intended-immutable fields; UI warns about downstream impact.
- **Component-aware compensation.** `FIXED` / `HOURLY` / `COMMISSION` / `HYBRID` resolved into components. Single source of truth for projection arithmetic — `StudioShift.projectedCost` is removed.
- **Base compensation is calculated, not stored as line items.** `ShowCreator` and `StudioShift` snapshots own normal base pay; `CompensationLineItem` stores event-attached supplemental add-ons and deductions only.
- **Null propagates through rollups; never coerce to zero.** Unresolved reasons surface explicitly to the UI.
- **Planned fallback is manager-visible only.** Missing or incomplete actuals may still produce a cost from planned time for admin/manager planning and operational rollups, but every affected row carries warnings. Creator/operator/helper self-views do not show money for those events; they show pending events until actuals are complete.
- **Recipient totals are countable-only.** Self-view totals include complete-actuals, resolved rows only and show pending event counts separately.
- **Forward-compatible actuals priority cascade.** Future sources extend the source category without changing consumer-facing row semantics.
- **Three first-class views, identity-derived self-access.** TALENT_MANAGER may view any creator's compensation in their studio.
- **Phase 4 stores outcomes, not rules.** Rule engine, settlement, freeze, grace, payment processing, acknowledgement — all extension hooks documented in §4 and revisited when their workstream activates.

## Downstream PRDs

The required Wave 2 downstream PRDs below are aligned to this simplified Phase 4 scope. Wave 3 PRDs consume this model, but they should be reviewed and revised again after 2.3 confirms the backend read shape.

- 2.2 Compensation Line Items: [compensation-line-items.md](./compensation-line-items.md)
- 2.3 Economics Service: [economics-service.md](./economics-service.md)
