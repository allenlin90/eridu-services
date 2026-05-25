# AGENTS.md

Operational guide for coding agents in `eridu-services`.

## Scope and Source of Truth
- This file applies to the entire monorepo.
- `AGENTS.md` is the canonical shared instruction file for this repo.
- Claude Code auto-loads `.claude/CLAUDE.md`; that file should remain a thin adapter that points back to this file instead of duplicating shared guidance.
- Canonical agent skill location: `.agent/skills/`. Skills are discovered dynamically from this directory.
- House rules: `.agent/rules/`.
- Workflows: `.agent/workflows/`.

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

- **Claude Code**: see `.claude/CLAUDE.md` for loading behavior, paths, and adapter rules.

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
- Use `docs/tech-debt/` for accepted implementation gaps and cleanup issues that should be fixed later; use `docs/ideation/` for deferred product or architecture ideas that need future discovery or PRD promotion.
- Before merging a PR, run `.agent/workflows/pr-review.md`.
- During design review, optimization investigations, or phase planning, cross-check `.agent/workflows/ideation-lifecycle.md`.

### Core Engineering Rules
- Never expose DB internal IDs from API responses. Use UID-based external IDs.
- Backend (`erify_api`) follows repository/service/controller separation.
- Use Zod schemas and consistent snake_case (API) <-> camelCase (service/domain) transformations.
- Prefer bulk DB operations and relation includes over N+1 query patterns.
- Maintain strict typing. Do not bypass with `any` or `@ts-ignore` unless explicitly requested.
- Keep internal package dependency spec as `workspace:*`.
- Store actual timestamps, operational indicators, performance facts, and revenue facts on the narrowest entity whose fact they describe. Keep OLTP tables focused on operational workflows and exception review; defer cross-entity analytics, trends, and derived aggregates to explicit OLAP/read-model designs. Do not persist derived finance totals on operational tables.
- Use standard audit history for new override and extraction flows. Do not add new `metadata.audit.*` arrays; existing metadata audit payloads are legacy compatibility only.
- Bump optimistic-lock `version` only on semantic user-visible mutations. Do NOT bump on pre-submission bookkeeping (upload reservations, presign caches, async denormalized state) — bumping causes spurious 409s on the user's next legitimate write. See `database-patterns` §6.
- Before storing new keys in a JSONB `metadata` column, decide: if losing the key to a concurrent overwrite breaks a business workflow, use the Audit model (or a dedicated table) — do not retrofit raw-SQL JSONB merges or advisory locks around `metadata` to make non-critical bookkeeping race-safe.
- For frontend money fields, normalize both the stored API decimal string and user input before comparison.
- Migration files must be generated by official tooling (Prisma for `erify_api`, Drizzle for `eridu_auth`; `better-auth` schema flow first for auth-domain changes). Do not hand-write new migrations. Never rewrite/squash migrations that have already been deployed to shared environments.
- For oversized backend files (>600 LOC), see `backend-large-file-refactor` skill.
- For large frontend route components (>200 LOC), see `frontend-code-quality` skill.
- For frontend searchable controls, pagination, form contracts, refresh actions, and async lookup patterns, see the relevant frontend skills (`frontend-ui-components`, `frontend-code-quality`, `table-view-pattern`).

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

Skills are discovered from `.agent/skills/`. Each `SKILL.md` has a name and description in its frontmatter. Skills cover these categories:

- **Backend API** — service, repository, controller, orchestration, authorization, database, testing, performance, logging, security patterns
- **Frontend** — tech stack, UI components, API layer, state management, testing, error handling, performance, i18n, code quality, table views, PWA
- **Docs platform** — SSR auth, Astro/Starlight, doc layering, information architecture, user-facing docs
- **Architecture** — shared API types, design patterns, SOLID, domain refactoring, data compatibility, environment config, package extraction
- **Feature-specific** — admin/studio list patterns, task templates, schedule continuity, shift schedules, file uploads, spreadsheets, and more
- **Meta and tooling** — agent instruction maintenance, code quality, doc hygiene, engineering best practices, database CLI, Playwright, security, skill creation

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

#### Route Shape
- Prefer one canonical collection route per mutable resource under its authorization boundary, for example `studios/:studioId/compensation-line-items`.
- Avoid deep parent chains that mirror UI location when the child has its own UID, audit trail, pagination, or soft-delete lifecycle.
- For polymorphic or target-attached resources, use explicit create fields and list filters such as `target_type` and `target_id`; reserve `include` / `expand` for read-time embedding, not primary mutation contracts.

#### Performance
- Use `Promise.all` for independent reads.
- Prefer bulk repository operations over loops of individual creates or updates.

### Service Layer Rules
- Schemas may import Prisma types to define payload types. Services must not expose Prisma input types in public signatures.
- Services should work with payload types defined in local schemas and delegate DB access to repositories.
- Prefer the task model and task orchestration flows as reference implementations when choosing between competing existing patterns.
- Reference priority for new backend code: `task.service.ts` → `task-orchestration.service.ts` → `studio-membership` schema.

| Do                               | Don't                                   |
| -------------------------------- | --------------------------------------- |
| Define payload types in schemas  | Expose `Prisma.*` in service signatures |
| Use repository for all DB access | Build Prisma queries in service         |
| Follow task model as reference   | Copy patterns from unverified models    |

### Supplementary References
- Tool-specific supplementary reference files (e.g. `.claude/memory/`) are maintained per-tool and are not replacements for skills, workflows, or this file.

### Change Safety
- Do not revert unrelated local changes.
- Prefer targeted edits in touched modules.
- Keep migrations or schema updates and corresponding tests in the same task when possible.

### Deliverable Expectations
- Include a short summary of what changed and why.
- Call out risks, assumptions, and follow-up items.
- Report verification commands run and outcomes.
