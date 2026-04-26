# PRD: Economics Cost Model (2.1)

> **Status**: 🔲 Active — docs-only; no code, no schema, no migrations
> **Phase**: 4 — Wave 2 critical-path gate
> **Workstream**: L-side P&L visibility — minimal cost reference + extensible foundation
> **Gates**: 2.2 Compensation Line Items, 2.3 Economics Service, 3.1 Studio Economics Review, 3.2 Show Planning Export, 4.1 P&L Revenue Workflow
> **Architecture**: Phase 4 [Architecture Guardrails](../roadmap/PHASE_4.md#architecture-guardrails) — monetary arithmetic, snapshot-on-write, soft-delete, fixture testing, `/me/` self-access pattern

## Purpose

Lock the **minimal** data model and computation rules for studio compensation and operational cost in Phase 4, before 2.2 / 2.3 land code. Phase 4's L-side stack is a **read-only reference viewer**, not a workflow system: it produces structured numbers for stakeholders to consult, and it provides a foundation that future workstreams (settlement, freeze, payment, acknowledgement, advanced compensation rules) can extend without schema reshape.

This document is authoritative for Phase 4 cost semantics. Sibling PRDs and design docs in this branch carry a **Visioning** banner — they describe future behavior that may change when their workstream becomes active. Where they conflict with this document, this wins for Phase 4 scope.

This PRD is docs-only.

## Scope & Stance

- **Records are notice and reference, not source of truth.** Phase 4 stores enough data to *show* compensation and operational cost. It does not authorize, lock, settle, or pay anything. The real source of truth for "what was paid" lives outside this system (bank records, contracts, conversations) and will be cross-referenced when a payment workstream ships.
- **All views are read-only.** Recipients (creators, members) inspect their own compensation; managers inspect operational rollups. No acknowledgement, dispute, or counter-signature exists in the backend.
- **Computation is live and pure.** Cost is derived from current persisted inputs at read time. No stored derived totals, no state machine, no transitions to manage.
- **The foundation is extensible.** Settlement gating, freeze guards, grace tolerance, payment processing, acknowledgement / dispute, advanced compensation rules, and bank-statement reconciliation each layer onto this base as additions when their workstream activates. See §4 Future Extensions.

Phase 4's two targets:

1. **Stakeholders refer to compensation and operational cost** — creator self-view, operator self-view, manager operational rollup.
2. **Build a solid extensible foundation** — every dropped concept in the Non-Goals list has a one-paragraph extension sketch in §4 so the foundation can be sanity-checked.

## Non-Goals (Phase 4)

Everything in this list is deferred. Each has an extension sketch in §4.

- Revenue (P-side) and commission resolution — Wave 4.
- Settlement state machine, settled-actuals gating, reopen flow.
- Freeze write guards at the entity-time boundary.
- Grace windows for late-arrival / early-leave tolerance.
- Adjustment-vs-agreement discrimination on line items (no `createdAt > boundary` enforcement).
- Polymorphic audit log table; rule-engine-driven OT / tiered commission.
- Sign enforcement on line items by `item_type`.
- Cost-state enum (`PROJECTED` / `RESOLVED` / `PARTIAL` / `UNRESOLVED`) with stored transitions.
- Payment processing, bank-statement reconciliation.
- Recipient acknowledgement / dispute flow.
- Recipient-initiated adjustment requests (in-product channel).
- Notifications when manager edits actuals.
- Proration of schedule-scoped or standing/global line items across shows.
- Schedule-level cost aggregation; standing/global line-item aggregation.
- Additive platform cost allocation across multi-platform shows.
- Double-entry ledger, general-ledger export.

## Terminology

| Term                              | Definition                                                                                                                                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agreement**                     | The pre-show / pre-shift terms a creator or operator is paid by — rate, compensation type, commission rate, scheduled times.                                                                                                                                |
| **Agreement snapshot**            | The persisted per-assignment copy of agreement terms, captured at assignment time from explicit input or roster defaults. Roster default edits do not rewrite snapshots.                                                                                    |
| **Snapshot-field override audit** | When ADMIN/MANAGER updates a snapshot field (e.g. `ShowCreator.agreedRate`), the change is appended to that row's existing `metadata` column following the codebase's existing audit-in-metadata pattern. No separate audit table is introduced in Phase 4. |
| **Compensation component**        | One independently-computed part of a creator agreement (`FIXED_BASE` / `HOURLY_BASE` / commission). `HYBRID` = more than one component.                                                                                                                     |
| **Actuals**                       | Recorded measurements: actual show time, actual shift block time. Plain nullable timestamps; entered freely.                                                                                                                                                |
| **Line item**                     | A `CompensationLineItem` record: a flat amount targeting a creator or membership, optionally scoped to a show. Phase 4 does not discriminate by author intent (agreement vs adjustment).                                                                    |
| **Unresolved reason**             | A string label on a row identifying why a component has no value (`commission_pending_revenue`, `actuals_not_entered`). UI surfaces these instead of substituting `0`.                                                                                      |
| **Settled-reference figure**      | The reconciled cost view for an assignment / shift / period: snapshot agreement + actuals + applicable line items, with null bubbling. The artifact stakeholders use as reference. "Settled" here is colloquial; no settlement state exists in Phase 4.     |

## 1. Data Model

### Agreement snapshot

When a creator is assigned to a show, `ShowCreator` persists `agreedRate`, `compensationType`, and `commissionRate` from explicit input or `StudioCreator` defaults at the moment of assignment. The same snapshot pattern already exists for `StudioShift.hourlyRate` from `StudioMembership.baseHourlyRate`. After snapshot:

- Reads use the snapshot. Source-table edits (`StudioCreator.defaultRate`, `StudioMembership.baseHourlyRate`) never rewrite existing snapshots.
- Snapshot fields (`ShowCreator.agreedRate`, `compensationType`, `commissionRate`; `StudioShift.hourlyRate`) are **intended-immutable**. ADMIN and MANAGER may update them through the normal update endpoint; the FE shows a warning explaining the downstream impact (historical references and cost rollups will recompute).
- Each update appends an entry to the entity's `metadata` column (existing audit-in-metadata pattern in this codebase) capturing `{field, old, new, actorId, at, reason?}`. **No dedicated audit table.** The metadata trail is the audit.

### Compensation components

`compensationType` is the user-facing package label. The economics service resolves the package into components before calculation.

| Package      | Components               | Phase 4 computation                                                     |
| ------------ | ------------------------ | ----------------------------------------------------------------------- |
| `FIXED`      | `FIXED_BASE`             | Fixed amount for the assignment.                                        |
| `HOURLY`     | `HOURLY_BASE`            | `agreedRate × duration` (actual if recorded, scheduled otherwise).      |
| `COMMISSION` | one commission component | `null` until Wave 4 revenue/sales input lands.                          |
| `HYBRID`     | two or more components   | Sum of resolved components; `null` if any commission component pending. |

The component model is the extensibility seam for future commission variants and the Phase 5 rule engine.

### Actuals

- `Show.actualStartTime` / `Show.actualEndTime` — nullable, entered any time.
- `StudioShiftBlock.actualStartTime` / `StudioShiftBlock.actualEndTime` — nullable, entered any time.

No state machine, no settlement, no approval. Actuals exist or they don't. Computation uses them when present, falls back to scheduled times otherwise. Manager edits to past actuals are allowed; if the entity's `metadata` audit pattern is in scope (e.g., it already covers other fields), edits are appended there. Notifications to recipients are deferred (§4).

### Compensation line items

`CompensationLineItem` is a flat record:

| Field                        | Notes                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `target`                     | `CompensationTarget` enum: `MEMBERSHIP` or `STUDIO_CREATOR` (Architecture Guardrail 3 — Prisma enum discriminator).             |
| `targetId`                   | FK to membership or studio-creator.                                                                                             |
| `scope`                      | `show_id` (most common) or null (standing). Schedule-scope is captured by the `scheduleId` field but not aggregated in Phase 4. |
| `itemType`                   | `BONUS` / `ALLOWANCE` / `OVERTIME` / `DEDUCTION` / `OTHER`. Label-only; no special computation.                                 |
| `amount`                     | Signed decimal. **No sign enforcement in Phase 4** — UI surfaces direction.                                                     |
| `reason`                     | Free text — required, since this is the human-readable explanation a stakeholder reads.                                         |
| `effectiveDate`, `createdAt` | Informational. Not used to discriminate adjustment-vs-agreement in Phase 4.                                                     |

No freeze, no adjustment-vs-agreement discrimination, no `createdAt > boundary` semantics in Phase 4. The calculator sums line items into target totals. Phase 5+ will discriminate when settlement and freeze ship — `createdAt` is preserved for that future use.

### Soft delete

All entities follow the existing soft-delete pattern (Architecture Guardrail 5). Aggregation queries exclude soft-deleted rows by default; admin/audit surfaces may include them via `includeDeleted`.

### Removed from prior thinking

Things present in earlier drafts of this PRD that Phase 4 explicitly **does not introduce**:

- `Show.actualsSettledAt` / `actualsSettledBy`, `StudioShift.actualsSettledAt` / `actualsSettledBy` — no settlement.
- A polymorphic actuals audit table — `metadata` column pattern handles snapshot overrides; actuals edits use the same pattern where applicable.
- Freeze service-layer guards on agreement / line-item writes at entity-time boundary.
- `Studio` grace-window settings (`graceLateShowMinutes`, etc.).
- `StudioShift.projectedCost` — drop, compute live at read time.
- Cost-state enum stored or enforced via transitions.

## 2. Computation

The economics service is a **pure calculator** over current persisted state. No stored derived fields, no transitions.

### Per-creator base

Resolve compensation components from the snapshot, evaluate each against available data:

- `FIXED_BASE` → fixed amount.
- `HOURLY_BASE` → `agreedRate × duration`. Duration uses `Show.actualStartTime/EndTime` if both present; otherwise `Show.startTime/endTime`.
- Commission components → `null` in Phase 4 (Wave 4 resolves).

### Per-shift labor

`StudioShift.hourlyRate × block-duration`, where block-duration uses `actualStartTime/EndTime` if present, else scheduled. Existing proportional-overlap allocation by minutes for blocks that span multiple shows is unchanged.

### Per-target line items

Sum line items targeting the creator or membership within the requested scope (show, period). Result may be negative — that is intentional and visible in rollups.

### Row shape (read response)

Each row exposes:

- `cost` — nullable decimal. `base + lineItems` if all components resolved; `null` if any component unresolved.
- `base_subtotal` — nullable decimal. The base portion alone (visible even when total is null because line items resolve and need to be shown).
- `line_item_subtotal` — non-nullable decimal. `0` when no line items.
- `unresolved_reasons` — string array. Examples: `["creator:smc_x:commission_pending_revenue"]`, `["show:show_y:actuals_not_entered"]`. UI consumes these instead of seeing `0`.
- `actuals_source` — which input drove time-based components: `OPERATOR_RECORD` / `PLANNED` (Phase 4); the enum extends to `PLATFORM_API` / `PLATFORM_UPLOAD` / `CREATOR_APP` / `PUNCH_CLOCK` later.
- `is_in_future` — boolean derived from entity-time vs request time. UI uses this to label the row "projected" if it likes; the backend does not store an enum.

### Null bubbling at rollup grains

- A row's `cost` is null if any component is unresolved.
- A grouping (schedule, client, period) reports `cost` = sum of children where defined; if any child is null, the rollup `cost` is null and `unresolved_reasons` carries the union with counts (e.g. `"3 of 17 shows pending actuals"`).
- Counts (`creator_count`, `show_count`) are always defined.
- **Never silently coerce null to zero at any grain.**

### Actuals priority cascade (extensibility seam)

Time-based computation reads from a forward-compatible priority enum so Phase 4's operator-record source can be augmented later without API change.

| Priority | Source                                                           | Phase 4 status |
| -------- | ---------------------------------------------------------------- | -------------- |
| 1        | Platform API (Shopee / Lazada / TikTok / etc.)                   | Deferred       |
| 2        | Platform manual upload                                           | Deferred       |
| 3        | Operator post-production record (`Show.actualStartTime/EndTime`) | ✅              |
| 4        | Creator app self-record                                          | Deferred       |
| 5        | Planned show time (`Show.startTime/endTime`)                     | ✅ fallback     |

Same shape for shift blocks (1: punch-clock; 2: operator manual entry — built; 3: scheduled — built). New sources slot in by extending the enum and resolver — no API restructure required. Row response carries `actuals_source` so the UI can show "calculated from Operator (priority 3)" and any lower-priority sources visible alongside.

## 3. Three Views (Read-Only)

All three views read the same data through the same calculator. **All are read-only in Phase 4** — no write endpoints, no acknowledgement, no counter-signature.

### Creator compensation view

- **Self**: `GET /me/compensation/creator?from=&to=` — derives identity from auth.
- **Cross-user**: `GET /studios/:studioId/creators/:creatorId/compensation?from=&to=` — accessible to TALENT_MANAGER (any creator in the studio they manage), ADMIN, MANAGER.
- Returns `ShowCreator` rows over the period (snapshot agreement + actuals where present) + line items targeting that creator (show-scoped, standing).

### Operator compensation view

- **Self**: `GET /me/compensation/operator?from=&to=`.
- **Cross-user**: `GET /studios/:studioId/members/:membershipId/compensation?from=&to=` — ADMIN, MANAGER.
- Returns `StudioShift` rows (rate × actual or scheduled minutes) + line items targeting that membership.

### Operational cost view

- `GET /studios/:studioId/economics?from=&to=` — ADMIN, MANAGER.
- Returns roll-up of creator and operator views grouped by show / schedule / client / platform.
- This is the engine 3.1 (Studio Economics Review) targets.

### Cross-cutting rules

- Date range required.
- Read-only — no writes accepted on any view.
- Apply the actuals priority cascade (§2) for time-based components; expose `actuals_source` per row.
- Apply null bubbling (§2); never coerce to zero.
- Self-access lives under the existing `/me/` module (`apps/erify_api/src/me/`); cross-user lives under studio-scoped routes with role guards. No per-endpoint identity decorators (Architecture Guardrail 6).

## 4. Future Extensions

The Phase 4 base supports each of the deferred concepts as a clean addition. One paragraph each so the foundation can be sanity-checked. **Detailed designs land when the workstream activates** — the existing sibling PRDs and design docs are visioning, not committed.

**Settlement gating.** When payment processing arrives, manager review of actuals becomes meaningful. Add `Show.actualsSettledAt/By` and `StudioShift.actualsSettledAt/By` (nullable timestamps + FK). The calculator gains a flag (or a separate "settled view") that requires settlement before treating actuals as authoritative. Phase 4 read-paths remain unaffected by default.

**Freeze write guards at entity-time boundary.** A service-layer check on agreement-field and pre-existing-line-item writes against `Show.endTime` / shift end. New line items remain creatable as adjustments. Pure service-layer addition; no schema change. Pairs with settlement.

**Adjustment-vs-agreement discrimination.** Once freeze ships, line items with `createdAt > entity-time boundary` are derived as adjustments; everything else is part of the frozen agreement. This is a derived field, not stored — `createdAt` is already preserved in Phase 4.

**Grace windows.** `Studio` configuration for late-arrival / early-leave tolerance per entity (show, shift block). The calculator gains a normalization step before duration math. Phase 4 default is no normalization; the addition is non-breaking.

**Polymorphic audit log table.** When authoritativeness matters (typically with payment processing), the `metadata`-column audit pattern is supplemented (not replaced) with a polymorphic audit table for actuals edits, settlement events, reopen events. The `metadata` pattern remains for snapshot-field overrides.

**Recipient acknowledgement / dispute.** Add `acknowledgedAt` / `disputedAt` per recipient view. Dispute reopens settlement (once settlement exists). Read-only Phase 4 views become two-party agreement views without changing the underlying computation.

**Sign enforcement on line items.** A future workstream may enforce `DEDUCTION < 0` and `BONUS / ALLOWANCE / OVERTIME > 0` at input validation. Phase 4 keeps `amount` signed and unenforced.

**Wave 4 commission resolution.** Revenue / sales input populates commission components. The frozen `commissionRate` from the snapshot is what revenue is multiplied by. Rows transition from `cost = null` (component unresolved) to a known value as revenue lands. No change to the calculator's public shape — commission components simply stop returning null.

**Schedule-scoped and standing/global line item rollup.** Phase 4 keeps these out of operational aggregation. When the product defines schedule-level cost behavior (allocation policy, freeze), rollup rules are added; the storage shape doesn't change.

**Bank-statement reconciliation.** Once payment processing produces a `PaymentRun` record, future bank-statement integration compares PaymentRun amounts vs settled-reference figures and surfaces mismatches as new `CompensationLineItem` adjustments. This is a new feature on top of the cost model, not a change to it.

**Notifications on manager edits to actuals / snapshot fields.** A subscriber on the `metadata` audit append. Out of scope for Phase 4; recipients see edits on next view read.

**Advanced compensation rule engine (Phase 5).** Tiered commission, OT formulas, bonus rules. Engine output is *written* as `CompensationLineItem` records (or new computed components) through this same data model. The cost model stores outcomes; the rule engine produces them.

**Cost-state enum.** If downstream UI demands a single-label state per row beyond `is_in_future` and `unresolved_reasons`, a derived enum (`PROJECTED` / `RESOLVED` / `PARTIAL` / `UNRESOLVED`) can be computed in the response without persistence. Phase 4 leaves this to the UI.

## 5. Acceptance

This PRD is complete when:

- [ ] This doc is merged on `master`.
- [ ] [PHASE_4.md](../roadmap/PHASE_4.md) row 2.1 links here and Definition of Done aligns with the simplified scope.
- [ ] The four sibling PRDs (`compensation-line-items.md`, `pnl-revenue-workflow.md`, `show-planning-export.md`, `studio-economics-review.md`) carry a **Visioning** banner indicating they are pre-simplification roadmap documents and may change.
- [ ] The six BE/FE design docs in `apps/erify_api/docs/design/` and `apps/erify_studios/docs/design/` for line items, show economics, and studio economics review carry a **Visioning + may be misaligned** banner.

No code verification.

## Glossary anchors

For linking from other docs:

- `#1-data-model` — snapshot fields, components, actuals, line items, metadata-column audit
- `#2-computation` — pure calculator, unresolved reasons, actuals priority cascade
- `#3-three-views-read-only` — creator / operator / operational, `/me/` pattern
- `#4-future-extensions` — extensibility hooks for settlement, freeze, grace, audit, acknowledgement, payment, etc.

## Product Decisions

- **Phase 4 is a viewer, not a workflow.** Records are notice and reference; views are read-only; the calculator is pure.
- **Snapshot at assignment time + metadata-column audit for snapshot overrides.** Stable historical references without freeze guards or a separate audit table. ADMIN and MANAGER may update intended-immutable fields; FE warns about downstream impact.
- **Component-aware compensation.** `FIXED` / `HOURLY` / `COMMISSION` / `HYBRID` resolved into components. Single source of truth for projection arithmetic — `StudioShift.projectedCost` is removed.
- **Null propagates through rollups; never coerce to zero.** Unresolved reasons surface explicitly to the UI.
- **Forward-compatible actuals priority cascade.** Future sources slot in by enum extension, not API restructure.
- **Three first-class views, single `/me/` pattern for self-access.** TALENT_MANAGER may view any creator's compensation in their studio.
- **Phase 4 stores outcomes, not rules.** Rule engine, settlement, freeze, grace, payment processing, acknowledgement — all extension hooks documented in §4 and revisited when their workstream activates.

## Design reference

The sibling PRDs and design docs below are **visioning** for Phase 4. They were drafted before this simplification and will be redrafted when their workstream becomes active. Treat as roadmap, not committed design.

- 2.2 Compensation Line Items: [compensation-line-items.md](./compensation-line-items.md)
- 2.3 Economics Service: [SHOW_ECONOMICS_DESIGN.md](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md)
- 3.1 Studio Economics Review: [studio-economics-review.md](./studio-economics-review.md)
- 3.2 Show Planning Export: [show-planning-export.md](./show-planning-export.md)
- 4.1 P&L Revenue: [pnl-revenue-workflow.md](./pnl-revenue-workflow.md)
- Phase 4 Roadmap: [PHASE_4.md](../roadmap/PHASE_4.md)
