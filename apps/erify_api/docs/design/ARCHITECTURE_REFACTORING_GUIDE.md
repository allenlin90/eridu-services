# `erify_api` Architecture Refactoring Guide

> **Status**: Accepted direction with the scheduled foundation implemented through Phase 3. The `ShowStatus` pilot passed, T12 reconciled the persistence doctrine, and `ShowCatalogModule` is the first consolidated capability. Later phases remain trigger-gated.
> **Source snapshot**: `f677b627` (original analysis baseline); implementation status is tracked in [`ARCHITECTURE_REFACTORING_ROADMAP.md`](./ARCHITECTURE_REFACTORING_ROADMAP.md)
> **Scope**: Structure, module ownership, service and persistence boundaries, DDD, CQRS, runtime composition, testing, and performance guardrails
> **Visual companion**: [`architecture-refactoring-visual.html`](./architecture-refactoring-visual.html) — a diagrammed walkthrough of the problem, the NestJS-vs-Rails philosophy, Nest conventions, the phased plan, and the risks. Open it in a browser.

## Executive Decision

Keep `erify_api` as a NestJS modular monolith. Refactor it from a predominantly table-first and audience-first layout toward business-capability modules, while retaining the parts of the current architecture that protect correctness: Zod contracts, UID-only API boundaries, CLS transactions, optimistic locking, soft delete, audits, and focused orchestration.

Adopt **strategic DDD and selective tactical DDD**, not a full DDD framework:

- Organize around business capabilities and shared language.
- Make important transitions and invariants explicit.
- Introduce pure policies and value objects only where they simplify rule-heavy code.
- Do not create an aggregate, repository interface, mapper, domain event, and factory for every Prisma model.

Do **not** adopt `@nestjs/cqrs` across the application now. Use CQRS thinking first: give writes task-oriented methods and give complex reads dedicated query providers, while continuing to use the same PostgreSQL database and Prisma client. Add buses, handlers, events, or separate read storage only when a concrete workflow needs their costs and benefits.

The recommended sequence is:

1. Keep a reproducible static architecture snapshot and build an isolated real-database safety harness.
2. Ship independent correctness fixes and low-risk cleanup without waiting for the performance baseline.
3. Close current persistence leaks behind the real-database transaction and rollback characterization.
4. Pilot optional repositories on one low-risk model, `ShowStatus`.
5. Consolidate the show reference catalog, then let [Phase 5 roadmap item 18](../../../../docs/roadmap/PHASE_5.md#18-show-lifecycle-state-machine) activate the show-operations lifecycle work when it starts.
6. Establish performance baselines before any trigger-gated schedule-publishing decomposition or MCP runtime narrowing.
7. Slim the MCP runtime and optimize only measured hot paths.
8. Re-evaluate CQRS or asynchronous processing only at explicit decision gates.

Execute accepted work through the [`codebase-hardening-program`](../../../../.agents/skills/codebase-hardening-program/SKILL.md) lifecycle. This guide fixes the direction and decision gates; it is not a parallel backlog. Convert selected work into independently reviewable items, keep the baseline green, characterize behavior before structural changes, reconcile the tracker after merges, and retire residuals to the canonical tech-debt register. Correctness changes remain separate, explicitly behavior-changing items that flip characterization tests to the intended expectation.

## What DDD Means Here

Domain-Driven Design is not a folder template, an ORM pattern, or a requirement to use CQRS. It is a way to make software structure follow the business model.

DDD has two useful levels:

### Strategic DDD

Strategic DDD decides:

- which business capabilities belong together;
- where one meaning of a term ends and another begins;
- which modules should own which rules and data changes;
- how capabilities communicate without sharing all internals.

Its main tools are ubiquitous language, bounded contexts, context relationships, and explicit ownership. This is the level that offers the greatest immediate value to `erify_api`.

### Tactical DDD

Tactical DDD supplies implementation patterns such as entities, value objects, aggregates, repositories, domain services, factories, and domain events.

These are optional tools. They are valuable when a business concept has identity, invariants, or coordinated state changes. They are overhead when applied to simple reference-data CRUD.

The authoritative [DDD Reference](https://www.domainlanguage.com/ddd/reference/) describes both sets of patterns. Nothing in DDD requires every database row to become a rich object.

## How This Differs From the Current Structure

The current code uses several good architectural ideas, but its primary axes are database models and transport audiences:

```text
HTTP audience              Shared workflows              Persistence-shaped models
admin/                     schedule-planning/            models/show/
studios/        ------->   show-orchestration/  ------>  models/show-status/
me/                        task-orchestration/            models/show-platform/
backdoor/                  orchestration/                 models/task/
google-sheets/                                         ...one module per model
```

This has three consequences:

1. One business change often crosses distant audience, orchestration, model, schema, and repository folders.
2. A small Prisma model commonly receives its own Nest module, service, repository, schema, and tests even when the repository only mirrors Prisma.
3. Complex workflows grow in audience-specific services because no single capability module clearly owns the whole use case.

A capability-first structure reverses the primary axis:

```text
REST controller ┐
MCP tool        ├─> capability public API ─> use case or query ─> persistence
future worker   ┘            │
                              └─> pure policy/value object where useful
```

Admin, studio, me, integration, and MCP remain authorization and transport concerns. They do not define the domain decomposition.

## Repository-Grounded Findings

The following is a static architecture snapshot, not a runtime performance
benchmark. The exact output from source snapshot `f677b627` is committed as
[`architecture-signals-baseline.json`](./architecture-signals-baseline.json).
Run `pnpm architecture:signals` to produce a current comparison. The command
scans `apps/erify_api/src/**/*.ts`, counts physical lines including blanks and
comments, treats each unique static import between local `*.module.ts` files as
one directed edge, detects cycles with depth-first search, and calculates the
MCP closure from `McpAppModule` including the entry module.

| Signal | Current evidence | Interpretation |
| --- | ---: | --- |
| Nest modules | 90 | High navigation and registration breadth |
| Static local module edges | 293 | A wide dependency graph |
| Detected static module cycles | 0 | The graph is broad, not cyclic |
| Modules at or below 20 LOC | 74 | Much of the graph is registration ceremony |
| Model modules | 27 | The model layer largely mirrors tables |
| Production services | 68 | Services are already the main business API |
| Repositories | 30 | Repository value varies substantially by model |
| Controllers | 53 | Transport surfaces are well separated by audience |
| Specs | 156 | Local unit coverage is a strength |
| Actual E2E test files | 0 | Module wiring and real transaction behavior lack a broad safety net |
| `McpAppModule` reachable modules | 24 | Four read-only tools boot write-heavy task and extraction modules |

The dependency graph is not failing because Nest has too many modules in the abstract. Nest recommends feature modules that group closely related capabilities and treats exports as the module's public interface. The mismatch is that many current modules represent one persistence model rather than one useful capability. See the [Nest modules guidance](https://docs.nestjs.com/modules).

### Strong Existing Patterns To Preserve

- Zod validation and response serialization.
- Snake-case API contracts separated from camel-case service payloads.
- External UIDs instead of database IDs.
- CLS transaction propagation and explicit transaction-aware delegates.
- Optimistic locking for semantic user mutations.
- Soft-delete and audit-history conventions.
- Bulk relation reads and lean read projections in optimized paths.
- Audience-specific guards and route prefixes.
- Focused task orchestration sub-services behind a stable facade.
- Extensive unit and regression specs around high-risk workflow code.

### Priority Architecture Problems

#### 1. Persistence Is Both Hidden And Leaked

The written convention says repositories are private module implementations and orchestration services inject model services. The implementation exports six repositories and imports repositories directly across show orchestration and studio show management.

Examples include:

- [`show-orchestration.module.ts`](../../src/show-orchestration/show-orchestration.module.ts), which imports 14 modules;
- [`show-orchestration.service.ts`](../../src/show-orchestration/show-orchestration.service.ts), which imports show-family repositories directly;
- [`studio-show-management.service.ts`](../../src/studios/studio-show/studio-show-management.service.ts), which combines model services, repositories, and `TransactionHost` access.

Some direct repository access is justified by bulk writes, transaction visibility, or projection needs. The problem is that the public contract does not say which access is intentional. Callers can bypass model-service invariants whenever an exported repository is convenient.

**Direction**: make each capability expose a small service/query surface. Keep complex persistence private. If a model service cannot support a required atomic operation, add a capability-owned persistence method instead of exporting a general repository.

#### 2. `BaseRepository` Is A Leaky Abstraction

[`base.repository.ts`](../../src/lib/repositories/base.repository.ts) mirrors Prisma CRUD using broad `Record<string, any>` and `any` parameters. It creates consistent soft-delete calls, but it does not hide Prisma's query model and it cannot reliably provide transaction semantics.

At the original source snapshot, inherited methods bound to the unbounded
`PrismaService`, and generic `restore()` targeted active rather than deleted
rows. T9 closed both defects behind the isolated PostgreSQL gate: the wrapper
now resolves `TransactionHost.tx` lazily and restore targets
`deletedAt: { not: null }`. `BaseRepository` remains non-default because its
broad generic query surface is still a leaky abstraction, not because its
transaction and restore semantics remain broken.

**Direction**:

- Keep the repaired generic semantics covered, but do not expand the abstraction
  by default.
- Keep named persistence modules for complex queries, conditional writes, optimistic locking, raw SQL, audit storage, and multi-row lifecycle changes.
- Allow a shallow capability service to use its transaction-aware Prisma delegate directly when a repository adds no policy or reuse.
- Do not introduce a repository interface for a single Prisma implementation. One adapter is a hypothetical seam; two adapters are a real seam.

#### 3. Small CRUD Has Too Much Ceremony

`ShowStatus` demonstrates the pattern:

- [`show-status.module.ts`](../../src/models/show-status/show-status.module.ts) registers a service, repository, Prisma, and utility module;
- [`show-status.service.ts`](../../src/models/show-status/show-status.service.ts) generates a UID and delegates most methods;
- [`show-status.repository.ts`](../../src/models/show-status/show-status.repository.ts) mainly restates Prisma CRUD and pagination.

The service is a useful public API. The separate repository is not clearly earning its extra seam.

`UtilityService` is another shallow module: it wraps UID generation and time-range overlap, yet `UtilityModule` is imported by 48 modules. Pure deterministic functions do not require Nest dependency injection merely to be testable.

**Direction**: preserve a stable service API but fold shallow persistence and pure utilities. Measure reduced imports, mocks, files, and navigation steps in the pilot.

#### 4. Complex Workflows Are Under-Decomposed

Two files contain several capabilities behind one class:

- [`studio-show-management.service.ts`](../../src/studios/studio-show/studio-show-management.service.ts): 1,421 LOC and 18 injected collaborators. It owns create, update, detail, deletion, cancellation, conflict resolution, publish-run listing and filtered publish-impact reads, audit reads, assignment replacement, and performance correction.
- [`publishing.service.ts`](../../src/schedule-planning/publishing.service.ts): 1,025 LOC and 11 collaborators. Its `publish()` transaction performs validation, diff planning, publish-run recording, lifecycle decisions, row updates, task reconciliation, relation synchronization, conflict handling, and audit writes with a 30-second timeout.

These are not arguments for one handler class per endpoint. They are evidence for a few cohesive internal modules:

- show CRUD and assignment synchronization;
- show cancellation/conflict resolution;
- show performance correction;
- publish diff planning;
- transactional publish application;
- publish impact/audit queries.

Keep one stable public facade when it improves locality for callers. The task orchestration refactor is a useful precedent: several cohesive internal services sit behind [`task-orchestration.service.ts`](../../src/task-orchestration/task-orchestration.service.ts).

#### 5. Transport Organization Scatters One Capability

Show changes frequently co-change across `studios/studio-show`, `show-orchestration`, and `models/show*`. Recent history also shows repeated co-change between schedule planning and studio show management. This is a locality problem: business rules are placed according to who calls them and which table they touch rather than who owns the use case.

**Direction**: colocate HTTP controllers, application services, policies, and private persistence under the capability that changes together. Keep route prefixes and guards unchanged.

#### 6. Runtime Composition Is Broader Than The Exposed MCP Surface

[`mcp-app.module.ts`](../../src/mcp/mcp-app.module.ts) imports `TaskModule` and the full `TaskOrchestrationModule`. Static reachability includes fact extraction, shift alignment, audit, task-template, membership, user, and most show-model modules. The tools are read-only.

[`mcp-tool.service.ts`](../../src/mcp/mcp-tool.service.ts) also has two specific read concerns:

- `limit` has a minimum and default but no hard maximum;
- `getTask()` first performs a scoped read and then a second broader relation read.

**Direction**: introduce narrow `TaskQueries` and `ShowQueries` providers that perform scoped, DTO-shaped reads in one query. Import only those providers into MCP. This implements command/query separation without a bus and advances the existing [Backend Runtime Boundaries](../../../../docs/ideation/backend-runtime-boundaries.md) direction.

#### 7. Performance Safety Is Uneven

Architecture cleanup does not automatically improve request latency. Moving files and reducing Nest imports mainly improves comprehension, test setup, and possibly bootstrap cost. Database round trips, payload size, locking, and algorithms determine request performance.

Concrete risks to measure or constrain include:

- MCP list limits have no hard maximum.
- Bulk schedule schemas allow 1,000 items while the services intentionally execute per-item writes sequentially for partial success.
- Schedule publishing performs multiple per-show reads and writes inside a transaction that may hold an advisory lock for up to 30 seconds.
- Some service-layer code constructs Prisma filters or orderings, so query ownership is inconsistent.

The existing [API Performance Evaluation and Optimization](../../../../docs/ideation/api-performance-optimization.md) correctly notes that there is no demonstrated production-wide latency crisis. Therefore:

- fix unbounded input and obvious redundant-query risks;
- instrument query count, transaction duration, payload size, and P50/P95/P99 before broader optimization;
- do not claim performance gains from folder reorganization;
- preserve the shipped lean projections documented in [Read-Path Optimization](../READ_PATH_OPTIMIZATION.md).

#### 8. Tests Protect Classes Better Than Architecture

The largest production files generally have sibling specs, and guards, controllers, and services have strong unit coverage. However, no actual E2E test file currently boots the API and exercises a real route. Most service tests mock repositories, so they cannot prove:

- Nest module import/export closure;
- real CLS commit and rollback behavior;
- soft-delete visibility through inherited versus transaction-aware delegates;
- controller-to-database serialization parity;
- MCP runtime boot closure.

**Direction**: add a small architecture characterization suite before moving files. A few high-value integration tests are more useful than duplicating every unit case at E2E level.

### Lower-Priority Cleanup Signals

- `AdminModule`, `BackdoorModule`, `MeModule`, and `StudiosModule` re-export child modules even though only `AppModule` imports those aggregators. Treat imports-only composition modules as roots, not public barrels.
- [`studio-show.module.ts`](../../src/studios/studio-show/studio-show.module.ts) imports `AuditModule` twice.
- [`openapi.module.ts`](../../src/lib/openapi/openapi.module.ts) is an empty dynamic module with no providers or exports.
- Several public service signatures still expose Prisma types, including generic task includes and `Prisma.Decimal`, despite the documented service convention.
- `StudioGuard` uses `any` for membership even though membership is an authorization-critical value.
- The canonical examples in [Read-Path Optimization](../READ_PATH_OPTIMIZATION.md) still point to task-orchestration methods that have since moved behind concern services, showing normal documentation drift after structural refactors.

These are worthwhile cleanup tasks, but they should not delay the transaction-safety and capability-boundary work.

### Things That Are Not Automatically Anti-Patterns

- **Many modules**: a module is justified when it encapsulates a meaningful public API. The problem is shallow modules, not the count alone.
- **Repositories**: a deep repository that owns non-trivial persistence is valuable. A CRUD mirror is not.
- **Orchestration services**: cross-model workflow coordination is appropriate. A service becomes problematic when it accumulates unrelated workflows or exposes persistence internals.
- **Large files**: [`fact-extraction.service.ts`](../../src/orchestration/fact-extraction/fact-extraction.service.ts) is large but has an accepted, trigger-based split plan in [`fact-extraction-service-size.md`](../../../../docs/tech-debt/fact-extraction-service-size.md). `TaskReportRunService` is also largely one projection algorithm. Split by cohesion and change patterns, not LOC alone.
- **Anemic reference data**: show types, statuses, standards, and platforms do not need rich domain objects merely to satisfy DDD terminology.
- **One database**: DDD bounded contexts and CQRS responsibilities can share one PostgreSQL database in a modular monolith.

## Recommended Target Architecture

### Top-Level Shape

```text
src/
├─ capabilities/
│  ├─ show-catalog/
│  ├─ show-operations/
│  ├─ schedule-planning/
│  ├─ task-management/
│  ├─ studio-workforce/
│  ├─ compensation/
│  └─ reporting/
├─ runtimes/
│  ├─ rest/
│  ├─ mcp/
│  └─ worker/                 # only when a real worker exists
├─ infrastructure/
│  ├─ database/
│  ├─ auth/
│  ├─ logging/
│  └─ storage/
└─ shared/
   ├─ errors/
   ├─ pagination/
   └─ pure utilities/
```

This is a destination map, not a request for a single mass move. Existing paths should move only when their owning capability is actively refactored.

### Capability Module Shape

Use the smallest structure that makes one capability readable:

```text
show-operations/
├─ show-operations.module.ts
├─ show-operations.service.ts       # small public write facade
├─ show-queries.service.ts          # public read API
├─ show-crud.service.ts             # internal cohesive use cases
├─ show-cancellation.service.ts     # internal lifecycle rules
├─ show-performance.service.ts      # internal correction workflow
├─ policies/                        # pure rules only when useful
├─ persistence/                     # private, only for deep persistence
└─ http/
   ├─ admin-show.controller.ts
   └─ studio-show.controller.ts
```

For a small capability, keep files flat. Do not create `application/`, `domain/`, `infrastructure/`, `commands/`, and `queries/` folders when each would contain one file.

### Candidate Bounded Contexts

These are working boundaries to validate through language, ownership, and co-change—not final microservice boundaries.

| Candidate context | Owns | Notes |
| --- | --- | --- |
| Show Catalog | Show type, status, standard, platform reference data | Simple CRUD; tactical DDD adds little |
| Show Operations | Show lifecycle, assignments, cancellation, conflicts, operational actuals | Highest immediate DDD value |
| Schedule Planning | Plan documents, validation, snapshots, publish diff and application | Already capability-shaped; deepen it |
| Task Management | Templates, snapshots, tasks, targets, assignment, submission | Already has useful facade and explicit lifecycles |
| Studio Workforce | Membership, creator roster, shifts, rooms | May remain several modules until co-change supports consolidation |
| Compensation and Costs | Line items, snapshot readiness, cost calculation | Needs explicit money and audit decisions |
| Fact Extraction and Reporting | Fact routing, projections, review/export | Supporting contexts with specialized read/write needs |

Do not force all tables into one of these immediately. Audit, auth, uploads, and infrastructure can remain supporting modules.

### Candidate Aggregate Decisions

Use aggregates to define atomic invariants, not to reproduce relation diagrams.

| Candidate | Likely invariant scope | Caution |
| --- | --- | --- |
| Show lifecycle | Show status, cancellation/conflict state, assignment changes that must remain consistent | Tasks have their own lifecycle and should not automatically become children of one giant Show aggregate |
| Schedule publication | Schedule version, plan validation, publish diff, snapshots, show reconciliation | The workflow may coordinate several aggregates inside an application transaction |
| Task | Content, status transition, version, assignee, targets required for task validity | Template snapshots remain immutable references |
| Task template | Current version and creation of immutable snapshots | Existing tasks must not be mutated through the template aggregate |
| Compensation line item | Target validity, amount, audit context | Do not make derived totals aggregate state |

Prisma records remain persistence shapes. A domain object or value object is warranted only when it centralizes a rule that is otherwise duplicated or hard to test.

## Rails, NestJS, And The Recommended Service Layer

The useful Rails qualities are convention, locality, recognizable naming, and a short path from request to business rule. They can be adopted without emulating Active Record.

Recommended mapping:

| Rails idea | NestJS equivalent here |
| --- | --- |
| Controller stays thin | Controller validates/translates and calls a capability API |
| Model owns simple record behavior | Prisma owns persistence shape; a capability service owns business behavior |
| Service object for workflow | Named internal use-case service |
| Concern/policy for reusable rule | Pure function or small policy/value object |
| Convention over configuration | Consistent capability layout and public API naming |

Do not wrap Prisma rows in stateful Active Record-style classes. Prisma does not use that lifecycle, and emulating it would create more mapping and surprise.

## Persistence Decision Matrix

Repositories should be optional and evidence-based.

| Situation | Recommended implementation |
| --- | --- |
| Simple single-model CRUD, one caller, no reusable query policy | Capability service uses `TransactionHost.tx.<model>` directly |
| Repeated complex filtering, projection, pagination, or aggregation | Private named `*Queries` provider |
| Atomic conditional write, optimistic lock, raw SQL, advisory lock, bulk lifecycle operation | Private repository or `*Store` provider |
| Multiple persistence implementations or a real external adapter | Port/interface plus adapters |
| Test seam only, one concrete implementation | Mock the concrete provider; do not create an interface solely for mocking |

Every option must preserve:

- `deletedAt: null` on active reads;
- transaction visibility through `TransactionHost.tx`;
- scoped write predicates;
- UID-only public contracts;
- audit and optimistic-lock behavior;
- bounded list and bulk inputs.

This matrix was accepted after the `ShowStatus` pilot. T12 reconciled every
instruction and architecture document that asserted “repository for all DB
access,” including `AGENTS.md`, the service/repository/orchestration/design and
database skills, tool-specific agent guidance, and
`docs/engineering/ARCHITECTURE_OVERVIEW.md`.

## CQRS: What It Is And Why Not Yet

CQRS means **Command Query Responsibility Segregation**. It separates models and code responsible for changing state from those responsible for reading state. It does not inherently require separate databases.

There are several adoption levels:

| Level | Write side | Read side | Storage |
| --- | --- | --- | --- |
| 0. Conventional service | CRUD-oriented methods | Same service | Same DB |
| 1. Semantic separation | Task-oriented write methods | Named query methods | Same DB |
| 2. Provider separation | Write use-case services | `*Queries` providers with DTO projections | Same DB |
| 3. Nest CQRS infrastructure | Command/Query buses and handlers; optional events/sagas | Query handlers | Usually same DB initially |
| 4. Independent read model | Commands emit reliable changes | Denormalized/materialized read store | Same or separate DB, eventual consistency |

`erify_api` should move from levels 0/1 toward level 2 in read-heavy and workflow-heavy capabilities.

The official [Nest CQRS guide](https://docs.nestjs.com/recipes/cqrs) adds `CommandBus`, `QueryBus`, `EventBus`, handlers, aggregate-root helpers, and sagas. It does not configure a second database or solve synchronization automatically.

### Why A Global CQRS Bus Is Not Suitable Yet

- The stated problem is too many files, imports, exports, and layers. A command, handler, query, handler, event, and registration array per operation initially increases all four.
- Most CRUD models do not have different read and write models.
- Existing transactions are synchronous and tightly coordinated; replacing direct calls with events would require explicit consistency and error semantics.
- There is no demonstrated need to scale reads and writes independently.
- There is no reliable event/outbox foundation for rebuilding separate read models.
- The current service call graph is debuggable with ordinary stack traces. Buses would add runtime dispatch indirection before they add leverage.

### CQRS Decision Gates

Consider `@nestjs/cqrs` for one capability only when at least two of these are true:

- one command has multiple independently evolving consumers;
- a long-running workflow needs explicit saga or compensation behavior;
- REST, MCP, and workers dispatch the same task-oriented command and direct service composition has become unstable;
- read projections differ materially from write models and have independent performance needs;
- a reliable outbox/event-delivery mechanism exists;
- handler discovery, tracing, and operational ownership are defined.

Consider a separate read store only when measured load, query complexity, historical analytics, or availability requirements justify eventual consistency. The deferred data-warehouse and analytics plans should remain separate from this structural refactor.

## Governance: How Architecture Triggers Become Work

Architecture thresholds should route review, not act as automatic pattern installers. A 601-line file, a ninth collaborator, or a wider module graph is evidence to inspect cohesion; it is not sufficient evidence to introduce DDD tactical objects, CQRS buses, a new repository layer, or another runtime.

Use four trigger classes:

| Trigger class | Examples | Response |
| --- | --- | --- |
| Hard invariant | Transaction visibility regression, unbounded input, leaked internal ID, new module cycle, unjustified cross-capability persistence access | Resolve in the current PR before merge |
| Local design signal | Backend file above roughly 600 LOC, frontend route/feature above roughly 200 LOC, service above roughly eight collaborators | Review cohesion; split, document an exception, or maintain an active split plan |
| Strategic decision gate | CQRS, worker runtime, separate read model, package extraction, or a port with a second real adapter | Begin an architecture decision only when the documented evidence gates are met |
| Repository trend | Module breadth, shallow-module count, dependency-graph width, runtime import closure | Compare periodically; investigate meaningful regression rather than an isolated count |

### Pull Request Review

Every pre-merge review should run the architecture trigger audit in [the canonical PR review workflow](../../../../.agents/workflows/pr-review.md). The audit is diff-scoped: check only triggers caused, crossed, or materially changed by the PR and record one outcome:

- `NOT TRIGGERED`;
- `TRIGGERED — HANDLED`;
- `TRIGGERED — REGISTERED` in the canonical tech-debt or ideation register;
- `BLOCKING` for a hard invariant violation.

In Codex, invoke the bridge skill explicitly when reliability matters:

```text
$pr-ready review the current branch against origin/master
```

Codex may also select the skill implicitly from a request such as “is this PR ready to merge?”, but a Markdown workflow file does not execute by itself. The repository skill reads and executes the canonical workflow.

### Periodic Repository Health

Repository-wide trends need a separate bookkeeping cadence because one PR cannot determine whether the overall architecture is drifting. Run [the repository health workflow](../../../../.agents/workflows/repository-health.md) at each phase boundary or within three months, whichever comes first. A monthly scheduled scan may provide an earlier read-only signal:

```text
Every month, run $repository-health for this project. Compare architecture
signals with the previous snapshot, reconcile verified triggers, and report
findings without implementing refactors or creating a parallel backlog.
```

The scheduled scan should discover and compare signals. Human review decides whether evidence warrants implementation. Performance gates should use runtime measurements and observability rather than source counts.

Capability-first placement and the persistence matrix are accepted for new
work. The generic trigger-audit process applies to both decisions.

## Phased Refactoring Plan

Phases 4 and 5 are destination maps, not scheduled folder-migration waves. Phase 4 activates when [Phase 5 roadmap item 18](../../../../docs/roadmap/PHASE_5.md#18-show-lifecycle-state-machine) starts, or when an earlier show-operations change already requires the same structural decomposition. Item 18 builds the canonical lifecycle transition service inside `ShowOperationsModule`; it must not introduce a fifth status writer or perform a standalone folder move.

Phase 5 activates only when item 18's schedule-publish integration touches `PublishingService`, or when measured query count, lock duration, rollback risk, or maintainability evidence independently justifies decomposition. Until then, preserve the current publishing facade and transactional boundary.

### Phase 0a — Isolated Safety Harness

Before persistence-boundary or behavior-bearing structural changes:

1. Add a small real-database integration harness for PostgreSQL/Prisma and CLS using a dedicated test database or disposable container. It must not share the Docker Compose development volume or accept the development `DATABASE_URL`; destructive reset commands may target only the explicitly validated test database.
2. Characterize one shallow CRUD flow, one show workflow, one schedule publish rollback, and MCP runtime boot.
3. Capture API response shapes and soft-delete/audit side effects.

Minimum gates:

- transaction writes roll back together;
- reads inside the transaction see earlier writes;
- active reads exclude soft-deleted rows;
- public responses contain UIDs, not internal IDs;
- current unit suite remains green.

Phase 0a gates the generic restore/lazy-delegate work, the `ShowStatus` persistence pilot, and any behavior-bearing decomposition that could change transaction or soft-delete behavior. It does not block independent correctness fixes already covered by focused unit or wiring tests.

### Phase 0b — Architecture And Performance Baselines

Before Phases 5–6 or any PR claiming performance improvement:

1. Maintain `pnpm architecture:signals` as the reproducible module-graph and MCP-closure checker, and keep its `pr-ready` enforcement point current as runtime entry modules change.
2. Record the command output as the comparison baseline for module nodes, edges, cycles, shallow modules, exported repositories, and MCP reachable modules.
3. Record query count, payload size, lock duration, and latency for selected show, task, MCP, and publish paths.

Phase 0b is observability work. It does not block Phase 1 correctness fixes or the Phase 2 pilot when those changes make no performance claim and their Phase 0a safety gates are satisfied.

### Phase 1 — Correctness And Low-Risk Ceremony Cleanup

| Work item | Required gate |
| --- | --- |
| Add hard maximums to MCP list queries | Ship as an independent live-surface fix using the existing MCP specs; do not wait for Phase 0 |
| Remove the duplicate `AuditModule` import, other unused module imports, and unnecessary root re-exports | Module wiring test plus build; do not wait for Phase 0 |
| Remove the empty OpenAPI dynamic module if it has no runtime role | Bootstrap/OpenAPI wiring verification plus build; do not wait for Phase 0 |
| Type the authorization membership value in `StudioGuard` | Focused guard specs and typecheck; do not wait for Phase 0 |
| Replace `UtilityService` with pure UID/time utilities, or narrow it to an actual injectable adapter | Existing unit baseline and focused utility/service specs; no real-database dependency |
| Fix or remove generic `BaseRepository.restore()` and implement the transaction-aware lazy delegate, or stop inherited base writes in transactions | Phase 0a real-database transaction, restore, and rollback characterization |
| Reassess the 1,000-item schedule bulk limit | Phase 0a harness plus task-scoped timeout/partial-success measurements; preserve the established sequential partial-success contract unless measurements justify change |

Keep these changes in small PRs. Do not combine them with folder moves.

The restore/lazy-delegate PR must update `repository-pattern-nestjs` §6, `soft-delete-restore`, `database-patterns` §1/§3, and close or rewrite the lazy-delegate row in `erify-api-refactor-residuals.md`. The UtilityService PR must reconcile `service-pattern-nestjs`, including the `BaseModelService` UID-generation contract.

### Phase 2 — Optional Repository Pilot: `ShowStatus`

Keep `ShowStatusService`'s public methods and API contracts stable. Fold the shallow repository into the service using the transaction-aware delegate, or replace it with a small private query provider if pagination warrants one.

Evaluate:

- files and Nest registrations removed;
- imports and test mocks removed;
- readability from controller to database;
- soft-delete and transaction parity;
- whether any caller actually needed a repository API;
- whether direct Prisma types leaked into the public service contract.

Do not generalize until the pilot passes behavior, rollback, and reviewability checks.

**Pilot result (2026-07-24): passed.** Folding persistence into
`ShowStatusService` removed one production file, one Nest provider registration,
and the repository mock seam. The service keeps its caller-facing methods,
builds only the bounded filter shapes its callers use, and exposes
schema-defined types rather than `Prisma.*` signatures. Focused caller tests and
the isolated PostgreSQL harness preserved active-row filtering, soft delete,
transaction visibility, and rollback. T12 accepted the result and reconciled
the persistence doctrine. Existing repositories are not migration debt by
default; migrate them only when touched and only when the matrix selects a
simpler boundary.

### Phase 3 — Consolidate The Show Catalog Capability

If the pilot succeeds, group show type, status, standard, and platform reference data under one `ShowCatalogModule`. Keep focused service names if callers benefit from them, but remove one-Nest-module-per-table registration where no independent public interface exists.

Move admin catalog controllers next to the capability while preserving routes and guards. The module should export only the services or queries used by other capabilities.

**Result (2026-07-24): completed.** `ShowCatalogModule` owns show type,
status, standard, and platform registration plus their four admin controllers.
It replaced eight table/audience wrapper modules without changing controller
prefixes. The module exports only the four focused services; platform UID
lookups now cross the boundary through `PlatformService`, leaving
`PlatformRepository` private. Static signals improved from 90 to 83 Nest
modules, 293 to 269 local module edges, and 75 to 68 modules at or below 20
lines, with zero cycles before and after.

### Phase 4 — Trigger-Gated Show Operations

Activate this phase with roadmap item 18 or an earlier show-operations change that requires the same capability boundary. Create a `ShowOperationsModule` as the owner of show lifecycle workflows, and implement item 18's canonical lifecycle transition service inside it. Move code incrementally from `studios/studio-show` and `show-orchestration` behind a stable public API; do not create a fifth status writer or run a standalone folder migration.

Suggested first slices:

1. performance correction;
2. cancellation and conflict resolution;
3. create/update plus platform assignment replacement;
4. read-only publish impacts and audit queries.

After each slice, remove the corresponding collaborators and private helpers from `StudioShowManagementService`. Split the 675-line controller by sub-resource if that makes route ownership clearer; multiple focused controllers may share the same route prefix.

### Phase 5 — Trigger-Gated Schedule Publishing

Activate this phase when item 18 routes schedule-publish transitions through the lifecycle service and that integration requires `PublishingService` decomposition, or when Phase 0b measurements expose material query, lock, rollback, or maintainability risk. Otherwise keep the current facade intact.

Preserve one transactional entry point while separating:

- a pure publish-diff planner;
- a transactional apply processor;
- relation synchronization;
- task reconciliation;
- conflict and impact recording.

Do not place independent `@Transactional()` decorators on internal steps and assume they create independent commits. Keep the atomic boundary explicit and test rollback with a real database.

Measure advisory-lock duration and query count before replacing per-row operations. Batch only where business outcomes and audit detail remain equivalent.

### Phase 6 — Narrow Queries And Runtime Modules

- Introduce scoped `ShowQueries` and `TaskQueries` providers.
- Make MCP depend only on those read providers and its authorization policy.
- Collapse MCP task scope validation and relation loading into one scoped query.
- Keep REST controllers and future workers as thin adapters over the same capability APIs.
- Extract a runtime-core module only if it removes the duplicated Config/Logger/CLS setup without making domain providers global.

### Phase 7 — Reassess Advanced Patterns

After the modular-monolith cleanup, review evidence for:

- `@nestjs/cqrs` in one workflow-heavy context;
- BullMQ and a worker runtime for genuinely asynchronous work;
- materialized/read models for measured reporting needs;
- package extraction only after a second real consumer exists;
- separate databases only for scaling, isolation, or analytics requirements.

### Per-Phase Knowledge Sync

Each implementation PR updates only the knowledge artifacts whose asserted pattern changed. This table is the minimum routing set; `knowledge-sync` must also discover any additional file that makes the same assertion.

| Phase | Minimum knowledge reconciliation |
| --- | --- |
| 0a | `backend-testing-patterns`, `database-patterns`, and the real-database test runbook/configuration |
| 0b | `engineering-best-practices-enforcer`, `pr-review.md`, `repository-health.md`, and this guide's reproducible baseline |
| 1 | `service-pattern-nestjs`, `repository-pattern-nestjs` §6, `soft-delete-restore`, `database-patterns` §1/§3, and `erify-api-refactor-residuals.md` |
| 2 | Every repository-first doctrine location named in the Persistence Decision Matrix acceptance gate, plus the `ShowStatus` feature/module documentation |
| 3 | `design-patterns`, `backend-controller-pattern-nestjs`, and `docs/engineering/ARCHITECTURE_OVERVIEW.md` |
| 4 | `show-production-lifecycle`, `orchestration-service-nestjs`, `backend-large-file-refactor`, and [Phase 5 roadmap item 18](../../../../docs/roadmap/PHASE_5.md#18-show-lifecycle-state-machine) |
| 5 | `schedule-continuity-workflow`, `orchestration-service-nestjs`, `database-patterns`, item 18's schedule-publish integration, and schedule-planning documentation |
| 6 | MCP/runtime documentation, `service-pattern-nestjs`, `openwebui-mcp-tool-integration`, and `backend-runtime-boundaries.md` |
| 7 | Only the skill, ideation/ADR, runtime documentation, and operational guidance for the advanced pattern actually accepted |

## Verification Gates For Every Migration Slice

### Behavior

- Route, guard, request, response, and error contracts are unchanged unless explicitly versioned.
- Soft delete, restore, audit, optimistic-lock, and idempotency behavior match characterization tests.
- Admin, studio, integration, and MCP paths exercise the same domain invariants.

### Architecture

- No new module cycle or `forwardRef`.
- A capability exports a deliberate public API, not repositories or internal processors.
- Transport adapters do not own business rules.
- New TypeScript interfaces correspond to real adapters, not speculative seams.
- The path from a controller/tool to the owning rule becomes shorter.

### Performance

- Query count and payload size do not regress.
- Bulk input has a documented hard maximum.
- Transaction and advisory-lock duration stay within the recorded budget.
- Independent reads use concurrency where transaction semantics permit it.
- Pagination remains bounded.

### Quality

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api test`
- `pnpm --filter erify_api build`
- targeted real-database integration tests
- `pnpm architecture:signals`, compared with the recorded module-graph and MCP-closure baseline
- documentation and skill knowledge sync

## Success Measures

Do not use total module count as the only target. Prefer these measures:

- No repository is exported without a documented complex-persistence reason.
- Shallow CRUD requires fewer files and mocks while retaining a stable service API.
- Complex capabilities expose one or two clear public providers.
- No workflow service has an unexplained constructor with more than roughly eight collaborators.
- Files above the backend size trigger have either a cohesive exception or an active split plan.
- Public service signatures contain domain/API payloads, not Prisma query types.
- MCP boots only read-side capability modules; its current 24-module closure materially decreases.
- High-risk workflows have real rollback and route-level characterization tests.
- Measured query count, payload size, and latency do not regress.
- A new engineer can locate a business rule from its route or domain term without searching across audience, model, and orchestration trees.

## Decisions To Confirm Before Implementation

The recommended answers are included so discussion can focus on the real tradeoffs.

1. **May simple capability services use `TransactionHost.tx` directly?** Recommended: yes, when a repository is a CRUD mirror and the service keeps Prisma types out of its public contract.
2. **Should controllers move from audience folders into capability folders?** Recommended: yes, incrementally. Preserve route prefixes and authorization decorators; use runtime root modules only for composition.
3. **Should all repositories be removed?** Recommended: no. Retain deep persistence modules and make them private.
4. **Should `@nestjs/cqrs` be introduced during this refactor?** Recommended: no. First implement named write use cases and query providers with direct calls.
5. **Which pilots proved the direction?** `ShowStatus` proved selective
   repository removal; `ShowCatalogModule` proved capability consolidation.
   Show-operations remains gated by roadmap item 18.
6. **Should performance be a claimed outcome?** Recommended: only for changes with before/after query, payload, lock-duration, or latency evidence. Structural simplicity is a separate outcome.

## Related Guidance

- [System Architecture Overview](../../../../docs/engineering/ARCHITECTURE_OVERVIEW.md)
- [Business Domain](../../../../docs/domain/BUSINESS.md)
- [Backend Runtime Boundaries](../../../../docs/ideation/backend-runtime-boundaries.md)
- [API Performance Evaluation and Optimization](../../../../docs/ideation/api-performance-optimization.md)
- [Repository Refactor Residuals](../../../../docs/tech-debt/erify-api-refactor-residuals.md)
- [Fact Extraction Size Decision](../../../../docs/tech-debt/fact-extraction-service-size.md)
- [Codebase Hardening Program](../../../../.agents/skills/codebase-hardening-program/SKILL.md)
- [Phase 5 Roadmap](../../../../docs/roadmap/PHASE_5.md)
- [Read-Path Optimization](../READ_PATH_OPTIMIZATION.md)
- [Architecture Direction — Visual Companion](./architecture-refactoring-visual.html)
- [Architecture Refactoring — Implementation Roadmap](./ARCHITECTURE_REFACTORING_ROADMAP.md)
- [NestJS Modules](https://docs.nestjs.com/modules)
- [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs)
- [Prisma With NestJS](https://www.prisma.io/docs/guides/frameworks/nestjs)
- [DDD Reference](https://www.domainlanguage.com/ddd/reference/)
