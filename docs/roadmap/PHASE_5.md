# Phase 5: TBD

> **Status**: Placeholder — scope to be decided after Phase 4 Wave 1 completes
> **Planning stance**: Three candidate tracks identified. Final scope and priority will be set based on business needs at the time.

## Purpose

Phase 5 is reserved for the next workstream selection after Phase 4's L-side foundations are stable (rosters, export, availability hardening shipped).

## Candidate Tracks

### Track A: P&L Revenue Side (P-side completion)

Complete the revenue half of the P&L model that Phase 4 defers. This track depends on the economics cost model review (Phase 4 post-Wave 1 gate) to ensure the architecture accommodates all cost components before layering on revenue.

Potential scope:
- **P&L revenue workflow** — GMV/sales inputs, commission cost activation, contribution margin (currently a Phase 4 Wave 3 PRD — may carry forward if not completed in Phase 4)
- **Advanced compensation engine** — automated rule-based computation (OT multipliers, tiered/volume commission, bonus formulas) that **writes `CompensationLineItem` records** as output. The data model and manual CRUD ship in Phase 4; the rule engine that automates line item creation is Phase 5. Double-entry ledger is out of scope unless the platform evolves into a financial product.
- **Creator HR & operations** — fixed cost tracking (rent, equipment depreciation), creator HRMS, platform API integrations
- **Financial arithmetic** — `big.js` adoption for production-grade financial reporting
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

Complete the transition from system-admin-dependent operations to studio self-service. Phase 4 addresses the most critical gaps (show management, schedule management, creator onboarding); Track C covers the remaining medium/low severity gaps identified in the Phase 4 gap analysis (2026-03-28).

Potential scope:
- **Studio reference data management** — studio-initiated creation of clients, platforms, show types, show standards, and show statuses into the global catalog. Removes system-admin bottleneck for routine metadata setup. See [PRD](../prd/studio-reference-data.md).
- **Studio creator profile editing** — studio admins can edit creator name, alias, and metadata for rostered creators. Conditional user-link setting. See [PRD](../prd/studio-creator-profile.md).
- **Studio-native schedule management** — deferred from Phase 4 on 2026-04-22 (Google Sheets flow remains stable and planner-preferred; client-portal direction speculative). Likely folded into the Client Portal workstream rather than shipped as a standalone studio-app feature. Existing design docs retained for reference: [PRD](../prd/studio-schedule-management.md), [BE design](../../apps/erify_api/docs/design/STUDIO_SCHEDULE_MANAGEMENT_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/STUDIO_SCHEDULE_MANAGEMENT_DESIGN.md).
- **Studio snapshot/audit trail** — expose schedule and show version history at studio level for operational audit and review. Currently admin-only via `/admin/snapshots`.
- **Full-text search & admin UX searchability** — cross-entity search at studio level (deferred from Phase 4).

Prerequisites from Phase 4:
- Studio creator onboarding must ship first (creator profile editing extends the onboarding surface).
- Studio show management already shipped; snapshot visibility is more useful once a schedule-management surface lands (whether studio-native or client-portal-driven).

## Items Deferred from Phase 4

These are explicitly out of Phase 4 scope and candidates for Phase 5:

| Item | Source | Candidate Track |
| --- | --- | --- |
| Advanced compensation **rule engine** (automated OT, tiered commission, bonus formulas) | Phase 4 ships the data model + manual CRUD; Phase 5 adds the computation engine | A |
| Creator HR & operations (HRMS, fixed cost tracking) | Phase 4 out-of-scope, ideation | A |
| Full-text search & admin UX searchability | Phase 4 out-of-scope, ideation | C (or either) |
| Ticketing & material management | Phase 4 out-of-scope, ideation | B |
| PWA push notifications | Ideation | B |
| Creator app expansion | Ideation | B |
| Studio reference data management (clients, platforms, types, standards, statuses) | Phase 4 gap analysis (2026-03-28) | C |
| Studio creator profile editing (name/alias at studio level) | Phase 4 gap analysis (2026-03-28) | C |
| Studio-native schedule management | Phase 4 re-sequencing (2026-04-22); likely folded into Client Portal | C |
| Studio snapshot/audit trail visibility | Phase 4 gap analysis (2026-03-28) | C |

## Promotion Rule

An ideation topic should move into Phase 5 planning only when:
- it becomes necessary to ship a current business goal,
- it has a clear owner, scoped deliverables, and testable exit criteria, or
- its prerequisite work from Phase 4 is complete.

All ideation topics live in `docs/ideation/` with individual decision gates and preserved context. See [ideation/README.md](../ideation/README.md) for the full index.
