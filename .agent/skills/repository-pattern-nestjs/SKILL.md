---
name: repository-pattern-nestjs
description: Comprehensive Prisma repository implementation patterns for NestJS. This skill should be used when implementing repositories that extend BaseRepository or use Prisma delegates.
---

# Repository Pattern - Prisma/NestJS

Implementation guide for NestJS Repositories using Prisma.

## Canonical Examples

- **Model Repository**: [task-template.repository.ts](../../../apps/erify_api/src/models/task-template/task-template.repository.ts)
- **Base Repository**: [base.repository.ts](../../../apps/erify_api/src/lib/repositories/base.repository.ts)

> See [references/repository-examples.md](references/repository-examples.md) for detailed code examples.

## Core Rules

### 1. Use BaseRepository by Default

🔴 Repositories for soft-deletable CRUD models should extend `BaseRepository<T, C, U, W>`.

BaseRepository-based repositories use `PrismaModelWrapper` to bridge repository
generics to Prisma delegates. Follow that pattern for CRUD models. Standalone
repositories exist for audit logs, schedule snapshots, task-report scopes, and
custom replacement/write flows such as show-platform violations; keep those as
explicit exceptions with module-local service APIs.

### 2. Soft Delete Filtering

🔴 Always filter `deletedAt: null` in custom queries. Use `BaseRepository.softDelete()`.

### 3. No Method Proliferation

🔴 Do NOT add named methods that are only thin `findMany({ where })` wrappers. Call `findMany` directly from the service.

A named method IS justified when:
- Non-trivial Prisma query building (range logic, OR conditions, subqueries)
- Multi-step operations (find + conditional update)
- Reused across multiple callers with identical complex logic
- Unique index lookup with specific field semantics

Document the engineering decision with a comment when adding named methods.

### 4. Never findByUidOrThrow

Do NOT implement `findByUidOrThrow` in repositories. Controller calls `ensureResourceExists()`.

### 5. Never Throw HTTP Exceptions

Repositories return `null` for not-found. Never throw HTTP exceptions from the data layer.

### 6. Route Writes Through the Transaction Host

🔴 A repository write run inside an `@Transactional` service flow must go through `this.txHost.tx.<model>` (the canonical `task.repository` delegate), **not** the unbounded `PrismaService` — otherwise it escapes the ambient transaction and commits even when the flow rolls back. Inject `TransactionHost<TransactionalAdapterPrisma>` and route `create`/`update`/`delete`/`softDelete` through it; reads may stay on the base client.

⚠️ **Known gap:** `BaseRepository` binds `super(new PrismaModelWrapper(prisma.<model>))` to the *unbounded* client, so its **inherited** methods don't join a transaction. The canonical pattern works around this by overriding the write methods a repo actually uses in transactions; a lazy-delegate `BaseRepository` is the proper fix (deferred — see `docs/tech-debt/erify-api-refactor-residuals.md`).

## Key Patterns

### Specialized Find Methods
Use `findOne({ uid, deletedAt: null })` from BaseRepository. Only add `findByUid` if it has additional logic (includes, scoping).

### Join/Association Tables
Repository is private to its module (never exported). Module's service wraps the repository and provides the public API.

### Advanced Filtering with Pagination
Accept domain-level parameters, build Prisma where clauses internally. Use `Promise.all` for concurrent data + count queries.

### Optimistic Locking
Implement `updateWithVersionCheck()` for versioned entities. Throw `VersionConflictError` (domain error), not HTTP exceptions. Service converts to `HttpError.conflict()`.

### Raw SQL (`$executeRaw` / `$queryRaw`)
Prisma applies **no** name mapping to raw queries — `Prisma.sql` strings hit the database verbatim. Always reference the `@@map`-ed table name and `@map`-ed column names (`"show_platforms"`, not the `ShowPlatform` model name). A model-name table reference compiles fine and only fails at runtime, where a swallowed extractor/approval error can hide it (silent no-op, nothing persisted). When a repository hand-writes raw SQL, add a regression test that asserts the literal table name in the generated SQL (e.g. `expect(sql.strings.join('')).toContain('UPDATE "show_platforms"')`).

### A New Relation Needs `include` at Every Call Site That Serializes It
When a DTO transform derives an API field from a relation (e.g. `client_id: obj.client?.uid ?? null`), every `findOne`/`create`/`update` call whose result reaches that DTO must pass `{ include: { client: true } }` (or equivalent) — Prisma silently omits relations that weren't included, so the field always serializes as the "absent" value instead of erroring. This is easy to miss because each call site compiles fine and only fails at runtime, and worse, a write path (e.g. `update()`) silently nulling a field the request just bound can look like the binding itself didn't persist. Grep every call site that produces the DTO's input when adding a relation-derived field, not just the one you're actively touching. See `task-template.repository.ts` / `task-template.service.ts` for the reference fix (PR 20.4 codex review).

### A Selection Rule Used by Two Repositories Belongs in a Shared Constant
When a business rule like "which task statuses count as finalized" needs the same filter in two different repositories (e.g. a performance aggregate and a coverage read-model both need "latest finalized task with a loop schema wins"), extract the literal array/predicate into a named constant in a shared location (e.g. `task-finalized-loop.constants.ts`) and import it from both repositories — don't let each repository re-type the same status list. Independently re-derived copies of the same rule drift silently when one gets updated and the other doesn't; each repository can still keep its own bespoke `include`/`select` shape, since only the filter predicate needs to be shared. See `client-mechanic.repository.ts` / `studio-performance.repository.ts` (PR 20.6).

## Checklist

- [ ] 🔴 Extends `BaseRepository` with `PrismaModelWrapper` for soft-deletable CRUD models
- [ ] 🔴 No thin `findMany` wrappers — call `findMany` from service
- [ ] 🔴 No `findByUidOrThrow` — controller handles 404
- [ ] 🔴 Always filter `deletedAt: null`
- [ ] 🔴 Never throw HTTP exceptions
- [ ] 🔴 A relation-derived DTO field is `include`d at every call site that serializes it (create/update/findOne), not just the one you're touching
- [ ] Accept domain-level parameters (not Prisma types) in public methods
- [ ] `Promise.all` for pagination (count + data)
- [ ] `VersionConflictError` for version conflicts
- [ ] Use `findFirst` when filtering by non-unique fields
- [ ] Raw SQL uses `@@map`/`@map` names, with a test asserting the literal table name

## Related Skills

- [Service Pattern](../service-pattern-nestjs/SKILL.md) — Service layer using repositories
- [Database Patterns](../database-patterns/SKILL.md) — Soft delete, transactions, locking
- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Controller patterns
