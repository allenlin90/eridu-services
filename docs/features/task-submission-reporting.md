# Feature: Task Submission Reporting & Export

> **Status**: ✅ Shipped — Phase 4 (reopened)
> **Workstream**: Task Management Reporting
> **Canonical docs**: [BE design](../../apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md), [FE canonical](../../apps/erify_studios/docs/TASK_SUBMISSION_REPORTING.md)

## Problem

Studio managers need to review and export submitted task data across many shows for KPI analysis and QC review without generating throwaway files in cloud storage.

## Users

| Role | Need |
| --- | --- |
| Studio Manager | Review moderation KPI rollups (GMV, views, performance metrics) across shows |
| Moderation Manager | QC review using post-production upload URLs from submitted tasks |
| Studio Admin | Export submitted task data for planning and operations |

## What Was Delivered

- Studio-scoped report builder: scope filtering (date range, client, show type/standard, templates) → source discovery → column selection → preflight → run → view/export
- Saved report definitions (studio-shared CRUD with creator/admin ownership)
- One-row-per-show deterministic merge with standard field cross-template merging
- Snapshot-driven data extraction preserving historical fidelity
- Client-side view filters (client, status, room, assignee) and CSV export
- 8 API endpoints: definition CRUD (5), sources, preflight, run

### Frontend Route Architecture

| Route | Purpose |
| --- | --- |
| `/studios/$studioId/task-reports` | Definitions landing page (list, create, load) |
| `/studios/$studioId/task-reports/builder` | Report builder (scope filters, column picker, preflight, run) |
| `/studios/$studioId/task-reports/results` | Result viewer (cached table, view filters, sort, CSV export) |

## Key Product Decisions

- **One row per show** — strictly enforced, no row expansion for multi-target tasks
- **Snapshots as runtime source of truth** — extraction always reads from task.snapshot.schema + task.content
- **Shared field metadata is immutable post-creation** — key, type, and category locked forever
- **Client-side materialization** — no server-side file generation; inline JSON response cached by frontend
- **10,000 show hard cap** per report run; 50 column hard cap
- **Studio-scoped definitions** — all authorized roles can view/run; only creator + ADMIN can edit/delete

## Acceptance Record

- [x] Source discovery endpoint returns template/snapshot field catalog for filtered scope
- [x] Saved report definitions persist JSON selections and scope filters
- [x] Run endpoint returns show-metadata + compatibility-grouped submitted-task rows
- [x] Report materialization on client with cached results for rerun/review
- [x] CSV export for compatible datasets
- [x] Role-based access: ADMIN, MANAGER, MODERATION_MANAGER
