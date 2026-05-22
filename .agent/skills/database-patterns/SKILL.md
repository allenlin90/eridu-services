---
name: database-patterns
description: Provides Prisma-specific patterns for soft delete, transactions, optimistic locking, advisory locks, bulk operations, and performance optimization. This skill should be used when implementing data persistence, handling concurrent updates, serializing concurrent operations on the same resource, managing complex multi-table operations, or optimizing query performance.
---

# Database Patterns (Prisma/PostgreSQL)

The single source of truth for database interactions in Eridu Services.

For detailed code examples, read the corresponding file from `references/` as needed.

## 1. Soft Delete

NEVER permanently delete logical data. Use `deletedAt` timestamps. Every query MUST filter `deletedAt: null`. Use `BaseRepository.softDelete()`. Add `@@index([deletedAt])`.

> 📖 [references/01-soft-delete.md](references/01-soft-delete.md)

## 2. Bulk Operations

NEVER loop over individual DB calls. Use `createMany` / `updateMany`.

> 📖 [references/02-bulk-operations.md](references/02-bulk-operations.md)

## 3. Transaction Pattern

Use `@Transactional()` from `@nestjs-cls/transactional`. CLS propagates automatically — never pass `tx`. Apply on **Orchestration Services**, not repositories. Keep transactions short.

**Anti-patterns:** Self-invocation bypasses proxy silently. Internal `try/catch` causes silent partial commit.

> 📖 [references/03-transactions.md](references/03-transactions.md)

## 4. Query Optimization

Prevent N+1 queries with `include`. Use `Promise.all` for independent queries.

> 📖 [references/04-query-optimization.md](references/04-query-optimization.md)

## 5. Nested Connect

Use `connect: { uid }` to link entities. Avoids extra reads.

> 📖 [references/06-relationships-and-nested-writes.md](references/06-relationships-and-nested-writes.md)

## 6. Optimistic Locking

Use `version` integer field. Repository throws `VersionConflictError`. Service converts to `HttpError.conflict()`.

> 📖 [references/05-optimistic-locking.md](references/05-optimistic-locking.md)

## 7. Explicit FKs over Polymorphism

NEVER use bare `entity_id + entity_type` without typed FK constraints.

| Target set | Pattern |
|---|---|
| **Closed & stable** | Exclusive Arc — typed nullable FKs with `CHECK (num_nonnulls(...) = 1)` |
| **Open & extensible** | Side table — polymorphism in dedicated child table |

Side-table cardinality: 1:N uses own `id`; 1:1 uses parent FK as PK.

> Prisma `include` traverses side tables — Zod DTO MUST `.transform()` to flatten.

> 📖 [references/06-relationships-and-nested-writes.md](references/06-relationships-and-nested-writes.md)

## 8. Nested Writes

Use Prisma nested writes for atomic parent + child creation. Use `@Transactional()` for multi-parent or cross-service orchestration.

## 9. Advisory Locks

Use `pg_advisory_xact_lock` to serialize concurrent operations within a transaction. Transaction-scoped, auto-releases. Use entity primary key as lock key.

## 10. Operational Facts vs Analytical Metrics

Persist OLTP facts on the narrowest scoped table when they support operational writes, exception review, filtering, sign-off, overrides, or constraints. Examples: actual time pairs, missing attendance markers, stale binding review state, and platform violation records.

Do not add operational columns just because a metric is useful for post-show analysis. GMV, conversion, trend, ranking, and cross-show aggregate needs should first be classified as analytical unless a concrete operational workflow depends on them. Analytical features may use the same Postgres database through read models/materialized views or a separate OLAP path; decide that in a design/ideation step before schema promotion.

Avoid storing calculated totals on operational rows. Use purpose-built models for frozen amounts.

## 11. Audit History

Use standard audit tables for new override and extraction history. Do not add new `metadata.audit.*` arrays; keep existing metadata audit payloads as legacy read compatibility only.

## 12. Migration Policy

New migrations from official tooling only (`prisma migrate dev`, `drizzle generate`). Custom SQL in generated files with `-- CUSTOM SQL START/END` comments. Never rewrite deployed migrations.

> 📖 For data-only backfills: choose migration SQL OR operational script, not both.

## 13. Seed Compatibility Gate

Schema/service changes must include seed/fixture compatibility review: reference data parity, seed completeness, fixture parity, deterministic verification.

## Related Skills

- [Repository Pattern](../repository-pattern-nestjs/SKILL.md) — Repository class patterns
- [Service Pattern](../service-pattern-nestjs/SKILL.md) — Transaction usage and business logic
