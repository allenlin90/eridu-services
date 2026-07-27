---
name: task-template-script-exceptions
description: Internal operator/script-only services in the task-template domain are an accepted Prisma-in-service exception; templateKind JSONB filter pattern
metadata:
  type: project
---

## Deliberate Prisma-in-Service Exception for internal operator scripts
`task-template-reset.service.ts` and `task-template-moderator-csv.service.ts` are internal operator-only
migration/CLI aids, not regular domain services reachable via HTTP controllers. They inject `PrismaService` directly
and `task-template-reset.service.ts` imports `Prisma.TaskWhereInput` (type-only, `import type`) for
`buildRelatedTaskWhere()`. Accept this pattern for internal reset/migration services outside the regular request path
— the `Prisma.*` import does not bleed into public API contracts.

## Double-planReset in migration execution chain
`executeMigration` in `TaskTemplateModeratorCsvService` calls `planMigration` (which calls `resetService.planReset`),
then calls `resetService.executeReset` (which internally calls `planReset` again) — two sequential `planReset` DB
round-trips for the reset portion. Acceptable overhead for an infrequently-run operator script on small datasets.
Flag as WARNING, not blocking, in future reviews of this service.

## templateKind filter: JSONB path probe
The `templateKind` filter in `task-template.repository.ts` uses a Prisma JSONB path query:
`currentSchema -> 'metadata' -> 'loops' -> '0'` — presence means moderation, absence means standard. `STANDARD` wraps
the same check in `NOT`. Both work at the DB level via PostgreSQL jsonb operators. This is the canonical approach for
detecting moderation templates until a DB-level `templateKind` column is added.
