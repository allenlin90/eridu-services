---
name: database-patterns
description: Implement Prisma soft delete, transactions, optimistic locking, advisory locks, bulk operations, and safe JSONB writes.
---

# Database Patterns (Prisma/PostgreSQL)

The single source of truth for database interactions in Eridu Services.

For detailed code examples, read the corresponding file from `references/` as needed.

## 1. Soft Delete

NEVER permanently delete logical data. Use `deletedAt` timestamps. Every active
query MUST filter `deletedAt: null`. Soft-delete through the selected
transaction-aware persistence boundary: `BaseRepository.softDelete()` for an
existing repository or a scoped `txHost.tx.<model>.update` for shallow direct
persistence. Add `@@index([deletedAt])`.

> 📖 [references/01-soft-delete.md](references/01-soft-delete.md)

## 2. Bulk Operations

NEVER loop over individual DB calls. Use `createMany` / `updateMany`.

> 📖 [references/02-bulk-operations.md](references/02-bulk-operations.md)

## 3. Transaction Pattern

Use `@Transactional()` from `@nestjs-cls/transactional`. CLS propagates automatically — never pass `tx`. Apply on **Orchestration Services**, not repositories. Keep transactions short.

**Anti-patterns:** Self-invocation bypasses proxy silently. Internal `try/catch` causes silent partial commit. Reading through a repository method bound to the raw `PrismaService` misses uncommitted writes made earlier in the same transaction. Nested `@Transactional()` calls reuse the ambient CLS transaction — a write that must survive a later throw in the same call chain (e.g. an audit row recording a rejection) needs its own, separately-committing transaction call, not a nested one. `createdAt`-only ordering (plain or `distinct`) can't distinguish two rows written in the same transaction — Postgres' `now()` returns one value per transaction, not per statement — add the autoincrement `id` as a secondary sort key wherever a table can be written more than once per transaction.

If a flow mutates rows and then immediately re-queries eligible rows in the same transaction, the read must use a transaction-aware delegate (`txHost.tx.<model>`). This especially matters for restore/resume paths: a raw-client read cannot see rows undeleted earlier in the transaction, so reconciliation logic can silently skip work.

For `BaseRepository` subclasses, pass a lazy transaction delegate to
`PrismaModelWrapper`: `new PrismaModelWrapper(() => txHost.tx.<model>)`.
Resolving the delegate per operation lets inherited CRUD methods use the
ambient transaction instead of capturing the unbounded client at construction.

Prove transaction participation with the isolated real-PostgreSQL harness, not
only repository mocks. The harness must require a dedicated local database whose
name ends in `_test`, refuse the normal `DATABASE_URL`, apply checked-in
migrations, and run transaction integration specs serially. See
[`apps/erify_api/test/README.md`](../../../apps/erify_api/test/README.md).

> 📖 [references/03-transactions.md](references/03-transactions.md)

## 4. Query Optimization

Prevent N+1 queries with `include`. Use `Promise.all` for independent queries.

> 📖 [references/04-query-optimization.md](references/04-query-optimization.md)

## 5. Nested Connect

Use `connect: { uid }` to link entities. Avoids extra reads.

> 📖 [references/06-relationships-and-nested-writes.md](references/06-relationships-and-nested-writes.md)

## 6. Optimistic Locking

Use `version` integer field. Repository throws `VersionConflictError`. Service converts to `HttpError.conflict()`.

**Bump `version` only on semantic user-visible mutations.** Do NOT bump for pre-submission bookkeeping (upload reservations, presign caches), async denormalized state, or self-referential metadata — bumping causes spurious 409s on the user's next legitimate write.

When an orchestration performs best-effort reconciliation, use the same version-checked write path as user edits and decide the conflict behavior deliberately. A stale row should usually be skipped and excluded from success counts, not overwritten and not allowed to fail the whole publish/edit flow unless the workflow requires all rows to reconcile atomically.

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

Use `pg_advisory_xact_lock` to serialize concurrent operations within a transaction. Transaction-scoped, auto-releases. Use entity primary key as lock key. When the protected identity has no single-row PK (e.g. a date range whose identity lives in JSONB `metadata`), lock on a hashed composite key: `pg_advisory_xact_lock(hashtextextended(${key}, 0))` where `key` is the normalized identity string. This guards a check-then-insert without adding a unique constraint to a generic envelope table.

## 10. Operational Facts vs Analytical Metrics

Persist OLTP facts on the narrowest scoped table when they support operational writes, exception review, filtering, export, overrides, or constraints. Examples: actual time pairs, missing attendance markers, stale binding review state, and platform violation records.

Do not add operational columns just because a metric is useful for post-show analysis. GMV, conversion, trend, ranking, and cross-show aggregate needs should first be classified as analytical unless a concrete operational workflow depends on them. Analytical features may use the same Postgres database through read models/materialized views or a separate OLAP path; decide that in a design/ideation step before schema promotion.

Avoid storing calculated totals on operational rows. Use purpose-built models for frozen amounts.

## 11. Audit History

Use standard audit tables for new override and extraction history. Do not add new `metadata.audit.*` arrays; keep existing metadata audit payloads as legacy read compatibility only.

**Metadata vs Audit decision:** before storing any new key in a JSONB `metadata` column, ask: *"If a concurrent writer silently overwrites this, does a business workflow break?"*

- **Yes** → Audit model (or a dedicated table). It needs durable, queryable history.
- **No** → `metadata` is fine. Accept the race; do NOT add raw SQL merges, advisory locks, or serializable transactions to protect non-critical bookkeeping. Document the intent in code so a later reader does not "fix" it.

When in doubt, default to Audit. Migrating a critical signal *out* of `metadata` later is costlier than putting it in the right place up front.

## 12. Migration Policy

New migrations from official tooling only (`prisma migrate dev`, `drizzle generate`). Custom SQL in generated files with `-- CUSTOM SQL START/END` comments. Never rewrite deployed migrations.

**Never hand-set a Drizzle migration's `meta/_journal.json` "when" timestamp.** Drizzle's Postgres migrator doesn't track per-migration applied state by hash — it compares each journal entry's `"when"` against only the single most-recent `__drizzle_migrations.created_at` (which is itself just the previous migration's `"when"`, not real apply time). A hand-authored `"when"` that's older than an already-applied later migration gets **silently skipped** on any database that's past that point — no error, nothing logged — and a subsequent migration assuming the skipped one's schema change exists then fails with a plain "column does not exist" error. Fresh databases never show this (an empty migrations table applies every entry unconditionally on the first run), so it only surfaces against an already-migrated shared environment. Always let `drizzle-kit generate` stamp the timestamp.

**Name migrations by purpose, not by plan.** The `--name` describes the schema change in domain terms (`client_mechanic_foundation`, `add_performance_metrics_to_show_platform`). Do NOT bake PR numbers, roadmap rows, ticket IDs, phase labels, or implementation/plan specifics into the name (`pr_20_1_*`, `phase4_*`, `JIRA_123_*`) — that noise outlives the plan and means nothing once merged. The folder name is permanent and shared; keep it a stable, purpose-only description.

> 📖 For data-only backfills: choose migration SQL OR operational script, not both.

## 13. Seed Compatibility Gate

Schema/service changes must include seed/fixture compatibility review: reference data parity, seed completeness, fixture parity, deterministic verification.

## Related Skills

- [Repository Pattern](../repository-pattern-nestjs/SKILL.md) — Repository class patterns
- [Service Pattern](../service-pattern-nestjs/SKILL.md) — Transaction usage and business logic
