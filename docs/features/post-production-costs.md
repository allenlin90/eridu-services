# Feature: Costs Dashboard

> **Status**: ✅ Shipped — Phase 4 PR 19
> **Route**: `/studios/:studioId/costs`
> **Roles**: Studio `ADMIN` and `MANAGER`
> **Canonical semantics**: [Economics Cost Model](../domain/economics-cost-model.md)

## Problem

Studio managers need one operational view of creator payouts and shift labor costs. The underlying assignment snapshots, compensation line items, shift blocks, and actual timestamps already exist, but inspecting those records separately does not answer how much a studio's shows and shifts cost over an operational date range.

## Users

| Role | Need |
| --- | --- |
| Studio Admin | Review show and shift cost composition, unresolved records, and provisional values. |
| Studio Manager | Monitor operational costs and open the source show or shift when a row needs correction. |
| Talent Manager / Member | No dashboard access; recipient-facing compensation remains on role-specific surfaces. |

## What Was Delivered

### Dashboard

The Costs entry appears under the studio **Analytics** navigation group beside Performance. The dashboard provides:

- an operational date-range picker with a seven-day default unless the studio metadata defines another dashboard range;
- total, show, and shift cost summary cards with unresolved counts;
- a lazily loaded daily stacked cost trend;
- server-paginated Show Payouts and Shift Labor tables;
- URL-synchronized filters, pagination, sorting, and active tab;
- source-record drill-ins from cost rows;
- lazy detail queries so only the active table tab fetches rows.

### API surface

All endpoints are studio-scoped and protected for `ADMIN` and `MANAGER`:

| Endpoint | Purpose |
| --- | --- |
| `GET /studios/:studioId/costs/summary` | Return cost totals, unresolved counts, currency/locale, and operational-day trend points. |
| `GET /studios/:studioId/costs/shows` | Return paginated show cost rows with creator and line-item breakdowns. |
| `GET /studios/:studioId/costs/shifts` | Return paginated shift cost rows with block and line-item breakdowns. |

The shared request and response contracts live in [`@eridu/api-types/costs`](../../packages/api-types/src/costs/costs.schema.ts). External identifiers are UIDs and monetary values are decimal strings.

### Cost semantics

- A show's base cost uses snapshotted `ShowCreator` agreement terms. Creator show pay is not multiplied by show duration.
- Show and assignment compensation line items are added to the show subtotal.
- `COMMISSION` and the commission portion of `HYBRID` remain unresolved until the future revenue workflow defines the applicable revenue input.
- Shift labor uses `StudioShift.hourlyRate × block duration` plus shift/block compensation line items.
- Complete actual timestamps determine shift-block duration. Manager operational views may use planned fallback when actuals are missing or incomplete, with explicit calculation warnings.
- Missing agreement data or unusable planned/actual times produce nullable cost rows with explicit unresolved reasons; missing values are never converted to zero.
- Summary totals include resolved rows. Trend points use the same operational-day assignment as their subtotals so the trend reconciles with the summary.

## Key Product Decisions

- This is a live operational reference view, not a settlement ledger. Costs are derived from current snapshots, actuals, and active line items.
- Contribution margin and financial revenue semantics remain outside this feature.
- Planned fallback is visible only on manager operational surfaces and is always labeled as provisional.
- Recipient self-views keep stricter actual-backed monetary visibility and do not inherit this dashboard's planned fallback.
- Performance and Costs share the Analytics navigation group but retain separate operational and financial semantics.

## Acceptance Record

- [x] Admin and Manager can open the studio Costs dashboard; other studio roles are denied.
- [x] Summary, show, and shift endpoints use shared Zod response contracts.
- [x] Dashboard date range, filters, pagination, sorting, and active tab are URL-synchronized.
- [x] Show and shift tables are server-paginated and only the active detail tab fetches.
- [x] Decimal strings remain precise through API and presentation boundaries.
- [x] Unresolved rows and planned-fallback calculations are surfaced explicitly.
- [x] Daily trend totals reconcile with the corresponding resolved summary subtotals.
- [x] Service and controller behavior have focused automated tests.

## Technical References

| Layer | Reference |
| --- | --- |
| Contract | [`packages/api-types/src/costs/costs.schema.ts`](../../packages/api-types/src/costs/costs.schema.ts) |
| Backend | [`StudioCostsController`](../../apps/erify_api/src/studios/studio-costs/studio-costs.controller.ts), [`StudioCostsService`](../../apps/erify_api/src/studios/studio-costs/studio-costs.service.ts) |
| Frontend | [`costs.tsx`](../../apps/erify_studios/src/routes/studios/$studioId/costs.tsx), [`studio-costs`](../../apps/erify_studios/src/features/studio-costs/) |
| Domain | [Economics Cost Model](../domain/economics-cost-model.md), [Finance Guardrails](../engineering/FINANCE_GUARDRAILS.md) |

## Open Documentation Work

The internal docs app does not yet have a role-scoped Costs Dashboard guide. Add one when the operations documentation workstream next covers studio analytics.
