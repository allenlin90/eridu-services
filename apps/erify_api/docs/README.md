# erify_api Documentation

> **TLDR**: NestJS REST API for live-commerce operations. Below is the documentation index organized by topic with implementation status.

**Status legend**: ✅ Implemented · 📐 Design Proposal · ⏳ In Progress · 🗓️ Planned

> Implemented/canonical backend docs are kept at `apps/erify_api/docs/` root. Design/proposal/in-progress docs are kept under `apps/erify_api/docs/design/`. Cross-app roadmap source of truth now lives at [`../../../docs/roadmap/`](../../../docs/roadmap/).

## Core

| Document                                                                           | Status | Description                                                      |
| ---------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| [System Architecture Overview](../../../docs/engineering/ARCHITECTURE_OVERVIEW.md) | ✅      | Root-level cross-app architecture overview                       |
| [Business Domain](../../../docs/domain/BUSINESS.md)                                | ✅      | Root-level business/domain model and product context             |
| [RBAC Roles](../../../docs/features/rbac-roles.md)                                 | ✅      | Shipped role expansion — product decisions and acceptance record |

## Features

| Document                                                                                             | Status       | Description                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| [Schedule Planning](./SCHEDULE_PLANNING.md)                                                          | ✅ Phase 1    | JSON planning, snapshots, validation, publishing                                                     |
| [Schedule Continuity](./SCHEDULE_CONTINUITY.md)                                                      | ✅ Core       | Identity-preserving diff+upsert publish; dedicated studio resolve workflow remains follow-up         |
| [Task Management Summary](./TASK_MANAGEMENT_SUMMARY.md)                                              | ✅            | Task-as-Form architecture, API surface, workflows                                                    |
| [Studio Shift Schedule](./STUDIO_SHIFT_SCHEDULE.md)                                                  | ✅ Phase 3    | Shift CRUD, duty-manager coverage, calendar, alignment                                               |
| [Studio Creator Roster](./STUDIO_CREATOR_ROSTER.md)                                                  | ✅ Phase 4    | Studio-scoped creator roster CRUD, compensation defaults, and inactive-roster assignment enforcement |
| [File Upload (Cloudflare R2)](./FILE_UPLOAD.md)                                                      | ✅ Phase 3    | Presigned URL flow, use-case limits, storage routing                                                 |
| [Task Submission Reporting & Export](./TASK_SUBMISSION_REPORTING.md)                                 | ✅ Phase 4    | Studio-scoped submitted-task report definitions and batched query API                                |
| [Studio Creator Onboarding](./STUDIO_CREATOR_ONBOARDING.md)                                          | ✅ Phase 4    | Studio-scoped creator creation and roster-first assignment enforcement                               |
| [Studio Show Management](./STUDIO_SHOW_MANAGEMENT.md)                                                | ✅ Phase 4    | Studio-scoped show create/update/delete, lookup bundling, and last-write-wins semantics              |
| [Read-Path Optimization](./READ_PATH_OPTIMIZATION.md)                                                | ✅ March 2026 | Lean show/task-template query shaping and repository/service boundaries                              |
| [Studios Internal Read Traffic Hardening](../../erify_studios/docs/STUDIOS_INTERNAL_READ_TRAFFIC.md) | ✅ Ops        | Internal-read burst handling, query cancellation, and readBurst throttle coverage                    |
| [Phase 4 P&L Backend Index](./PHASE_4_PNL_BACKEND.md)                                                | ⏳ Phase 4    | Phase-level backend index and shared rules for per-feature Phase 4 design docs                       |
| [DB Migration Policy](../../../docs/engineering/DB_MIGRATION_POLICY.md)                              | ✅ Ops        | Canonical migration governance, tool-first generation, and branch-local scoping rule                 |

## Design

| Document                                                                                           | Status | Description                                                                    |
| -------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| [Authorization Guide](./design/AUTHORIZATION_GUIDE.md)                                             | 📐      | Proposed JSONB-based RBAC (current auth: `isSystemAdmin` + `StudioMembership`) |
| [Creator Availability Hardening Backend Design](./design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) | 📐      | Planned strict availability enforcement and assignment errors                  |
| [Pending-Resolution MVP](./design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md)          | 📐      | Planned studio-scoped resolution follow-up for cancelled shows                  |
| [Ad-hoc Task Ticketing](./design/AD_HOC_TASK_TICKETING.md)                                         | 📐      | Planned template-less task creation using the existing `Task` model            |
| [Material Management](./design/MATERIAL_MANAGEMENT_DESIGN.md)                                      | 🗓️      | Deferred Phase 5 candidate for the operations-expansion track                  |
| [Data Warehouse](./design/DATA_WAREHOUSE_DESIGN.md)                                                | 🗓️      | Deferred Phase 5 analytics candidate (Datastream + BigQuery)                   |

Wave 2, Wave 3, and future revenue economics design drafts were removed after 2.1 sign-off because they carried stale pre-simplification assumptions. Redraft app-local implementation designs from the signed-off PRDs when each workstream starts.

## Roadmap

| Phase                                               | Status | Focus                                                           |
| --------------------------------------------------- | ------ | --------------------------------------------------------------- |
| [Phase 1 Overall](../../../docs/roadmap/PHASE_1.md) | ✅      | Closed foundation phase                                         |
| [Phase 2 Overall](../../../docs/roadmap/PHASE_2.md) | ✅      | Closed task-management foundation phase                         |
| [Phase 3 Overall](../../../docs/roadmap/PHASE_3.md) | ✅      | Closed summary after scope reset                                |
| [Phase 4 Overall](../../../docs/roadmap/PHASE_4.md) | ⏳      | P&L implementation on top of completed creator cutover baseline |
| [Phase 5 Overall](../../../docs/roadmap/PHASE_5.md) | 🗓️      | Deferred / parking lot features                                 |

## Quick Start

1. Read **[System Architecture Overview](../../../docs/engineering/ARCHITECTURE_OVERVIEW.md)** for cross-app architecture
2. Read **[Business Domain](../../../docs/domain/BUSINESS.md)** for product/domain context
3. Read backend implementation docs in this folder for API-specific behavior

## Related Packages

| Package                                            | Description                                       |
| -------------------------------------------------- | ------------------------------------------------- |
| [Auth SDK](../../../packages/auth-sdk/README.md)   | JWT/JWKS validation (`@eridu/auth-sdk`)           |
| [API Types](../../../packages/api-types/README.md) | Shared Zod schemas and types (`@eridu/api-types`) |

## Implementation Patterns

For code patterns, see `.agent/skills/` — the **canonical references** for how to write code in this codebase.
