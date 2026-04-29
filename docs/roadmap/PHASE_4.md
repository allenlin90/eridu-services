# Phase 4: P&L Visibility & Creator Operations

> **Status**: 🚧 Active — Wave 1 shipped; Wave 2 (Cost Foundation) is the current critical path
> **Last updated**: 2026-04-29

## Goal

Build the L-side (cost) of P&L on existing studio entities, while completing studio operational autonomy so studios no longer depend on `/system/*` routes for routine workflows.

**Phase 4 produces reference compensation figures, not payments.** No money moves through this system. Admin and manager surfaces may show projected, actual-backed, or planned-fallback values for planning and reconciliation. Creator/operator/helper self-views show actual-backed compensation only; when actuals are missing or incomplete, they show the acknowledged event as pending instead of showing any compensation amount. A future workstream (post-Phase 4) will consume these rows as input to actual payment processing and bank-statement reconciliation. Recipient acknowledgement, dispute, and recipient-initiated adjustment flows are deferred to that future phase; Phase 4 self-views are read-only.

Outcomes:

- Studio operators manage labor rates and creator compensation defaults without system-admin intervention.
- Studio admins onboard creators, create shows, and manage schedules from the studio workspace.
- A canonical cost model defines the snapshot-on-write contract, the actuals priority cascade, and three read-only compensation views (creator, operator, operational) used as reconciliation references.
- Studios review and export projected, actual-backed, and planned-fallback reference costs from a single date-ranged economics engine, with show planning export as a preset.
- Creator assignment correctness is enforced (overlap + roster conflicts).
- **Future target:** revenue inputs (P-side), commission resolution, and contribution margin complete the full P&L model after the simplified Phase 4 cost stack is stable.
- **Out of scope for Phase 4:** revenue workflow, payment processing, bank transfers, bank-statement reconciliation, recipient acknowledgement / dispute, recipient-initiated adjustments, and notifications on actuals edits.

## Workstream Tracker

| #   | Workstream                               | Doc                                                                | Status             | Wave   |
| --- | ---------------------------------------- | ------------------------------------------------------------------ | ------------------ | ------ |
| 1.1 | Sidebar redesign                         | [design](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) | 🔁 Incremental      | 1      |
| 1.2 | Studio creator roster                    | [feature](../features/studio-creator-roster.md)                    | ✅ Shipped (PR #30) | 1      |
| 1.3 | Studio member roster                     | [feature](../features/studio-member-roster.md)                     | ✅ Shipped (PR #28) | 1      |
| 1.4 | Studio creator onboarding (roster-first) | [feature](../features/studio-creator-onboarding.md)                | ✅ Shipped (PR #32) | 1      |
| 1.5 | Studio show management                   | [feature](../features/studio-show-management.md)                   | ✅ Shipped          | 1      |
| 2.1 | Economics cost model                     | [PRD](../prd/economics-cost-model.md)                              | ✅ Signed off       | 2      |
| 2.2 | Compensation line items + actuals        | [PRD](../prd/compensation-line-items.md)                           | 📝 Design next      | 2      |
| 2.3 | Economics service                        | [PRD](../prd/economics-service.md)                                 | 🔲 Planned          | 2      |
| 3.1 | Studio economics review surface          | [PRD](../prd/studio-economics-review.md)                           | 🔲 Planned          | 3      |
| 3.2 | Show planning export                     | [PRD](../prd/show-planning-export.md)                              | 🔲 Planned          | 3      |
| 3.3 | Creator availability hardening           | [PRD](../prd/creator-availability-hardening.md)                    | 🔲 Planned          | 3      |
| 4.1 | P&L revenue workflow                     | [PRD](../prd/pnl-revenue-workflow.md)                              | ⏭️ Future target    | Future |

3.3 depends only on shipped 1.4 and is independent of the Wave 2 cost stack. It may start in parallel with Wave 2 if capacity allows.

4.1 is no longer required to close Phase 4. Keep the PRD as future-target context until revenue planning restarts.

Studio schedule management is deferred — Google Sheets is the production scheduling path; revisit with the Client Portal workstream.

## Phase 5 Deferrals

| Workstream                                                             | PRD                                     | Track |
| ---------------------------------------------------------------------- | --------------------------------------- | ----- |
| Studio reference data (clients, platforms, types, standards, statuses) | [PRD](../prd/studio-reference-data.md)  | C     |
| Studio creator profile editing (name/alias at studio level)            | [PRD](../prd/studio-creator-profile.md) | C     |
| Studio snapshot/audit trail visibility                                 | —                                       | C     |
| Advanced compensation rule engine                                      | —                                       | A     |
| Creator HR & operations (HRMS, fixed costs)                            | —                                       | A     |
| Ticketing, material management, inventory                              | —                                       | B     |
| Payment processing and bank-statement reconciliation                   | —                                       | A     |
| Recipient acknowledgement / dispute on read-only reference figures     | —                                       | A     |
| Recipient-initiated adjustment requests (in-product channel)           | —                                       | A     |
| Notifications when manager edits actuals                               | —                                       | B     |
| Review-period close lock for standing/schedule line items              | —                                       | A     |
| Platform and creator-app actuals sources                               | —                                       | A     |
| P&L revenue workflow, commission resolution, contribution margin       | [PRD](../prd/pnl-revenue-workflow.md)   | A     |

## Implementation Sequencing

```mermaid
flowchart TD
    subgraph wave1["Wave 1 — Studio Autonomy ✅"]
        W1_1["1.1 Sidebar"]
        W1_2["1.2 Creator Roster"]
        W1_3["1.3 Member Roster"]
        W1_4["1.4 Creator Onboarding"]
        W1_5["1.5 Show Management"]
    end

    subgraph wave2["Wave 2 — Cost Foundation"]
        W2_1["2.1 Cost Model"]
        W2_2["2.2 Line Items + Actuals"]
        W2_3["2.3 Economics Service"]
    end

    subgraph wave3["Wave 3 — Finance Surfaces"]
        W3_1["3.1 Economics Review"]
        W3_2["3.2 Planning Export"]
        W3_3["3.3 Availability Hardening"]
    end

    subgraph future["Future Targets"]
        W4_1["Revenue Workflow"]
    end

    W1_2 --> W1_4
    W1_3 --> W1_4
    W1_5 --> W2_3
    W2_1 --> W2_2 --> W2_3
    W2_3 --> W3_1
    W3_1 --> W3_2
    W1_4 --> W3_3
    W2_3 -.-> W4_1
    W3_1 -.-> W4_1

    classDef done fill:#d4edda,stroke:#28a745,color:#000
    classDef active fill:#fff3cd,stroke:#ffc107,color:#000
    classDef planned fill:#e2e3e5,stroke:#6c757d,color:#000
    classDef future fill:#f8f9fa,stroke:#adb5bd,color:#000

    class W1_1,W1_2,W1_3,W1_4,W1_5,W2_1 done
    class W2_2 active
    class W2_3,W3_1,W3_2,W3_3 planned
    class W4_1 future
```

### Wave 2 critical path

Wave 2 is single-track. Each step gates the next.

| Step | Workstream                                                   | Why                                                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | [Economics cost model](../prd/economics-cost-model.md)       | Signed off. Locks the simplified Phase 4 data model, computation rules, three read-only views, and extensibility hooks. Stale app design drafts were removed; implementation designs are redrafted from the signed-off PRDs.                                                                |
| 2.2  | [Compensation line items](../prd/compensation-line-items.md) | Next design/implementation slice. Prisma additions for event-attached `CompensationLineItem` + `Show.actualStartTime/EndTime` + `StudioShiftBlock.actualStartTime/EndTime`; line item and actuals input surfaces. **No freeze guards, no settlement, no grace, no audit table** in Phase 4. |
| 2.3  | [Economics service](../prd/economics-service.md)             | Greenfield implementation of the pure calculator and read endpoints against 2.1, consuming line-items + actuals from 2.2. No state machine.                                                                                                                                                 |

Wave 3 begins after 2.3 merges to master.

Wave 3 PRDs and app design docs are planning placeholders until that point. Review and revise them against the confirmed 2.3 backend read shape before starting Wave 3 implementation.

## Architecture Guardrails

Platform-level rules. Domain-specific decisions (line item types, view shapes, etc.) live in the relevant PRDs.

1. **Finance arithmetic is owned by economics services and calculators.** Controllers stay transport-only (authz, DTO parsing, response shaping). Orchestration services coordinate flows but do not own financial formulas.

2. **Monetary arithmetic uses `Prisma.Decimal` end-to-end.** Do not convert to JS `Number` before aggregation. Serialize to string at the API boundary. `toFixed(2)` is forbidden inside aggregation paths. `Prisma.Decimal` is backed by `decimal.js` and ships with `@prisma/client` — no new dependency required.

3. **Polymorphic discriminators on financial tables use Prisma enums where cleanly supported.** Applies to the compensation line-item attachment discriminator and any future financial / audit-bearing tables. Use the repo's `TaskTarget` pattern as the local Prisma polymorphism reference, but do not migrate `TaskTarget` itself.

4. **Historical cost inputs are snapshot-on-write.** `StudioShift.hourlyRate` and `ShowCreator.agreedRate` (plus `compensationType` and `commissionRate`) are persisted at the moment of assignment from explicit input or roster defaults, and never rewritten by source-table edits to `StudioMembership.baseHourlyRate` or `StudioCreator.defaultRate`. Snapshot fields are intended-immutable: ADMIN/MANAGER may update them through the normal endpoint with an FE warning; each update appends an audit entry to the entity's `metadata` column (existing pattern) — no separate audit table in Phase 4. Projection arithmetic (e.g., shift `hourlyRate × scheduled minutes`) is computed live, not cached.

5. **Aggregation queries exclude soft-deleted rows by default.** An explicit `includeDeleted` flag is permitted only on admin / audit surfaces.

6. **Self-access uses the existing `/me/` module.** Endpoints where a user reads their own data live under `/me/<resource>` (`apps/erify_api/src/me/`) and derive identity from auth context. Cross-user reads (admin viewing another user's data) live under studio-scoped routes with role guards. Do not invent new self-access decorators or per-endpoint identity checks.

7. **Economics aggregation services ship with fixture-based tests.** Coverage includes the actuals priority cascade resolution, null-bubbling cases at each grain, and the read shape defined in [economics-cost-model.md](../prd/economics-cost-model.md). Phase 4 has no cost-state machine — tests target the calculator's resolved-vs-unresolved branches directly.

## Documentation

### Doc flow per feature

```
docs/prd/<feature>.md                                ← PRD (pre-ship)
    ↓
apps/erify_api/docs/design/<FEATURE>_DESIGN.md       ← BE design
apps/erify_studios/docs/design/<FEATURE>_DESIGN.md   ← FE design
    ↓
Implementation PR (code + tests)
    ↓
Post-ship: promote PRD → docs/features/, promote app docs → apps/*/docs/, run knowledge-sync
```

### Phase-level reference

| Scope          | Doc                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| BE index       | [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md)                             |
| FE index       | [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md)                       |
| Authorization  | [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md)                      |
| Role use cases | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md) |

### Per-feature docs

| Workstream                            | Product                                                 | BE                                                                              | FE                                                                                  |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1.2 Studio creator roster             | [feature](../features/studio-creator-roster.md)         | [BE](../../apps/erify_api/docs/STUDIO_CREATOR_ROSTER.md)                        | [FE](../../apps/erify_studios/docs/STUDIO_CREATOR_ROSTER.md)                        |
| 1.3 Studio member roster              | [feature](../features/studio-member-roster.md)          | Shipped (PR #28)                                                                | Shipped (PR #28)                                                                    |
| 1.4 Studio creator onboarding         | [feature](../features/studio-creator-onboarding.md)     | [BE](../../apps/erify_api/docs/STUDIO_CREATOR_ONBOARDING.md)                    | [FE](../../apps/erify_studios/docs/STUDIO_CREATOR_ONBOARDING.md)                    |
| 1.5 Studio show management            | [feature](../features/studio-show-management.md)        | [BE](../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md)                       | [FE](../../apps/erify_studios/docs/STUDIO_SHOW_MANAGEMENT.md)                       |
| 2.1 Economics cost model              | [PRD](../prd/economics-cost-model.md)                   | N/A (docs-only)                                                                 | N/A                                                                                 |
| 2.2 Compensation line items + actuals | [PRD](../prd/compensation-line-items.md)                | Redraft after sign-off                                                          | Redraft after sign-off                                                              |
| 2.3 Economics service                 | [PRD](../prd/economics-service.md)                      | Redraft when 2.3 starts                                                         | Redraft when 2.3 starts                                                             |
| 3.1 Studio economics review           | [PRD](../prd/studio-economics-review.md)                | Redraft after 2.3 read shape lands                                              | Redraft after 2.3 read shape lands                                                  |
| 3.2 Show planning export              | [PRD](../prd/show-planning-export.md)                   | Redraft after 3.1 scope is confirmed                                            | Redraft after 3.1 scope is confirmed                                                |
| 3.3 Creator availability hardening    | [PRD](../prd/creator-availability-hardening.md)         | [BE](../../apps/erify_api/docs/design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) | [FE](../../apps/erify_studios/docs/design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) |
| Future P&L revenue workflow           | [PRD](../prd/pnl-revenue-workflow.md) *(future target)* | Redraft when revenue planning restarts                                          | Redraft when revenue planning restarts                                              |

## Definition of Done

Phase 4 explicitly does not process payments. Every figure produced is a read-only reference value. Admin/manager planned-fallback values must carry warnings; creator/operator/helper self-views must hide money for any event with missing or incomplete actuals and show pending events until actuals are complete.

- [x] Studio member roster with `baseHourlyRate` editing
- [x] Studio creator roster CRUD with compensation defaults
- [x] Studio-side creator onboarding with roster-first assignment enforcement
- [x] Studio show CRUD (create / update / delete before start time)
- [x] Internal docs knowledge base (`eridu_docs`) with authenticated SSR access
- [x] 2.1 Economics cost model locked (simplified data model + pure calculator + three read-only views + planned-fallback warnings + future-extensions surface)
- [ ] 2.2 event-attached `CompensationLineItem` + actuals fields (`Show.actualStartTime/EndTime`, `StudioShiftBlock.actualStartTime/EndTime`) + line-item and actuals input surfaces. **No freeze guards, no settlement, no grace, no audit table in Phase 4.** Snapshot-field overrides audited via existing `metadata`-column pattern.
- [ ] 2.3 Economics service implemented as a pure calculator + three read endpoints; merged to `master`
- [ ] 3.1 Studio economics review surface (date-ranged, read-only) consuming the operational view and surfacing actuals-missing/incomplete warnings
- [ ] 3.2 Show planning export
- [ ] 3.3 Creator availability hardening (overlap + roster conflict)
- [ ] Sidebar Finance group landed alongside 3.1

Future target, not a Phase 4 close requirement:

- [ ] P&L revenue workflow (revenue input, COMMISSION/HYBRID activation, contribution margin)
