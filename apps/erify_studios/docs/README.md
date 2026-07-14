# erify_studios Documentation

Implemented/canonical frontend docs stay in `apps/erify_studios/docs/` root. Design/proposal/in-progress docs stay in `apps/erify_studios/docs/design/`. Cross-app roadmap source of truth now lives at [`../../../docs/roadmap/`](../../../docs/roadmap/).

## Cross-App Roadmap

1. [Phase 3 Closure Summary](../../../docs/roadmap/PHASE_3.md)
2. [Phase 4 — Complete](../../../docs/roadmap/PHASE_4.md)
3. [Phase 5 — Show Production Lifecycle Gap Closure (planned, next up)](../../../docs/roadmap/PHASE_5.md)

## Canonical Docs

1. [Task Management Summary](./TASK_MANAGEMENT_SUMMARY.md)
2. [JsonForm Submission Upload Flow](./JSON_FORM_SUBMISSION_UPLOAD_FLOW.md)
3. [Moderation Loop Workflow](./MODERATION_WORKFLOW.md)
4. [Show Readiness](./SHOW_READINESS.md)
5. [Studio Role Use Cases and Views](./STUDIO_ROLE_USE_CASES_AND_VIEWS.md)
6. [Studio Shift Schedule Features and Workflows](./STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md)
7. [Studio Creator Roster](./STUDIO_CREATOR_ROSTER.md)
8. [PWA Shell Runbook](./PWA_SHELL_RUNBOOK.md)
9. [Studios Internal Read Traffic Hardening](./STUDIOS_INTERNAL_READ_TRAFFIC.md)
10. [Task Submission Reporting Frontend Reference](./TASK_SUBMISSION_REPORTING.md)
11. [Studio Creator Onboarding Frontend Reference](./STUDIO_CREATOR_ONBOARDING.md)
12. [Studio Show Management Frontend Reference](./STUDIO_SHOW_MANAGEMENT.md) — CRUD, show actuals, and current-view export
13. [Compensation Line Items + Actuals Frontend Reference](./COMPENSATION_LINE_ITEMS.md)
14. [Frontend Tech Debt Register](./FRONTEND_TECH_DEBT.md)
15. [Entity Detail Routes (PR 14)](./ENTITY_DETAIL_ROUTES.md) — entity edit dialogs → dedicated routes; 14a creator, 14b member, and 14d shift detail shipped (14c show planned)
16. [Client Mechanics Management](./CLIENT_MECHANICS_MANAGEMENT.md) — client-owned mechanics catalog, Loop × Mechanic matrix, mechanic↔show coverage (PR 20.1–20.8)

## Design Docs

Active (in progress):

1. [Schedule Continuity FE Design](./design/DESIGN_FE_SCHEDULE_CONTINUITY_IMPLEMENTATION_PLAN.md) — 📐 Planned follow-up
2. [Sidebar Redesign](./design/SIDEBAR_REDESIGN.md) — 🔁 Incremental (core regrouping shipped)
3. [Creator Availability Hardening Frontend Design](./design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) — 📐 Planned
4. [Show-Level Issue Ownership](../../erify_api/docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md) — 📐 Cross-app Phase 5 item 8 design locked for implementation

Wave 2, Wave 3, and future revenue economics design drafts were removed after 2.1 sign-off because they carried stale pre-simplification assumptions. Redraft app-local implementation designs from the signed-off PRDs when each workstream starts.
