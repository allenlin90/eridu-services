# Ideation: System Admin UX Searchability Refactor

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [full-text-search-filtering.md](./full-text-search-filtering.md)

## What

Refactor relevant `/system/*` forms and filters in `erify_studios` to use combobox-style searchable selectors instead of raw ID input patterns. Update `/admin/*` endpoints to support search-input-driven lookup (name/keyword) where appropriate. Reduce manual copy/paste friction in linking and lookup workflows.

## Why It Was Considered

- Several `erify_studios` `/system/*` screens rely on ID-based selection flows where copy/paste is inconvenient.
- These screens are lower-frequency but still need better usability for admin operations.
- Combobox-style selectors improve discoverability without requiring a full search engine.

## Why It Was Deferred

1. These screens are lower-frequency — admin operations can tolerate the current copy/paste friction.
2. The refactor requires both frontend combobox implementation and backend keyword-search endpoint support.
3. This is not blocking any current business-critical workflows.
4. The improvement is better delivered during a dedicated UX polish pass, not alongside feature delivery.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A specific admin workflow (e.g. linking a creator to a studio, looking up a show) is causing operational errors due to ID copy/paste mistakes.
2. A UX polish pass is planned and these items have a clear owner and scoped deliverables.
3. Full-text search is promoted and the combobox selectors can reuse the same keyword-search endpoints.
4. The admin screen count grows to the point where consistent search UX is required for onboarding new admins.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Refactor relevant `/system/*` forms/filters to use combobox-style searchable selectors instead of raw ID input patterns.
- Update `/admin/*` endpoints to support search-input-driven lookup (name/keyword) in addition to direct ID targeting where appropriate.
- Reduce manual copy/paste friction in linking and lookup workflows while keeping existing admin capability coverage.
- Keep this as a lower-priority improvement unless blocked by current business-critical workflows.
