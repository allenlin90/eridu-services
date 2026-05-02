# AGENTS.md

Operational guide for coding agents in `eridu-services`.

## Scope and Source of Truth
- This file applies to the entire monorepo.
- `AGENTS.md` is the canonical shared instruction file for this repo.
- Claude Code auto-loads `.claude/CLAUDE.md`; that file should remain a thin adapter that points back to this file instead of duplicating shared guidance.
- Canonical agent skill location: `.agent/skills/`.
- Skills should be discovered dynamically from the skills directory; the routing list below is a convenience map, not the source of truth.
- Existing house rules and workflows are in:
  - `.agent/rules/`
  - `.agent/workflows/verification.md`
  - `.agent/workflows/knowledge-sync.md`

## Shared Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```text
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Tool-Specific Notes

### Claude Code (`.claude/` System)

Claude Code does **not** auto-load `AGENTS.md`; it auto-loads `.claude/CLAUDE.md`, which should redirect back here.

| Artifact          | Location            | Notes                                                      |
| ----------------- | ------------------- | ---------------------------------------------------------- |
| Claude entrypoint | `.claude/CLAUDE.md` | Thin Claude-specific adapter only                          |
| Skills            | `.agent/skills/`    | Read directly via `Read` tool; no `.claude/skills/` mirror |
| Workflows         | `.agent/workflows/` | Read directly; no `.claude/workflows/` mirror              |
| Project memory    | `.claude/memory/`   | Supplementary reference, not source of truth               |
| Subagents         | `.claude/agents/`   | Claude-specific subagents                                  |

## Project-Specific Guidelines

### Repository Overview
- Monorepo: `pnpm` workspaces + Turborepo
- Node: `>=22`
- Apps:
  - `erify_api`
  - `eridu_auth`
  - `eridu_docs`
  - `erify_creators`
  - `erify_studios`
- Packages:
  - `@eridu/api-types`
  - `@eridu/auth-sdk`
  - `@eridu/browser-upload`
  - `@eridu/ui`
  - `@eridu/i18n`
  - `@eridu/eslint-config`
  - `@eridu/prettier-config`
  - `@eridu/typescript-config`

### Workflow Rules

#### Skill-First Development
- Before implementing any feature, load the relevant skill from `.agent/skills/<skill-name>/SKILL.md`.
- Prefer the routing map in this file for quick lookup, but treat the skill directory itself as authoritative.

#### Dependency Changes
- The cloud build runs `pnpm install --frozen-lockfile`. `pnpm-lock.yaml` is authoritative; `package.json` changes alone are not enough.
- Every time any `package.json` changes, update the lockfile in the same change set.
- For dependency changes, also run:
  - `pnpm install`
  - `pnpm lint`
  - `pnpm sherif`
  - `pnpm --filter <affected> typecheck`
  - `pnpm --filter <affected> build`
- If another workspace shares the dependency, align versions and verify those dependents too.

#### Knowledge And Doc Lifecycle
- After feature delivery, behavior changes, or refactors, run `.agent/workflows/knowledge-sync.md`.
- When a phase closes, PRDs ship, or docs are reorganized, run `.agent/workflows/doc-lifecycle.md`.
- When a backwards-incompatible schema redesign lands for a shipped feature, run `.agent/workflows/feature-version-cutover.md` (manual trigger). It decides whether to update docs in place or promote the feature doc to a versioned folder (`v1.md` archived, `README.md` describing v2), and enforces same-PR updates across all related docs and skills.
- Before merging a PR, run `.agent/workflows/pr-review.md`.
- During design review, optimization investigations, or phase planning, cross-check `.agent/workflows/ideation-lifecycle.md`.

### Core Engineering Rules
- Never expose DB internal IDs from API responses. Use UID-based external IDs.
- Backend (`erify_api`) follows repository/service/controller separation.
- Use Zod schemas and consistent snake_case (API) <-> camelCase (service/domain) transformations.
- Prefer bulk DB operations and relation includes over N+1 query patterns.
- Maintain strict typing. Do not bypass with `any` or `@ts-ignore` unless explicitly requested.
- Keep internal package dependency spec as `workspace:*`.
- For searchable frontend controls (`AsyncCombobox`, `AsyncMultiCombobox`, table filters, lookup dialogs), define the expected search data source per field during planning. Inputs that appear searchable must either trigger the intended scoped API query or use explicitly documented local filtering. Never ship no-op `onSearch` handlers or silent fallback to preloaded bundles without documenting that UX decision.
- For paginated frontend table/list views in `erify_studios` and `erify_creators`, use the shared pagination stack: `useTableUrlState`, `DataTablePagination`, `setPageCount` from real API metadata, and `placeholderData: keepPreviousData` for server-driven page transitions. Do not hand-roll route-local pagination/clamp logic unless the UX is materially different and the exception is documented in the relevant design/canonical doc. Older custom pagination implementations are refactor debt and should be unified toward this stack when those surfaces are touched. During implementation, code review, and PR review, treat fallback clamps such as `totalPages ?? 1`, manual next/prev pagers, or missing previous-data preservation on standard paginated routes as consistency findings.
- Migration files must be generated by official tooling (Prisma for `erify_api`, Drizzle for `eridu_auth`; `better-auth` schema flow first for auth-domain changes). Do not hand-write new migrations. Multiple tool-generated migrations are allowed (and preferred) when they keep each schema/data change scoped per PR/deployment. Never rewrite/squash migrations that have already been deployed to shared environments. Manual SQL is allowed only as in-place customization with explicit comments and synced docs/skills updates.
- For oversized NestJS backend files in `erify_api` (roughly >600 LOC or mixed service/repository/controller concerns), use `backend-large-file-refactor` as a development principle: prefer local pure helper modules or injectable collaborators over mixin-style concerns, while preserving repository/service/controller boundaries.
- For large frontend route components (roughly >200 LOC or mixed concerns), decompose into route container + extracted sections/hooks, keep search validation in route schema, and preserve URL behavior parity.
- For manual frontend refetch actions, use icon-only refresh buttons (`size="icon"`) with explicit `aria-label` and loading spin state; avoid text-labeled `Refresh` buttons. Older text-based mobile menu actions are refactor debt and should be migrated toward this pattern when touched.

### Core Patterns

#### ID Strategy
- Never expose internal DB IDs; convert DB IDs to UID strings at the API boundary.
- Use `{prefix}_{nanoid}` style UIDs such as `user_abc123` or `studio_xyz789`.
- Services should generate external IDs via the shared service helpers, not ad hoc per controller.

#### Three-Tier Schema Architecture
```text
API Layer: snake_case, Zod, @eridu/api-types
Service Layer: camelCase payloads and business logic
DB Layer: camelCase TypeScript mapped to snake_case DB columns
```

#### Authentication Chain
```text
eridu_auth (JWT) -> erify_api (JWKS verify) -> frontend clients
```
- Common guard ordering is Throttler -> JwtAuth -> Admin or Studio role checks.

#### Studio-Scoped Pattern
```typescript
@StudioProtected([ADMIN, MANAGER])
method(@StudioParam() studioUid: string) {
  // studioUid is already membership-validated by the guard
}
```

#### Immutable Task Templates
- Templates produce versioned snapshots.
- Tasks reference a specific snapshot.
- Template updates must not retroactively mutate existing tasks.

### Monorepo Package Rules
- Keep internal package versions as `workspace:*`.
- Default pattern: package exports should point to compiled artifacts in `dist/`.
- Current codebase has mixed export patterns (for example, `@eridu/ui` exports runtime entries from `src` while types come from `dist`). Mixed export packages are refactor debt, not an alternate standard. Avoid unrelated drive-by rewiring, but when package export/build behavior is in scope, align toward compiled `dist/` exports unless a concrete compatibility blocker is documented.
- Prefer package exports with both `types` and runtime entry definitions in `package.json`.
- Avoid path mappings from apps directly into workspace package sources unless the package already uses that pattern and the task explicitly requires it.
- For package or bundler changes, verify pnpm symlink behavior and affected `optimizeDeps` or build config expectations.

### Naming Conventions
| Context                 | Convention                 | Example                          |
| ----------------------- | -------------------------- | -------------------------------- |
| Variables and functions | `camelCase`                | `createUser`, `userId`           |
| Components and classes  | `PascalCase`               | `UserCard`, `TaskService`        |
| DB columns              | `snake_case`               | `user_id`, `created_at`          |
| API JSON                | `snake_case`               | `user_id`, `studio_id`           |
| Constants               | `SCREAMING_SNAKE_CASE`     | `STUDIO_ROLE`, `TASK_STATUS`     |
| Utility files           | `kebab-case`               | `api-client.ts`, `query-keys.ts` |
| Component files         | `PascalCase`               | `UserCard.tsx`, `TaskForm.tsx`   |
| Type suffixes           | `Dto`, `Schema`, `Payload` | `CreateUserDto`, `userSchema`    |

### Skill Routing (Use Before Editing)
- Backend API features (`apps/erify_api`):
  - `service-pattern-nestjs`
  - `repository-pattern-nestjs`
  - `backend-controller-pattern-nestjs`
  - `database-patterns`
  - `data-validation`
  - `erify-authorization`
  - `authentication-authorization-nestjs`
  - `orchestration-service-nestjs`
  - `backend-testing-patterns`
  - `backend-large-file-refactor`
  - `api-performance-optimization`
  - `observability-logging`
  - `secure-coding-practices`
  - `soft-delete-restore`
- Frontend features (`apps/erify_creators`, `apps/erify_studios`):
  - `frontend-tech-stack`
  - `frontend-ui-components`
  - `frontend-api-layer`
  - `frontend-state-management`
  - `frontend-testing-patterns`
  - `frontend-error-handling`
  - `frontend-performance`
  - `frontend-i18n`
  - `frontend-code-quality`
  - `table-view-pattern`
  - `pwa-best-practices`
- Docs platform (`apps/eridu_docs`):
  - `ssr-auth-integration`
  - `astro-starlight-best-practices`
  - `monorepo-doc-layering`
  - `eridu-docs-information-architecture`
  - `user-facing-docs`
- Architecture and shared contracts:
  - `shared-api-types`
  - `design-patterns`
  - `solid-principles`
  - `domain-refactor-cutover-strategy`
  - `data-compatibility-migration`
  - `environment-configuration-zod`
  - `package-extraction-strategy`
- Feature-specific:
  - `admin-list-pattern`
  - `studio-list-pattern`
  - `task-template-builder`
  - `schedule-continuity-workflow`
  - `jsonb-analytics-snapshot`
  - `shift-schedule-pattern`
  - `file-upload-presign`
  - `spreadsheet`
- Meta and tooling:
  - `agent-instruction-maintenance`
  - `code-quality`
  - `engineering-best-practices-enforcer`
  - `playwright`
  - `security-threat-model`
  - `skill-creator`
- If a listed routing skill is unavailable, discover candidates in `.agent/skills/` and use the closest match.

### Standard Task Workflow
1. Identify impacted workspace(s).
2. Load relevant skill(s) from `.agent/skills/<skill>/SKILL.md`.
3. Read local patterns in the target module before changing code.
4. Implement the minimal change set first; avoid broad refactors unless requested.
5. For PWA work in frontend apps, follow `.agent/workflows/pwa-migration.md` in addition to feature-specific skills.
6. For UI or UX redesign and route layout quality passes, follow `.agent/workflows/ui-ux-pro-max.md`.
7. Verify each impacted workspace with the checklist below.
8. For feature, refactor, or behavior changes, run knowledge sync.
9. For doc or phase-boundary work, run the appropriate lifecycle workflow.

### Verification Checklist (Mandatory)
Run for every changed workspace or package:
```bash
pnpm --filter <workspace> lint
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> test
```
If a workspace does not currently define `test`, run the available verification commands and report the missing test script explicitly.

Also run:
```bash
pnpm --filter <workspace> build
```
- whenever package wiring or build behavior changed
- whenever dependencies changed
- whenever the workspace has stricter build-time checks than `typecheck`
- whenever you would not be comfortable handing off the change without a build result

> **Why `build` matters**: `typecheck` runs `tsc --noEmit` against the root tsconfig. The actual build uses stricter or different configs (e.g. `tsconfig.server.json` for `eridu_auth`, Vite for frontends). Errors like stale `@ts-expect-error`, `noUnusedLocals`, and ESLint type-aware rules only surface in `build`. Passing `typecheck` does not guarantee a passing build.

If cross-workspace changes were made, validate dependents too.

### Useful Commands
```bash
pnpm dev
pnpm dev:creators
pnpm dev:studios
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm sherif
```

### Backend API Patterns

#### Error Handling
- Use `HttpError` utilities for cross-domain constraints instead of throwing NestJS exceptions directly from orchestration services.
- Model services should generally return `null` for not-found results and let controllers convert that through the established response helpers.

#### Transactions
- Prefer `@Transactional()` and the repo's CLS transaction flow instead of manually threading `tx` through service signatures.

#### Controller Responses
- Use the established response decorators for admin, studio, and me controllers.
- Path params that represent UIDs should use `UidValidationPipe`.

#### Performance
- Use `Promise.all` for independent reads.
- Prefer bulk repository operations over loops of individual creates or updates.

### Service Layer Rules
- Schemas may import Prisma types to define payload types. Services must not expose Prisma input types in public signatures.
- Services should work with payload types defined in local schemas and delegate DB access to repositories.
- Prefer the task model and task orchestration flows as reference implementations when choosing between competing existing patterns.
- Reference priority for new backend code: `.claude/memory/ideal-pattern.md` → `task.service.ts` → `task-orchestration.service.ts` → `studio-membership` schema.

| Do                               | Don't                                   |
| -------------------------------- | --------------------------------------- |
| Define payload types in schemas  | Expose `Prisma.*` in service signatures |
| Use repository for all DB access | Build Prisma queries in service         |
| Follow task model as reference   | Copy patterns from unverified models    |

### Supplementary References
- `.claude/memory/` contains useful deep-dive references such as `ideal-pattern.md`, `known-issues.md`, `auth-patterns.md`, `schema-patterns.md`, and `monorepo-package-rules.md`.
- Treat those files as supplementary reference material, not as replacements for skills, workflows, or this file.

### Change Safety
- Do not revert unrelated local changes.
- Prefer targeted edits in touched modules.
- Keep migrations or schema updates and corresponding tests in the same task when possible.

### Deliverable Expectations
- Include a short summary of what changed and why.
- Call out risks, assumptions, and follow-up items.
- Report verification commands run and outcomes.
