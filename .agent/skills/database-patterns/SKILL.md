---
name: database-patterns
description: Provides Prisma-specific patterns for soft delete, transactions, optimistic locking, advisory locks, bulk operations, and performance optimization. This skill should be used when implementing data persistence, handling concurrent updates, serializing concurrent operations on the same resource, managing complex multi-table operations, or optimizing query performance.
---

# Database Patterns Skill (Prisma/PostgreSQL)

**The Single Source of Truth for Database Interactions in Eridu Services.**

For detailed code examples for each section, read the corresponding file from `references/` as needed.

---

## 1. Soft Delete

**Rule**: NEVER permanently delete logical data. Use `deletedAt` timestamps.

- Every query **MUST** filter `deletedAt: null` unless intentionally listing history.
- Use `BaseRepository.softDelete()` — never raw `prisma.model.delete()`.
- Add `@@index([deletedAt])` to every soft-deletable model schema.

> 📖 See [`references/01-soft-delete.md`](references/01-soft-delete.md) for schema and query examples.

---

## 2. Bulk Operations

**Rule**: NEVER loop over individual DB calls. Use `createMany` / `updateMany`.

- A loop with `await prisma.model.create()` inside = N round-trips = ❌
- Use `prisma.model.createMany({ skipDuplicates: true })` for inserts.
- Use `prisma.model.updateMany({ where: {...} })` for batch updates.

> 📖 See [`references/02-bulk-operations.md`](references/02-bulk-operations.md) for examples.

---

## 3. Transaction Pattern

**Rule**: Use `@Transactional()` from `@nestjs-cls/transactional` for atomic multi-entity operations.

- CLS propagates the transaction automatically — never pass `tx` as a parameter.
- Apply `@Transactional()` on **Orchestration Service** methods, not repositories.
- Keep transactions **short** — no external HTTP/email calls inside.

### ⚠️ Anti-Pattern 1: Self-Invocation (silent no-op)

`@Transactional()` relies on NestJS AOP proxy. `this.method()` within the same class bypasses the proxy — **no transaction is created, no error is raised**.

**Fix**: Extract the transactional method into a **separate `@Injectable()` class** and call it through DI.

### ⚠️ Anti-Pattern 2: Internal `try/catch` (silent partial commit)

`@Transactional()` only rolls back if an unhandled error **propagates out** of the decorated method. Catching the error internally causes a **commit of partial DB writes**.

**Fix**: Remove `try/catch` from inside the `@Transactional()` method. Place error handling in the **caller**, outside the transaction boundary. By the time the caller's `catch` block runs, the transaction has already been rolled back.

> 📖 See [`references/03-transactions.md`](references/03-transactions.md) for full code examples of both anti-patterns and correct usage.

> [!NOTE]
> **Legacy pattern**: Some existing code uses `prisma.$transaction(async (tx) => {...})` with explicit `tx` passing. This is being migrated to `@Transactional()`. Do **NOT** write new code using the old pattern.

---

## 4. Query Optimization

**Rule**: Prevent N+1 queries; run independent queries in parallel.

- Use `include` to eager-load relations — never loop and fetch separately.
- Use `Promise.all([...])` for concurrent independent queries (e.g., `findMany` + `count`).

> 📖 See [`references/04-query-optimization.md`](references/04-query-optimization.md) for examples.

---

## 5. Nested Connect

**Rule**: Use `connect: { uid }` to link related entities. Avoids an extra read to resolve `id`.

```typescript
// ✅ One round-trip
await prisma.show.create({ data: { client: { connect: { uid: 'client_123' } } } });
```

> 📖 See [`references/06-relationships-and-nested-writes.md`](references/06-relationships-and-nested-writes.md) for full examples.

---

## 6. Optimistic Locking (Version Check)

**Rule**: Use a `version` integer field to prevent concurrent overwrites.

- Repository implements `updateWithVersionCheck()` and throws `VersionConflictError` (a domain error, not HTTP).
- Service catches `VersionConflictError` and converts it to `HttpError.conflict(...)`.
- This keeps DB layer decoupled from HTTP transport.

> 📖 See [`references/05-optimistic-locking.md`](references/05-optimistic-locking.md) for full repository + service examples.

---

## 7. Explicit FKs over Polymorphism

**Rule**: NEVER use a bare `entity_id + entity_type` discriminator pair as the only way to model a polymorphic association. Always use typed nullable foreign keys for referential integrity.

- A bare `(entity_id, entity_type)` pair bypasses FK constraints → orphan data risk.
- Prisma cannot natively `include` such a relation → N+1 forced.
- Typed FKs are fully typed and indexable.

> 📖 See [`references/06-relationships-and-nested-writes.md`](references/06-relationships-and-nested-writes.md) for schema examples.

### When polymorphism *is* required: pick by open vs closed target set

Both shapes below are recognized Postgres + Prisma best practice. The decision rule is **whether the set of target entity types is expected to grow**:

| Target set | Pattern | Shape |
|---|---|---|
| **Closed & stable** (won't grow — e.g. `Comment → Post \| Page`) | **Exclusive Arc on the entity** | Multiple typed nullable FKs directly on the entity. **MUST** include a CHECK constraint: `CHECK (num_nonnulls(fk1, fk2, ...) = 1)`. **NEVER** add a redundant `target_type` discriminator alongside the typed FKs — derive the type from "which FK is non-null". |
| **Open & extensible** (will grow — e.g. `Task → Show \| Studio \| ...`, `CompensationLineItem` targets, audit-log subjects) | **Side table** | Polymorphism extracted into a dedicated child table. Keeps the entity's hot path narrow. New target types are migrations on the side table only, never on the entity. |

This codebase trends toward **open** for entities like `Task`, `CompensationLineItem`, audit logs — pick side table by default unless the target set is genuinely fixed.

### Side-table sub-pattern: cardinality

| Cardinality | PK strategy | Reference |
|---|---|---|
| **1:N** (one parent → many target rows) | Side table has its own `id`. Carries discriminator + typed FKs. May have own `deletedAt` if individual targets need independent removal. | [`TaskTarget`](../../../apps/erify_api/prisma/schema.prisma) |
| **1:1, polymorphism-only** (one parent → exactly one target row, immutable) | Parent FK IS the PK (`lineItemId @id`). No own audit fields, no own `deletedAt` — lifecycle inherits from parent. The relation field on the parent is `target ChildTarget?` — Prisma 1:1 forces the optional, but the application creates the child in the same transaction as the parent. | [`CompensationLineItemTarget`](../../../apps/erify_api/prisma/schema.prisma) |

> [!IMPORTANT]
> Whichever side-table cardinality you pick, the Prisma `include` traverses the side table explicitly. The raw Prisma shape is **nested** (`target.show.uid`, `targets[].show.uid`) rather than flat. The Zod DTO schema **MUST** include a `.transform()` to flatten and remap this to the API wire format. See the **Polymorphic relation DTO transform** pattern in the [Shared API Types skill](../shared-api-types/SKILL.md).

---

## 8. Nested Writes

**Rule**: Use Prisma nested writes for atomic parent + child creation without an explicit transaction.

- Best for: single parent + direct children, simple relation.
- Use `@Transactional()` when: multiple parents, conditional logic, or cross-service orchestration.

> 📖 See [`references/06-relationships-and-nested-writes.md`](references/06-relationships-and-nested-writes.md) for examples and comparison table.

---

## 9. Advisory Locks (Concurrency Serialization)

**Rule**: Use `pg_advisory_xact_lock` to serialize concurrent operations on the same logical resource within a transaction.

Advisory locks prevent race conditions when two concurrent requests modify the same entity (e.g., two publish requests for the same schedule, or two task-generation requests for the same show).

**When to use**:
- Concurrent mutation risk on the same entity (double-click, parallel workers)
- Must serialize within a `@Transactional()` boundary
- Optimistic locking (version check) alone is insufficient — it detects conflicts but doesn't prevent them; the second request fails instead of waiting

**Pattern**:

```typescript
@Transactional<TransactionalAdapterPrisma>({ timeout: 30_000 })
async processEntity(entityId: bigint) {
  // Acquire transaction-scoped advisory lock — auto-releases on commit/rollback
  await this.txHost.tx.$executeRaw`SELECT pg_advisory_xact_lock(${entityId})`;

  // ... rest of transactional logic (safe from concurrent modification)
}
```

**Key properties**:
- `pg_advisory_xact_lock` is **transaction-scoped** — auto-releases when the transaction commits or rolls back. No manual release needed.
- Works across **any number of Node.js processes** (including BullMQ workers, horizontal scaling) as long as they connect to the same PostgreSQL instance.
- The lock key is a `bigint` — use the entity's primary key (`id`).
- A second caller with the same key **waits** until the first transaction completes (blocking, not failing).

**When NOT to use**:
- Non-transactional operations (use Redis distributed lock or optimistic locking instead)
- Cross-database coordination (advisory locks are per PostgreSQL instance)

> [!NOTE]
> **DB cluster consideration**: If the system moves to a PostgreSQL cluster (e.g., read replicas with a primary), advisory locks only work on the primary (write) node. Ensure the connection proxy/gateway routes transactional writes to the primary. This is standard behavior for most PostgreSQL proxies (PgBouncer, PgPool, RDS Proxy).

**Canonical example**: [TaskGenerationProcessor.processShow()](../../../apps/erify_api/src/task-orchestration/task-generation-processor.service.ts) — uses advisory lock to prevent concurrent task generation for the same show.

---

## 10. Recorded Facts and Derived Values

**Rule**: Persist recorded facts on the narrowest scoped table; compute derived finance values in backend read models.

Use typed columns when the fact is queryable, filterable, or part of a calculator input:

| Fact | Recommended persistence |
| :--- | :--- |
| Overall show actual start/end | `Show.actualStartTime` / `Show.actualEndTime` |
| Creator-specific participation start/end | `ShowCreator.actualStartTime` / `ShowCreator.actualEndTime` when that feature ships |
| Platform stream/performance window or revenue metrics | `ShowPlatform` columns or a `ShowPlatform*Metrics` child table, depending on audit/history needs |
| Shift labor actual start/end | `StudioShiftBlock.actualStartTime` / `StudioShiftBlock.actualEndTime` |

Avoid:
- generic `actualStartTime` / `actualEndTime` columns on a parent table when the fact is really child-scoped,
- storing calculated `projectedCost`, `calculatedCost`, or similar live totals on operational rows,
- executable formulas in `metadata`.

If the business needs a durable payment, settlement, or frozen reference amount, introduce a purpose-built snapshot/settlement/payment model with explicit authority semantics.

---

## 11. Migration Generation and SQL Customization Policy

**Rule**: New migration files must come from official tooling first, then optionally be customized.

- `erify_api` (Prisma):
  - `pnpm --filter erify_api prisma migrate dev --name <descriptive_name>` (development)
  - `pnpm --filter erify_api prisma migrate deploy` (apply existing migrations)
- `eridu_auth` (better-auth + Drizzle):
  - run Better Auth schema generation first when auth schema intent changed:
    - `pnpm --filter eridu_auth auth:schema`
  - then generate/check via Drizzle:
    - `pnpm --filter eridu_auth db:generate`
    - `pnpm --filter eridu_auth db:check`
- Never create a new migration file manually from scratch.
- If tooling cannot express required SQL (partial index, trigger, advanced constraint), edit the generated migration file in-place.
- Prefer migration scoping over consolidation:
  - Multiple tool-generated migrations are valid when they map cleanly to logical changes and deployment scopes.
  - Keep migration names descriptive to match PR/release intent.
  - If a migration is already applied in any shared environment, do not rewrite/squash/reorder it.
  - Use forward-only follow-up migrations for fixes after shared deployment.
- Manual SQL blocks must include explicit comments that explain:
  - what is customized,
  - why tool-generated SQL was insufficient,
  - rollback/operational notes if relevant.

For deterministic local Prisma validation cycles:

```bash
pnpm --filter erify_api db:local:refresh
```

If cross-app auth mapping requires `ext_id` synchronization after seed:

```bash
pnpm --filter erify_api db:extid:sync
```

Recommended comment format in migration SQL:

```sql
-- CUSTOM SQL START: <short reason>
-- Tool-generated SQL cannot express <capability>; applying manual SQL.
...custom statements...
-- CUSTOM SQL END
```

**Documentation sync is mandatory** when custom SQL exists:
- Update `docs/engineering/DB_MIGRATION_POLICY.md` with the customization rationale.
- Update relevant feature docs if behavior/operational impact exists.
- Keep this skill aligned with any new recurring customization pattern.

### Data-only backfill decision rule

For data-only mutations (no schema change), choose exactly one:

1. Migration SQL backfill (auto-runs in `migrate deploy`)
2. Operational script backfill (manual execution with dry-run support)

Do not ship both for the same mutation in one rollout.

Use script-based backfill when:
- rollout needs explicit operator control,
- dry-run inspection is required,
- execution timing differs by environment.

If script-based backfill is chosen:
- expose a dedicated package script command,
- keep script idempotent or collision-guarded,
- update canonical feature docs with runbook commands.

---

## 12. Seed Contract Compatibility Gate (Required)

**Rule**: Any schema or service contract change must include a seed/fixture compatibility review.

Why:
- Local verification, manual test workflows, and cross-app auth mapping depend on seeded reference data.
- Missing seed updates can create false runtime conflicts (for example missing `systemKey`, stale fixture IDs, or payload fields not present in generated test data).

Required checks when changing schema/service behavior:

1. **Reference data parity**
   - If logic looks up status/type rows by key/name, ensure seed writes both required fields.
   - If introducing a required field, seed must backfill/update existing rows on rerun.

2. **Seed completeness gates**
   - Update seed "already seeded" checks to include newly required records/keys.
   - Prevent stale DB states from being marked complete.

3. **Fixture/manual-test parity**
   - Update fixture-based payload generators when required API fields change.
   - Ensure manual test scripts parse actual API DTO/envelope responses (not internal schemas).

4. **Deterministic verification**
```bash
pnpm --filter erify_api db:local:refresh
pnpm --filter erify_api manual:schedule:generate
```
   - If local API is running:
```bash
pnpm --filter erify_api manual:schedule:all
```

Policy:
- If mismatch is only in seed/manual-test tooling, fix those first.
- Do not change production service logic unless shipped behavior itself is incorrect.

---

## Related Skills

- **[Repository Pattern](../repository-pattern-nestjs/SKILL.md)**: How to wrap these patterns in a reusable class.
- **[Service Pattern](../service-pattern-nestjs/SKILL.md)**: Where to use transactions and business logic.
