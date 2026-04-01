# PRD: Studio Economics Review

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: Studio finance workspace — date-ranged future projected and past actual cost review
> **Depends on**: Studio Show Management — 🔲 Active, Show Economics baseline merge — ⏸️ Deferred revision, Compensation Line Items — 🔲 Active
> **Extended by**: P&L Revenue Workflow — 🔲 Planned (adds revenue, commission resolution, contribution margin)

## Problem

Phase 4 already has the building blocks for L-side economics, but the studio-facing workflow is fragmented:

- the deferred economics baseline gives grouped and per-show cost reads, but not a clearly defined finance workspace for studio users
- show planning export covers future planning as a downloadable table, but it is not the primary review surface
- show detail / creator assignment flows do not explicitly require an inline economics preview while assignments are being managed
- post-show cost review is implied by economics endpoints and future revenue work, but the docs do not define how studio users review occurred costs across a date range

That leaves a product gap around the real finance questions:

- *"What is this studio expected to spend on upcoming shows this week?"*
- *"What did completed shows actually cost us last week?"*
- *"Can I review future projected cost and past actual cost from one route with the same filters?"*
- *"While I am assigning creators to a show, can I see the current projected cost without leaving the show workflow?"*

## Users

- **Studio ADMIN**: review projected cost before approving assignments, review occurred cost after execution, and inspect per-show breakdowns
- **Studio MANAGER**: operationally monitor projected cost for upcoming shows and actualized/partial cost for completed shows
- **Finance / Operations**: use the same date-ranged workspace for weekly/monthly cost review before exporting or reporting elsewhere

## Existing Infrastructure

| Surface / Model | Current Behavior | Status |
| --- | --- | --- |
| `GET /studios/:studioId/shows/:showId/economics` | Per-show variable cost breakdown | ✅ Exists on deferred merge branch |
| `GET /studios/:studioId/economics` | Grouped economics (`show`, `schedule`, `client`) | ✅ Exists on deferred merge branch |
| Show creator assignments | Current assignment workflow, but no explicit economics preview requirement | ✅ Exists |
| [Compensation Line Items](./compensation-line-items.md) | Adds show/schedule-scoped supplemental cost items | 🔲 Planned |
| [Show Planning Export](./show-planning-export.md) | Future-horizon export with estimated cost | 🔲 Planned |
| [P&L Revenue Workflow](./pnl-revenue-workflow.md) | Revenue entry + contribution margin | 🔲 Planned |

## Requirements

### In Scope

1. **Unified economics review route**
   - Studio users review economics from `/studios/$studioId/economics`.
   - Date range is required.
   - The route supports `horizon = future | past | all` so users can explicitly separate projected upcoming cost from occurred historical cost.
   - `group_by = show | schedule | client` remains supported.

2. **Explicit projected vs actual semantics**
   - Future-horizon rows show **projected cost** based on the current persisted state of assignments, rates, shifts, and applicable show-scoped line items.
   - Past-horizon rows show **actual cost** using the occurred cost basis that Phase 4 knows about today:
     - member shift basis: `calculatedCost ?? projectedCost`
     - creator base cost when resolvable from the current compensation model
     - applicable show-scoped compensation line items
   - When a completed show still has unresolved creator cost (`COMMISSION` / `HYBRID` without revenue), the row is shown as a partial or unresolved actual state rather than silently converted to zero.

3. **Show-level drill-in and assignment-side preview**
   - The show detail economics drill-in remains the per-show source of truth.
   - The show / creator-assignment workflow must expose a compact economics summary card so operators can review the current projection while managing assignments.
   - After assignment writes succeed, the economics preview refreshes from the backend. FE must not simulate formulas locally.

4. **Date-range workflow**
   - The main review route uses URL-backed date filters and preserves them across refresh/navigation.
   - Provide preset entry points such as `Next 7 days`, `Next 30 days`, `Previous 7 days`, `Previous 30 days`, while still allowing custom dates.
   - Initial v1 range cap should stay aligned with planning-export expectations and default to a 90-day max window unless later performance work justifies expansion.

5. **Row state clarity**
   - Each row exposes a cost state such as `PROJECTED`, `ACTUALIZED`, `PARTIAL_ACTUAL`, or `UNRESOLVED`.
   - The UI must explain why a row is partial or unresolved.
   - Grouped totals inherit the same nullability rules and must not coerce unknown values to zero.

6. **Planning export is downstream, not primary**
   - Show Planning Export remains useful for CSV/JSON handoff, but it is a downstream output of the future-horizon economics contract.
   - The interactive review route is the primary finance UX in-product.

7. **Wave 3 extension path**
   - Revenue, contribution margin, and commission/hybrid resolution extend this same review workflow in Wave 3.
   - Phase 4 cost review must therefore keep null and partial states explicit so the Wave 3 revenue extension can layer on without redefining the route.

### Out of Scope

- Immutable budget snapshots captured at assignment time
- Historical budget-vs-actual variance for the same show based on a frozen prior plan
- Fixed-cost accounting (rent, equipment, depreciation)
- Real-time what-if simulation before assignments are persisted
- Automatic allocation of standing/global compensation items into show totals
- General-ledger or payroll workflows

## Product Decisions

- **Phase 4 fills the workflow gap with horizon-based review, not frozen budget history**. "Planned" means the current projection from live data. "Actual" means the best occurred cost basis available after execution.
- **Do not imply historical variance where no snapshot exists**. If true budget-vs-actual is needed later, it requires a separate snapshot/audit design.
- **The interactive economics route comes before export-first surfaces**. Planning export is important, but it should reuse the review contract rather than define it.
- **Revenue is an extension, not a prerequisite for cost review**. Cost review ships first, while unresolved commission/hybrid paths remain explicit until Wave 3.

## API / Route Shape

### Backend

| Method | Route | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/studios/:studioId/economics` | Grouped economics review for a required date range and horizon | `ADMIN`, `MANAGER` |
| `GET` | `/studios/:studioId/shows/:showId/economics` | Per-show drill-in and assignment-side preview | `ADMIN`, `MANAGER` |

Grouped query params: `date_from`, `date_to`, `horizon`, `group_by`, optional `client_uid`, `status`, `standard`.

### Frontend

Primary route: `/studios/$studioId/economics`

Related embedded surface: compact economics card inside the show detail / creator-assignment workflow.

## Acceptance Criteria

- [ ] `ADMIN` and `MANAGER` can open `/studios/$studioId/economics` with a required date range and horizon filter.
- [ ] Future-horizon rows show projected cost for upcoming/in-flight shows using current persisted assignments and rates.
- [ ] Past-horizon rows show actualized or partial cost for completed/past shows using the occurred cost basis available in Phase 4.
- [ ] The route supports grouping by `show`, `schedule`, and `client`.
- [ ] Row-level state clearly distinguishes projected, actualized, partial, and unresolved cost conditions.
- [ ] Show detail / assignment surfaces display a current projected-cost summary and refresh after assignment mutations.
- [ ] Grouped totals preserve backend nullability and never silently coerce unresolved creator cost to zero.
- [ ] Planning export reuses the future-horizon cost contract rather than becoming the primary review surface.
- [ ] Revenue and contribution margin remain null or hidden until the Wave 3 revenue workflow ships.

## Delivery Notes

### Recommended Sequence Inside Phase 4

1. Finalize economics cost semantics in the Post-Wave 1 review (`R`).
2. Ship compensation line items so actualized past-show cost can include additive adjustments.
3. Merge the revised economics baseline to `master`.
4. Implement the studio economics review workspace and the assignment-side preview.
5. Implement show planning export on top of the stabilized future-horizon economics contract.
6. Extend the same workspace in Wave 3 with revenue, commission resolution, and contribution margin.

## Design Reference

- Backend design: `apps/erify_api/docs/design/STUDIO_ECONOMICS_REVIEW_DESIGN.md`
- Frontend design: `apps/erify_studios/docs/design/STUDIO_ECONOMICS_REVIEW_DESIGN.md`
- Economics baseline feature: `docs/features/show-economics.md`
- Compensation line items PRD: `docs/prd/compensation-line-items.md`
- Show planning export PRD: `docs/prd/show-planning-export.md`
- P&L revenue workflow PRD: `docs/prd/pnl-revenue-workflow.md`
