# PRD: Studio Economics Review

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: Studio finance review/export engine — perspective-based projected and actual cost review
> **Depends on**: Studio Show Management — ✅ **Complete** (shipped 1e, populates `Show.scheduleId` for the `schedule` perspective), Show Economics baseline merge — ⏸️ Deferred revision, Compensation Line Items — 🔲 Active
> **Extended by**: P&L Revenue Workflow — 🔲 Planned (adds revenue, commission resolution, contribution margin, and future show-platform economics)

## Problem

Phase 4 already has the core L-side cost records, but the studio-facing workflow is still underspecified:

- the backend economics records and grouped reads are relatively clear, but the product does not yet define a manager workflow for configuring, reviewing, and exporting economics views
- the current docs still read like one fixed grouped table, which is too narrow for real finance questions
- managers need to review the same cost data from different perspectives depending on the task:
  - by show for assignment and execution review
  - by schedule for weekly planning
  - by client for account-level reporting
  - by platform-aware slices when filtering/exporting operational data
- show planning export is one downstream output, but it should not be the only way to get structured economics tables out of the product
- show detail / creator assignment flows still need a compact inline preview, which is a different UX from a manager-facing review/export workspace

That leaves a product gap around the real operational questions:

- *"What are we projected to spend next week by schedule?"*
- *"What did completed shows actually cost last month by client?"*
- *"Can I choose which economics columns and cost components I want to review before exporting?"*
- *"Can the finance workspace work like task reports instead of a hard-coded table?"*
- *"While I am assigning creators to a show, can I still see a lightweight projected-cost preview without opening the full report builder?"*

## Users

- **Studio ADMIN**: review projected cost before approving assignments, review occurred cost after execution, and export finance views for downstream use
- **Studio MANAGER**: monitor projected and actualized cost across shows/schedules/clients without leaving the studio workspace
- **Finance / Operations**: build repeatable date-ranged economics views, save definitions, and export the exact columns needed for weekly/monthly review

## Existing Infrastructure

| Surface / Model | Current Behavior | Status |
| --- | --- | --- |
| `GET /studios/:studioId/shows/:showId/economics` | Per-show variable cost breakdown | ✅ Exists on deferred merge branch |
| `GET /studios/:studioId/economics` | Grouped economics prototype (`show`, `schedule`, `client`) | ✅ Exists on deferred merge branch |
| Show creator assignments | Current assignment workflow, but no explicit economics preview requirement | ✅ Exists |
| [Task Submission Reporting](../features/task-submission-reporting.md) | Implemented builder/run/export workflow pattern for configurable manager reports | ✅ Exists |
| [Compensation Line Items](./compensation-line-items.md) | Adds show/schedule-scoped supplemental cost items | 🔲 Planned |
| [Show Planning Export](./show-planning-export.md) | Future-horizon export with estimated cost | 🔲 Planned |
| [P&L Revenue Workflow](./pnl-revenue-workflow.md) | Revenue entry + contribution margin; future show-platform economics extension | 🔲 Planned |

## Requirements

### In Scope

1. **Economics review is a configurable engine, not one fixed grouped table**
   - Studio users review economics from a dedicated workspace under `/studios/$studioId/economics`.
   - The primary UX follows the same high-level pattern as task reporting: configure scope, choose perspective, choose included columns/measures, preflight, run, review, export.
   - The workspace must support both ad hoc runs and repeatable saved definitions because finance review is a recurring operational activity, not a one-off query.

2. **Split manager workflow from show-level preview**
   - The manager-facing economics workspace is the place for broad review/export across many shows.
   - Show detail / creator-assignment screens continue to use a compact embedded economics card for immediate projected-cost feedback.
   - The embedded card is not the builder/result surface and should stay intentionally lightweight.

3. **Required scope controls**
   - Date range is required.
   - The route supports `horizon = future | past | all` so users can explicitly separate projected upcoming cost from occurred historical cost.
   - Preset entry points such as `Next 7 days`, `Next 30 days`, `Previous 7 days`, and `Previous 30 days` are required.
   - Initial v1 range cap should stay aligned with planning-export expectations and default to a 90-day max window unless later performance work justifies expansion.
   - Optional server-side filters may include `client`, `schedule`, `platform`, `show standard`, `show status`, and `room`.

4. **Perspective-driven review**
   - Each run chooses one primary perspective / row grain.
   - Phase 4 core must support additive rollup perspectives:
     - `show`
     - `schedule`
     - `client`
   - `platform` must be supported as a filter and visible dimension in Phase 4 core.
   - The engine contract must remain extensible so `platform` can become a first-class row grain later without redesigning the FE workflow.

5. **Selectable included items (columns/measures), not local formula authoring**
   - Managers choose which columns/measures to include in the review/export result.
   - The catalog should include:
     - identity columns for the selected perspective
     - supporting dimensions such as date, status, standard, room, and platform names
     - economics measures such as `projected_total_cost`, `actual_total_cost`, `primary_total_cost`, `cost_state`, `unresolved_reason`
     - component breakdowns such as creator base cost, shift labor cost, and compensation line item cost
     - operational counts such as `show_count` where relevant
   - Column selection changes what is shown/exported, but it must not silently redefine the underlying finance math.
   - Phase 4 does **not** include an arbitrary formula builder or spreadsheet-style derived metrics engine.

6. **Explicit projected vs actual semantics**
   - Future-horizon rows show **projected cost** based on the current persisted state of assignments, rates, shifts, and applicable show-scoped line items.
   - Past-horizon rows show **actual cost** using the occurred cost basis that Phase 4 knows about today:
     - member shift basis: `calculatedCost ?? projectedCost`
     - creator base cost when resolvable from the current compensation model
     - applicable show-scoped compensation line items
   - When a completed show still has unresolved creator cost (`COMMISSION` / `HYBRID` without revenue), the row is shown as a partial or unresolved actual state rather than silently converted to zero.

7. **Result workflow and export**
   - The workspace must support a preflight step before generation so managers understand scope size and unresolved-cost risk before running the result.
   - Result generation may stay synchronous for MVP if the response remains fast enough.
   - FE caches the most recent results so managers can switch back to previous views without immediate re-runs.
   - Export is client-side from the cached result in at least `CSV` and `JSON`.
   - [Show Planning Export](./show-planning-export.md) becomes a downstream preset / locked view over this same engine rather than a separate primary finance workflow.

8. **Row state clarity**
   - Each row exposes a cost state such as `PROJECTED`, `ACTUALIZED`, `PARTIAL_ACTUAL`, or `UNRESOLVED`.
   - The UI must explain why a row is partial or unresolved.
   - Grouped totals inherit the same nullability rules and must not coerce unknown values to zero.

9. **Wave 3 extension path**
   - Revenue, contribution margin, and commission/hybrid resolution extend this same review workflow in Wave 3.
   - Phase 4 cost review must therefore keep null and partial states explicit so the Wave 3 revenue extension can layer on without redefining the route or export model.

### Out of Scope

- Immutable budget snapshots captured at assignment time
- Historical budget-vs-actual variance for the same show based on a frozen prior plan
- Fixed-cost accounting (rent, equipment, depreciation)
- Real-time what-if simulation before assignments are persisted
- Automatic allocation of standing/global compensation items into show totals
- Arbitrary user-authored formulas or pivot-table logic
- Server-side export file storage/jobs for Phase 4 MVP
- Additive platform cost allocation across multi-platform shows before show-platform economics are formally defined
- General-ledger or payroll workflows

## Product Decisions

- **Phase 4 ships a manager-facing economics review/export engine, not a single hard-coded grouped screen.**
- **One primary row grain per run; everything else is an included column or filter.** This keeps the UX flexible without turning Phase 4 into a BI tool.
- **Platform is filter/dimension first, not a default additive rollup in Phase 4 core.** Full-show cost cannot be rolled up across multi-platform relationships without explicit allocation semantics.
- **Column selection does not redefine core totals.** Stable totals come from backend cost semantics; choosing fewer columns only changes what is displayed/exported.
- **Planning export is a preset over the same engine.** It should not define a second parallel economics workflow.
- **Revenue is an extension, not a prerequisite for cost review.** Cost review ships first, while unresolved commission/hybrid paths remain explicit until Wave 3.

## API / Route Shape

### Backend

Primary manager-facing contract:

| Method | Route | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/studios/:studioId/economics/catalog` | Return available perspectives, filters, selectable columns/measures, and preset metadata | `ADMIN`, `MANAGER` |
| `GET` | `/studios/:studioId/economics/preflight` | Scope summary before generation | `ADMIN`, `MANAGER` |
| `POST` | `/studios/:studioId/economics/run` | Generate inline economics result for the selected scope/perspective/columns | `ADMIN`, `MANAGER` |
| `GET` | `/studios/:studioId/economics-definitions` | List saved economics definitions | `ADMIN`, `MANAGER` |
| `POST` | `/studios/:studioId/economics-definitions` | Create a saved economics definition | `ADMIN`, `MANAGER` |
| `PATCH` | `/studios/:studioId/economics-definitions/:definitionUid` | Update a saved economics definition | `ADMIN`, `MANAGER` |
| `DELETE` | `/studios/:studioId/economics-definitions/:definitionUid` | Delete a saved economics definition | `ADMIN`, `MANAGER` |
| `GET` | `/studios/:studioId/shows/:showId/economics` | Per-show drill-in and assignment-side preview | `ADMIN`, `MANAGER` |

Existing `GET /studios/:studioId/economics` may remain as a low-level grouped read / compatibility layer, but it is no longer sufficient as the primary FE workflow contract.

### Frontend

- Landing / definitions route: `/studios/$studioId/economics`
- Builder / run workspace: `/studios/$studioId/economics/builder`
- Related embedded surface: compact economics card inside the show detail / creator-assignment workflow

## Acceptance Criteria

- [ ] `ADMIN` and `MANAGER` can open the economics workspace, choose a required date range and horizon, and run a review result.
- [ ] The workspace supports additive perspectives `show`, `schedule`, and `client`.
- [ ] Platform can be applied as a server-side filter and visible result dimension in Phase 4 core.
- [ ] Managers can choose included columns/measures before running the result.
- [ ] Future-horizon rows show projected cost for upcoming/in-flight shows using current persisted assignments and rates.
- [ ] Past-horizon rows show actualized or partial cost for completed/past shows using the occurred cost basis available in Phase 4.
- [ ] The route supports a preflight step that summarizes row/show counts and unresolved-cost warnings before generation.
- [ ] FE exports the generated result to CSV/JSON from the cached dataset.
- [ ] Saved definitions can be created, reopened, and re-run without rebuilding the configuration from scratch.
- [ ] Show detail / assignment surfaces display a current projected-cost summary and refresh after assignment mutations.
- [ ] Grouped totals preserve backend nullability and never silently coerce unresolved creator cost to zero.
- [ ] Planning export reuses this same economics engine instead of becoming the primary finance surface.
- [ ] Revenue and contribution margin remain null or hidden until the Wave 3 revenue workflow ships.

## Delivery Notes

### Recommended Sequence Inside Phase 4

1. Finalize economics cost semantics in the Post-Wave 1 review (`R`).
2. Ship compensation line items so actualized past-show cost can include additive adjustments.
3. Merge the revised economics baseline to `master`.
4. Implement the backend economics engine contract: catalog, preflight, run, and saved-definition persistence over the shared economics domain.
5. Implement the frontend builder/result workflow and keep the show-level preview as a separate compact surface.
6. Layer show planning export on top of the same engine as a locked preset / export-oriented view.
7. Extend the same engine in Wave 3 with revenue, commission resolution, contribution margin, and possible future show-platform economics once allocation semantics are explicit.

## Design Reference

- Backend design: `apps/erify_api/docs/design/STUDIO_ECONOMICS_REVIEW_DESIGN.md`
- Frontend design: `apps/erify_studios/docs/design/STUDIO_ECONOMICS_REVIEW_DESIGN.md`
- Economics baseline archived reference: `docs/features/show-economics.md`
- Task reporting feature reference: `docs/features/task-submission-reporting.md`
- Compensation line items PRD: `docs/prd/compensation-line-items.md`
- Show planning export PRD: `docs/prd/show-planning-export.md`
- P&L revenue workflow PRD: `docs/prd/pnl-revenue-workflow.md`
