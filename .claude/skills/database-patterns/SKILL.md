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

**Rule**: PREFER explicit nullable foreign keys over `entity_id + entity_type` polymorphic columns.

- Polymorphism bypasses FK constraints → orphan data risk.
- Prisma cannot natively `include` polymorphic relations → N+1 forced.
- Explicit FKs are fully typed and indexable.

> 📖 See [`references/06-relationships-and-nested-writes.md`](references/06-relationships-and-nested-writes.md) for schema examples.

> [!IMPORTANT]
> When a polymorphic **join table** is unavoidable (e.g., `TaskTarget` linking tasks to multiple target entity types), the Prisma `include` must traverse the join table explicitly. This means the raw Prisma shape is **nested** (`targets[].show`) rather than flat (`show`). The Zod DTO schema **MUST** include a `.transform()` to flatten and remap this to the API wire format. See the **Polymorphic relation DTO transform** pattern in the [Shared API Types skill](../shared-api-types/SKILL.md).

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

## Related Skills

- **[Repository Pattern](../repository-pattern-nestjs/SKILL.md)**: How to wrap these patterns in a reusable class.
- **[Service Pattern](../service-pattern-nestjs/SKILL.md)**: Where to use transactions and business logic.
