# Studio Economics Review Backend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/studio-economics-review.md`](../../../../docs/prd/studio-economics-review.md)
> **Depends on**: Show economics baseline revision/merge ⏸️, compensation line items 🔲, studio show ownership/read paths ✅, schedule-ready show linkage 🔲

## Purpose

Define the backend contract for a manager-facing economics review/export engine that supports:

- required date-ranged scope
- horizon-aware projected vs actual cost semantics
- configurable row grain
- selectable result columns/measures
- inline run responses suitable for FE caching and export

This is not just a grouped read endpoint. It is the backend foundation for a configurable report-builder workflow in the studio app.

## Hard Invariants

1. **Backend owns finance math.**
   - FE never derives projected, actual, or subtotal amounts locally.
   - The backend returns ready-to-render amounts, states, and warnings.

2. **One primary row grain per run.**
   - A result set is generated for one selected perspective at a time.
   - Phase 4 additive perspectives are `show`, `schedule`, and `client`.

3. **Column selection does not redefine totals.**
   - Selected columns change result shape and export shape only.
   - Core totals still use the backend's stable cost semantics.

4. **Scope resolution is shared across catalog, preflight, and run.**
   - The same scope input must produce the same candidate show set across these endpoints.
   - Preflight cannot drift from run.

5. **Platform remains non-additive in Phase 4 core.**
   - Platform can be used as a filter and visible dimension.
   - Do not expose additive platform rollups unless explicit allocation/show-platform economics semantics are introduced.

6. **Rows must be FE-ready.**
   - The run response returns flat columns plus flat rows, ready for table display and export.
   - Nullability and unresolved states must be explicit.

## API Plan

| Endpoint | Purpose |
| --- | --- |
| `GET /studios/:studioId/economics/catalog` | Return available perspectives, scope filters, selectable columns/measures, defaults, and preset metadata |
| `GET /studios/:studioId/economics/preflight` | Validate scope and return row/show/unresolved counts before generation |
| `POST /studios/:studioId/economics/run` | Generate inline economics result for one perspective + selected columns/measures |
| `GET /studios/:studioId/economics-definitions` | List saved economics definitions |
| `POST /studios/:studioId/economics-definitions` | Create saved economics definition |
| `PATCH /studios/:studioId/economics-definitions/:definitionUid` | Update saved economics definition |
| `DELETE /studios/:studioId/economics-definitions/:definitionUid` | Delete saved economics definition |
| `GET /studios/:studioId/shows/:showUid/economics` | Show drill-in plus assignment-side preview card source |

Existing `GET /studios/:studioId/economics` may remain as a low-level grouped read or compatibility adapter, but it should not be the only contract the FE depends on for the manager workflow.

## Request Contract

### Shared scope fields

- Required:
  - `date_from`
  - `date_to`
  - `horizon`
- Optional filters:
  - `client_uid[]`
  - `schedule_uid[]`
  - `platform_uid[]`
  - `show_status_uid[]`
  - `show_standard_uid[]`
  - `room_uid[]`

### Perspective

- `perspective = show | schedule | client`
- Keep the contract enum extensible for future additions

### Selected result fields

The run contract should accept a backend-defined list of selected result field keys, grouped conceptually as:

- identity columns
- operational dimensions
- economics totals
- economics components
- counts / state fields

The backend catalog is the source of truth for which fields are selectable and which perspectives/horizons they support.

### Definition reference

- `definition_uid` is optional on run requests for audit/logging only
- the FE always sends a fully resolved run payload rather than a "definition + overrides" instruction set

## Catalog Contract

`GET /economics/catalog` should provide enough metadata for the FE builder to be backend-driven:

- available perspectives
- default perspectives and default selected fields
- selectable fields with:
  - stable `key`
  - label
  - category/group
  - supported perspectives
  - supported horizons
  - default visibility
- supported scope filters and option metadata
- preset definitions or preset descriptors for quick-start flows

This keeps the FE from hard-coding economics field definitions across multiple places.

## Preflight Contract

`GET /economics/preflight` should return lightweight scope intelligence before generation:

- `row_count`
- `show_count`
- `within_limit`
- `unresolved_row_count`
- `partial_actual_row_count`
- optional warnings such as:
  - empty scope
  - over date-range cap
  - selected fields incompatible with perspective/horizon

Preflight should stay cheap by reusing scope resolution and aggregate helpers, not full row construction.

## Run Response Shape

`POST /economics/run` returns an inline result suitable for immediate table rendering and export:

- `columns[]`
  - ordered descriptors for the selected fields
  - labels and categories for FE grouping
- `rows[]`
  - flat objects keyed by selected field key
  - one row per selected perspective grain
- `summary`
  - top-line totals and counts for summary cards
- `warnings[]`
  - dataset-level notices about unresolved or partial values
- `generated_at`

Rows should also include hidden metadata fields when needed for FE-only result filtering, for example row-state or label-backed filter values. This should follow the same philosophy as task reporting: the FE gets one flat result and does not need additional joins to review or export it.

## Response Semantics

- Expose `projected_total_cost` for future / in-flight review.
- Expose `actual_total_cost` for past / completed review when the occurred cost basis is known.
- Expose `primary_total_cost` selected by the requested horizon.
- Expose `cost_state` and optional `unresolved_reason` so FE can explain `PARTIAL_ACTUAL` and `UNRESOLVED` rows without guessing.
- Preserve existing nullability rules for unresolved `COMMISSION` / `HYBRID` creator base cost.
- When selected, component columns expose cost slices such as:
  - creator base cost
  - shift labor cost
  - compensation line item cost

## Calculation Rules

- **Projected** means current persisted projection from:
  - `ShowCreator.agreedRate` → `StudioCreator.defaultRate`
  - creator compensation type precedence
  - shift projected cost inputs
  - applicable show-scoped compensation line items already recorded
- **Actual** means current occurred cost basis from:
  - member shift cost `calculatedCost ?? projectedCost`
  - creator base cost when resolvable under the current model
  - applicable show-scoped compensation line items
- Schedule-scoped and standing/global line items keep the same inclusion rules defined in compensation-line-items design; do not invent new allocation rules here.
- Phase 4 does **not** persist a frozen "planned at assignment time" snapshot. Do not expose fake variance fields that imply historical budget locking.
- Phase 4 does **not** allocate full show cost across multi-platform associations for additive platform totals.

## Saved Definitions

Saved definitions should persist:

- scope filters
- horizon
- perspective
- selected result field keys
- optional preset metadata such as name and description

Definitions are studio-scoped and shared across permitted roles. Authorization details follow the PRD, but the contract should mirror task-report definitions closely enough that the FE can reuse established patterns.

## Service / Repository Shape

Recommended module layering:

- `economics-scope.service.ts`
  - resolve candidate shows and reusable scope metadata
- `economics-catalog.service.ts`
  - field catalog, defaults, preset descriptors
- `economics-run.service.ts`
  - row construction, selected-field shaping, summary/warnings
- `economics-definition.service.ts`
  - definition CRUD
- `economics-definition.repository.ts`
  - persistence only

Key implementation guidance:

- reuse shared economics calculators between grouped review, run rows, summary cards, and show drill-in
- keep horizon selection and state shaping in the economics domain layer, not controllers
- query helpers should return lean slices for shows, assignments, shifts, schedule linkage, client linkage, platform linkage, and line-item aggregates only
- if the legacy grouped endpoint remains, it should adapt the same domain services rather than fork semantics

## Revenue Extension Boundary

- Revenue workflow later adds contribution margin and resolves commission/hybrid creator cost paths.
- The contract should therefore keep room for later measures such as revenue and margin without breaking the run shape.
- Future show-platform economics can extend the perspective catalog once allocation semantics are explicit.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke:
  - catalog returns perspective + field metadata
  - preflight and run stay consistent for the same scope
  - future horizon
  - past horizon
  - unresolved / partial rows
  - assignment-preview refresh source
