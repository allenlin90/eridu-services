# Ideation: Show Planning Export

> **Status**: Deferred from planning/reporting exploration
> **Origin**: Operations workflow ideation for Google Sheets replacement (2026-03-21)
> **Related**: [Task submission reporting PRD](../../docs/prd/task-submission-reporting.md), [Task reporting BE design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [Task reporting FE design](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [Business domain](../../docs/domain/BUSINESS.md), [Studio shift/show workflow notes](../../apps/erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md)

## What

Add a studio-scoped export/report workflow for **planned show records before execution starts**. The core use case is exporting a flat joined table where the database is the source of truth for show planning data, for example:

1. one row per show with show metadata, client, room, status, time window, and schedule context,
2. joined assignment context such as assigned MCs / show creators,
3. optional upstream planning fields that operations currently inspect in Google Sheets.

This is intentionally **upstream from task submission reporting**:

- **Show planning export** answers: "What is planned and who is assigned before the show starts?"
- **Task submission reporting** answers: "What was submitted/reviewed after execution has started or completed?"

## Why It Was Considered

- Operations already use Google Sheets as a lightweight planning and verification surface, but manual sync creates drift from the database.
- A joined export would let the team validate a simplified spreadsheet workflow without introducing a separate planning source of truth.
- The current show domain already exposes key relational data such as client and assigned MCs, so a first PoC can likely be delivered from existing normalized tables.
- The task reporting feature has already proven useful design patterns: scoped generation, flat table output, client-side export, saved definitions, and preflight before generating large result sets.

## Why It Was Deferred

1. **The lifecycle boundary is materially different from task reporting.** Upstream planning data is mutable until show start, while task submission reporting reads mostly historical, snapshot-backed records. Reusing the same product surface without redefining freshness and edit expectations would blur those boundaries.
2. **The row contract is not fully settled.** "Join show with assigned MCs" sounds simple, but one-to-many relations create hard output choices: repeat rows per MC, aggregate into a single cell, or keep one row per show with derived list columns. The wrong choice will make Sheets workflows awkward.
3. **The source set is broader than the initial example.** Once this exists, operations will likely ask for schedule, platform, creator-mapping, materials, readiness, and staffing fields. The first version needs a strict contract or it will become an open-ended ad hoc export builder.
4. **We should avoid coupling planning export to task-specific assumptions.** The current task report engine is built around submitted-task scope, immutable snapshots, and task-content column discovery. Those assumptions do not map directly to show planning data.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. **Operations commits to replacing or reducing a current Google Sheets planning workflow** with a DB-backed export as the source of truth.
2. **At least one stable planning export contract is agreed**, for example: one row per show with joined client + assigned-MC list, exported before the show date.
3. **The current task-report engine is ready to be modularized** into reusable scope/query/result-building layers without forcing task-specific concepts into show planning export.
4. **A pre-show operational workflow depends on repeatable joined-table exports** for planning review, assignment verification, or handoff.

## Implementation Notes (Preserved Context)

### Proposed product boundary

Treat this as a **planning export** or **show export** feature, not as an extension of task submission reporting semantics.

Recommended lifecycle boundary:

- primary scope: shows with `start_time >= now` or within a selected future planning range,
- allowed statuses: planned / upcoming / not-yet-started states,
- excluded by default: post-show review data that belongs to task reporting or downstream analytics.

This keeps the mental model clean:

- pre-show export = planning truth from normalized show relations,
- post-show export = execution/submission truth from tasks and snapshots.

### First PoC shape

For a low-risk PoC, keep the output contract narrow:

1. **One row per show**
2. **Fixed system columns first**
   - `show_id`
   - `show_name`
   - `client_name`
   - `show_status_name`
   - `show_standard_name`
   - `show_type_name`
   - `studio_room_name`
   - `start_time`
   - `end_time`
3. **Derived joined columns**
   - `assigned_mc_ids[]` or serialized export form
   - `assigned_mc_names[]` or serialized export form
   - optional `assigned_mc_summary` string for CSV/Sheets convenience
4. **Filters**
   - date range required
   - optional client, show status, show standard, show type, room
5. **Export**
   - single flat CSV first

This mirrors the practical Sheets need without prematurely building a generic relational export engine.

### Row-model concern: one-to-many joins

The most important product decision is how to flatten one-to-many relations such as assigned MCs.

Candidate contracts:

1. **One row per show, aggregate MCs into list/string columns**
   - best match for planning sheets where each show is the planning unit,
   - easiest to compare against existing show list views,
   - harder if users later need per-MC sorting/filtering in spreadsheets.
2. **One row per show-assignment pair**
   - better for assignment-level operations,
   - breaks the "planned record = show" mental model,
   - duplicates show columns heavily.
3. **Primary row per show plus optional exploded export mode**
   - most flexible,
   - probably too much surface area for the first version.

Default recommendation for a first PRD: **one row per show** with aggregated assignment columns, unless operations explicitly need assignment-level downstream processing.

### Database source-of-truth requirement

The feature should read from normalized database relations, not from uploaded spreadsheets or ad hoc cached exports.

Likely source groups:

- `Show`
- `Client`
- show-to-creator / MC assignment relation
- room / show standard / show type relations
- optional schedule linkage when planning context matters

If Google Sheets remains in the loop, it should be a **consumer/export target**, not the source.

### Reuse opportunity from task reporting

Some parts of the task-report feature are reusable in principle:

1. scope parsing and preflight pattern,
2. flat table response contract (`rows[]`, `columns[]`, export serializer),
3. FE builder/viewer split and cached-result workflow,
4. saved definition concept for recurring exports.

But these parts should be extracted only if the abstraction is truly domain-neutral. A reusable module should not assume:

- task submission statuses,
- task snapshot schemas,
- task-content column discovery,
- shared-field merge semantics tied to templates.

Practical modularization direction:

1. separate a generic **tabular export engine** from domain-specific data providers,
2. keep **show planning provider** and **task submission provider** as different source adapters,
3. share only flat-table primitives, filter parsing helpers, and export serialization.

If the extraction requires too much indirection or compromises current task-report clarity, ship show planning export as a parallel vertical slice first.

### Questions and conditions to settle before PRD

1. **Primary record grain**: show-level only, or optional exploded assignment rows?
2. **Allowed time boundary**: future-only, upcoming + in-progress, or configurable?
3. **Freshness expectation**: is this an on-demand export only, or should definitions/cache imply a reusable review workspace?
4. **Assignment semantics**: does "assigned MC" come only from current show-creator relations, or are there other staffing relations that operations also expect?
5. **Column scope**: fixed planning columns first, or builder-based selectable joins from day one?
6. **Ownership**: does this live beside task reports in `/task-reports`, or does it deserve a separate `/show-exports` or `/planning-exports` surface to preserve lifecycle clarity?

### Suggested promotion path

1. Deliver a narrow PoC: `shows + client + assigned MCs` export, one row per show, CSV only.
2. Validate with operations against the existing Google Sheets workflow.
3. Decide whether recurring definitions and view filters are actually needed for this upstream use case.
4. Only then evaluate whether task-report infrastructure should be split into a shared tabular-export foundation.
