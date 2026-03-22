# Ideation: API Performance Evaluation and Optimization

> **Status**: Active ideation with initial implementation slice shipped in March 2026
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [api-performance-optimization skill](../../.agent/skills/api-performance-optimization/SKILL.md), [Read-Path Optimization](../../apps/erify_api/docs/READ_PATH_OPTIMIZATION.md), [erify-studios-route-query-optimization.md](./erify-studios-route-query-optimization.md)

## What

Run a dedicated performance pass across critical API workflows: deep analysis of query patterns, N+1 detection and remediation, response field minimization, and definition of concrete latency baselines. This is a backend-focused companion to the frontend route query optimization work.

## Why It Was Considered

- As entity counts grow (creators, shows, tasks, templates), unoptimized queries that are currently acceptable will degrade.
- N+1 queries and over-fetching are known risks in ORM-driven backends and need a systematic audit pass.
- Lean select/include strategies (enforced by the `api-performance-optimization` skill) are not consistently applied across all repositories.
- Defining latency baselines now will make future optimization planning data-driven rather than reactive.

## Why It Was Deferred

1. Current entity counts are low enough that query performance is not causing user-visible issues.
2. A performance pass without production traffic data would optimize the wrong queries — baselines should be measured from real usage patterns.
3. The optimization work is cross-cutting and requires dedicated engineering time that would displace feature delivery.
4. The `api-performance-optimization` skill already documents the correct patterns — the gap is audit and enforcement, not design.

## March 2026 Update

A low-risk implementation slice shipped directly without promoting this topic to a PRD.

Implemented scope:

- show DTO read-path include slimming
- studio show task-summary and single-show query shaping
- show orchestration assignment-read shaping
- admin task-template usage list blob-read reduction

Canonical shipped record:

- `apps/erify_api/docs/READ_PATH_OPTIMIZATION.md`

The broader ideation item remains active because the deeper work is still deferred:

- formal latency baselines and SLO tracking
- production query-count instrumentation
- wider schedule/google-sheets/query-audit passes
- additional endpoint audits beyond the show/task-template slice

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. P95 API latency on any critical workflow endpoint exceeds 500ms under production load.
2. A specific N+1 query is identified as causing degradation for a high-frequency route.
3. Response payload sizes reach a threshold that causes visible load time issues for studio operators.
4. The team decides to establish formal SLO targets for API latency before scaling to additional studios.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Deep analysis of query patterns, relationships, and loading strategy.
- Detect and reduce N+1 queries, redundant joins, and over-fetching.
- Minimize transportation/communication overload:
  - reduce unnecessary response fields,
  - enforce lean select/include strategy,
  - reduce avoidable client-server round-trips.
- Define and track concrete performance baselines for later optimization planning.

### Skill reference

The `.agent/skills/api-performance-optimization/SKILL.md` covers: lean select/include, N+1 audit methodology, aggregation strategy, bulk write guards, pagination caps, and query logging. Use this as the implementation checklist when promoted.

### Companion frontend work

The frontend route query optimization (`erify-studios-route-query-optimization.md`) addresses the client-side half of this problem. Both items may benefit from being promoted together to avoid solving only half of a latency issue.
