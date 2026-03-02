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

## Design

| Document                                                                                   | Status | Description                                                                    |
| ------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| [Authorization Guide](./design/AUTHORIZATION_GUIDE.md)                                     | 📐      | Proposed JSONB-based RBAC (current auth: `isSystemAdmin` + `StudioMembership`) |
| [Pending-Resolution MVP](./design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md) | ⏳      | Studio-scoped resolution for cancelled shows                                   |
| [Ad-hoc Task Ticketing](./design/AD_HOC_TASK_TICKETING.md)                                | 📐      | Template-less pre-production ticketing using Tasks                             |
| [Studio Shift Schedule](./design/STUDIO_SHIFT_SCHEDULE_DESIGN.md)                         | 📐      | Shift blocks, cost tracking, calendar/alignment                                |
| [File Upload (Cloudflare R2)](./design/FILE_UPLOAD_DESIGN.md)                              | 📐      | Presigned URL architecture for file uploads                                    |
| [Material Management](./design/MATERIAL_MANAGEMENT_DESIGN.md)                             | ⏳      | To be written (Phase 3 prerequisite)                                           |
| [Data Warehouse](./design/DATA_WAREHOUSE_DESIGN.md)                                       | ⏳      | Datastream + BigQuery — to be written (Phase 4)                                |

## Roadmap

| Phase                           | Status | Focus                                           |
| ------------------------------- | ------ | ----------------------------------------------- |
| [Phase 1](./roadmap/PHASE_1.md) | ✅      | Core entities, schedule planning, auth           |
| [Phase 2](./roadmap/PHASE_2.md) | ✅      | Task management system                           |
| [Phase 3](./roadmap/PHASE_3.md) | 🗓️      | Material management, shift schedules, file uploads |
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
