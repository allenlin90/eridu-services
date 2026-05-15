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
- Actuals input/read surfaces are resource-scoped in labels, query keys, and API calls: show actuals, creator participation actuals, platform performance actuals, and shift-block actuals are distinct concepts.
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
| 2.1 | Economics cost model                       | ✅ Signed off    | [economics-cost-model.md](../../../docs/prd/economics-cost-model.md)                                     | N/A (docs-only PRD)                                                                           |
| 2.2 | Compensation line items + actuals          | 🚧 Tasks 1-6 merged | [Tracker §PR 3-10](../../../docs/roadmap/PHASE_4.md)                                     | [COMPENSATION_LINE_ITEMS_DESIGN.md](./design/COMPENSATION_LINE_ITEMS_DESIGN.md)              |
| 2.3 | Economics service                          | 🔲 Planned       | [Tracker §PR 11-13](../../../docs/roadmap/PHASE_4.md)                                    | Design doc on first PR introducing a novel pattern                                            |
| 3.1 | Studio economics review                    | 🔲 Planned       | [Tracker §PR 14](../../../docs/roadmap/PHASE_4.md)                                       | Design doc on PR 14                                                                           |
| 3.2 | Page-local exports                         | 🔲 Planned       | [Tracker §PR 1-2](../../../docs/roadmap/PHASE_4.md)                                      | n/a (no new pattern)                                                                          |
| 3.3 | Creator availability hardening             | 🔲 Planned       | [Tracker §PR 15](../../../docs/roadmap/PHASE_4.md)                                       | [CREATOR_AVAILABILITY_HARDENING_DESIGN.md](./design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) |
| —   | P&L revenue workflow                       | ⏭️ Future target | [Future PRD](../../../docs/prd/future/pnl-revenue-workflow.md)                                          | Redraft when revenue planning restarts                                                        |
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
