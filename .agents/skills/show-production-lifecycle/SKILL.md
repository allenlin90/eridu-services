---
name: show-production-lifecycle
description: Implement livestream Show relationships, readiness, transitions, cancellation, completion, and assignments.
---

# Show Production Lifecycle

Procedure for show-related changes in `erify_api` and `erify_studios`. The canonical state machine, entity graph, lifecycle phases, readiness conditions, operating roles, implementation landmarks, and the ten rules for show-related changes live in [`knowledge/domain/show-production-lifecycle`](../../../knowledge/domain/show-production-lifecycle.md).

## When to Use

- Adding or changing show status transitions or gate logic.
- Implementing readiness checks, completion gates, or cancellation/resolution flows.
- Building surfaces spanning multiple lifecycle phases (task setup, live control, post-production review).
- Connecting a new entity or feature to the show graph.
- Reviewing whether a change respects the lifecycle contract.

## Procedure

1. Read the knowledge doc's § Lifecycle State Machine. States are `draft`, `confirmed`, `live`, `completed`, `cancelled`, `cancelled_pending_resolution` — a **lookup table**, not a Prisma enum. Match by `showStatus.systemKey` or `name`; never hardcode IDs.
2. For any status write, read § Status write paths and gate invariants first. `ShowCancellationGateService` owns every **user-initiated** transition into or out of `CANCELLED` / `CANCELLED_PENDING_RESOLUTION`; generic admin and studio edit paths must not write them. Schedule publishing is an explicit owned exception that writes both directly during bulk reconciliation — legitimate, not a bug to route through the gate.
3. For actuals, route through the fact-extraction pipeline or `StudioShowManagement` — the only two write paths. Check `source-priority.ts` before adding a third.
4. Locate the code via § Implementation Landmarks rather than searching blind.
5. Check the ten § Rules for Show-Related Changes against your diff.
6. Do not duplicate guidance owned by `schedule-continuity-workflow`, `fact-extraction-pipeline`, `operations-review-surface`, `shift-schedule-pattern`, or `task-template-builder` — see § Cross-Skill References.

## Verification

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test && pnpm --filter erify_api build
```

Status-transition and soft-delete/restore changes also require the real-database gate in [`backend-testing-patterns`](../backend-testing-patterns/SKILL.md#5-real-database-integration-tests).

## Canonical Knowledge

- [`knowledge/domain/show-production-lifecycle`](../../../knowledge/domain/show-production-lifecycle.md) — state machine, entity graph, phases, readiness, roles, landmarks, rules
- [`references/entity-relationships.md`](references/entity-relationships.md) — field-level entity detail
- [`references/state-gates.md`](references/state-gates.md) — full condition inventory and enforcement-level design
- [`apps/erify_api/docs/SHOW_ISSUE_OWNERSHIP.md`](../../../apps/erify_api/docs/SHOW_ISSUE_OWNERSHIP.md)
