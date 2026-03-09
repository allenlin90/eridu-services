# Product & Requirements

This section gathers the business and product references that shape cross-app delivery.

These documents are not all owned by one app, but together they describe the current domain, user workflows, and operational expectations.

## Core Domain References

- [Business Domain](./BUSINESS.md)
- [System Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- [Role Access Matrix (Canonical RBAC Reference)](./ROLE_ACCESS_MATRIX.md)
- [DB Migration Policy](./DB_MIGRATION_POLICY.md)

## Operations and Workflow References

- Backend task architecture: [apps/erify_api/docs/TASK_MANAGEMENT_SUMMARY.md](../../apps/erify_api/docs/TASK_MANAGEMENT_SUMMARY.md)
- Frontend task workflows: [apps/erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md](../../apps/erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md)
- Backend shift behavior: [apps/erify_api/docs/STUDIO_SHIFT_SCHEDULE.md](../../apps/erify_api/docs/STUDIO_SHIFT_SCHEDULE.md)
- Frontend shift workflows: [apps/erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md](../../apps/erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md)
- Show readiness UX and operational interpretation: [apps/erify_studios/docs/SHOW_READINESS.md](../../apps/erify_studios/docs/SHOW_READINESS.md)
- Studio roles and visibility model: [apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md)

## Media / Upload / Moderation References

- Upload infrastructure and rules: [apps/erify_api/docs/FILE_UPLOAD.md](../../apps/erify_api/docs/FILE_UPLOAD.md)
- Moderation loop workflow: [apps/erify_studios/docs/MODERATION_WORKFLOW.md](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md)

## Usage Rule

When a requirement is clearly cross-app or product-level, link it from here and the root roadmap rather than burying it inside a single app’s design folder.

When a document is primarily about backend implementation details, keep it under `apps/erify_api/docs/`.

When a document is primarily about frontend workflow execution details, keep it under `apps/erify_studios/docs/`.
