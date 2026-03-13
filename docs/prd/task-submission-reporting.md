# PRD: Task Submission Reporting & Export

> **Status**: Draft
> **Phase**: 5 — Parking Lot / immediate post-Phase-4 follow-up candidate
> **Workstream**: Reporting, review, and manager visibility from submitted tasks
> **Depends on**: Phase 2 task-management foundation, [RBAC Roles](./rbac-roles.md), [Show Economics](./show-economics.md)

## Problem

Studio managers can review submitted tasks one-by-one, but they cannot reliably answer cross-show questions such as:

- *"What was the GMV, views, and performance output for all premium moderation tasks this week?"*
- *"Which premium shows already have post-production upload links ready for QC review?"*
- *"Can I export one clean spreadsheet for a client or date range without hand-copying from dozens of submitted tasks?"*

Today the data exists inside `Task.content`, but the system has no manager-facing reporting workflow that can:

1. read submitted task data across many shows,
2. respect the historical template snapshot used by each task,
3. join that data into a reviewable table,
4. cache the fetched dataset client-side for repeated analysis, and
5. export the result without creating server-side report files that nobody reuses.

## Users

- **Studio managers**: review submitted operational data across many shows and export it for internal follow-up
- **Moderation managers**: summarize moderation KPIs such as GMV, views, conversion, and live-performance metrics
- **Studio admins**: audit premium-show QC readiness using uploaded post-production URLs and other submitted evidence

## Requirements

### Submitted-task source fidelity

1. Managers can build a report from one or more task sources chosen by task template or by exact template snapshot version.
2. Historical data must always be read from the task snapshot that generated the task; current template schema is only a selection convenience, not the source of truth.
3. Template-based selections may span multiple snapshot versions, but the result must preserve version boundaries when schemas differ.
4. Default source scope is submitted/approved tasks only: `REVIEW`, `COMPLETED`, and `CLOSED`.

### Scope and filtering

1. Managers can filter by show date range, client, show, task type, template, snapshot version, assignee, and task status.
2. Report queries must be explicitly bounded by show scope (`show_uids`) or a date range; unbounded studio-wide exports are not allowed.
3. The query must support batched loading so managers can keep appending more rows to the same report workspace.

### Review workspace

1. The review surface is show-centric: one show row can display selected values sourced from one or more submitted tasks linked to that show.
2. Missing submissions must be visible as blank cells plus source-status metadata; the UI must not silently pretend missing data is zero.
3. Numeric columns support client-side summaries such as count, sum, and average.
4. File and URL fields render as clickable links for manager review and QC workflows.

### Saved report definitions

1. Managers can save a named report definition containing selected sources, selected columns, filters, and preferred export settings.
2. Saved definitions are persisted as JSON only; the backend must not store pre-generated CSV/XLSX files.
3. Saved definitions can be reopened and rerun later against fresh submitted tasks.

### Export behavior

1. CSV export is required for compatible result sets.
2. XLSX export should use the same normalized dataset and support multi-sheet output when multiple compatible groups are present.
3. Incompatible source groups must not be merged only because `task_type` or snapshot `version` numbers happen to match.
4. Exported rows include stable show/task metadata plus the selected submitted values.

## Acceptance Criteria

- [ ] A studio manager can select moderation-task columns such as `gmv`, `views`, and other performance metrics, filter by client and show date range, and review the results in one table.
- [ ] A premium-show reviewer can include post-production file/url fields in the same workspace and open those links directly from the review table.
- [ ] A saved report definition can be rerun later without regenerating any server-side file artifact.
- [ ] Batched queries can append more submitted-task rows into the same client-side workspace without discarding previously fetched data.
- [ ] When selected data comes from incompatible template snapshots, export splits the output into separate sheets/files instead of silently mixing schemas.
- [ ] Numeric columns show correct aggregate summaries in the review workspace.

## Product Decisions

- **Review is show-centric; export is snapshot-centric.** Managers want one operational table per show, but export integrity depends on preserving snapshot compatibility groups.
- **Do not group by `task_type + version` alone.** Snapshot version numbers are local to a template. Safe grouping must include template identity and snapshot compatibility.
- **Client-side dataset cache is intentional.** Persist fetched report batches in IndexedDB so repeated review/export does not require server-side materialized reports.
- **File fields export as references, not binaries.** CSV/XLSX output contains URL strings and related metadata only; it does not duplicate uploaded assets.
- **CSV is the baseline format.** XLSX uses the same normalized dataset and is expected as the next milestone, especially for multi-sheet export.

## Out of Scope

- Server-side materialized report storage or scheduled report generation
- Cross-studio reporting
- Arbitrary formula builders or BI-style pivot tables
- Binary attachment packaging inside exported files

## Design Reference

- Backend design: [TASK_SUBMISSION_REPORTING_DESIGN.md](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)
- Frontend design: [TASK_SUBMISSION_REPORTING_DESIGN.md](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)
