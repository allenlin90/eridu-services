# `erify_api` Refactoring Targets

> **Status**: Active architecture target register after the T1-T13 foundation
> **Current evidence snapshot**: `09fde432`
> **Architecture doctrine**: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## Purpose And Scope

This register makes the remaining `erify_api` architecture targets visible
without turning them into an unconditional migration program.

It owns:

- residual capability, module, persistence, and runtime-composition targets;
- the evidence that activates each target;
- the boundary that an activated refactor should move toward;
- the proof required to close or re-gate a target.

It does not own product sequencing. [`PHASE_5.md`](../../../docs/roadmap/PHASE_5.md)
and later product roadmaps define behavior and delivery order. A product item
appears here only when it supplies evidence or activates an architecture target.

Use `docs/tech-debt/` for an accepted implementation defect or gap with a fix
trigger, and `docs/ideation/` for a future mechanism that still needs discovery
or a decision. Use this register for a desired architecture boundary and its
activation evidence; link related entries instead of duplicating their scope.

## Feature And Refactor Preflight

Before planning or implementing any `erify_api` feature, behavior change, or
refactor:

1. Name the business capability and use case being changed.
2. Check the targets below for the touched surface.
3. Compare the current change with the target's activation evidence.
4. Choose the smallest boundary that satisfies the current requirement and the
   accepted persistence matrix.
5. Record the applicable target IDs and one trigger outcome in the plan and PR:
   `NOT TRIGGERED`, `TRIGGERED — HANDLED`, `TRIGGERED — REGISTERED`, or
   `BLOCKING`.
6. Update this register in the same PR when evidence, status, scope, or exit
   criteria change.

A product feature does not automatically activate every target near its code.
Conversely, a feature must not deepen a registered coupling problem without an
explicit response.

## Abstraction Decision

Introduce a capability API, query provider, repository, policy, or adapter only
when it addresses a present boundary:

- two or more current transports or capabilities need one owned operation;
- an invariant or transaction boundary must remain centralized;
- complex filtering, conditional writes, raw SQL, or reusable persistence policy
  needs to stay private;
- an external system or runtime needs an independently testable adapter;
- a read-only runtime needs a narrower dependency closure;
- current change frequency or duplicated behavior demonstrates an unstable seam.

Do not introduce an abstraction only because a future refactor might need it.
Avoid single-implementation interfaces without an independent boundary,
pass-through services or repositories, generic base classes, speculative event
buses, and parallel write paths. The abstraction must reduce current coupling
and have one named capability owner.

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| Active rule | Applies to every relevant change now; not a finite work item |
| Observed | Verified residual with no implementation gate yet |
| Touch-gated | Reassess when a feature or refactor changes the named surface |
| Gated | Do not implement until the stated evidence exists |
| Ready | Evidence and dependencies support a bounded implementation |
| In progress | An accepted implementation is open |
| Complete | Exit criteria are proven; retain only durable doctrine |

## Current Evidence

`pnpm architecture:signals` at `09fde432`, compared with the committed
[`architecture-signals-baseline.json`](./architecture-signals-baseline.json),
reports:

| Signal | Source `f677b627` | Current `09fde432` |
| --- | ---: | ---: |
| Nest modules | 90 | 83 |
| Static local module edges | 293 | 253 |
| Static module cycles | 0 | 0 |
| Modules at or below 20 lines | 74 | 70 |
| Model modules | 27 | 23 |
| Repositories | 30 | 29 |
| Exported repositories | 6 | 5 |
| MCP-reachable modules | 24 | 22 |
| Specs | 156 | 165 |

These signals aid navigation and trend review. Zero modules, repositories, or
small files is not the target.

## Target Register

### RT-01 - Capability-first placement

- **Status**: Active rule.
- **Evidence**: Table-shaped `models/` modules and audience-owned orchestration
  remain common, while the show-catalog pilot proves capability ownership can
  reduce breadth without changing contracts.
- **Activation**: Every new or materially changed use case.
- **Target**: Transport adapters call a capability-owned service, use case, or
  query provider. Persistence remains private and follows the decision matrix.
- **Exit**: Ongoing doctrine. A changed surface must not add a table-first module,
  audience-owned business rule, exported repository, or speculative seam.

### RT-02 - Show-operations ownership

- **Status**: Gated.
- **Evidence**:
  [`StudioShowManagementService`](../src/studios/studio-show/studio-show-management.service.ts)
  is 1,417 lines with 18 collaborators, and
  [`ShowOrchestrationService`](../src/show-orchestration/show-orchestration.service.ts)
  has 11 collaborators. Status transitions, assignments, cancellation, review
  reads, and persistence span audience and model boundaries.
- **Activation**: The canonical show-lifecycle transition work requires the
  boundary, or an earlier change already needs the same cohesive decomposition.
  File size or collaborator count alone is not sufficient.
- **Target**: Introduce `ShowOperationsModule` as the owner of named show
  commands and queries. Move behavior incrementally behind stable facades; do
  not create another status writer or perform a standalone folder migration.
- **Exit**: Transition ownership is singular, transport callers use narrow
  capability APIs, persistence is private, and route, authorization,
  transaction, audit, and response contracts remain proven.

### RT-03 - Schedule-publishing cohesion

- **Status**: Gated.
- **Evidence**:
  [`PublishingService`](../src/schedule-planning/publishing.service.ts) is 1,025
  lines with 11 collaborators and owns validation, planning, transactional
  writes, relation synchronization, task reconciliation, conflict handling,
  audit recording, and impact behavior.
- **Activation**: Show-lifecycle integration requires a publishing boundary, or
  measured query, lock, rollback, latency, or maintainability risk independently
  justifies decomposition.
- **Target**: Preserve one stable facade and outer transaction while delegating
  cohesive planning, application, reconciliation, and query responsibilities.
- **Exit**: Responsibilities have focused tests, every transactional operation
  resolves through `TransactionHost.tx`, and partial-success, rollback, audit,
  and publish-impact contracts remain characterized.

### RT-04 - Scoped query providers and MCP composition

- **Status**: Touch-gated.
- **Evidence**: The
  [`McpAppModule`](../src/mcp/mcp-app.module.ts) closure reaches 22 Nest modules.
  The provider/HTTP split prevents inherited REST routes, but MCP still depends
  on broader model and orchestration surfaces than the destination architecture
  requires.
- **Activation**: A touched show or task read path needs reuse across transports,
  MCP closure expands, a write-heavy module leaks into the MCP runtime, or a
  measured read path needs a purpose-shaped projection.
- **Target**: MCP and other read-only callers use scoped `ShowQueries`,
  `TaskQueries`, or capability-equivalent providers without importing REST
  controllers or unrelated write dependencies.
- **Exit**: Inputs are bounded, projections are purpose-shaped, authorization is
  enforced at the query boundary, and runtime-composition tests prove no
  inherited REST surface.

### RT-05 - Private persistence boundaries

- **Status**: Touch-gated.
- **Evidence**: Five repositories remain exported:
  [`CreatorRepository`](../src/models/creator/creator.repository.ts),
  [`ShowCreatorRepository`](../src/models/show-creator/show-creator.repository.ts),
  [`ShowPlatformRepository`](../src/models/show-platform/show-platform.repository.ts),
  [`ShowRepository`](../src/models/show/show.repository.ts), and
  [`StudioCreatorRepository`](../src/models/studio-creator/studio-creator.repository.ts).
- **Activation**: A caller or feature changes one of these cross-module
  dependencies, or capability placement exposes a narrow owned operation that
  can replace repository injection.
- **Target**: Other capabilities depend on a capability API or query provider.
  Retain a private repository when it hides real persistence complexity.
- **Exit**: The touched repository is private or has a documented architectural
  exception; no public service contract exposes Prisma query types.

### RT-06 - Model modules and pass-through persistence

- **Status**: Touch-gated, with an active no-growth rule.
- **Evidence**: The source contains 23 model modules, 29 repositories, and 70
  modules at or below 20 lines.
- **Activation**: A feature changes the model-shaped module, a repository merely
  forwards bounded Prisma operations, or several reference models demonstrably
  belong to one capability.
- **Target**: Consolidate only the touched capability. Use direct
  `TransactionHost.tx` access for shallow bounded CRUD and private specialized
  persistence for complex behavior.
- **Exit**: The selected boundary is simpler without losing a meaningful public
  interface, transaction participation, soft-delete behavior, or focused test
  coverage.

### RT-07 - Boundary verification

- **Status**: Active rule.
- **Evidence**: The guarded PostgreSQL harness and module-wiring tests protect the
  foundation, while static analysis alone cannot prove transaction or runtime
  behavior.
- **Activation**: Any persistence, transaction, soft-delete, optimistic-lock,
  raw-SQL, module-composition, or runtime-boundary change.
- **Target**: Add the smallest real-database or Nest application test that proves
  the moved invariant.
- **Exit**: The PR records the guarded test result and relevant architecture
  signal comparison.

### RT-08 - Advanced architecture

- **Status**: Gated.
- **Evidence**: No current need proves a global CQRS bus, asynchronous workers,
  domain-event infrastructure, separate read store, package extraction, or
  database split.
- **Activation**: Multiple current consumers, asynchronous reactions,
  independent scaling or deployment, measured read/write divergence, or another
  explicit architecture decision supplies evidence.
- **Target**: Decide the smallest scoped mechanism through an architecture
  decision before implementation.
- **Exit**: The accepted decision names ownership, contracts, operational
  consequences, migration safety, and rollback.

## Current Implementation Queue

No residual target is ready for a standalone repository-wide migration.
RT-01 and RT-07 apply to all relevant changes; RT-04 through RT-06 are
touch-gated; RT-02, RT-03, and RT-08 remain gated.

This does not mean the application has reached the final folder or dependency
shape. It means the next implementation target must be selected by verified
coupling or workflow evidence rather than by a desired metric reduction.

## Ultimate Target

The architecture is at its intended destination when:

- each business rule has a recognizable capability owner;
- transports remain thin adapters rather than workflow owners;
- cross-capability calls use narrow APIs instead of persistence injection;
- complex commands have explicit invariant and transaction ownership;
- read-only runtimes import only the providers they need;
- repositories exist only where persistence complexity earns the seam;
- refactors preserve public contracts and have behavior-level safety evidence;
- developers can locate a use case and understand its execution path without
  tracing unrelated model and audience modules.

The ultimate target is not zero repositories, zero model modules, or the
smallest possible dependency graph.

## Maintenance

- Feature and refactor PRs update affected target evidence and status in the
  same change.
- `repository-health` reconciles this register at phase boundaries or at least
  quarterly.
- Completed finite work is summarized in
  [`ARCHITECTURE.md`](./ARCHITECTURE.md); durable implementation rules belong in
  the
  [`erify-api-capability-refactoring`](../../../.agents/skills/erify-api-capability-refactoring/SKILL.md)
  skill.
- Product roadmaps may link to target IDs as activation evidence but must not
  duplicate this register's architecture scope.
