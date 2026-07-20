---
name: erify-api-capability-refactoring
description: >
  Guide refactoring decisions in apps/erify_api. Use when changing NestJS modules,
  services, repositories, Prisma access, transactions, complex workflows, read paths,
  MCP composition, or tests. Prefer capability ownership and explicit use cases while
  preserving established correctness conventions.
---

# `erify_api` Capability Refactoring Skill

## Authority and Deprecation Policy

This is the authoritative architecture skill for all new `erify_api` code and every refactoring task. Read and apply it before any lower-level implementation skill.

The following skills are deprecated architectural patterns and must not be used to select a design:

- `service-pattern-nestjs`
- `repository-pattern-nestjs`
- `orchestration-service-nestjs`

They may be consulted only for safety constraints while maintaining untouched legacy code whose architecture is explicitly outside the task scope. They must not justify adding new model-shaped services, default repositories, `BaseRepository`, generic orchestration services, or table-first modules.

When instructions conflict, this skill wins. Refactoring should actively remove deprecated patterns when doing so is within the selected capability scope and characterization coverage protects behavior.

## Purpose

Use this skill to refactor `apps/erify_api` incrementally from a table-first NestJS
layout toward a capability-oriented modular monolith.

This is not a mandate to rewrite the application into full DDD or to adopt
`@nestjs/cqrs` everywhere. The target is a pragmatic architecture:

```text
transport adapter
  -> capability API
  -> command/use case or query provider
  -> private persistence
  -> PostgreSQL through Prisma
```

The same capability may use direct transaction-aware Prisma access, a specialized
repository, pure policies, or domain objects. Choose the least complex design that
protects the workflow's invariants.

## Repository Assessment

Snapshot reviewed: `fe2124364809776a345b8e1cb687a9e90f0fbbca`.

The existing architecture guide correctly identifies the main structural problem:

- `models/` largely mirrors database tables.
- audience folders such as `admin/`, `studios/`, and `me/` organize transport callers;
- orchestration folders coordinate workflows that do not have a clear capability owner;
- many small Nest modules register one service and one repository;
- complex workflows remain concentrated in very large services;
- repositories are sometimes treated as private persistence and sometimes exported
  directly to orchestration callers.

The codebase is not structurally chaotic. It has no detected static Nest module cycles
and has strong local test coverage. The problem is **breadth, ceremony, and unclear
ownership**, not an absence of layering.

## Preserve These Existing Strengths

A refactor must preserve:

- Zod request validation and response serialization;
- snake_case external contracts and camelCase internal payloads;
- UID-only API boundaries;
- CLS transaction propagation with `TransactionHost`;
- optimistic locking for semantic user mutations;
- soft-delete semantics;
- audit history;
- audience-specific guards and route prefixes;
- lean read projections and bulk relation reads;
- focused internal orchestration where it already improves cohesion;
- regression tests around high-risk workflows.

Do not trade these guarantees for a cosmetically cleaner folder tree.

## Core Architecture Decisions

### 1. Organize by business capability, not Prisma model

A Nest module should represent a useful business capability or a stable subsystem
boundary.

Prefer:

```text
show-catalog/
show-operations/
schedule-publishing/
task-management/
studio-performance/
```

over:

```text
models/show/
models/show-status/
models/show-platform/
models/show-creator/
```

A model-specific module may remain when the model is independently meaningful and has
a real public API. It should not be the automatic default.

Transport audiences remain adapters:

```text
studios controller ┐
admin controller   ├──> capability service/query
MCP tool           ┘
```

Do not duplicate business workflows according to the caller.

### 2. Separate commands and queries before adopting CQRS infrastructure

Use CQRS as a design distinction:

- **commands/use cases** change state and own invariants and transaction boundaries;
- **queries** return purpose-shaped read models and optimize retrieval.

Examples:

```text
CreateShow
UpdateShowAssignments
CancelShow
ResolveShowConflict
CorrectShowPerformance
PublishSchedule
GetShowDetails
ListPublishImpact
```

Do not adopt `@nestjs/cqrs`, buses, handlers, sagas, or domain events globally.
Introduce them only when multiple transports, asynchronous reactions, or cross-cutting
command behavior create a concrete need.

A class named `CancelShow` with an `execute()` method is already a valid command-style
use case. It does not require `CommandBus`.

### 3. Keep transaction ownership at the application workflow

The outer command/use case should define what must be atomic.

```ts
@Transactional()
async execute(input: PublishScheduleInput): Promise<PublishResult> {
  // validate
  // plan changes
  // apply writes through txHost.tx
  // append audit data
}
```

Repository methods used inside the workflow must access the ambient transaction through
`TransactionHost.tx`.

Never assume inherited `BaseRepository` methods are transaction-safe. The current base
repository binds to the unbounded Prisma delegate. Reads can miss uncommitted changes,
and writes can escape rollback unless explicitly routed through the transaction host.

### 4. Use repositories selectively

A repository is justified when it owns meaningful persistence behavior, such as:

- complex filters or projections reused as one concept;
- optimistic conditional writes;
- raw SQL;
- aggregate reconstruction;
- multi-row persistence;
- bulk replacement or synchronization;
- audit storage;
- soft-delete behavior beyond trivial CRUD;
- transaction-sensitive operations;
- data access that must remain private behind a capability API.

A repository is not justified merely to rename Prisma:

```ts
findMany(args) {
  return prisma.showStatus.findMany(args);
}
```

For shallow CRUD, a capability service may call `txHost.tx.<model>` directly while
preserving a stable service API.

Do not add a repository interface for a single Prisma implementation. Add an interface
when there are genuinely different adapters or when the domain boundary requires an
independent contract.

### 5. Retire `BaseRepository` as the universal default

`BaseRepository` currently provides consistency around soft delete but is a leaky
abstraction:

- broad `any` and `Record<string, any>` erase Prisma's strongest type information;
- `include`, `orderBy`, and where-clause shapes still expose Prisma concepts;
- inherited methods are not automatically transaction-aware;
- `restore()` filters by `deletedAt: null`, so the generic implementation cannot restore
  a deleted row;
- concrete repositories frequently need overrides to behave correctly.

Until replaced or fixed:

- do not expand its use automatically;
- treat inherited transaction behavior as unsafe;
- keep specialized repositories explicit;
- add regression tests for every critical override;
- prefer deletion of a pass-through repository over creating another generic wrapper.

### 6. Keep framework classes at the boundary; use plain TypeScript internally

NestJS uses classes because decorators, dependency injection, and runtime provider
tokens require runtime values. This does not mean all business logic should be
class-oriented.

Use classes for:

- controllers;
- injectable use cases and query providers;
- gateways and infrastructure adapters;
- stateful domain entities where controlled mutation matters.

Use plain functions and types for:

- deterministic policies;
- calculations;
- mapping;
- immutable value transformations;
- DTO and read-model shapes.

Example:

```ts
export function canCancelShow(show: ShowState, now: Date): boolean {
  return show.status !== 'completed' && show.startsAt > now;
}
```

Do not inject a utility provider for a pure deterministic function unless runtime
configuration or replaceable infrastructure is involved.

## Decision Matrix

### Simple reference CRUD

Examples: status catalogs, static classifications, small lookup tables.

Use:

```text
controller -> capability service -> txHost.tx.<model>
```

Keep:

- stable service API;
- UID creation;
- contract mapping;
- soft-delete rules;
- focused tests.

Avoid:

- one repository per model;
- repository interfaces;
- CQRS handlers;
- domain entities;
- separate mappers with no transformation.

### Moderate business workflow

Examples: create/update operations with permissions, assignments, audit data, or a few
coordinated writes.

Use:

```text
controller -> named use case -> specialized persistence or txHost.tx
```

Add pure policies where rules are reused or difficult to understand.

### Complex transactional workflow

Examples: schedule publishing, conflict resolution, task reconciliation.

Use:

```text
stable facade
  -> cohesive internal command services
  -> transaction-aware specialized persistence
  -> pure planning/policy functions
```

Decompose by phases of the workflow, not by individual endpoint or database table.

Suitable internal boundaries include:

- validation;
- diff planning;
- transactional application;
- relation synchronization;
- task reconciliation;
- conflict handling;
- audit recording;
- impact queries.

### Complex read path

Examples: MCP tools, dashboards, filtered reports, publish impact.

Use a dedicated query provider:

```text
transport -> ShowQueries / TaskQueries -> Prisma projection
```

The query provider should:

- enforce caller scope;
- select only required fields;
- avoid hydrating write-side objects;
- avoid a second broader relation lookup;
- cap pagination limits;
- return a purpose-specific read model.

## Service Rules

A service or use case should have one recognizable responsibility.

Good names expose intent:

```text
CancelShow
CorrectShowPerformance
ReplaceShowAssignments
PublishSchedule
GetPublishImpact
```

Question vague or table-shaped names when they become large:

```text
ShowService
StudioShowManagementService
PublishingService
```

A stable facade may remain when it simplifies callers, but delegate substantial
sub-workflows to cohesive internal providers.

Do not create one handler class per trivial endpoint. Split only where behavior,
dependencies, tests, or transaction phases form a meaningful unit.

## Module Rules

A module's `exports` array is its public API.

- Export capability services and query providers.
- Keep repositories private by default.
- Do not export repositories as a convenience for orchestration callers.
- When another capability needs an operation, add a narrow public method or a
  capability-owned persistence operation.
- Avoid importing an entire write-heavy feature into a read-only runtime.

For MCP specifically, expose narrow `TaskQueries` and `ShowQueries` providers instead
of importing full task and orchestration modules.

## Prisma and Type Boundaries

Prisma records are persistence data, not Rails-style Active Record models.

Public service APIs should use:

- schema-defined input types;
- domain-level parameters;
- explicit result/read-model types.

Avoid exposing raw `Prisma.*` argument types through capability APIs.

Do not create domain classes simply to wrap generated Prisma records. Introduce a
domain entity or value object only when it protects invariants or makes repeated
business behavior clearer.

For raw SQL, use the physical `@@map` and `@map` names and add a test asserting the
literal table and column names.

When a DTO derives a field from a relation, ensure every create, update, and read path
that feeds the serializer selects or includes that relation.

## Error Boundaries

Use errors according to architectural responsibility:

- repositories return data-layer results or domain persistence errors;
- domain policies return decisions or throw domain errors;
- application use cases translate known domain conflicts where appropriate;
- controllers and global filters map errors to HTTP responses.

Do not throw HTTP exceptions from generic repositories.

Avoid controller-driven workflows such as:

```text
controller checks existence
controller calls several mutations
controller constructs audit context
```

The command/use case should own the complete business operation and remain callable
from jobs, MCP, or future message consumers.

## Testing Strategy

Current unit tests are valuable but primarily protect individual classes.

For refactoring:

1. Add characterization tests before moving complex logic.
2. Add real-database integration coverage for:
   - transaction rollback;
   - read-your-own-writes behavior;
   - optimistic locking;
   - soft delete and restore;
   - raw SQL mappings;
   - multi-row synchronization.
3. Add a small number of Nest application tests that boot representative module graphs.
4. Keep controller contract tests for validation and serialization.
5. Test pure policies without Nest testing modules.

A mocked repository test cannot prove that a Prisma operation joined the ambient
transaction.

## Performance Rules

Do not claim latency improvements from reorganizing folders or reducing Nest modules.

Measure and constrain:

- Prisma query count;
- transaction duration;
- payload size;
- P50, P95, and P99 latency;
- pagination limits;
- repeated per-row reads and writes;
- lock duration;
- MCP runtime dependency closure.

Set hard upper bounds on list inputs. Preserve lean projections. Optimize only measured
hot paths except for obvious unbounded or redundant-query risks.

## Incremental Refactoring Workflow

For each refactoring PR:

1. **Name the capability and use case.**
   State which business behavior owns the change.

2. **Characterize behavior.**
   Add or identify tests for contracts, state transitions, transactions, and audit
   effects.

3. **Choose the smallest valid structure.**
   Use the decision matrix above.

4. **Move ownership before adding abstraction.**
   Colocate behavior that changes together. Do not first create new interfaces, base
   classes, or buses.

5. **Make persistence private.**
   Replace cross-module repository injection with a narrow capability API.

6. **Verify transaction semantics.**
   Trace every read and write to `txHost.tx` when the use case is transactional.

7. **Preserve external contracts.**
   Keep routes, guards, UIDs, Zod schemas, serialized shapes, and error behavior stable
   unless the PR explicitly changes them.

8. **Measure architectural change.**
   Run:

   ```bash
   pnpm architecture:signals
   ```

   Record relevant changes such as module count, graph edges, exported repositories,
   utility-module imports, and MCP closure.

9. **Keep the PR independently reviewable.**
   Separate correctness fixes from structural moves when possible.

## Review Checklist

### Capability ownership

- [ ] The code is placed under the business capability that owns the behavior.
- [ ] Transport audience does not determine domain ownership.
- [ ] The public API is a capability service, command/use case, or query provider.

### Complexity

- [ ] No new layer merely forwards arguments unchanged.
- [ ] A class or file has a clear behavioral responsibility.
- [ ] CQRS infrastructure was not introduced without a concrete coordination need.
- [ ] Domain objects or policies protect real invariants.

### Persistence

- [ ] Repositories are private unless a documented exception exists.
- [ ] Transaction-dependent operations use `txHost.tx`.
- [ ] Direct Prisma access is deliberate and capability-local.
- [ ] Soft-delete filters apply to root and join records where required.
- [ ] Raw SQL uses mapped database identifiers.
- [ ] DTO relation fields are selected on every serialization path.

### Contracts and correctness

- [ ] UID boundaries are preserved.
- [ ] Zod validation remains at the transport boundary.
- [ ] Optimistic locking behavior is preserved.
- [ ] Audit behavior is preserved.
- [ ] HTTP concerns do not leak into generic persistence code.

### Testing and operations

- [ ] Characterization tests protect the moved behavior.
- [ ] Transaction behavior has real-database coverage when material.
- [ ] Read paths have bounded inputs and lean projections.
- [ ] No performance claim is made without measurement.
- [ ] `pnpm architecture:signals` was reviewed.

## Migration Priorities

Recommended order:

1. Correct or retire unsafe generic `BaseRepository` behavior.
2. Stop adding table-shaped modules and pass-through repositories.
3. Pilot shallow direct persistence on one low-risk reference capability.
4. Consolidate show reference data into a coherent catalog capability.
5. Decompose studio show management by use case behind a stable facade.
6. Decompose schedule publishing into planning, application, reconciliation, and query
   responsibilities.
7. Narrow MCP composition to read-only query providers.
8. Add real-database transaction and module-wiring tests.
9. Re-evaluate `@nestjs/cqrs` only after explicit commands and queries are established.

## Existing Repository References

Primary direction:

- `apps/erify_api/docs/design/ARCHITECTURE_REFACTORING_GUIDE.md`
- `scripts/measure-erify-api-architecture.mjs`

Existing conventions to preserve but progressively reconcile:

- `.agents/skills/service-pattern-nestjs/SKILL.md`
- `.agents/skills/repository-pattern-nestjs/SKILL.md`
- `.agents/skills/database-patterns/SKILL.md`
- `.agents/skills/orchestration-service-nestjs/SKILL.md`

Representative implementation areas:

- `apps/erify_api/src/lib/repositories/base.repository.ts`
- `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts`
- `apps/erify_api/src/schedule-planning/publishing.service.ts`
- `apps/erify_api/src/task-orchestration/`
- `apps/erify_api/src/mcp/`

## Final Rule

Prefer **explicit capability ownership and understandable execution flow** over
architectural symmetry.

The best refactor is not the one with the most layers. It is the one where a developer
can answer these questions quickly:

1. Which capability owns this behavior?
2. Which use case changes the state?
3. Where is the transaction boundary?
4. Which rules must always hold?
5. Which persistence operations are intentionally exposed?
6. Which query serves this caller?
7. Which test proves the workflow still works?
