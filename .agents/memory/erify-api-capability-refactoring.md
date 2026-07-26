# `erify_api` Capability Refactoring Foundation (2026-07)

## Status

The T1–T13 foundation shipped through PRs #323–#336. The execution roadmap and
visual walkthrough were retired after closeout. Current architecture lives in
[`apps/erify_api/docs/ARCHITECTURE.md`](../../apps/erify_api/docs/ARCHITECTURE.md),
and implementation rules live in the
[`erify-api-capability-refactoring`](../skills/erify-api-capability-refactoring/SKILL.md)
skill.

## Durable Decisions

- Keep `erify_api` as a capability-first NestJS modular monolith.
- Use direct `TransactionHost.tx` persistence for shallow, bounded CRUD.
- Retain private repositories, stores, or query providers when they hide
  complex or reusable persistence behavior.
- Do not create one Nest module or repository per Prisma model by default.
- Keep transport audiences as adapters, not domain ownership boundaries.
- Preserve routes, guards, UID-only responses, Zod contracts, transactions,
  rollback, soft delete, restore, optimistic locking, audits, and runtime
  composition during structural work.
- Keep correctness and security fixes separate from behavior-preserving
  refactors.
- Do not introduce CQRS infrastructure, workers, read models, package splits,
  or database splits without their documented evidence gates.

## Safety And Reference Implementations

- The guarded PostgreSQL runner accepts only loopback
  `ERIFY_API_TEST_DATABASE_URL` databases ending in `_test`; it must never use
  development or production data.
- `ShowStatusService` is the direct-persistence pilot.
- `ShowCatalogModule` plus `ShowCatalogHttpModule` is the provider/transport
  separation reference.
- The repaired `BaseRepository` resolves `TransactionHost.tx` lazily and
  restores only deleted rows, but remains non-default.
- `UidGeneratorService` is the narrow nondeterministic adapter; time overlap is
  a pure function.

## Future Activation

- Start Phase 5 with item 9, show-level issue ownership.
- Phase 5 item 18 activates `ShowOperationsModule` as part of the lifecycle
  transition work, never as a standalone folder move.
- `PublishingService` decomposition activates only when item 18 integration or
  measured risk requires it.
- Scoped query providers and further MCP narrowing travel with the owning
  capability work.

## Recorded Discussion Outcomes

- Automated real-database CI remains
  [ideation](../../docs/ideation/erify-api-real-database-ci-gate.md), not an
  accepted implementation task.
- Shared REST pagination and bulk schedule error-code asymmetry remain
  [registered tech debt](../../docs/tech-debt/README.md).
- `studioMembership!` in guarded task-report controller methods is not
  registered as debt: the established `StudioProtected` guard contract
  guarantees that attachment before the controller executes.
- The long Cursor monorepo package rule is registered as instruction-maintenance
  debt rather than expanded inside this architecture program.
