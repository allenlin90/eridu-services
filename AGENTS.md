# AGENTS.md

Operational guide for coding agents in `eridu-services`.

## Scope and Source of Truth
- This file applies to the entire monorepo.
- Canonical agent skill location: `.agent/skills/`.
- Skills should be discovered dynamically from the skills directory; do not maintain a hardcoded inventory in this file.
- Existing house rules and workflows are in:
  - `.agent/rules/`
  - `.agent/workflows/verification.md`
  - `.claude/CLAUDE.md`

## Repository Overview
- Monorepo: `pnpm` workspaces + Turborepo
- Node: `>=22`
- Workspaces:
  - Apps: `erify_api`, `eridu_auth`, `erify_creators`, `erify_studios`
  - Packages: `@eridu/api-types`, `@eridu/auth-sdk`, `@eridu/ui`, `@eridu/i18n`, `@eridu/eslint-config`, `@eridu/typescript-config`

## Core Engineering Rules
- Never expose DB internal IDs from API responses. Use UID-based external IDs.
- Backend (`erify_api`) follows repository/service/controller separation.
- Use Zod schemas and consistent snake_case (API) <-> camelCase (service/domain) transformations.
- Prefer bulk DB operations and relation includes over N+1 query patterns.
- Maintain strict typing. Do not bypass with `any` or `@ts-ignore` unless explicitly requested.
- Keep internal package dependency spec as `workspace:*`.

## Skill Routing (Use Before Editing)
- Backend API features (`apps/erify_api`):
  - `service-pattern-nestjs`
  - `repository-pattern-nestjs`
  - `backend-controller-pattern-nestjs`
  - `database-patterns`
  - `data-validation`
  - `erify-authorization`
  - `orchestration-service-nestjs` (for multi-service workflows)
- Frontend features (`apps/erify_creators`, `apps/erify_studios`):
  - `frontend-tech-stack`
  - `frontend-ui-components`
  - `frontend-api-layer`
  - `frontend-state-management`
  - `frontend-testing-patterns`
  - `frontend-error-handling`
  - `frontend-performance`
  - `frontend-i18n`
- Cross-app/shared contracts:
  - `shared-api-types`
  - `design-patterns`
  - `code-quality`
- Feature templates/list pages:
  - `admin-list-pattern`
  - `studio-list-pattern`
  - `task-template-builder`
- If a listed routing skill is unavailable, discover candidates in `.agent/skills/` and use the closest match.

## Standard Task Workflow
1. Identify impacted workspace(s).
2. Load relevant skill(s) from `.agent/skills/<skill>/SKILL.md`.
3. Read local patterns in the target module before changing code.
4. Implement minimal change set first; avoid broad refactors unless requested.
5. Verify each impacted workspace.

## Verification Checklist (Mandatory)
Run for every changed workspace/package:
```bash
pnpm --filter <workspace> lint
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> test
```
When package wiring/build behavior changed, also run:
```bash
pnpm --filter <workspace> build
```
If cross-workspace changes were made, validate dependents too.

## Useful Commands
```bash
pnpm dev
pnpm dev:creators
pnpm dev:studios
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

## Monorepo Package Notes
- Default pattern: package exports should point to compiled artifacts in `dist/`.
- Current codebase has mixed export patterns (for example, `@eridu/ui` exports runtime entries from `src` while types come from `dist`).
- Preserve existing behavior unless the task explicitly includes package export/build restructuring.

## Change Safety
- Do not revert unrelated local changes.
- Prefer targeted edits in touched modules.
- Keep migrations/schema updates and corresponding tests in the same task when possible.

## Deliverable Expectations
- Include a short summary of what changed and why.
- Call out any risks, assumptions, and follow-up items.
- Report verification commands run and outcomes.
