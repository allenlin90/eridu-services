# PRD: Economics Cost Model (2.1)

> **Status**: ✅ Signed off — canonical Phase 4 cost semantics locked
> **Phase**: 4 — Wave 2 critical-path gate
> **Workstream**: L-side P&L visibility — minimal cost reference + extensible foundation
> **Gates**: 2.2 Compensation Line Items, 2.3 Economics Service
> **Future target**: P&L Revenue Workflow (commission resolution + contribution margin)
> **Constraints**: Phase 4 [Architecture Guardrails](../roadmap/../engineering/FINANCE_GUARDRAILS.md) — monetary arithmetic, snapshot-on-write, soft-delete, fixture testing, identity-derived self-access

## Purpose

Lock the **minimal** data model and computation rules for studio compensation and operational cost in Phase 4. Phase 4's L-side compensation stack is a **read-only reference viewer**, not a payment workflow: it produces structured numbers for stakeholders to consult, and it provides a foundation that future workstreams (settlement, freeze, payment, acknowledgement, advanced compensation rules) can extend without schema reshape.

This document is authoritative for Phase 4 cost semantics. Required Wave 2 downstream PRDs must align to this simplified scope; Wave 3 PRDs are revised later against the implemented 2.3 read shape.

## Scope & Stance

- **Records are notice and reference, not source of truth.** Phase 4 stores enough data to *show* compensation and operational cost. It does not authorize, lock, settle, or pay anything. The real source of truth for "what was paid" lives outside this system (bank records, contracts, conversations) and will be cross-referenced when a payment workstream ships.
- **Compensation and economics views are read-only.** Recipients (creators, members/helpers) inspect actual-backed compensation and pending events; managers inspect operational rollups. Operational task submissions may write actuals and performance facts, but no acknowledgement, dispute, or counter-signature exists in Phase 4.
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
- Rule-engine-driven OT / tiered commission.
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
| **Agreement snapshot missing marker** | `metadata.flags.agreement_snapshot_missing = true` on a `ShowCreator` row means required agreement snapshot fields could not be resolved at write time. It is an explanatory marker, not the calculator's only detection mechanism.          |
| **Override audit**                | When ADMIN/MANAGER updates an actual, performance fact, or snapshot field (e.g. `ShowCreator.agreedRate`), the change is recorded through the standard `Audit` / `AuditTarget` history introduced by the task-input fact binding workstream. Metadata audit arrays are legacy only after that foundation lands. |
| **Compensation component**        | One independently-computed part of a creator agreement (`FIXED_BASE` or commission). `HYBRID` = `FIXED_BASE` + commission. There is no `HOURLY_BASE` for creators — creator pay is never time-multiplied. |
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
- Each update writes a standard audit entry with old value, new value, actor, timestamp, and optional reason. Internal database IDs are not exposed in API responses or written as external identifiers. Metadata audit arrays remain legacy compatibility only; new override paths use `Audit` / `AuditTarget`.
- New assignment writes that cannot resolve the required agreement snapshot fields may set `metadata.flags.agreement_snapshot_missing = true`. Calculators must still inspect the snapshot fields directly; a missing or false flag does not prove the row is calculable.

### Compensation components

`compensationType` is the user-facing package label. The economics service resolves the package into components before calculation.

| Package      | Components               | Phase 4 computation                                                                                                                           |
| ------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIXED`      | `FIXED_BASE`             | Fixed amount for the assignment, **applied per show regardless of duration**. Recipient self-views still wait for complete actuals on the show event before showing/counting it. |
| `COMMISSION` | one commission component | `null` until a future revenue/sales input lands.                                                                                              |
| `HYBRID`     | `FIXED_BASE` + commission | Sum of resolved components: fixed base is the per-show flat amount; commission is `null` until revenue lands. Row total is `null` while commission is pending. |

> **Legal-compliance constraint:** Creator pay is **not** time-multiplied. There is no `HOURLY` creator package — neither `FIXED` nor `HYBRID` scales with `Show.duration`. Time-multiplied pay applies to operator shift labor only (`StudioShift.hourlyRate × shift-block duration`), not to creator assignments. This is a deliberate product/legal decision, not a Phase 4 deferral; do not add `HOURLY` to `CREATOR_COMPENSATION_TYPE`.

The component model is the extension point for future commission variants and the Phase 5 rule engine.

#### Cross-field validation invariants

The relationship between `compensationType` and the rate fields is enforced at the API boundary (Zod `superRefine` on `updateStudioShowCreatorInputSchema` and `updateStudioCreatorRosterInputSchema`). Calculators above assume these invariants hold:

| `compensationType` | `agreedRate` (per-show: `agreed_rate`, roster default: `default_rate`) | `commissionRate` (per-show: `commission_rate`, roster default: `default_commission_rate`) |
| ------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `FIXED`            | required (else snapshot incomplete)                                   | **must be `null`**                                                                        |
| `COMMISSION`       | ignored by calculators; FE clears it for clarity                       | **required**                                                                              |
| `HYBRID`           | required                                                              | **required**                                                                              |
| `null` (unset)     | unconstrained but ignored                                              | **must be `null`**                                                                        |

FE forms editing these fields **must** clear the irrelevant rate fields before submit (don't rely on the user to delete a stale value when switching types). See `apps/erify_studios/src/features/studio-show-creators/lib/show-creator-assignment-terms.ts` and `apps/erify_studios/src/features/studio-creator-roster/lib/studio-creator-compensation.ts` for the canonical helpers, and the `frontend-ui-components` skill for the form pattern.

### Actuals

- `Show.actualStartTime` / `Show.actualEndTime` — nullable, entered any time.
- `ShowCreator.actualStartTime` / `ShowCreator.actualEndTime` — nullable, creator participation window for a specific show assignment.
- `ShowPlatform.actualStartTime` / `ShowPlatform.actualEndTime` — nullable, platform stream window for a specific platform on a show.
- `ShowPlatform` performance facts — **deferred to the PR 21 analytics infrastructure** (see [`show-performance-analytics.md`](../features/show-performance-analytics.md)). Phase 4 does not promote GMV, view count, CTR/CTO, or any other platform performance metric to a typed `ShowPlatform` column. `viewerCount` keeps its pre-existing `Int @default(0)` shape from the init migration but its read path is analytical.
- `ShowPlatformViolation` records — zero or more violation records attached to a `ShowPlatform`.
- `StudioShiftBlock.actualStartTime` / `StudioShiftBlock.actualEndTime` — nullable, entered any time.

#### Actual ownership and scope

Actual timestamps and platform performance inputs are recorded facts, not calculated money. Store each fact on the narrowest entity whose fact it describes:

| Scope | Meaning | Phase 4 status |
| ----- | ------- | -------------- |
| `Show` | Overall operational show window when the task or manager input records one show-level timeline. | ✅ In scope |
| `StudioShiftBlock` | One operator/member labor window. | ✅ In scope |
| `ShowCreator` | One creator's distinct attendance status and participation window for a multi-creator show, late join, early leave, or missing creator. | ✅ Planned in Phase 4 |
| `ShowPlatform` | One platform stream's actual window (actual start / end time). Typed performance facts (GMV, views, etc.) are deferred to the PR 21 analytics infrastructure investigation. | ✅ Actual times planned in Phase 4 (performance facts deferred to PR 21) |
| `ShowPlatformViolation` | One violation event or finding for a platform stream. A `ShowPlatform` can have zero, one, or many violation records. | ✅ Planned in Phase 4 |

Creator attendance does not inherit the show timeline once creator-scoped inputs exist. A creator-specific late, missing, start, or end fact belongs on `ShowCreator`, while the show-level timeline remains a separate operational fact for the overall event.

Platform actuals are platform-specific. Seller-center or platform-derived actual times belong on `ShowPlatform`; a show with multiple platforms may have multiple platform windows. Violations are child records rather than a single platform status because one platform stream can have zero, one, or many violations. Overall show actuals are populated through confirmed task submissions rather than direct target-table edits. Platform-scoped performance metrics (GMV, viewer count, CTR, CTO, etc.) are analytical, not operational, and ride the 12.6 analytics infrastructure track.

Show-level performance analytics are downstream read-model concerns. Aggregate dashboards, trend analysis, and cross-show performance exploration should derive from platform-scoped facts through a future analytical layer instead of storing generic performance buckets on `Show`.

For comparable actuals and operational facts, the selected model value follows source priority: manager override task > system/platform telemetry or upload > creator-attributed input > operator task input > planned schedule. Manager override is intentionally highest priority because system inputs can be wrong and can affect compensation; every override must be captured as a submitted task with a review reason where the UI collects one. The system may retain every submitted input as an audit/reference record, but the value currently written to the scoped model field or child record is the operational source of truth for reads.

The calculator should then read the selected scoped model value for the component being calculated. Creator-facing rows use selected `ShowCreator` actuals when present. Creator lateness is measured against `Show.startTime` because the recorded arrival/start fact itself is scoped to `ShowCreator`; the show may start before every assigned creator has joined. Platform or performance rows use selected `ShowPlatform` facts and `ShowPlatformViolation` records. Show-level operational rows use direct `Show` actuals or a documented platform-derived aggregate when no direct show-level actual exists. Shift labor uses `StudioShiftBlock` actuals.

No settlement state machine and no per-record approval gate. Actuals may be absent, complete, or incomplete:

- If both actual timestamps are absent, computation falls back to scheduled times when scheduled times exist and emits an actuals-missing warning.
- If both actual timestamps are present, computation uses the actual duration.
- If exactly one actual timestamp is present, computation falls back to scheduled times when scheduled times exist and emits an actuals-incomplete warning.
- If planned time is also missing, the row is unresolved with `planned_time_missing`.

Planned fallback is an admin/manager and operational review behavior. Creator/operator/helper self-views must not expose money for any event whose actuals are absent or incomplete, even if the compensation package is fixed and does not mathematically depend on duration. Those rows remain visible as pending recipient events so the recipient can see that the event exists and can follow up with a line manager, but the event cannot be counted as compensation yet. If the self-view shows a period total, that total must be a countable recipient total: complete-actuals, resolved rows only, with pending counts/events shown separately.

Manager corrections to past actuals are allowed only through submitted manager override or correction tasks. Notifications to recipients are deferred (§4).

Task-submitted actuals and operational facts write to their scoped models only when the task is confirmed into `COMPLETED`. Operator submissions first land in `REVIEW`; manager confirmation is the gate that triggers extraction and populates target columns. Manager overrides use the same submitted-task path, so operational facts always trace back to a confirmed task submission. The review surface is the Phase 4 home for submitted-task review, bulk confirmation, exception queues, confirmed operational-fact summaries, and filtered exports. The surface can group by operational day, week, or date range without requiring managers to inspect each task individually.

### Compensation line items

`CompensationLineItem` is a flat supplemental cost record. It stores add-ons and deductions such as bonus, allowance, overtime adjustment, correction, or other explicit manual costs. It must be attached to a concrete operational event or event participation. It must not be generated from normal base compensation.

Conceptual requirements:

- Attachment target: exactly one supported operational event or event participation in the same studio. Required Phase 4 attachment concepts are show, show-creator assignment, shift, and shift block.
- Polymorphism: follow the repo's Prisma-friendly polymorphic pattern in technical design; exact discriminator, typed FK, and index names do not belong in this cost-model PRD.
- Item label: `BONUS` / `ALLOWANCE` / `OVERTIME` / `DEDUCTION` / `OTHER`. Label-only; no special computation.
- Amount: signed decimal. **No sign enforcement in Phase 4** — UI surfaces direction.
- Reason: free text and required, since this is the human-readable explanation a stakeholder reads.
- Audit history: preserve creator and creation time through standard audit records; `createdAt` is not used to discriminate adjustment-vs-agreement in Phase 4.

No standalone, standing, schedule-scoped, global, recurring, or HR/payroll-style line items ship in Phase 4. Date inclusion comes from the attached event, not a separate `effectiveDate`. No freeze, no adjustment-vs-agreement discrimination, no `createdAt > boundary` semantics in Phase 4. The calculator sums line items into the attached event / recipient totals. Phase 5+ may introduce a different model or migration for non-event compensation.

Base compensation remains separate:

- Creator/show base compensation is calculated from `ShowCreator.agreedRate`, `compensationType`, and `commissionRate`. The `FIXED_BASE` component is a flat per-show amount and is **not** multiplied by show duration; commission components depend on future revenue input, not duration.
- Operator/shift base labor is calculated from `StudioShift.hourlyRate` and shift-block planned/actual duration.
- These base components may appear as generated rows in API responses, but they are not persisted as `CompensationLineItem` rows.

### Soft delete

All entities follow the existing soft-delete pattern (Architecture Guardrail 5). Aggregation queries exclude soft-deleted rows by default; admin/audit surfaces may include them when explicitly requested.

### Removed from prior thinking

Things present in earlier drafts of this PRD that Phase 4 explicitly **does not introduce**:

- `Show.actualsSettledAt` / `actualsSettledBy`, `StudioShift.actualsSettledAt` / `actualsSettledBy` — no settlement.
- Metadata audit arrays as the active write path — the standard audit history replaces metadata-based audits for new override and extraction flows.
- Freeze guards on agreement / line-item writes at entity-time boundary.
- `Studio` grace-window settings (`graceLateShowMinutes`, etc.).
- `effectiveDate`, standing/null-scope line items, schedule-scoped line items, global line items, and recurring HR/payroll costs.
- `StudioShift.projectedCost` — drop, compute live at read time.
- Cost-state enum stored or enforced via transitions.

## 2. Computation

The economics service is a **pure calculator** over current persisted state. No stored derived fields, no transitions.

### Per-creator base

Resolve compensation components from the snapshot, evaluate each against available data:

- `FIXED_BASE` → `agreedRate` as a flat per-show amount. **Not** multiplied by `Show.duration`, `actualStart/EndTime` deltas, or any other time term. Recipient self-view countability still requires complete actuals on the show event, but the value itself does not depend on duration.
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
- `actuals_source` — which selected input category drove the **time-based component** specifically (`actual_start_time`/`actual_end_time` pair). One of `MANAGER_OVERRIDE`, `PLATFORM_DATA`, `OPERATOR_INPUT`, or `PLANNED` in Phase 4. A `CREATOR_INPUT` value is reserved for forward compatibility but has no Phase 4 writer. The enum can extend to source-specific values such as `CREATOR_APP` / `PUNCH_CLOCK` later. Note this row-level field reports the dominant source for time only; the underlying storage shape on `Show` / `ShowCreator` / `ShowPlatform` is a per-field source map (see "Per-field actuals source map" below) so non-time facts (e.g., GMV, viewer count — once those re-enter via PR 21) can carry their own source independently.
- `is_in_future` — boolean derived from entity-time vs request time. UI uses this to label the row "projected" if it likes; Phase 4 does not store a state enum.

Recipient self-view responses must include enough status/reason metadata for FE to show pending events, but must suppress monetary totals whenever actuals are missing or incomplete. Pending rows do not contribute to recipient-facing row amounts, subtotals, or period totals until actuals are complete. Exact DTO names belong to 2.3.

### Null bubbling at rollup grains

- A row's `cost` is null if any component is unresolved.
- A grouping (schedule, client, period) reports `cost` = sum of children where defined; if any child is null, the rollup `cost` is null and `unresolved_reasons` carries the union with counts (e.g. `"3 of 17 shows pending revenue"`).
- Warnings do not null the rollup. Grouped rows carry warning unions/counts so users know totals are calculated from planned values where actuals are missing or incomplete.
- Recipient self-view totals are a separate presentation contract: they include only countable complete-actuals rows and expose pending event counts separately. They must not include planned-fallback values or silently imply that pending events are already compensation.
- Counts (`creator_count`, `show_count`) are always defined.
- **Never silently coerce null to zero at any grain.**

### Actuals priority cascade

Each fact (time pair, attendance — plus GMV / viewer count once they re-enter via PR 21) carries an independently selected source category. The cascade below describes the **per-fact resolver**: when a new input event arrives, the resolver compares the incoming source against the previously selected source for that specific fact and writes only if the incoming priority is higher or equal. The product contract needs the selected source category per fact; ingestion details and lower-priority reference inputs stay behind the service layer unless a review surface needs to show them.

| Priority | Source                                                           | Phase 4 status       |
| -------- | ---------------------------------------------------------------- | -------------------- |
| 1        | Manager override with audit                                      | ✅ built/extended where override surfaces exist |
| 2        | Platform data or platform upload, including seller-center/API data mapped to `ShowPlatform` or `ShowPlatformViolation` | ✅ planned where manually submitted; automated API/upload later |
| 3        | _Reserved: Creator input / creator-attributed actuals mapped to `ShowCreator`_ | 🟡 reserved tier — enum value reserved for forward compatibility; no Phase 4 writer |
| 4        | Operator task input mapped to `Show` / `ShowPlatform` / `ShowCreator` | ✅ planned, complete pair only |
| 5        | Planned show time (`Show.startTime/endTime`)                     | ✅ fallback           |

Same shape for shift blocks once additional sources exist: manager override, then higher-confidence external/hardware source, then creator/member input where allowed, then operator manual entry, then scheduled fallback. New sources slot into the source resolution order without changing public row semantics. Row response carries `actuals_source` (dominant source for the time pair only — see row schema above) so admin/manager UI can show "calculated from Manager Override", "calculated from Platform", "calculated from Operator", or "calculated from Planned" without exposing ingestion implementation details. If a selected scoped record is absent or incomplete and planned time exists, admin/manager rows may use planned time with a calculation warning; recipient self-view rows show pending instead.

### Per-field actuals source map

Storage on `Show`, `ShowCreator`, and `ShowPlatform` uses a per-field source map inside the model's existing `metadata` bucket:

```json
{
  "actuals_source": {
    "actual_start_time": "MANAGER",
    "actual_end_time": "OPERATOR"
  }
}
```

Source values use the short forms defined by `actualsSourceSchema` in [`packages/api-types/src/audits/schemas.ts`](../../packages/api-types/src/audits/schemas.ts): `MANAGER`, `PLATFORM`, `CREATOR_INPUT` (reserved), `OPERATOR`, `PLANNED`. Phase 4 only writes time-pair keys into the map. The shape generalizes: when analytical facts (e.g. GMV, viewer count) re-enter the OLTP path via PR 21, they will use their own keys (e.g. `gmv`, `viewer_count`) so a single row can legitimately mix sources (a manager-overridden time pair alongside a platform-sourced GMV). This is also how the `ShowPlatform.viewerCount Int @default(0)` ambiguity will be resolved cleanly: **absence of a key in the map means never-written**; **presence means submitted (even if zero)**. The row's `actuals_source` exposed by the calculator projects only the time-pair source for backward compatibility with PR 4 / 10 / 11 self-views; non-time facts are not currently surfaced as their own row-level fields.

### Source label alignment

The PR 12.0.5 extraction pipeline writes the short-form values listed above. The earlier draft of this doc referenced long-form labels (`OPERATOR_RECORD`, `MANAGER_OVERRIDE`, `OPERATOR_INPUT`, `PLANNED_SCHEDULE`); no shipped surface ever emitted those strings, so the canonical wire labels are the short forms from `actualsSourceSchema`. PR 4 / 10 / 11 self-views surface the calculator's `actuals_source` projection directly — there is no transitional alias to maintain.

## 3. Three Views (Read-Only)

All three compensation views read the same data through the same calculator. **The compensation views are read-only in Phase 4** — no acknowledgement, no counter-signature, and no recipient-side write path.

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

**Audit hardening.** The Phase 4 task-input fact binding workstream introduces standard `Audit` / `AuditTarget` history for overrides and extracted facts. Future payment, settlement, and reopen workflows can extend that history with settlement-specific events without returning to metadata audit arrays.

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

- `#1-data-model` — snapshot fields, components, actuals, line items, override audit
- `#2-computation` — pure calculator, unresolved reasons, actuals priority cascade
- `#3-three-views-read-only` — creator / operator / operational, identity-derived self-access
- `#4-future-extensions` — extensibility hooks for settlement, freeze, grace, audit, acknowledgement, payment, etc.

## Product Decisions

- **Phase 4 compensation is a viewer, not a payment workflow.** Records are notice and reference; compensation views are read-only; the calculator is pure.
- **Snapshot at assignment time + standard audit for overrides.** Stable historical references without freeze guards. ADMIN and MANAGER may update intended-immutable fields; UI warns about downstream impact and the override is audited.
- **Component-aware compensation.** Creator packages — `FIXED` / `COMMISSION` / `HYBRID` — resolved into components (`FIXED_BASE` + commission). No `HOURLY` for creators; that's a legal-compliance product constraint. Operator shift labor is always `hourlyRate × duration`. Single source of truth for projection arithmetic — `StudioShift.projectedCost` is removed.
- **Base compensation is calculated, not stored as line items.** `ShowCreator` and `StudioShift` snapshots own normal base pay; `CompensationLineItem` stores event-attached supplemental add-ons and deductions only.
- **Null propagates through rollups; never coerce to zero.** Unresolved reasons surface explicitly to the UI.
- **Planned fallback is manager-visible only.** Missing or incomplete actuals may still produce a cost from planned time for admin/manager planning and operational rollups, but every affected row carries warnings. Creator/operator/helper self-views do not show money for those events; they show pending events until actuals are complete.
- **Recipient totals are countable-only.** Self-view totals include complete-actuals, resolved rows only and show pending event counts separately.
- **Manager-overridable actuals priority cascade.** Manager override is highest priority and audited; future sources extend the source category without changing consumer-facing row semantics.
- **Three first-class views, identity-derived self-access.** TALENT_MANAGER may view any creator's compensation in their studio.
- **Phase 4 stores outcomes, not rules.** Rule engine, settlement, freeze, grace, payment processing, acknowledgement — all extension hooks documented in §4 and revisited when their workstream activates.

## Downstream work

All downstream Phase 4 work — compensation line items + actuals, economics service, review surface, page-local exports, availability hardening — is tracked PR-by-PR in [`docs/roadmap/PHASE_4.md`](../roadmap/PHASE_4.md). This PRD remains the locked semantic contract those PRs must conform to.
