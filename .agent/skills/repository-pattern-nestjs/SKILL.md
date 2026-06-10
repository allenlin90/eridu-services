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

## Checklist

- [ ] 🔴 Extends `BaseRepository` with `PrismaModelWrapper` for soft-deletable CRUD models
- [ ] 🔴 No thin `findMany` wrappers — call `findMany` from service
- [ ] 🔴 No `findByUidOrThrow` — controller handles 404
- [ ] 🔴 Always filter `deletedAt: null`
- [ ] 🔴 Never throw HTTP exceptions
- [ ] Accept domain-level parameters (not Prisma types) in public methods
- [ ] `Promise.all` for pagination (count + data)
- [ ] `VersionConflictError` for version conflicts
- [ ] Use `findFirst` when filtering by non-unique fields
- [ ] Raw SQL uses `@@map`/`@map` names, with a test asserting the literal table name

## Related Skills

- [Service Pattern](../service-pattern-nestjs/SKILL.md) — Service layer using repositories
- [Database Patterns](../database-patterns/SKILL.md) — Soft delete, transactions, locking
- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Controller patterns
