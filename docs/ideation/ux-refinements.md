# Ideation: Lower-Priority UX Refinements

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [erify-studios-route-query-optimization.md](./erify-studios-route-query-optimization.md)

## What

A collection of useful UX improvements with no hard dependency on new backend contracts: non-essential shift calendar interaction polish, workflow enhancements that do not change backend contracts, and bulk review approve refinements.

## Why It Was Considered

- These improvements are identified during active development and design reviews but do not block current workflows.
- Shift calendar interaction polish reduces friction in scheduling operations.
- Bulk review approve refinements improve throughput for review-heavy workflows.

## Why It Was Deferred

1. These improvements have no hard dependency but also no urgent business need — they improve quality of life rather than unblock operations.
2. Calendar interaction polish is best done as part of a dedicated UX pass, not alongside feature delivery.
3. Bulk review refinements should follow the review quality hardening work (`review-quality-hardening.md`) to avoid conflicting design decisions.
4. These items are intentionally lower-priority — promotion should happen only during a dedicated polish phase.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A UX polish phase is planned and these items have a clear owner and scoped deliverables.
2. User feedback identifies specific shift calendar interactions as friction points that affect scheduling throughput.
3. Bulk review operations are promoted to scale and the approve flow becomes a bottleneck.
4. These items are bundled with a larger UX-focused workstream that has clear exit criteria.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Non-essential shift calendar interaction polish.
- Workflow enhancements that do not change backend contracts.
- Bulk review approve refinements.

### Guidance

These items should remain in the ideation backlog until a dedicated UX pass is planned. Do not promote individual items — bundle them as part of a focused UX improvement sprint with a clear scope boundary.
