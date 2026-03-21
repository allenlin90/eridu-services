# Ideation: Frontend API Contract Consistency (Tech Debt)

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [erify-studios-route-query-optimization.md](./erify-studios-route-query-optimization.md)

## What

Standardize records-per-page query parameter usage to `limit` across all frontend pages and related API calls. Remove or migrate `pageSize` usage in route/search state where it overlaps with `limit`. Align shared hooks/utilities and docs to a single pagination contract (`page` + `limit`).

## Why It Was Considered

- Some frontend pages use `pageSize` while others use `limit` for records-per-page behavior, creating inconsistency in the frontend layer.
- Mixed pagination parameter names create integration friction when writing shared hooks or debugging query state.
- A single consistent contract (`page` + `limit`) aligns with the API contract defined in `@eridu/api-types`.

## Why It Was Deferred

1. The inconsistency is not currently causing functional bugs — it is a quality-of-life improvement.
2. The cleanup requires touching multiple frontend pages and could introduce regressions if done carelessly.
3. This is best done as part of a frontend tech-debt pass, not alongside feature delivery.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A new feature requires a shared pagination hook that cannot cleanly support both `limit` and `pageSize`.
2. The inconsistency causes a user-visible bug (e.g., wrong page size applied when navigating between pages).
3. A frontend tech-debt pass is planned and this item has a clear owner.
4. The route query optimization item (`erify-studios-route-query-optimization.md`) is promoted and pagination consistency is a prerequisite for route loader standardization.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Standardize records-per-page query parameter usage to `limit` across frontend pages and related API calls.
- Remove or migrate `pageSize` usage in route/search state where it overlaps with `limit`.
- Align shared hooks/utilities and docs to a single pagination contract (`page` + `limit`).
