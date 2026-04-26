# PRD: Studio Economics Review (3.1)

> **Status: Visioning.** This document was drafted before [Phase 4 was simplified to a read-only viewer](./economics-cost-model.md). Treat as roadmap and future-feature reference, not a committed design — it will be redrafted when this workstream activates. Where this document conflicts with [`economics-cost-model.md`](./economics-cost-model.md), the cost model wins for Phase 4 scope.

> **Status**: 🔲 Planned
> **Phase**: 4 — Wave 3 (Finance Surfaces)
> **Workstream**: Operational view — perspective-based, date-ranged, manager-facing review/export engine. Owns the **Operational cost** view from [cost-model §8](./economics-cost-model.md#8-three-compensation-views).
> **Depends on**: 1.5 Studio Show Management ✅ (populates `Show.scheduleId` for the `schedule` perspective) · 2.1 Economics Cost Model 🔲 ([PRD](./economics-cost-model.md)) · 2.2 Compensation Line Items + Freeze + Actuals 🔲 · 2.3 Economics Service 🔲 (the engine 3.1 calls)
> **Canonical semantics**: [economics-cost-model.md](./economics-cost-model.md) — `cost_state`, horizon filtering, nullability propagation, `unresolved_reason`, actuals priority cascade, and the response shape. Acceptance criteria below refer to it as the authority.
> **Extended by**: 4.1 P&L Revenue Workflow (adds revenue, commission resolution, contribution margin, and future show-platform economics)

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

| Surface / Model                                                       | Current Behavior                                                              | Status         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------- |
| `GET /studios/:studioId/shows/:showId/economics`                      | Per-show cost breakdown (consumed for drill-in and assignment-side preview)   | 🔲 Built by 2.3 |
| `GET /studios/:studioId/economics`                                    | Grouped economics read (`show`, `schedule`, `client`)                         | 🔲 Built by 2.3 |
| Show creator assignments                                              | Current assignment workflow                                                   | ✅ Exists       |
| [Task Submission Reporting](../features/task-submission-reporting.md) | Builder/run/export workflow pattern for configurable manager reports          | ✅ Exists       |
| [Compensation Line Items](./compensation-line-items.md) (2.2)         | Line items + freeze + actuals + per-target compensation views                 | 🔲 Planned      |
| [Show Planning Export](./show-planning-export.md) (3.2)               | Future-horizon export preset over this engine                                 | 🔲 Planned      |
| [P&L Revenue Workflow](./pnl-revenue-workflow.md) (4.1)               | Revenue entry + contribution margin; future show-platform economics extension | 🔲 Planned      |

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

6. **Explicit projected vs actual semantics** (per [cost-model §1–§7](./economics-cost-model.md))
   - Future-horizon rows show **projected cost** computed live from the current state of assignments, rates, scheduled shifts, and applicable show-scoped line items.
   - Past-horizon rows show **actual cost** computed from frozen agreement applied to **approved** actuals:
     - member shift basis: `hourlyRate × actual block minutes` (cascade fallback to scheduled when no actuals; grace windows normalize near-on-schedule actuals to scheduled)
     - creator base cost: `agreedRate × actual show minutes` for HOURLY (cascade + grace), `agreedRate` for FIXED, base portion only for HYBRID until Wave 4
     - applicable show-scoped compensation line items (frozen agreement vs post-freeze adjustments surfaced separately)
   - Pre-approval actuals render with `actuals_approval_state = PENDING_APPROVAL` and the row stays `PARTIAL_ACTUAL`.
   - Unresolved cost (`COMMISSION` / `HYBRID` without revenue, or actuals not yet approved) renders as partial or unresolved — never silently converted to zero.

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

9. **Wave 4 extension path**
   - Revenue, contribution margin, and commission/hybrid resolution extend this same review workflow in 4.1.
   - 3.1 cost review must keep null and partial states explicit so the 4.1 revenue extension can layer on without redefining the route or export model.

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
- **Revenue is an extension, not a prerequisite for cost review.** Cost review ships first, while unresolved commission/hybrid paths remain explicit until 4.1 ships.

## API / Route Shape

### Backend

Primary manager-facing contract:

| Method   | Route                                                     | Description                                                                              | Access             |
| -------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------ |
| `GET`    | `/studios/:studioId/economics/catalog`                    | Return available perspectives, filters, selectable columns/measures, and preset metadata | `ADMIN`, `MANAGER` |
| `GET`    | `/studios/:studioId/economics/preflight`                  | Scope summary before generation                                                          | `ADMIN`, `MANAGER` |
| `POST`   | `/studios/:studioId/economics/run`                        | Generate inline economics result for the selected scope/perspective/columns              | `ADMIN`, `MANAGER` |
| `GET`    | `/studios/:studioId/economics-definitions`                | List saved economics definitions                                                         | `ADMIN`, `MANAGER` |
| `POST`   | `/studios/:studioId/economics-definitions`                | Create a saved economics definition                                                      | `ADMIN`, `MANAGER` |
| `PATCH`  | `/studios/:studioId/economics-definitions/:definitionUid` | Update a saved economics definition                                                      | `ADMIN`, `MANAGER` |
| `DELETE` | `/studios/:studioId/economics-definitions/:definitionUid` | Delete a saved economics definition                                                      | `ADMIN`, `MANAGER` |
| `GET`    | `/studios/:studioId/shows/:showId/economics`              | Per-show drill-in and assignment-side preview                                            | `ADMIN`, `MANAGER` |

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
- [ ] Revenue and contribution margin remain null or hidden until 4.1 (Wave 4) revenue workflow ships.
- [ ] Result rows expose `actuals_source` per [cost-model §4](./economics-cost-model.md#4-actuals-priority-cascade) and the available source values when applicable.

## Scale and scope considerations

The 90-day range cap is the v1 boundary. Performance work (caching, async result persistence, paginated rendering) is justified before the cap is widened or heavier perspectives are added. Preflight is required before any synchronous result generation that could exceed the 90-day default.

## Delivery Notes

### Sequence inside Phase 4

1. 2.1 Economics Cost Model — locks contract / freeze / cascade / views.
2. 2.2 Compensation Line Items + Freeze + Actuals — line-item data model + freeze guards + actuals fields + per-target compensation views.
3. 2.3 Economics Service — greenfield implementation of the per-show and grouped economics endpoints.
4. 3.1 (this PRD) — backend engine contract (catalog, preflight, run, saved definitions) plus the frontend builder/result workspace. Show-level drill-in stays a compact surface on the show detail page.
5. 3.2 Show Planning Export — locked preset / export-oriented view over this engine.
6. 4.1 P&L Revenue Workflow — extends this engine with revenue, commission resolution, contribution margin, and possible future show-platform economics.

## Design Reference

- 2.1 Cost Model: [`economics-cost-model.md`](./economics-cost-model.md)
- 2.2 Compensation Line Items: [`compensation-line-items.md`](./compensation-line-items.md)
- 2.3 Economics Service: [`SHOW_ECONOMICS_DESIGN.md`](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md)
- 3.1 Backend design: [`STUDIO_ECONOMICS_REVIEW_DESIGN.md`](../../apps/erify_api/docs/design/STUDIO_ECONOMICS_REVIEW_DESIGN.md)
- 3.1 Frontend design: [`STUDIO_ECONOMICS_REVIEW_DESIGN.md`](../../apps/erify_studios/docs/design/STUDIO_ECONOMICS_REVIEW_DESIGN.md)
- 3.2 Show Planning Export PRD: [`show-planning-export.md`](./show-planning-export.md)
- 4.1 P&L Revenue Workflow PRD: [`pnl-revenue-workflow.md`](./pnl-revenue-workflow.md)
- Task reporting feature reference: [`task-submission-reporting.md`](../features/task-submission-reporting.md)
- Phase 4 roadmap: [`PHASE_4.md`](../roadmap/PHASE_4.md)
