# erify_api Design Docs

Design/proposal/in-progress documents for `erify_api`.

Use these docs for planning and implementation tracking. Once behavior is shipped and stabilized, consolidate into canonical docs under `apps/erify_api/docs/`.

## Index

1. [Authorization Guide](./AUTHORIZATION_GUIDE.md) — Proposed RBAC model
2. [Show Economics Backend Design](./SHOW_ECONOMICS_DESIGN.md) — Deferred merge target for economics baseline revisions
3. [Studio Economics Review Backend Design](./STUDIO_ECONOMICS_REVIEW_DESIGN.md) — Planned finance review workspace contract
4. ~~Studio Creator Roster Backend Design~~ — ✅ Implemented — promoted to canonical doc at [../STUDIO_CREATOR_ROSTER.md](../STUDIO_CREATOR_ROSTER.md)
5. [Compensation Line Items Backend Design](./COMPENSATION_LINE_ITEMS_DESIGN.md) — Planned supplemental compensation model
6. [Show Planning Export Backend Design](./SHOW_PLANNING_EXPORT_DESIGN.md) — Planned planning export endpoint
7. [Creator Availability Hardening Backend Design](./CREATOR_AVAILABILITY_HARDENING_DESIGN.md) — Planned strict availability enforcement
8. [P&L Revenue Workflow Backend Design](./PNL_REVENUE_WORKFLOW_DESIGN.md) — Blocked Wave 3 revenue-side activation
9. [Pending-Resolution MVP](./IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md) — In-progress execution plan
10. ~~Studio Shift Schedule~~ — ✅ Implemented — promoted to canonical doc at [../STUDIO_SHIFT_SCHEDULE.md](../STUDIO_SHIFT_SCHEDULE.md)
11. ~~File Upload (Cloudflare R2)~~ — ✅ Implemented — promoted to canonical doc at [../FILE_UPLOAD.md](../FILE_UPLOAD.md)
12. [Material Management](./MATERIAL_MANAGEMENT_DESIGN.md) — 🗓️ Planned for Phase 5
13. [Ad-hoc Task Ticketing](./AD_HOC_TASK_TICKETING.md) — Planned template-less task creation for pre-production tickets
14. [Task Submission Reporting & Export](./TASK_SUBMISSION_REPORTING_DESIGN.md) — ✅ Implemented studio-scoped reporting API (sources, preflight, run, definition CRUD)
15. [Studio Creator Onboarding](./STUDIO_CREATOR_ONBOARDING_DESIGN.md) — Studio-scoped creator creation + roster-first assignment enforcement
16. [Data Warehouse (Datastream + BigQuery)](./DATA_WAREHOUSE_DESIGN.md) — 🗓️ Planned for Phase 5
17. ~~Analytics Dashboard~~ — ⚠️ Superseded by Data Warehouse approach; prior design doc removed

## Note

- Phase 4 backend cross-feature context is tracked in [../PHASE_4_PNL_BACKEND.md](../PHASE_4_PNL_BACKEND.md); feature-specific design lives in this folder.
