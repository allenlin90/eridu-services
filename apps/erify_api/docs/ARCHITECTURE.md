# `erify_api` Architecture

> **Status**: Current architecture after the capability-refactoring foundation
> **Source comparison**: `f677b627` in [`architecture-signals-baseline.json`](./architecture-signals-baseline.json)
> **Current snapshot**: `341b984c` after the T1–T13 foundation

## Architecture Decision

Keep `erify_api` as a NestJS modular monolith. Organize new work around the
business capability that owns the rule instead of the transport audience or
the Prisma model it touches.

The default dependency direction is:

```text
REST controller ┐
MCP tool        ├─> capability service or use case ─> private persistence
future worker   ┘                 │
                                  └─> pure policy or value object when useful
```

Use strategic domain-driven design to make capability ownership and language
clear. Use tactical patterns only when they protect real invariants. Do not
create an aggregate, repository interface, mapper, domain event, factory, or
Nest module for every Prisma model by default.

Do not introduce a global `@nestjs/cqrs` bus. Task-oriented write methods and
dedicated query providers are sufficient until a concrete workflow
demonstrates a need for handlers, events, asynchronous processing, or a
separate read model.

## Placement And Persistence

Controller, capability, and persistence responsibilities stay separate even
when a shallow capability service owns its Prisma calls directly.

| Signal | Preferred boundary |
| --- | --- |
| Bounded, single-model CRUD with no reusable query policy | Capability service using `TransactionHost.tx.<model>` directly |
| Complex filters, projections, conditional writes, raw SQL, or reusable persistence policy | Private repository, store, or query provider |
| Multi-step workflow spanning capabilities | Focused orchestration service or use case behind a stable facade |
| Rule-heavy transition or calculation | Pure policy or value object, called by the owning capability |
| Audience-specific routes and guards | Thin controller or HTTP adapter around the capability API |
| Read-only runtime with a smaller surface | Provider module without REST controllers or unrelated write dependencies |

Direct persistence remains private and bounded. Service signatures must not
expose Prisma inputs or a generic query language. Repositories remain useful
when they hide real persistence complexity; pass-through repositories and
exported repositories are not the default.

All transaction-dependent persistence resolves through `TransactionHost.tx`.
The repaired `BaseRepository` preserves this rule by resolving its delegate
lazily, but its broad generic surface remains non-default.

## Contracts To Preserve

Structural changes must preserve:

- route paths, guard ordering, authorization boundaries, and response shapes;
- external UIDs and the rule that database IDs never cross the API boundary;
- Zod validation and snake-case API to camel-case service transformations;
- CLS transaction propagation, rollback behavior, and read-your-own-writes;
- soft-delete, restore, optimistic-lock, and audit-history semantics;
- immutable task-template snapshots and existing partial-success contracts;
- bounded read inputs and lean relation projections;
- runtime separation between reusable providers and REST-only controllers.

Correctness or security fixes must be labeled and reviewed separately from
behavior-preserving structural work.

## Implemented Foundation

The foundation is complete and establishes these reusable examples:

- A guarded, loopback-only PostgreSQL integration runner protects transaction,
  rollback, soft-delete/restore, application wiring, MCP wiring, and selected
  workflow behavior. It accepts only `ERIFY_API_TEST_DATABASE_URL` values whose
  database name ends in `_test` and never uses the development database.
- `ShowStatusService` demonstrates shallow direct persistence through
  `TransactionHost.tx` without exposing Prisma types or a pass-through
  repository.
- `ShowCatalogModule` owns show type, status, standard, and platform reference
  providers. `ShowCatalogHttpModule` registers their REST controllers so the
  MCP runtime does not inherit admin routes.
- `BaseRepository` resolves the ambient transaction lazily and restores only
  soft-deleted rows. It is retained for existing complex persistence, not as a
  mandatory base for new services.
- UID generation is a narrow injectable adapter. Deterministic time-overlap
  logic is a pure function.
- MCP list inputs have hard maximums, and its module closure remains narrower
  than the full REST application.

See the
[`erify-api-capability-refactoring`](../../../.agents/skills/erify-api-capability-refactoring/SKILL.md)
skill for implementation and review rules.

## Architecture Signals

`pnpm architecture:signals` is a navigation and trend aid, not a quality score
or runtime benchmark.

| Signal | Source `f677b627` | Foundation closeout `341b984c` |
| --- | ---: | ---: |
| TypeScript files | 539 | 546 |
| Nest modules | 90 | 83 |
| Static local module edges | 293 | 253 |
| Static module cycles | 0 | 0 |
| Modules at or below 20 lines | 74 | 70 |
| Model modules | 27 | 23 |
| Production services | 68 | 69 |
| Repositories | 30 | 29 |
| Exported repositories | 6 | 5 |
| Controllers | 53 | 54 |
| Specs | 156 | 165 |
| Generic utility-module importers | 48 | 0 |
| UID-generator module importers | — | 25 |
| MCP-reachable modules | 24 | 22 |

The important result is not fewer files by itself. The graph remains acyclic,
the show catalog now has one capability owner, direct persistence has a tested
decision rule, and runtime composition has not expanded accidentally.

Compare every architecture PR with both the committed source baseline and its
PR base. A new cycle is blocking. Changes in edges, small modules, exported
repositories, or runtime closure require explanation but are not automatic
failures.

## Trigger-Gated Next Steps

The remaining architecture directions are destination maps, not an autonomous
refactoring backlog:

1. Phase 5 [item 18](../../../docs/roadmap/PHASE_5.md#18-show-lifecycle-state-machine)
   activates a `ShowOperationsModule` only as the owning boundary for the
   canonical lifecycle transition service. Move related code incrementally
   behind a stable facade; do not run a standalone folder migration or create
   another status writer.
2. Decompose `PublishingService` only if item 18's schedule-publish integration
   requires it, or measured query, lock, rollback, or maintainability risk
   independently reaches the gate. Preserve the current facade and transaction
   boundary until then.
3. Introduce scoped show/task query providers and further narrow MCP composition
   when the owning capability work needs them, not as speculative seams.
4. Reconsider CQRS infrastructure, workers, read models, package extraction, or
   database splits only after explicit coordination, scaling, or independent
   deployment evidence exists.

## Phase 5 Handoff

Phase 5 is already in progress. The next ready product slice is
[item 9, show-level issue ownership](../../../docs/roadmap/PHASE_5.md#9-show-level-issue-ownership).
It is state-independent and has a locked design, so it can proceed without
starting the trigger-gated show-operations restructuring.

After item 9, follow the roadmap's dependency order. Architecture changes travel
with the product work that triggers them; there is no separate Phase 4–7
architecture migration wave.

## Deferred Decisions And Known Gaps

- Automated CI enforcement for the real-database suite remains
  [ideation](../../../docs/ideation/erify-api-real-database-ci-gate.md). The
  manual guarded runner remains the active gate.
- The shared REST pagination cap mismatch remains
  [tech debt](../../../docs/tech-debt/erify-api-shared-pagination-limit-unbounded.md).
- Bulk schedule create/update error-code mapping remains
  [tech debt](../../../docs/tech-debt/erify-api-bulk-schedule-error-code-asymmetry.md).

## Related References

- [Cross-app architecture overview](../../../docs/engineering/ARCHITECTURE_OVERVIEW.md)
- [Phase 5 roadmap](../../../docs/roadmap/PHASE_5.md)
- [Real-database integration guide](../test/README.md)
- [`erify-api-capability-refactoring` skill](../../../.agents/skills/erify-api-capability-refactoring/SKILL.md)
