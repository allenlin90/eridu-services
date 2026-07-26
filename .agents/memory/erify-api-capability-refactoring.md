# `erify_api` Capability Refactoring Foundation (2026-07)

## Status

The T1–T13 foundation shipped through PRs #323–#336. The execution roadmap and
visual walkthrough were retired after closeout. Current architecture lives in
[`apps/erify_api/docs/ARCHITECTURE.md`](../../apps/erify_api/docs/ARCHITECTURE.md),
residual target status lives in
[`apps/erify_api/docs/REFACTORING_TARGETS.md`](../../apps/erify_api/docs/REFACTORING_TARGETS.md),
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
- Every new `erify_api` feature or refactor checks the target register and
  records the applicable target IDs and trigger outcome.
- Add an abstraction only for a present owned boundary; do not create a
  speculative seam merely to ease a hypothetical future refactor.

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

- The refactoring target register is authoritative for open-target evidence,
  activation gates, status, and exit criteria.
- Product sequencing remains in Phase 5 and supplies activation evidence; it is
  not the refactoring queue.
- Do not duplicate open target state here. Update the register when evidence or
  status changes.

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
