# Task Submission Reporting Frontend Reference

> **Status**: ✅ Implemented
> **Phase scope**: Phase 4
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/features/task-submission-reporting.md`](../../../docs/features/task-submission-reporting.md)
> **Depends on**: backend task-report APIs, shared fields/task template snapshot contracts

## Purpose

Technical reference for the shipped studio-scoped reporting UI, including the definitions landing page, builder flow, cached result viewer, client-side table filters, and CSV export.

## Route And Access

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/task-reports` | Definitions landing page | `ADMIN`, `MANAGER`, `MODERATION_MANAGER` |
| `/studios/$studioId/task-reports/builder` | Scope filters, source discovery, column selection, preflight, run | `ADMIN`, `MANAGER`, `MODERATION_MANAGER` |
| `/studios/$studioId/task-reports/results` | Cached result viewer, view filters, sort, export | `ADMIN`, `MANAGER`, `MODERATION_MANAGER` |

## Key Frontend Modules

- `src/routes/studios/$studioId/task-reports.tsx`
- `src/routes/studios/$studioId/task-reports/index.tsx`
- `src/routes/studios/$studioId/task-reports/builder.tsx`
- `src/routes/studios/$studioId/task-reports/results.tsx`
- `src/features/task-reports/components/task-report-definitions-viewer.tsx`
- `src/features/task-reports/components/report-builder.tsx`
- `src/features/task-reports/components/report-column-picker.tsx`
- `src/features/task-reports/components/report-result-table.tsx`
- `src/features/task-reports/api/*`
- `src/features/task-reports/lib/filter-rows.ts`
- `src/features/task-reports/lib/sort-rows.ts`
- `src/features/task-reports/lib/serialize-csv.ts`

## Data And Query Model

- definition CRUD, source discovery, preflight, and run all live under `src/features/task-reports/api/`
- query keys are centralized in `src/features/task-reports/api/keys.ts`
- report results are cached client-side using a scope/columns cache key built by `build-task-report-result-cache-key.ts`
- the result viewer reads cached run output instead of forcing a rerun when the same scope + column selection is reopened
- client-side filtering/sorting/export stays in `src/features/task-reports/lib/` so table operations remain framework-free and reusable

## UX Rules

- the landing route is definitions-first; builder/results are separate route responsibilities
- source discovery and run remain show-scope driven; users do not manually enumerate show IDs
- preflight is required before run and reflects the same reportable-task eligibility as the final run
- table view remains one row per show
- client-side view filters and sort affect only on-screen review; export uses the full cached dataset
- no server-side file generation or XLSX flow is part of the shipped slice
