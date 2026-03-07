# erify_api Documentation

> **TLDR**: NestJS REST API for live-commerce operations. Below is the documentation index organized by topic with implementation status.

**Status legend**: ✅ Implemented · 📐 Design Proposal · ⏳ In Progress · 🗓️ Planned

> Implemented/canonical docs are kept at `docs/` root. Design/proposal/in-progress docs are kept under `docs/design/`.

## Core

| Document                                            | Status | Description                                       |
| --------------------------------------------------- | ------ | ------------------------------------------------- |
| [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) | ✅      | Tech stack, module structure, controller scopes   |
| [Business Domain](./BUSINESS.md)                    | ✅      | Entity relationships, domain concepts, ER diagram |

## Features

| Document                                                                            | Status    | Description                                         |
| ----------------------------------------------------------------------------------- | --------- | --------------------------------------------------- |
| [Schedule Planning](./SCHEDULE_PLANNING.md)                                         | ✅ Phase 1 | JSON planning, snapshots, validation, publishing    |
| [Schedule Continuity](./SCHEDULE_CONTINUITY.md)                                     | ✅ Core    | Identity-preserving diff+upsert publish             |
| [Task Management Summary](./TASK_MANAGEMENT_SUMMARY.md)                             | ✅         | Task-as-Form architecture, API surface, workflows   |
| [File Upload (Cloudflare R2)](./FILE_UPLOAD.md)                                     | ✅ Phase 3 | Presigned URL flow, use-case limits, storage routing |

## Design

| Document                                                                                   | Status | Description                                                                    |
| ------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| [Authorization Guide](./design/AUTHORIZATION_GUIDE.md)                                     | 📐      | Proposed JSONB-based RBAC (current auth: `isSystemAdmin` + `StudioMembership`) |
| [Pending-Resolution MVP](./design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md) | ⏳      | Studio-scoped resolution for cancelled shows                                   |
| [Ad-hoc Task Ticketing](./design/AD_HOC_TASK_TICKETING.md)                                | 📐      | Template-less pre-production ticketing using Tasks                             |
| [Studio Shift Schedule](./design/STUDIO_SHIFT_SCHEDULE_DESIGN.md)                         | ✅ stub  | See [STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md](../erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md) |
| [Analytics Dashboard](./design/ANALYTICS_DASHBOARD.md)                                    | ⚠️ Superseded | Replaced by Datastream + BigQuery; see [Phase 4](./roadmap/PHASE_4.md)         |
| [Material Management](./design/MATERIAL_MANAGEMENT_DESIGN.md)                             | ⏳      | To be written (Phase 3 prerequisite)                                           |
| [Data Warehouse](./design/DATA_WAREHOUSE_DESIGN.md)                                       | ⏳      | Datastream + BigQuery — to be written (Phase 4)                                |

## Roadmap

| Phase                           | Status | Focus                                           |
| ------------------------------- | ------ | ----------------------------------------------- |
| [Phase 1](./roadmap/PHASE_1.md) | ✅      | Core entities, schedule planning, auth           |
| [Phase 2](./roadmap/PHASE_2.md) | ✅      | Task management system                           |
| [Phase 3](./roadmap/PHASE_3.md) | 🚧      | Ticketing system, shift schedules, file uploads (material management deferred to Phase 4) |
| [Phase 4](./roadmap/PHASE_4.md) | 🗓️      | Review quality, decision support, analytics (BigQuery) |
| [Phase 5](./roadmap/PHASE_5.md) | 🗓️      | Collaboration, notifications, enterprise scheduling |

## Quick Start

1. Read **[Architecture Overview](./ARCHITECTURE_OVERVIEW.md)** for system design
2. Read **[Business Domain](./BUSINESS.md)** for entity relationships
3. Check **Phase Roadmaps** to see what's implemented

## Related Packages

| Package                                            | Description                                       |
| -------------------------------------------------- | ------------------------------------------------- |
| [Auth SDK](../../../packages/auth-sdk/README.md)   | JWT/JWKS validation (`@eridu/auth-sdk`)           |
| [API Types](../../../packages/api-types/README.md) | Shared Zod schemas and types (`@eridu/api-types`) |

## Implementation Patterns

For code patterns, see `.agent/skills/` — the **canonical references** for how to write code in this codebase.
