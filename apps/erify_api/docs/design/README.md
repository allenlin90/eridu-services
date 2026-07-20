# erify_api Design Docs

Active design documents for planned and in-progress features. Once a feature ships, the design doc is promoted to a canonical doc under `apps/erify_api/docs/` and removed from this index — promoted docs serve as the backbone that new features and implementations should reference.

## Index

1. [Authorization Guide](./AUTHORIZATION_GUIDE.md) — Proposed RBAC model
2. [Creator Availability Hardening Backend Design](./CREATOR_AVAILABILITY_HARDENING_DESIGN.md) — Planned strict availability enforcement
3. [Material Management](./MATERIAL_MANAGEMENT_DESIGN.md) — Phase 5 candidate
4. [Ad-hoc Task Ticketing](./AD_HOC_TASK_TICKETING.md) — Planned template-less task creation for pre-production tickets
5. [Data Warehouse (Datastream + BigQuery)](./DATA_WAREHOUSE_DESIGN.md) — Phase 5 candidate
6. [Studio Schedule Management](./STUDIO_SCHEDULE_MANAGEMENT_DESIGN.md) — Deferred Phase 5 (revisit for Client Portal)
7. [Show-Level Issue Ownership](./SHOW_ISSUE_OWNERSHIP_DESIGN.md) — Phase 5 item 9 design locked for implementation
8. [`erify_api` Architecture Refactoring Guide](./ARCHITECTURE_REFACTORING_GUIDE.md) — Accepted capability-first modular-monolith direction with a pilot-gated persistence matrix and CQRS decision gates
   - [Visual Companion](./architecture-refactoring-visual.html) — diagrammed walkthrough (problem, NestJS-vs-Rails philosophy, Nest conventions, phased plan, risks); open in a browser
   - [Implementation Roadmap](./ARCHITECTURE_REFACTORING_ROADMAP.md) — the follow-up task backlog (T1–T13) for the do-now foundation, with gates, skills, and knowledge-sync targets

## Note

- Phase 4 cross-feature context lives in [PHASE_4.md](../../../../docs/roadmap/PHASE_4.md); feature-specific design lives in this folder. The Phase 4 endpoint→role matrix lives in [AUTHORIZATION_GUIDE.md](./AUTHORIZATION_GUIDE.md#phase-4-endpoint--role-matrix).
- Stale Wave 2, Wave 3, and future revenue economics design drafts were removed after 2.1 sign-off because they carried pre-simplification assumptions. Active redrafts are listed in the index above.
