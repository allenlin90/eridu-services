# Phase 4 P&L Backend Index

> **Status**: Active
> **Phase scope**: Phase 4 P&L workstreams
> **Owner app**: `apps/erify_api`

## Purpose

This file is the **phase-level backend index** for Phase 4. Feature-specific backend design now lives in `apps/erify_api/docs/design/` on a per-feature basis instead of one omnibus Phase 4 design file.

## Shared Backend Guardrails

- Keep financial arithmetic in dedicated economics domain services/calculators.
- Keep controllers transport-focused only: authz, DTO parsing, and response shaping.
- Use Zod schemas from `@eridu/api-types` as request/response source of truth.
- No DB internal IDs in public API responses; use UIDs only.
- `metadata` is descriptive context only, not executable compensation logic.
- `CompensationLineItem` records store flat outcomes, not rule definitions.
- `CompensationTarget` follows the `TaskTarget` polymorphic pattern with additive nullable FK columns for new target types.

## Feature Design Index

| Feature | Status | Product source | Backend design |
| --- | --- | --- | --- |
| Creator mapping + assignment | ✅ Shipped | [creator-mapping.md](../../../docs/features/creator-mapping.md) | No retained Phase 4 design doc; shipped feature |
| Show economics baseline | ⏸️ Deferred revision | [show-economics.md](../../../docs/features/show-economics.md) | [SHOW_ECONOMICS_DESIGN.md](./design/SHOW_ECONOMICS_DESIGN.md) |
| Studio member roster | ✅ Shipped | [studio-member-roster.md](../../../docs/features/studio-member-roster.md) | No retained design doc; shipped in PR #28 |
| Studio creator roster | ✅ Implemented | [studio-creator-roster.md](../../../docs/features/studio-creator-roster.md) | [STUDIO_CREATOR_ROSTER.md](./STUDIO_CREATOR_ROSTER.md) |
| Compensation line items | 🔲 Planned | [compensation-line-items.md](../../../docs/prd/compensation-line-items.md) | [COMPENSATION_LINE_ITEMS_DESIGN.md](./design/COMPENSATION_LINE_ITEMS_DESIGN.md) |
| Show planning export | 🔲 Planned | [show-planning-export.md](../../../docs/prd/show-planning-export.md) | [SHOW_PLANNING_EXPORT_DESIGN.md](./design/SHOW_PLANNING_EXPORT_DESIGN.md) |
| Creator availability hardening | 🔲 Planned | [creator-availability-hardening.md](../../../docs/prd/creator-availability-hardening.md) | [CREATOR_AVAILABILITY_HARDENING_DESIGN.md](./design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) |
| P&L revenue workflow | 🔲 Blocked on decisions | [pnl-revenue-workflow.md](../../../docs/prd/pnl-revenue-workflow.md) | [PNL_REVENUE_WORKFLOW_DESIGN.md](./design/PNL_REVENUE_WORKFLOW_DESIGN.md) |

## Shared Authorization Matrix

| Endpoint group | Required roles |
| --- | --- |
| Catalog / roster / availability reads | `[ADMIN, MANAGER, TALENT_MANAGER]` |
| Show creator list read | `[ADMIN, MANAGER, TALENT_MANAGER]` |
| Bulk assign / remove creators | `[ADMIN, MANAGER, TALENT_MANAGER]` |
| Economics reads | `[ADMIN, MANAGER]` |
| Studio member roster reads | `[ADMIN, MANAGER]` |
| Studio member roster writes | `[ADMIN]` |
| Studio creator roster writes | `[ADMIN]` |
| Compensation line item reads | `[ADMIN, MANAGER]` |
| Compensation line item writes | `[ADMIN]` |
| Member self-review compensation | `[ADMIN, self]` |
| Creator compensation summary | `[ADMIN, MANAGER, TALENT_MANAGER]` |
| Show planning export | `[ADMIN, MANAGER]` |

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
