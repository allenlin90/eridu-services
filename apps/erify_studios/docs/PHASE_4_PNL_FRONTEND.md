# Phase 4 P&L Frontend Index

> **Status**: Active
> **Phase scope**: Phase 4 P&L workstreams
> **Owner app**: `apps/erify_studios`

## Purpose

This file is the **phase-level frontend index** for Phase 4. Feature-specific frontend design now lives in `apps/erify_studios/docs/design/` on a per-feature basis instead of one omnibus Phase 4 design file.

## Shared Frontend Rules

- Keep route access in the shared `hasStudioRouteAccess` policy source; sidebar visibility and route guards must stay aligned.
- Keep query keys scoped by studio/show and organized by feature.
- Keep table filters and view state in the URL where the feature is list/report oriented.
- Version-guarded write paths must treat 409 as refetch + user-review flow.
- Do not reproduce finance formulas or compensation allocation logic in FE code.
- Loading, empty, and null-data states must be explicit for economics and reporting surfaces.

## Feature Design Index

| Feature | Status | Product source | Frontend design |
| --- | --- | --- | --- |
| Creator mapping + assignment | ✅ Shipped | [creator-mapping.md](../../../docs/features/creator-mapping.md) | No retained Phase 4 design doc; shipped feature |
| Sidebar redesign | 🔲 Planned | FE-only scope | [SIDEBAR_REDESIGN.md](./design/SIDEBAR_REDESIGN.md) |
| Show economics surfaces | 🔲 Planned | [show-economics.md](../../../docs/features/show-economics.md) | [SHOW_ECONOMICS_DESIGN.md](./design/SHOW_ECONOMICS_DESIGN.md) |
| Studio member roster | ✅ Shipped | [studio-member-roster.md](../../../docs/features/studio-member-roster.md) | No retained design doc; shipped in PR #28 |
| Studio creator roster | ✅ Implemented | [studio-creator-roster.md](../../../docs/features/studio-creator-roster.md) | [STUDIO_CREATOR_ROSTER.md](./STUDIO_CREATOR_ROSTER.md) |
| Compensation line items | 🔲 Planned | [compensation-line-items.md](../../../docs/prd/compensation-line-items.md) | [COMPENSATION_LINE_ITEMS_DESIGN.md](./design/COMPENSATION_LINE_ITEMS_DESIGN.md) |
| Show planning export | 🔲 Planned | [show-planning-export.md](../../../docs/prd/show-planning-export.md) | [SHOW_PLANNING_EXPORT_DESIGN.md](./design/SHOW_PLANNING_EXPORT_DESIGN.md) |
| Creator availability hardening | 🔲 Planned | [creator-availability-hardening.md](../../../docs/prd/creator-availability-hardening.md) | [CREATOR_AVAILABILITY_HARDENING_DESIGN.md](./design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) |
| P&L revenue workflow | 🔲 Blocked on decisions | [pnl-revenue-workflow.md](../../../docs/prd/pnl-revenue-workflow.md) | [PNL_REVENUE_WORKFLOW_DESIGN.md](./design/PNL_REVENUE_WORKFLOW_DESIGN.md) |

## Shared Query-Key Families

- `studio-members`
- `studio-creator-roster`
- `compensation-items`
- `planning-export`
- `economics`
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
