# Phase 6: TBD

> **Status**: Placeholder — scope to be decided after Phase 5 closes
> **Planning stance**: Three candidate tracks identified. Final scope and priority will be set based on business needs at the time.

## Purpose

Phase 6 is reserved for the next workstream selection after Phase 5's show production lifecycle gap closure is stable. The candidate tracks below were originally scoped as Phase 5 candidates and were repositioned when Phase 5 was repurposed for lifecycle gap filling.

## Candidate Tracks

### Track A: P&L Revenue Side (P-side completion)

Complete the revenue half of the P&L model that Phase 4 defers. This track depends on Phase 4's typed operational facts and economics cost read model so revenue work can consume `ShowPlatform` GMV/views and platform violation records instead of parsing task submissions directly.

Potential scope:
- **P&L revenue workflow** — net sales inputs, commission cost activation, contribution margin, and revenue correction policy. Phase 4 may add platform-scoped GMV/views and violation records for operational performance; Phase 6 owns financial revenue semantics, commission resolution, and margin.
- **Advanced compensation engine** — automated rule-based computation (OT multipliers, tiered/volume commission, bonus formulas) that **writes `CompensationLineItem` records** as output. The data model and manual CRUD ship in Phase 4; the rule engine that automates line item creation is Phase 6. Double-entry ledger is out of scope unless the platform evolves into a financial product.
- **Creator HR & operations** — fixed cost tracking (rent, equipment depreciation), creator HRMS, creator-app actuals, and platform API integrations
- **Economics FE** — dashboard pages consuming the shipped economics endpoints

Related ideation topics:
- `docs/ideation/creator-hr-operations.md` — fixed cost tracking, HRMS, platform API
- `docs/ideation/enterprise-scale-followups.md` — data warehouse, advanced analytics

### Track B: Operations Expansion (ticketing, materials, inventory)

Expand the operational feature set beyond show-centric workflows. This track introduces new domain models and cross-functional workflows.

Potential scope:
- **Cross-functional ticketing** — ad-hoc task creation without templates (commerce, design, moderation); client self-service ticketing
- **Material management** — `Material` / `MaterialType` / `ShowMaterial` models with immutable versioning; attachment workflows
- **Inventory management** — tracking physical assets, equipment, and consumables across studios
- **Collaboration & communication** — in-system threaded comments, @mentions, notification delivery

Related ideation topics:
- `docs/ideation/cross-functional-ticketing.md`
- `docs/ideation/material-management.md`
- `docs/ideation/collaboration-communication.md`

### Track C: Studio Autonomy Completion

Complete the transition from system-admin-dependent operations to studio self-service. Phase 4 addresses the most critical gaps; Track C covers the remaining medium/low severity autonomy gaps that still need a business owner.

Potential scope:
- **Studio reference data management** — studio-initiated creation of clients, platforms, show types, show standards, and show statuses into the global catalog. Removes system-admin bottleneck for routine metadata setup. See [PRD](../prd/studio-reference-data.md).
- **Studio creator profile editing** — studio admins can edit creator name, alias, and metadata for rostered creators. Conditional user-link setting. See [PRD](../prd/studio-creator-profile.md).
- **Studio-native schedule management** — deferred from Phase 4 on 2026-04-22 (Google Sheets flow remains stable and planner-preferred; client-portal direction speculative). Likely folded into the Client Portal workstream rather than shipped as a standalone studio-app feature. Existing design docs retained for reference: [Future PRD](../prd/future/studio-schedule-management.md), [BE design](../../apps/erify_api/docs/design/STUDIO_SCHEDULE_MANAGEMENT_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/STUDIO_SCHEDULE_MANAGEMENT_DESIGN.md).
- **Studio snapshot/audit trail** — expose schedule and show version history at studio level for operational audit and review. Currently admin-only via `/admin/snapshots`.
- **Full-text search & admin UX searchability** — cross-entity search at studio level (deferred from Phase 4).

Prerequisites from Phase 4:
- Studio creator onboarding must ship first (creator profile editing extends the onboarding surface).
- Studio show management already shipped; snapshot visibility is more useful once a schedule-management surface lands (whether studio-native or client-portal-driven).

### Track D: Granular Access Control & Client Operations

Items deferred from Phase 5 lifecycle gap closure that require broader RBAC/module-permission redesign or new domain foundations.

Potential scope:
- **Granular role and module access** — decompose MANAGER into offset/onset/account/talent/moderation scopes with proper RBAC.
- **ACCOUNT_MANAGER money-field redaction and client scope** — accepted PR #149 known issues; resolved by PR #215 (20.3): client-mechanic studio-client linkage gate on every route (reads included), money-field redaction on task templates/shows/show creators/platforms/submitted-task content (`projectAllowList()` + per-route gating), and `StudioShiftController` GET routes gated to exclude `ACCOUNT_MANAGER`.
- **Client operations portal** — dedicated client identity, access model, and portal foundation.
- **Account manager show-quality review** — AM review workflow for creator mapping and mechanics quality.
- **Client mechanics review** — client-facing mechanics submission, review, and approval.

## Items Deferred from Phase 4

These are explicitly out of Phase 4 scope and candidates for Phase 6:

| Item                                                                                    | Source                                                                                                                                                         | Candidate Track |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Advanced compensation **rule engine** (automated OT, tiered commission, bonus formulas) | Phase 4 ships the data model + manual CRUD; Phase 6 adds the computation engine                                                                                | A               |
| Creator HR & operations (HRMS, fixed cost tracking)                                     | Phase 4 out-of-scope, ideation                                                                                                                                 | A               |
| Full-text search & admin UX searchability                                               | Phase 4 out-of-scope, ideation                                                                                                                                 | C (or either)   |
| Ticketing & material management                                                         | Phase 4 out-of-scope, ideation                                                                                                                                 | B               |
| PWA push notifications                                                                  | Ideation                                                                                                                                                       | B               |
| Creator app expansion                                                                   | Ideation                                                                                                                                                       | B               |
| Studio reference data management (clients, platforms, types, standards, statuses)       | Phase 4 gap analysis                                                                                                                                           | C               |
| Studio creator profile editing (name/alias at studio level)                             | Phase 4 gap analysis                                                                                                                                           | C               |
| Studio-native schedule management                                                       | Phase 4 re-sequencing; likely folded into Client Portal                                                                                                        | C               |
| Studio snapshot/audit trail visibility                                                  | Phase 4 gap analysis                                                                                                                                           | C               |
| Strict-mode creator availability with conflict metadata                                 | Phase 4 re-sequencing; availability is currently advisory — strict-mode + conflict metadata payload is the next layer once a business driver pulls it in       | C               |
| Hardware / creator-app actuals sources beyond task submissions                          | Phase 4 adds task-submission and manager-entry paths; hardware and creator-app automation remain future work                                                   | A               |
| Additional platform performance metrics beyond GMV/views                                | Phase 4 PR 21 decides the analytics storage path for GMV, views, CTR/CTO, and related metrics; they are not promoted through the 12.4 operational review track | A               |
| P&L revenue workflow, commission resolution, contribution margin                        | Phase 4 persists operational actuals and violation records; Phase 6 owns financial revenue semantics and commission resolution                                 | A               |

## Items Deferred from Phase 5

These are explicitly out of Phase 5 scope (lifecycle gap closure) and candidates for Phase 6:

| Item                                                     | Source         | Candidate Track |
| -------------------------------------------------------- | -------------- | --------------- |
| Granular role and module access (RBAC decomposition)     | Gap summary §1 | D               |
| Client operations portal                                 | Gap summary §6 | D               |
| Account manager show-quality review                      | Gap summary §6 | D               |
| Client mechanics review (client-facing)                  | Gap summary §6 | D               |
| Creator availability management                          | Gap summary §1 | C               |
| Studio member availability management                    | Gap summary §1 | C               |
| Configure studio operating rules (deep config system)    | Gap summary §1 | C               |
| Record show revenue / financial revenue semantics        | Gap summary §6 | A               |
| Calculate commission payouts                             | Gap summary §6 | A               |
| Review show profitability / contribution margin          | Gap summary §6 | A               |
| Close monthly operations (unified period-close workflow) | Gap summary §5 | A               |
| Manage production materials                              | Gap summary §2 | B               |
| Manage studio inventory                                  | Gap summary §2 | B               |
| Coordinate work in context (full collaboration)          | Gap summary §3 | B               |
| Evaluate creator mapping feasibility                     | Gap summary §2 | C               |
| Evaluate operator assignment feasibility                 | Gap summary §2 | C               |

## Promotion Rule

An ideation topic should move into Phase 6 planning only when:
- it becomes necessary to ship a current business goal,
- it has a clear owner, scoped deliverables, and testable exit criteria, or
- its prerequisite work from Phase 4 or Phase 5 is complete.

All ideation topics live in `docs/ideation/` with individual decision gates and preserved context. See [ideation/README.md](../ideation/README.md) for the full index.
