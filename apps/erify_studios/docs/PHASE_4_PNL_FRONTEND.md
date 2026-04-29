# Phase 4 P&L Frontend Index

> **Status**: Active
> **Phase scope**: Phase 4 P&L workstreams
> **Owner app**: `apps/erify_studios`

## Purpose

Phase-level frontend index for Phase 4. Active feature proposals stay in `apps/erify_studios/docs/design/`; once a feature ships, its frontend reference is promoted into `apps/erify_studios/docs/` root and linked here instead of remaining in the design folder.

## Frontend Rules

Authoritative cross-cutting rules: [PHASE_4.md Architecture Guardrails](../../../docs/roadmap/PHASE_4.md#architecture-guardrails). Frontend-specific recap:

- Route access lives in the shared `hasStudioRouteAccess` policy; sidebar visibility and route guards must stay aligned.
- Query keys are scoped by studio/show and organized by feature.
- Table filter and view state lives in the URL for list/report-oriented features.
- Version-guarded write paths treat `409` as refetch + user-review flow.
- Projected, actual-backed, planned-fallback, pending, and unresolved labels are explicit in finance UI; never collapse them into a single ambiguous "actual" number.
- Compensation views surface `actuals_source` and the recipient pending/countable-total rules per the [cost-model actuals priority cascade](../../../docs/prd/economics-cost-model.md#actuals-priority-cascade-extension-point).
- FE never recomputes finance arithmetic locally; all monetary numbers come from the API as `Prisma.Decimal`-serialized strings.
- Loading, empty, null, and unresolved reference states are explicit on every economics and compensation surface.

## Feature Doc Index

| #   | Workstream                                 | Status         | Product source                                                                           | Frontend doc                                                                                |
| --- | ------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1.1 | Sidebar redesign                           | 🔁 Incremental  | FE-only scope                                                                            | [SIDEBAR_REDESIGN.md](./design/SIDEBAR_REDESIGN.md)                                         |
| 1.2 | Studio creator roster                      | ✅ Shipped      | [studio-creator-roster.md](../../../docs/features/studio-creator-roster.md)              | [STUDIO_CREATOR_ROSTER.md](./STUDIO_CREATOR_ROSTER.md)                                      |
| 1.3 | Studio member roster                       | ✅ Shipped      | [studio-member-roster.md](../../../docs/features/studio-member-roster.md)                | Shipped (PR #28)                                                                            |
| 1.4 | Studio creator onboarding                  | ✅ Shipped      | [studio-creator-onboarding.md](../../../docs/features/studio-creator-onboarding.md)      | [STUDIO_CREATOR_ONBOARDING.md](./STUDIO_CREATOR_ONBOARDING.md)                              |
| 1.5 | Studio show management                     | ✅ Shipped      | [studio-show-management.md](../../../docs/features/studio-show-management.md)            | [STUDIO_SHOW_MANAGEMENT.md](./STUDIO_SHOW_MANAGEMENT.md)                                    |
| 2.1 | Economics cost model                       | ✅ Signed off   | [economics-cost-model.md](../../../docs/prd/economics-cost-model.md)                     | N/A (docs-only PRD)                                                                         |
| 2.2 | Compensation line items + actuals          | 📝 Design next  | [compensation-line-items.md](../../../docs/prd/compensation-line-items.md)               | Redraft from PRD                                                                            |
| 2.3 | Economics service                          | 🔲 Planned      | [economics-service.md](../../../docs/prd/economics-service.md)                            | Redraft when 2.3 starts                                                                     |
| 3.1 | Studio economics review                    | 🔲 Planned      | [studio-economics-review.md](../../../docs/prd/studio-economics-review.md)               | Redraft after 2.3 read shape lands                                                          |
| 3.2 | Show planning export                       | 🔲 Planned      | [show-planning-export.md](../../../docs/prd/show-planning-export.md)                     | Redraft after 3.1 scope is confirmed                                                        |
| 3.3 | Creator availability hardening             | 🔲 Planned      | [creator-availability-hardening.md](../../../docs/prd/creator-availability-hardening.md) | [CREATOR_AVAILABILITY_HARDENING_DESIGN.md](./design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) |
| —   | P&L revenue workflow                       | ⏭️ Future target | [pnl-revenue-workflow.md](../../../docs/prd/pnl-revenue-workflow.md)                     | Redraft when revenue planning restarts                                                      |
| —   | Task submission reporting                  | ✅ Shipped      | [task-submission-reporting.md](../../../docs/features/task-submission-reporting.md)      | [TASK_SUBMISSION_REPORTING.md](./TASK_SUBMISSION_REPORTING.md)                              |

## Query-Key Families

- `studio-members`
- `studio-creator-roster`
- `compensation-items`
- `member-compensation-view`
- `creator-compensation-view`
- `show-actuals`
- `shift-block-actuals`
- `economics`
- `planning-export`
- creator availability / creator mapping keys

## Verification Gate

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`

## Traceability

- Phase tracker: [docs/roadmap/PHASE_4.md](../../../docs/roadmap/PHASE_4.md)
- Frontend docs index: [README.md](./README.md)
- Frontend design docs index: [design/README.md](./design/README.md)
- Backend phase index: [../../erify_api/docs/PHASE_4_PNL_BACKEND.md](../../erify_api/docs/PHASE_4_PNL_BACKEND.md)
