# Show Economics Backend Design

> **Status**: Deferred revision target
> **Phase scope**: Phase 4 reopened scope
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/features/show-economics.md`](../../../../docs/features/show-economics.md)
> **Depends on**: Creator mapping foundation ✅, studio shift cost inputs ✅, compensation line items review ⏸️

## Purpose

Define the backend design for the show-level and grouped economics APIs that already exist on the deferred `feat/show-economics-baseline` branch and still need revision before merge to `master`.

## API Surface

| Endpoint | Purpose |
| --- | --- |
| `GET /studios/:studioId/shows/:showUid/economics` | Show-level variable cost breakdown |
| `GET /studios/:studioId/economics` | Grouped economics summary (`show`, `schedule`, `client`) |

## Domain Rules

- Creator cost precedence: `ShowCreator.agreedRate` → `StudioCreator.defaultRate`.
- Creator compensation type precedence: `ShowCreator.compensationType` → `StudioCreator.defaultRateType`.
- `COMMISSION` and `HYBRID` creator base cost remain `null` until the revenue workflow activates those paths.
- Shift labor cost is attributed by block overlap with the show time window.
- Compensation line items integrate by **scope-matched aggregation only**: show/client surfaces include show-scoped items; schedule grouping also includes schedule-scoped items; standing/global items stay out of economics until an allocation policy exists.

## Service Shape

- Keep finance arithmetic in a dedicated economics domain service or calculator module.
- Controllers stay transport-only: parse scope/grouping params, enforce studio authz, and map responses.
- Repository/query helpers should return lean creator, shift, show, and schedule slices only; avoid coupling economics reads to unrelated write models.
- The grouped endpoint should share the same cost-resolution helpers as the show-level endpoint so precedence and nullability rules stay identical.

## Data Dependencies

- `Show`, `ShowCreator`, `StudioCreator`
- `StudioShift` and shift blocks
- `CompensationLineItem` / `CompensationTarget` once PR `R+` lands
- `ShowPlatform` revenue fields in Wave 3

## Response Contract Notes

- Public responses continue to use UID-based identifiers only.
- For creators with unresolved commission/hybrid base cost, expose known supplemental line item subtotal separately and keep the fully resolved creator total `null`.
- Grouped totals inherit the same nullability semantics as show-level totals; they must not silently coerce unknown creator cost to zero.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke: show-level economics, grouped economics, compensation-line-item roll-up, mixed FIXED/COMMISSION creator cases

