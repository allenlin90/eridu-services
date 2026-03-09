# DB Migration Policy

Canonical migration governance for backend workspaces:
- `erify_api` (`Prisma`)
- `eridu_auth` (`Drizzle` + `better-auth`)

## Goals

- Keep schema history trustworthy and reproducible.
- Prevent AI/manual drift from framework/tool state.
- Make manual SQL exceptions explicit and auditable.

## Framework-First Rule

- Always use official framework/tooling first.
- For `eridu_auth`, `better-auth` is the primary framework for auth-domain schema behavior.
- Generate/derive schema and migrations from official tooling before any manual SQL edits.

## Required Workflow by Workspace

### A) `erify_api` (Prisma)

1. Update Prisma schema (`apps/erify_api/prisma/schema.prisma`).
2. Generate migration:
   - `pnpm --filter erify_api prisma migrate dev --name <descriptive_name>`
3. Verify state:
   - `pnpm --filter erify_api prisma migrate status`

### B) `eridu_auth` (better-auth + Drizzle)

1. Update auth framework/schema intent first (Better Auth config/schema source).
2. Generate/refresh Better Auth schema artifact when needed:
   - `pnpm --filter eridu_auth auth:schema`
3. Generate Drizzle migration from schema diff:
   - `pnpm --filter eridu_auth db:generate`
4. Verify migration state/check:
   - `pnpm --filter eridu_auth db:check`

## Hard Rules

- Do not create a new migration file manually from scratch.
- New migration directories/files must be tool-generated (Prisma/Drizzle).
- If generated SQL is insufficient, edit the generated migration in-place only.
- Keep one final migration per feature branch before merge when possible (only if not already deployed to shared environments).

## Manual SQL Customization (Allowed with Guardrails)

Manual SQL is allowed only when official tooling cannot express required behavior (example: partial indexes, triggers, advanced constraints).

When customization is added:

1. Add inline SQL comments around the custom block.
2. Explain why generated SQL was insufficient.
3. Record operational/rollback notes if needed.

Recommended SQL comment format:

```sql
-- CUSTOM SQL START: <short reason>
-- Tool-generated SQL cannot express <capability>; applying manual SQL.
...custom statements...
-- CUSTOM SQL END
```

## Documentation Sync Requirement

When a migration contains manual SQL:

- Update this doc with the rationale/pattern if it introduces reusable guidance.
- Update relevant feature docs if behavior or operations are impacted.
- Update `.agent/skills/database-patterns/SKILL.md` if the pattern should guide future implementations.

## Deployment Safety

- Never rewrite/squash migrations already applied in shared environments.
- Use forward-only migrations for fixes after shared deployment.

## Branch-Local Consolidation Rule (Prisma, HITL)

For feature branches that are still local/not merged:

1. Keep all base migrations from `master` untouched.
2. Keep exactly one feature-branch Prisma migration directory (consolidated).
3. If schema changes during iteration, regenerate/rewrite that single branch migration.
4. Rebuild local state via:
   - `pnpm --filter erify_api db:migrate:reset`
   - `pnpm --filter erify_api db:migrate:deploy`
   - `pnpm --filter erify_api db:seed`

This consolidation rule is branch-local only. Shared/staging/production environments remain forward-only.
