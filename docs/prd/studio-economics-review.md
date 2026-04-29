# PRD: Studio Economics Review (3.1)

> **Status**: 🔲 Planned - required Phase 4 scope
> **Phase**: 4 - Wave 3 (Finance Surfaces)
> **Workstream**: Manager-facing read/review/export surface for the operational cost view produced by 2.3.
> **Depends on**: 1.5 Studio Show Management ✅ · 2.1 Economics Cost Model ✅ ([PRD](./economics-cost-model.md)) · 2.2 Compensation Line Items + Actuals 🔲 · 2.3 Economics Service 🔲
> **Canonical semantics**: [economics-cost-model.md](./economics-cost-model.md) owns calculation, null bubbling, actuals-source labels, and the read-only reference stance.

## Purpose

3.1 turns the 2.3 operational cost view into a usable studio finance surface. It does not redefine finance math and does not introduce a second backend calculation engine.

The user-facing goal is simple: ADMIN and MANAGER can choose a date range, review projected, actual-backed, or planned-fallback reference cost rows by an operational perspective, understand unresolved and provisional values, and export the visible result for offline review.

## Difference From 2.3 Economics Service

| Workstream                  | Owns                                                                                                                                                                                        | Does Not Own                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 2.3 Economics Service       | Backend pure calculator, data loading, `/me/` compensation reads, show-level economics read, operational `GET /studios/:studioId/economics?from=&to=` read, fixture-based calculator tests. | Manager workflow UX, saved report UX, client-side table review, export buttons.                        |
| 3.1 Studio Economics Review | Studio app route, query controls, perspective/filter UI, table presentation, unresolved-state explanation, cached result handling, CSV/JSON export from returned rows.                      | Monetary formulas, actuals priority resolution, null bubbling, settlement state, revenue/margin logic. |

If 3.1 needs a small catalog/preflight helper for UX, that helper must describe or validate 2.3's existing operational view. It must not fork or duplicate calculator semantics.

## Problem

After Wave 2, the backend can compute cost references, but managers still need a practical review surface:

- review upcoming projected cost before shows happen
- review past actual-backed reference cost after actuals are entered
- group or filter the same operational cost data by show, schedule, client, or platform dimension
- see why a row or total is unresolved instead of treating missing values as zero
- export the reviewed table without copying values by hand

Show-level assignment pages still need compact inline previews, but that is a separate lightweight use case. 3.1 is the broader date-ranged review surface.

## Users

| Role                 | Need                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Studio ADMIN         | Review cost references across the studio, inspect unresolved values, and export results for finance follow-up.                           |
| Studio MANAGER       | Monitor projected, actual-backed, and planned-fallback reference cost for their operational window without leaving the studio workspace. |
| Finance / Operations | Receive date-ranged CSV/JSON exports with stable fields and explicit unresolved values.                                                  |

## Existing Infrastructure

| Surface / Model                                  | Behavior                                                 | Status                 |
| ------------------------------------------------ | -------------------------------------------------------- | ---------------------- |
| `GET /studios/:studioId/economics?from=&to=`     | Operational cost view grouped by 2.3-supported grain(s). | Built by 2.3           |
| `GET /studios/:studioId/shows/:showId/economics` | Show-level preview/drill-in.                             | Built by 2.3           |
| `CompensationLineItem` and actual fields         | Cost inputs.                                             | Built by 2.2           |
| Task Submission Reporting                        | Existing builder/result/export UX reference.             | Shipped reference only |
| Show Planning Export                             | Locked future-horizon preset over this cost data.        | 3.2                    |

## Requirements

### In Scope

1. **Dedicated economics review route**
   - Frontend route: `/studios/$studioId/economics`.
   - Access: ADMIN and MANAGER.
   - The page reads from 2.3 operational economics endpoints.

2. **Required date range**
   - `from` and `to` are required.
   - Use quick presets such as `Next 7 days`, `Next 30 days`, `Previous 7 days`, and `Previous 30 days`.
   - Initial v1 range cap should align with planning export at 90 days unless 2.3 sets a stricter cap.

3. **Perspective and filters**
   - Support 2.3's Phase 4 operational perspectives: `show`, `schedule`, and `client`.
   - Platform is a filter and display dimension in Phase 4, not a first-class additive rollup unless 2.3 later defines allocation semantics.
   - Optional filters may include client, schedule, platform, show standard, show status, and room if 2.3 supports them.

4. **Backend-owned measures**
   - All monetary values come from the API as decimal strings.
   - FE must not recompute finance amounts locally.
   - Rows expose cost-model fields such as `cost`, `base_subtotal`, `line_item_subtotal`, `unresolved_reasons`, `calculation_warnings`, `actuals_source`, and `is_in_future`.

5. **Projected vs actual-backed labels**
   - The backend does not store a cost-state enum in Phase 4.
   - FE may label rows as projected when `is_in_future = true`.
   - FE may label resolved past rows with complete actuals as actual-backed reference values, but must not imply payment approval or final payroll.
   - Unresolved rows display `unresolved_reasons` and keep cost nullable.
   - Planned-fallback rows display warnings when actuals are missing or incomplete, so managers know the cost is currently calculated from planned values.

6. **Column visibility, not formula authoring**
   - Managers can choose or toggle visible/exported columns if the 2.3 response supports a stable catalog.
   - Hiding columns never changes totals.
   - No arbitrary formula builder or spreadsheet-like metric editor in Phase 4.

7. **Result review and export**
   - Result table supports client-side sort/filter over the returned dataset where practical.
   - Export at least CSV and JSON from the cached/latest result.
   - Export uses the same rows and columns the manager reviewed; no server-side export artifact is required in v1.

8. **Compact show-level preview remains separate**
   - Show detail / assignment surfaces may use `GET /studios/:studioId/shows/:showId/economics`.
   - The embedded card is not the full review workspace and should stay lightweight.

9. **Planning export remains a preset**
   - [Show Planning Export](./show-planning-export.md) uses this same operational cost data as a locked future-horizon export.
   - It should not become a competing finance workflow.

### Out of Scope

- New finance formulas or a second economics calculator.
- Saved economics report definitions in the first simplified 3.1 slice.
- Server-side report file storage, scheduled exports, or email delivery.
- Payment processing, settlement, acknowledgement, dispute, or approval workflow.
- Revenue, commission resolution, contribution margin, or P-side reporting.
- Historical budget snapshots and budget-vs-actual variance.
- Standalone, schedule-scoped, standing, global, recurring, HR, or payment-system compensation rows.
- Additive platform rollups before show-platform allocation semantics are defined.
- General ledger, payroll, or fixed-cost accounting.

## Product Decisions

- **3.1 is a consumer surface over 2.3.** The economics service is the source of truth for values and unresolved reasons.
- **Date-ranged table first.** Avoid dashboard-heavy visuals until the row semantics and export workflow are trusted.
- **One primary perspective per run.** A result is grouped by show, schedule, or client; other fields are filters or dimensions.
- **Task reporting is a UX pattern, not a domain dependency.** Reuse ideas such as cached results and CSV serialization, but do not import task snapshot concepts.
- **No saved definitions in the simplified required slice.** They can be added later if finance review becomes recurring enough to justify persistence.

## API / Route Shape

### Backend dependency

3.1 should prefer the 2.3 operational endpoint:

| Method | Route                                                 | Purpose                                        |
| ------ | ----------------------------------------------------- | ---------------------------------------------- |
| `GET`  | `/studios/:studioId/economics?from=&to=&perspective=` | Date-ranged operational cost rows.             |
| `GET`  | `/studios/:studioId/shows/:showId/economics`          | Show-level drill-in / assignment-side preview. |

If 3.1 adds helper endpoints such as catalog or preflight, they are UX helpers over this same service, not a separate calculation path.

### Frontend

| Route                          | Purpose                                                | Access         |
| ------------------------------ | ------------------------------------------------------ | -------------- |
| `/studios/$studioId/economics` | Date-ranged economics review table and export actions. | ADMIN, MANAGER |

## Acceptance Criteria

- [ ] ADMIN and MANAGER can open `/studios/$studioId/economics`.
- [ ] Date range is required and supports common past/future presets.
- [ ] The review route can request 2.3 operational rows for supported perspectives (`show`, `schedule`, `client`).
- [ ] Platform can be used as a filter or visible dimension when supplied by 2.3, but not as an additive rollup in Phase 4.
- [ ] Rows display backend-provided `cost`, `base_subtotal`, `line_item_subtotal`, `unresolved_reasons`, `calculation_warnings`, `actuals_source`, and `is_in_future` fields where available.
- [ ] Null `cost` values remain null in the UI and export; they are not coerced to zero.
- [ ] The UI explains unresolved rows using `unresolved_reasons`.
- [ ] The UI warns when costs are calculated from planned time because actuals are missing or incomplete.
- [ ] FE does not recompute monetary values locally.
- [ ] The latest result can be exported to CSV and JSON.
- [ ] Show detail / assignment surfaces can display a compact projected-cost preview without opening the full review route.
- [ ] Planning export is represented as a downstream locked preset over the same operational economics data.
- [ ] Revenue and contribution margin are absent or clearly future-target placeholders.

## Delivery Notes

1. 2.1 locks cost semantics.
2. 2.2 persists line items and actuals.
3. 2.3 implements the calculator and read endpoints.
4. 3.1 builds the review/export surface on those endpoints.
5. 3.2 ships the show planning export preset after 3.1 confirms the review/export shape.

## Design Reference

Pre-signoff design drafts were removed because they encoded stale cost-state, approval, freeze, grace, and saved-definition assumptions. Redraft 3.1 backend and frontend designs after the 2.3 read shape lands.

- 2.1 Cost Model: [economics-cost-model.md](./economics-cost-model.md)
- 2.2 Compensation Line Items: [compensation-line-items.md](./compensation-line-items.md)
- 2.3 Economics Service PRD: [economics-service.md](./economics-service.md)
- 3.2 Show Planning Export PRD: [show-planning-export.md](./show-planning-export.md)
- Task reporting feature reference: [task-submission-reporting.md](../features/task-submission-reporting.md)
- Phase 4 roadmap: [PHASE_4.md](../roadmap/PHASE_4.md)
