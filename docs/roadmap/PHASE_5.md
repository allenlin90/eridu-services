# Phase 5: TBD

> **Status**: Placeholder — scope to be decided after Phase 4 Wave 1 completes
> **Planning stance**: Two candidate tracks identified. Final scope and priority will be set based on business needs at the time.

## Purpose

Phase 5 is reserved for the next workstream selection after Phase 4's L-side foundations are stable (rosters, export, availability hardening shipped).

## Candidate Tracks

### Track A: P&L Revenue Side (P-side completion)

Complete the revenue half of the P&L model that Phase 4 defers. This track depends on the economics cost model review (Phase 4 post-Wave 1 gate) to ensure the architecture accommodates all cost components before layering on revenue.

Potential scope:
- **P&L revenue workflow** — GMV/sales inputs, commission cost activation, contribution margin (currently a Phase 4 Wave 3 PRD — may carry forward if not completed in Phase 4)
- **Advanced compensation engine** — bonus, OT, special allowances, tiered/volume commission, hybrid rule sets
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

## Items Deferred from Phase 4

These are explicitly out of Phase 4 scope and candidates for Phase 5:

| Item | Source | Candidate Track |
| --- | --- | --- |
| Advanced compensation (bonus, OT, tiered commission) | Phase 4 out-of-scope | A |
| Creator HR & operations (HRMS, fixed cost tracking) | Phase 4 out-of-scope, ideation | A |
| Full-text search & admin UX searchability | Phase 4 out-of-scope, ideation | Either |
| Ticketing & material management | Phase 4 out-of-scope, ideation | B |
| PWA push notifications | Ideation | B |
| Creator app expansion | Ideation | B |

## Promotion Rule

An ideation topic should move into Phase 5 planning only when:
- it becomes necessary to ship a current business goal,
- it has a clear owner, scoped deliverables, and testable exit criteria, or
- its prerequisite work from Phase 4 is complete.

All ideation topics live in `docs/ideation/` with individual decision gates and preserved context. See [ideation/README.md](../ideation/README.md) for the full index.
