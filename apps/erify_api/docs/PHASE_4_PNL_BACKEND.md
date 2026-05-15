# Phase 4 P&L Backend Index

> **Status**: Active
> **Phase scope**: Phase 4 P&L workstreams
> **Owner app**: `apps/erify_api`

## Purpose

Phase-level backend index for Phase 4. Feature-specific backend design lives in `apps/erify_api/docs/design/` per feature, not in one omnibus file.

## Backend Guardrails

Authoritative source: [PHASE_4.md Architecture Guardrails](../../../docs/roadmap/PHASE_4.md#architecture-guardrails). Recap of the rules that affect backend code:

- Finance arithmetic in dedicated economics services / calculators.
- `Prisma.Decimal` end-to-end for monetary composition. No `Number` / `toFixed(2)` in aggregation paths.
- Financial polymorphism follows the repo's Prisma-friendly target pattern; new discriminators use Prisma enums where cleanly supported.
- Historical cost inputs are snapshot-on-write.
- Aggregation queries exclude soft-deleted rows by default.
- Self-access uses the existing `/me/` module and derives identity from auth context.
- Fixture-based tests on economics aggregation services.
- Zod schemas from `@eridu/api-types` are the request/response source of truth.
- No DB internal IDs in public API responses — UIDs only.
- Actual timestamps and performance/revenue facts are persisted on their narrowest entity scope; calculated finance reference values stay in backend economics read models.

## Feature Design Index

| #   | Workstream                                 | Status         | Product source                                                                           | Backend design                                                                                |
| --- | ------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1.2 | Studio creator roster                      | ✅ Shipped      | [studio-creator-roster.md](../../../docs/features/studio-creator-roster.md)              | [STUDIO_CREATOR_ROSTER.md](./STUDIO_CREATOR_ROSTER.md)                                        |
| 1.3 | Studio member roster                       | ✅ Shipped      | [studio-member-roster.md](../../../docs/features/studio-member-roster.md)                | Shipped (PR #28)                                                                              |
| 1.4 | Studio creator onboarding                  | ✅ Shipped      | [studio-creator-onboarding.md](../../../docs/features/studio-creator-onboarding.md)      | [STUDIO_CREATOR_ONBOARDING.md](./STUDIO_CREATOR_ONBOARDING.md)                                |
| 1.5 | Studio show management                     | ✅ Shipped      | [studio-show-management.md](../../../docs/features/studio-show-management.md)            | [STUDIO_SHOW_MANAGEMENT.md](./STUDIO_SHOW_MANAGEMENT.md)                                      |
| 2.1 | Economics cost model                       | ✅ Signed off    | [economics-cost-model.md](../../../docs/prd/economics-cost-model.md)                                     | N/A (docs-only)                                                                               |
| 2.2 | Compensation line items + actuals          | 🚧 Tasks 1-6 merged | [Tracker §PR 3-10](../../../docs/roadmap/PHASE_4.md)                                     | [COMPENSATION_LINE_ITEMS_DESIGN.md](./design/COMPENSATION_LINE_ITEMS_DESIGN.md)              |
| 2.3 | Economics service                          | 🔲 Planned       | [Tracker §PR 11-13](../../../docs/roadmap/PHASE_4.md)                                    | Design doc on first PR that introduces a novel pattern                                        |
| 3.1 | Studio economics review                    | 🔲 Planned       | [Tracker §PR 14](../../../docs/roadmap/PHASE_4.md)                                       | FE-only consumer of PR 13 rollup                                                              |
| 3.2 | Page-local exports                         | 🔲 Planned       | [Tracker §PR 1-2](../../../docs/roadmap/PHASE_4.md)                                      | n/a (FE-only)                                                                                 |
| 3.3 | Creator availability hardening             | 🔲 Planned       | [Tracker §PR 15](../../../docs/roadmap/PHASE_4.md)                                       | [CREATOR_AVAILABILITY_HARDENING_DESIGN.md](./design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) |
| —   | P&L revenue workflow                       | ⏭️ Future target | [Future PRD](../../../docs/prd/future/pnl-revenue-workflow.md)                                          | Redraft when revenue planning restarts                                                        |

## Authorization Matrix

| Endpoint group                                | Required roles                                  |
| --------------------------------------------- | ----------------------------------------------- |
| Catalog / roster / availability reads         | `[ADMIN, MANAGER, TALENT_MANAGER]`              |
| Show creator list read                        | `[ADMIN, MANAGER, TALENT_MANAGER]`              |
| Bulk assign / remove creators                 | `[ADMIN, MANAGER, TALENT_MANAGER]`              |
| Studio member roster reads                    | `[ADMIN, MANAGER]`                              |
| Studio member roster writes                   | `[ADMIN]`                                       |
| Studio creator roster writes                  | `[ADMIN]`                                       |
| Studio show writes                            | `[ADMIN, MANAGER]`                              |
| Show / shift-block actuals writes             | `[ADMIN, MANAGER]`                              |
| Compensation line item reads                  | `[ADMIN, MANAGER]`                              |
| Compensation line item writes                 | `[ADMIN, MANAGER]`                              |
| Snapshot-field override writes                | `[ADMIN, MANAGER]`                              |
| Member self-compensation view                 | `[ADMIN, MANAGER, self]`                        |
| Creator self-compensation view                | `[ADMIN, MANAGER, TALENT_MANAGER, self]`        |
| Operational economics reads (3.1)             | `[ADMIN, MANAGER]`                              |
| Show planning export (3.2)                    | `[ADMIN, MANAGER]`                              |

## Verification Gate

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`

## Traceability

- Phase tracker: [docs/roadmap/PHASE_4.md](../../../docs/roadmap/PHASE_4.md)
- Backend docs index: [README.md](./README.md)
- Backend design docs index: [design/README.md](./design/README.md)
- Authorization foundation: [AUTHORIZATION_GUIDE.md](./design/AUTHORIZATION_GUIDE.md)
