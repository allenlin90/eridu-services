---
name: database-patterns
description: Implement Prisma soft delete, transactions, optimistic locking, advisory locks, bulk operations, and safe JSONB writes.
---

# Database Patterns

Procedure for changing persistence in `erify_api` and `eridu_auth`. Canonical doctrine — all 13 numbered rules — lives in [`knowledge/architecture/database-patterns`](../../../knowledge/architecture/database-patterns.md). Read the section covering your change before editing; the rules there are not summarized here.

## Select The Rule

| Change | Read |
| --- | --- |
| Deleting or restoring rows | §1 Soft Delete, §13 Seed Compatibility Gate |
| Writing many rows | §2 Bulk Operations |
| Anything spanning two writes | §3 Transaction Pattern |
| List/detail reads | §4 Query Optimization, §5 Nested Connect |
| Concurrent edits to a user-visible record | §6 Optimistic Locking |
| New table or relation | §7 Explicit FKs over Polymorphism, §8 Nested Writes |
| Check-then-insert races | §9 Advisory Locks |
| New column for a metric | §10 Operational Facts vs Analytical Metrics |
| New JSONB `metadata` key or override history | §11 Audit History |
| Any schema change | §12 Migration Policy |

## Procedure

1. Read the applicable knowledge sections above, plus the linked [`references/`](references/) file when you need code.
2. Change `prisma/schema.prisma`, then generate the migration with official tooling — `npx prisma migrate dev --name <purpose_only_name>` from `apps/erify_api`, or `pnpm --filter erify_api db:migrate:create --name <purpose_only_name>` when you need to review the SQL first. Never hand-write a migration or edit a deployed one. Name by purpose only (§12).
3. Route the write through the persistence boundary the [persistence matrix](../erify-api-capability-refactoring/SKILL.md) selects — direct `txHost.tx.<model>` for shallow CRUD, a private provider for complex persistence.
4. Add or update specs at behavior altitude (see [`backend-testing-patterns`](../code-quality/references/backend-testing-patterns.md)).
5. Verify.

## Verification

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test && pnpm --filter erify_api build
```

Changes affecting transaction semantics, soft-delete/restore, CLS participation, or Nest runtime composition also require the guarded real-database gate in [`backend-testing-patterns`](../code-quality/references/backend-testing-patterns.md#5-real-database-integration-tests). Record the result in the PR.

## Canonical Knowledge

- [`knowledge/architecture/database-patterns`](../../../knowledge/architecture/database-patterns.md) — the 13 rules
- [`references/`](references/) — code examples per rule
