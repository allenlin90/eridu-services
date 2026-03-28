# Creator Availability Hardening Backend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/creator-availability-hardening.md`](../../../../docs/prd/creator-availability-hardening.md)
> **Depends on**: Studio creator roster write path 🔲

## Purpose

Harden creator assignment eligibility by extending the availability endpoint with strict conflict metadata and enforcing the same rules on assignment writes.

## API Surface

| Endpoint | Purpose |
| --- | --- |
| `GET /studios/:studioId/creators/availability` | Default discovery mode plus `strict=true` enforcement mode |
| Existing creator assignment write path | Returns typed overlap/roster errors when strict checks fail |

## Strict-Mode Rules

- `show_id` is required when `strict=true`.
- Conflict priority: `OVERLAP` > `NOT_IN_ROSTER` > `INACTIVE`.
- Same-show assignments are not treated as overlap conflicts.
- `include_inactive=true` returns inactive creators with conflict metadata instead of hiding them.

## Service Plan

- Keep the loose discovery read path for `strict=false`.
- Add a strict evaluation branch that composes:
  - target-show time window lookup
  - overlapping `ShowCreator` lookup
  - studio roster membership / active-state lookup
- Reuse the same conflict-resolution helper in assignment writes so read/write enforcement stays identical.

## Error Contract

- `CREATOR_OVERLAP_CONFLICT` → 409
- `CREATOR_NOT_IN_ROSTER` → 422
- Missing `show_id` in strict mode → 400

## Authorization

- Availability read roles stay aligned with creator mapping surfaces.
- Assignment enforcement happens in the existing write path and does not change route-level authz.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke: loose mode unchanged, strict overlap, not-in-roster, inactive creator, same-show reassign

