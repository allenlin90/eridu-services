# Tech Debt: Per-Platform Performance Fields Exposed to All Members on Show Detail

## Current Issue

The show **detail** endpoint `GET /studios/:studioId/shows/:id` is authorized with class-level `@StudioProtected()` — i.e. **all** studio members (including `TALENT_MANAGER` and any non-manager role). Its response (`studioShowDetailDto` → `studioShowPlatformSummarySchema`) includes the per-platform performance metrics `gmv`, `ctr`, and `cto` (added in PR 21.7 / #136).

The dedicated performance surfaces gate the same facts to managers: the performance controller is `@StudioProtected([ADMIN, MANAGER])` (`studios/:studioId/performance/*`). So the same `gmv`/`ctr`/`cto` data has two different audiences depending on which endpoint serves it.

## Why It Matters

`gmv` is revenue data. If it is intended as manager-level information (as the `/performance` gating implies), then serving it on an all-members endpoint is an unintended widening of access. Conversely, if per-platform GMV on the show detail is acceptable for all members, the `/performance` gating is stricter than necessary and the intent should be documented so the inconsistency is not read as a bug.

Either way the current state is **inconsistent**: the same fact is manager-only on one endpoint and all-members on another.

Note: this is pre-existing from PR 21.7 and is independent of the `/shows` list fix in PR #139, which deliberately keeps the metrics **off** the all-members list (`showListPlatformSummarySchema`).

## Desired Direction

Make a deliberate decision and align the endpoints:
- **If manager-level**: restrict `gmv`/`ctr`/`cto` on the show-detail response to `ADMIN`/`MANAGER` (e.g. role-aware serialization or a manager-only detail field set), and gate the frontend performance tab accordingly.
- **If all-members**: keep as-is and record the intent (in the PRD / authorization guide) so it is not re-flagged.

## Risk

- Accepted, low-immediate-risk: internal studio members only; no public exposure.
- Deferred because resolving it is a behavioral/authorization change that needs a product decision plus matching frontend gating — out of scope for the `/shows` 500 hotfix.

## Trigger To Fix

Address before or during any PR that:
- changes show-detail authorization or the show-detail performance tab, or
- adds further revenue/performance facts to the show-detail response, or
- a stakeholder confirms whether per-platform GMV is manager-only.

## Related Context

- [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md)
- `studio-performance.controller.ts` (`@StudioProtected([ADMIN, MANAGER])`)
- `studio-show.controller.ts` (`@StudioProtected()` — all members)
- [PHASE_4.md](../roadmap/PHASE_4.md) PR 21 meta-row
