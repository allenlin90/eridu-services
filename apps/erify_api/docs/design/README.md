# erify_api Design Docs

Active design documents for planned and in-progress features. Once a feature ships, the design doc is promoted to a canonical doc under `apps/erify_api/docs/` and removed from this index — promoted docs serve as the backbone that new features and implementations should reference.

## Index

1. [Authorization Guide](./AUTHORIZATION_GUIDE.md) — Proposed RBAC model
2. [Creator Availability Hardening Backend Design](./CREATOR_AVAILABILITY_HARDENING_DESIGN.md) — Planned strict availability enforcement
3. [Pending-Resolution MVP](./IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md) — Planned follow-up execution plan
4. [Material Management](./MATERIAL_MANAGEMENT_DESIGN.md) — Phase 5 candidate
5. [Ad-hoc Task Ticketing](./AD_HOC_TASK_TICKETING.md) — Planned template-less task creation for pre-production tickets
6. [Data Warehouse (Datastream + BigQuery)](./DATA_WAREHOUSE_DESIGN.md) — Phase 5 candidate

## Note

- Phase 4 backend cross-feature context is tracked in [../PHASE_4_PNL_BACKEND.md](../PHASE_4_PNL_BACKEND.md); feature-specific design lives in this folder.
- Wave 2, Wave 3, and future revenue economics design drafts were removed after 2.1 sign-off because they carried stale pre-simplification assumptions. Redraft them from the signed-off PRDs when each workstream starts.
