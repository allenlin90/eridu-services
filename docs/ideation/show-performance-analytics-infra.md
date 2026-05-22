# Ideation: Show Performance Analytics Infrastructure

> **Status**: Deferred until after PR 12.4
> **Origin**: PR 12.0.2 / Phase 4 actuals schema review
> **Related**: [Phase 4 roadmap](../roadmap/PHASE_4.md), [PR 12 PRD](../prd/task-fact-binding.md), [PR 12 design](../../apps/erify_api/docs/design/TASK_INPUT_FACT_BINDING_DESIGN.md), [Task Analytics Summaries](./task-analytics-summaries.md)

## What

Design the analytical layer for post-show performance features after the operational review surface exists. The investigation decides whether show-level analytics should extend current services with read models/materialized views or introduce dedicated OLAP infrastructure for cross-show, client, studio, and platform trend analysis.

## Boundary

Phase 4's active PR 12 pipeline remains OLTP-oriented. It records operational facts needed to identify and review immediate problems:

- late or incomplete show, creator, and platform actual time pairs
- missing creator attendance and attendance reasons
- active platform violations
- typed platform GMV and view count facts

`Show` remains the overall event/timing entity. Platform performance facts belong on `ShowPlatform`, and violation events belong in `ShowPlatformViolation`. Show-level performance summaries are derived analytical views over those narrower facts, not source facts persisted on `Show`.

## Why It Was Deferred

1. **Operational review and analytics have different query shapes.** PR 12.4 needs current-state exception review for late, missing, stale, and violation queues. Analytical features need historical slicing, aggregation, trends, and cross-show comparisons.
2. **Metrics arrive after the show lifecycle.** Platform performance metrics are usually available after a stream ends, so they do not need to live in the same write path as operational planning and task assignment.
3. **JSONB is not the right home for critical filters.** Metrics that become filtering, sorting, billing, or dashboard dimensions should be promoted to typed columns or analytical projections instead of staying as ad hoc JSON queries.
4. **Show-level aggregates need product semantics.** A show can have multiple platforms, multiple streams, and multiple metric sources. Totals, averages, maxima, attribution windows, and deduplication rules require explicit product decisions.

## Candidate Directions

1. **Postgres read models**: create dedicated summary tables or materialized views maintained by jobs after show close. This keeps the stack simple while separating analytical reads from OLTP tables.
2. **Application-managed projections**: write explicit projection services that consume operational facts and persist query-shaped summaries for dashboards.
3. **Dedicated OLAP path**: introduce warehouse-style infrastructure when cross-studio trend analysis, high-cardinality metrics, or historical exploration outgrow Postgres operational read models.
4. **Metric promotion workflow**: keep low-priority platform metrics in `ShowPlatform.performanceMetrics`, then promote individual keys to typed columns or analytical projections when they become product-critical.

## Decision Gates for Promotion

Promote this topic to a PRD when any of these are true:

1. PR 12.4 has shipped enough operational facts to define stable analytical dimensions.
2. Product requires show-level trend dashboards, client/studio comparisons, platform performance exploration, or historical metric exports.
3. Querying operational tables for analytical screens creates unacceptable latency, locking, or indexing pressure.
4. Platform metric semantics are defined beyond GMV/views and need first-class schema or analytical projections.

## Open Design Questions

1. What is the canonical grain: show, show-platform, show-platform-day, client-day, studio-day, or another shape?
2. Which metrics are facts, which are aggregates, and which are display-only calculations?
3. What freshness is required: end-of-show batch, near-real-time, daily rollup, or manual refresh?
4. Which service owns projection writes, retries, backfills, and data quality checks?
5. How should analytics expose provenance when aggregate inputs mix operator, manager, and platform sources?
