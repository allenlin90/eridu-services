# erify_api Documentation

> **TLDR**: NestJS REST API for live-commerce operations. Below is the documentation index organized by topic with implementation status.

**Status legend**: ✅ Implemented · 📐 Design Proposal · ⏳ In Progress · 🗓️ Planned

> Implemented/canonical backend docs are kept at `apps/erify_api/docs/` root. Design/proposal/in-progress docs are kept under `apps/erify_api/docs/design/`. Cross-app roadmap source of truth now lives at [`../../../docs/roadmap/`](../../../docs/roadmap/).

## Core

| Document                                            | Status | Description                                       |
| --------------------------------------------------- | ------ | ------------------------------------------------- |
| [System Architecture Overview](../../../docs/engineering/ARCHITECTURE_OVERVIEW.md) | ✅      | Root-level cross-app architecture overview |
| [Business Domain](../../../docs/domain/BUSINESS.md)                    | ✅      | Root-level business/domain model and product context |
| [RBAC Roles PRD](../../../docs/prd/rbac-roles.md)                       | 📐      | Phase-scoped role expansion and access intent |

## Features

| Document                                                                            | Status    | Description                                         |
| ----------------------------------------------------------------------------------- | --------- | --------------------------------------------------- |
| [Schedule Planning](./SCHEDULE_PLANNING.md)                                         | ✅ Phase 1 | JSON planning, snapshots, validation, publishing    |
| [Schedule Continuity](./SCHEDULE_CONTINUITY.md)                                     | ✅ Core    | Identity-preserving diff+upsert publish             |
| [Task Management Summary](./TASK_MANAGEMENT_SUMMARY.md)                             | ✅         | Task-as-Form architecture, API surface, workflows   |
| [Studio Shift Schedule](./STUDIO_SHIFT_SCHEDULE.md)                                 | ✅ Phase 3 | Shift CRUD, duty-manager coverage, calendar, alignment |
| [File Upload (Cloudflare R2)](./FILE_UPLOAD.md)                                     | ✅ Phase 3 | Presigned URL flow, use-case limits, storage routing |
| [Phase 4 P&L Backend](./PHASE_4_PNL_BACKEND.md)                                     | ⏳ Phase 4 | Creator mapping contracts, assignment foundation, economics API plan |
| [DB Migration Policy](../../../docs/engineering/DB_MIGRATION_POLICY.md)                 | ✅ Ops     | Canonical migration governance, tool-first generation, and branch-local scoping rule |

## Design

| Document                                                                                   | Status | Description                                                                    |
| ------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| [Authorization Guide](./design/AUTHORIZATION_GUIDE.md)                                     | 📐      | Proposed JSONB-based RBAC (current auth: `isSystemAdmin` + `StudioMembership`) |
| [Pending-Resolution MVP](./design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md) | ⏳      | Studio-scoped resolution for cancelled shows                                   |
| [Ad-hoc Task Ticketing](./design/AD_HOC_TASK_TICKETING.md)                                | 📐      | Planned template-less task creation using the existing `Task` model            |
| [Task Submission Reporting & Export](./design/TASK_SUBMISSION_REPORTING_DESIGN.md)        | 📐      | Planned studio-scoped submitted-task report definitions and batched query API  |
| Analytics Dashboard                                                                        | ⚠️ Removed | Superseded by Datastream + BigQuery planning in [Phase 4](../../../docs/roadmap/PHASE_4.md) |
| [Material Management](./design/MATERIAL_MANAGEMENT_DESIGN.md)                             | 🗓️      | Planned for Phase 4; not implemented in the current schema                     |
| [Data Warehouse](./design/DATA_WAREHOUSE_DESIGN.md)                                       | 🗓️      | Planned Datastream + BigQuery architecture for Phase 4                         |

## Roadmap

| Phase                           | Status | Focus                                           |
| ------------------------------- | ------ | ----------------------------------------------- |
| [Phase 1 Overall](../../../docs/roadmap/PHASE_1.md) | ✅      | Closed foundation phase |
| [Phase 2 Overall](../../../docs/roadmap/PHASE_2.md) | ✅      | Closed task-management foundation phase |
| [Phase 3 Overall](../../../docs/roadmap/PHASE_3.md) | ✅      | Closed summary after scope reset |
| [Phase 4 Overall](../../../docs/roadmap/PHASE_4.md) | ⏳      | P&L implementation on top of completed creator cutover baseline |
| [Phase 5 Overall](../../../docs/roadmap/PHASE_5.md) | 🗓️      | Deferred / parking lot features |

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
