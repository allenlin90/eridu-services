# PRD: Economics Service (2.3)

> **Status**: 🔲 Planned - required Phase 4 scope
> **Phase**: 4 - Wave 2 (Cost Foundation)
> **Workstream**: Backend pure calculator and read endpoints for creator, operator, show-level, and operational cost references.
> **Depends on**: 2.1 Economics Cost Model ([PRD](./economics-cost-model.md)) · 2.2 Compensation Line Items + Actuals ([PRD](./compensation-line-items.md)) · 1.5 Studio Show Management ✅
> **Canonical semantics**: [economics-cost-model.md](./economics-cost-model.md) owns calculation rules, null bubbling, actuals-source labels, read-only stance, and future-extension boundaries.

## Purpose

2.3 turns the Phase 4 cost model into working backend reads. It consumes the persisted inputs from 2.2, applies the pure cost calculator from 2.1, and exposes read-only reference endpoints used by creator/operator self-views, show detail previews, studio economics review, and show planning export.

2.3 is deliberately not a manager report builder. It is the service/API layer that produces trusted finance rows.

## Difference From Neighboring Workstreams

| Workstream                            | Owns                                                                                                                | Does Not Own                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 2.2 Compensation Line Items + Actuals | Supplemental line item CRUD, actual timestamp storage, snapshot override audit, `StudioShift.projectedCost` removal. | Aggregation, calculator semantics, generated base rows, `/me/compensation` read rows. |
| 2.3 Economics Service                 | Pure calculator, data loading for cost reads, read-only creator/operator/show/operational endpoints, fixture tests. | Line item CRUD, actuals entry UX, manager review/export UI, planning-export CSV. |
| 3.1 Studio Economics Review           | Date-ranged studio app review/export surface consuming 2.3 rows.                                                    | Finance formulas or alternate calculator.                                        |
| 3.2 Show Planning Export              | Locked future-horizon export consuming 2.3 show rows.                                                               | Finance formulas or assignment-level payroll export.                             |

## Users

| User                   | Need                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Studio creator         | Read their own actual-backed creator compensation reference and see pending events that cannot be counted yet.  |
| Studio member/operator | Read their own actual-backed operator/helper compensation reference and see pending events that cannot be counted yet. |
| Studio ADMIN           | Read any creator/member compensation reference and operational rollups.                                          |
| Studio MANAGER         | Read creator/member compensation references and operational rollups.                                             |
| TALENT_MANAGER         | Read creator compensation references for creators in the studio they manage.                                     |
| Studio frontend        | Fetch stable rows for show detail preview, 3.1 review, and 3.2 planning export without doing local finance math. |

## Inputs

2.3 reads current persisted state. It does not mutate cost inputs.

| Input                          | Source                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Creator agreement snapshots    | `ShowCreator.agreedRate`, `compensationType`, `commissionRate`.                     |
| Member/operator rate snapshots | `StudioShift.hourlyRate`.                                                           |
| Show planned time              | `Show.startTime`, `Show.endTime`.                                                   |
| Show actual time               | `Show.actualStartTime`, `Show.actualEndTime`.                                       |
| Shift planned blocks           | `StudioShiftBlock.startTime`, `StudioShiftBlock.endTime`.                           |
| Shift actual blocks            | `StudioShiftBlock.actualStartTime`, `StudioShiftBlock.actualEndTime`.               |
| Supplemental costs             | Active event-attached `CompensationLineItem` rows; these exclude generated base compensation. |
| Show grouping dimensions       | Show, schedule, client, platform, status, standard, room relations where available. |

2.3 must use snapshot fields. It must not recalculate historical assignments from mutable roster defaults.

## Requirements

### 1. Pure calculator

- Calculator takes loaded domain slices and returns deterministic read rows.
- No stored derived totals.
- No state machine or transitions.
- No writes from read endpoints.
- Controllers stay transport-only; financial arithmetic lives in economics services/calculators.

### 2. Monetary arithmetic

- Use `Prisma.Decimal` end-to-end for all aggregation.
- Serialize monetary values as strings at the API boundary.
- Never aggregate with JS `Number`.
- Never use `toFixed(2)` inside aggregation paths.

### 3. Compensation components

Resolve `ShowCreator.compensationType` into components:

| Type         | Phase 4 behavior                                                               |
| ------------ | ------------------------------------------------------------------------------ |
| `FIXED`      | Fixed amount from `agreedRate`; recipient self-views still require complete actuals before exposing/counting it. |
| `HOURLY`     | `agreedRate × duration`.                                                       |
| `COMMISSION` | `cost = null`, `unresolved_reasons` includes commission pending revenue.       |
| `HYBRID`     | Sum resolved components; total is null if any commission component is pending. |

Future revenue work resolves commission components without changing the public row shape.

If required snapshot fields are missing after 2.2 normalization, the row stays unresolved with `agreement_snapshot_missing`. 2.3 must not repair missing snapshots by reading mutable roster defaults live.

### 4. Actuals source resolution

- For show time, use `Show.actualStartTime` / `actualEndTime` only when both are present.
- If show actual timestamps are absent or incomplete, use `Show.startTime` / `endTime` when planned time exists and emit a calculation warning.
- If neither actual nor planned show duration can be resolved, return an unresolved row.
- For shift blocks, use block actuals only when both are present.
- If block actual timestamps are absent or incomplete, use block scheduled times when scheduled time exists and emit a calculation warning.
- If neither actual nor planned block duration can be resolved, return an unresolved row.
- Expose `actuals_source` so consumers can distinguish `OPERATOR_RECORD` from `PLANNED`, and expose calculation warnings when `PLANNED` is used because actuals are missing or incomplete.
- `/me/` recipient self-views must not expose monetary totals for events with missing or incomplete actuals, even when the compensation package is fixed. They should return enough event/status context for FE to show the row as pending and explain that actual inputs are not complete yet.
- Keep the enum extensible for future `PLATFORM`, `CREATOR_APP`, and `PUNCH_CLOCK` source categories. How platform data arrives is an implementation detail behind `PLATFORM`.

### 5. Line item composition

- Include active event-attached line items in admin/manager direct creator/operator compensation views when the attached show/shift event falls inside the requested date range. Recipient self-views only expose monetary impact once the row is countable under the actuals visibility rule.
- Include show/show-assignment-attached line items in show-level and operational show rows.
- Include shift/shift-block-attached line items in operator views and operational rollups using the same show-overlap allocation rule as shift labor where allocation is needed.
- Do not read or expect standing, schedule-scoped, global, recurring, HR, or payment-system line items in Phase 4.
- Preserve signed amounts; negative subtotals are allowed.
- Treat line items as supplemental add-ons/deductions only. The calculator may return generated base component rows for display, but it must not read or expect base compensation to be persisted as line items.

### 6. Null bubbling

- Row `cost` is null if any required component is unresolved.
- Rollup `cost` is null if any child cost is null.
- `base_subtotal` may be nullable.
- `line_item_subtotal` is non-null, includes supplemental line items only, and returns `"0"` when no line items apply.
- `unresolved_reasons` carries explicit reason strings; consumers must not infer missing money from `0`.
- `calculation_warnings` carries provisional-value warnings; consumers must surface these when planned values are used because actuals are missing or incomplete.
- Recipient self-view rows with missing or incomplete actuals should behave like pending rows, not provisional-money rows: monetary totals are null/hidden and the event remains visible for follow-up.
- Recipient self-view summaries must be countable-only: totals include complete-actuals resolved rows only, and pending event counts/rows are reported separately.

### 7. Read endpoints

All routes are read-only and require a date range except show drill-in.

| Method | Route                                                           | Purpose                                                | Access                         |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------ |
| `GET`  | `/me/compensation/creator?studioId&from&to`                     | Current user's actual-backed creator compensation plus pending events. | Authenticated self             |
| `GET`  | `/me/compensation/operator?studioId&from&to`                    | Current user's actual-backed operator/member compensation plus pending events. | Authenticated self             |
| `GET`  | `/studios/:studioId/creators/:creatorId/compensation?from&to`   | Cross-user creator compensation reference.             | ADMIN, MANAGER, TALENT_MANAGER |
| `GET`  | `/studios/:studioId/members/:membershipId/compensation?from&to` | Cross-user operator/member compensation reference.     | ADMIN, MANAGER                 |
| `GET`  | `/studios/:studioId/shows/:showId/economics`                    | Show-level cost reference and drill-in source.         | ADMIN, MANAGER                 |
| `GET`  | `/studios/:studioId/economics?from&to&perspective=`             | Operational rollup rows for 3.1 and 3.2 consumers.     | ADMIN, MANAGER                 |

Self routes live under the existing `/me/` module and derive identity from auth context. Cross-user reads use studio-scoped routes and role guards.

### 8. Operational perspectives and filters

The operational endpoint must support:

- `perspective=show`
- `perspective=schedule`
- `perspective=client`

Optional filters may include client, schedule, platform, show status, show standard, and room if the data is available.

Platform is a filter/display dimension in Phase 4, not an additive rollup perspective unless future allocation semantics are defined.

### 9. Response shape

Admin/manager rows should follow the cost-model shape:

```json
{
  "row_id": "show_abc123",
  "row_type": "show",
  "cost": "1650.00",
  "base_subtotal": "1500.00",
  "line_item_subtotal": "150.00",
  "unresolved_reasons": [],
  "calculation_warnings": ["show:show_abc123:actuals_missing_using_planned"],
  "actuals_source": "PLANNED",
  "is_in_future": true
}
```

Grouped rows may include counts and labels such as `show_count`, `creator_count`, `client_name`, `schedule_name`, or `platform_names`. The technical design owns the exact DTO names, but it must preserve the cost-model nullability and decimal-string contract.

Recipient self-view rows with missing or incomplete actuals should not return a monetary total, whether the admin/manager equivalent would use planned fallback or fixed compensation. They should be represented as pending/unavailable for compensation counting until actuals are complete; exact field names are left to technical design.

If a recipient self endpoint returns summary totals, those totals must include only countable complete-actuals resolved rows. Pending rows, including fixed compensation and supplemental line items, are excluded from recipient monetary totals until the row becomes countable. The response should still make pending events discoverable so the recipient can report missing actual inputs to a line manager.

## Out of Scope

- Line item CRUD and actuals write routes - 2.2.
- Actuals approval, settlement, freeze, reopen, grace windows, or payment locks.
- Dedicated audit log table.
- Standalone, schedule-scoped, standing, global, recurring, HR, or payment-system compensation rows.
- Manager-facing review/export workspace - 3.1.
- Planning export CSV/JSON endpoint - 3.2.
- Saved report definitions, column builders, report file storage, or scheduled exports.
- Revenue input, commission resolution, contribution margin - future target.
- General ledger, payroll, bank reconciliation, acknowledgement, or dispute workflows.

## Product Decisions

- **2.3 is the finance source for Phase 4 consumers.** FE surfaces do not recompute monetary amounts.
- **One calculator, multiple reads.** Self views, show drill-in, operational rollups, 3.1, and 3.2 all consume the same calculation path.
- **Recipient self-views require complete actuals.** The service may calculate planned fallback for admin/manager surfaces, but `/me/` compensation endpoints expose rows with missing or incomplete actuals as pending instead of monetary amounts.
- **Recipient totals are countable-only.** `/me/` totals include complete-actuals resolved rows only and surface pending event counts separately.
- **No workflow state.** Phase 4 uses live persisted inputs; no settlement, approval, cost-state persistence, or stored totals.
- **Base and supplemental costs stay separate.** `base_subtotal` comes from `ShowCreator` / `StudioShift` snapshots; `line_item_subtotal` comes from persisted event-attached supplemental line items.
- **Explicit nulls beat false precision.** Unknown commission/revenue components keep cost nullable and surface `unresolved_reasons`.
- **Operational service is not a report builder.** 3.1 can add UX helpers, but 2.3 owns the stable read semantics.

## Acceptance Criteria

- [ ] Calculator composes creator base, operator shift labor, and line-item subtotals from persisted 2.2 inputs.
- [ ] Calculator uses assignment/member snapshot fields and does not read mutable roster defaults for existing assignments.
- [ ] Missing assignment snapshot fields return unresolved rows with `agreement_snapshot_missing`; they are not backfilled inside read endpoints.
- [ ] Monetary aggregation uses `Prisma.Decimal` and serializes decimal strings.
- [ ] Show and shift durations use actual timestamps only when both actual endpoints are present; admin/manager surfaces may fall back to planned timestamps when actuals are absent or incomplete and planned time exists.
- [ ] Rows expose `actuals_source`.
- [ ] Rows expose calculation warnings when planned fallback is used because actuals are missing or incomplete.
- [ ] `/me/compensation/creator` and `/me/compensation/operator` do not expose monetary totals for rows with missing or incomplete actuals, including fixed-compensation rows; they expose pending event status for recipient follow-up instead.
- [ ] `/me/compensation/creator` and `/me/compensation/operator` summary totals include only complete-actuals resolved rows and expose pending counts/rows separately.
- [ ] `COMMISSION` and unresolved `HYBRID` commission components keep `cost` null and add `unresolved_reasons`.
- [ ] Rollups preserve null bubbling and never coerce unknown costs to zero.
- [ ] Event-attached line items are included in direct creator/operator compensation views through their attached show/shift event date when the row is countable; recipient self-views still hide row amounts and exclude those line items from totals while actuals are pending.
- [ ] Show/show-assignment-attached line items are included in show-level and operational show rows.
- [ ] Shift/shift-block-attached line items follow the same show-overlap allocation rule as shift labor where operational allocation is needed.
- [ ] Standing, schedule-scoped, global, recurring, HR, or payment-system line items are not introduced or consumed in Phase 4.
- [ ] `base_subtotal` is calculated from assignment/shift snapshots and never from generated `CompensationLineItem` records.
- [ ] `line_item_subtotal` includes persisted supplemental line items only.
- [ ] `/me/compensation/creator` and `/me/compensation/operator` derive identity from the existing `/me/` auth context.
- [ ] Cross-user creator/member compensation routes enforce studio role access and use UIDs externally.
- [ ] `GET /studios/:studioId/shows/:showId/economics` returns a show-level cost reference suitable for show detail preview and planning export.
- [ ] `GET /studios/:studioId/economics` supports `show`, `schedule`, and `client` perspectives.
- [ ] Platform is supported only as a filter/display dimension in Phase 4.
- [ ] Fixture-based tests cover fixed, hourly, commission-pending, hybrid-pending, line-item subtotal, null bubbling, planned-vs-operator actual source, missing/incomplete actual warnings, recipient pending/countable-only totals, soft-deleted exclusion, and role/self-access cases.

## Design Reference

Pre-signoff design drafts were removed because they encoded stale cost-state, approval, freeze, and grace assumptions. Redraft backend and frontend implementation designs from this PRD when 2.3 starts. Wave 3 PRDs are consumer context only; revise them when Wave 3 starts, not as part of the 2.3 scope.

- 2.1 Economics Cost Model: [economics-cost-model.md](./economics-cost-model.md)
- 2.2 Compensation Line Items + Actuals: [compensation-line-items.md](./compensation-line-items.md)
- Architecture Guardrails: [PHASE_4.md#architecture-guardrails](../roadmap/PHASE_4.md#architecture-guardrails)
