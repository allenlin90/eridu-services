# AGENTS.md

Operational guide for coding agents in `eridu-services`.

## Scope and Source of Truth

- This file applies to the entire monorepo.
- `AGENTS.md` is the canonical shared runtime instruction file for this repo.
- [`.agents/README.md`](.agents/README.md) is the canonical taxonomy and admission contract for agent content; it does not replace this runtime instruction file.
- Claude Code auto-loads `.claude/CLAUDE.md`; that file should remain a thin adapter that points back to this file instead of duplicating shared guidance.
- Cursor auto-loads `.cursor/rules/`; keep the `erify_api` rule as a thin adapter to this file and the canonical skills instead of duplicating backend doctrine.
- Canonical agent skill location: `.agents/skills/`. Skills are discovered dynamically from this directory.
- House rules: `.agents/rules/`.
- Workflows: `.agents/workflows/`.

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

- **Codex**: discovers `.agents/skills/` natively. Keep shared instructions in `SKILL.md`; put Codex-only presentation, invocation policy, and tool dependencies in `agents/openai.yaml` inside the skill.
- **Claude Code**: see `.claude/CLAUDE.md` for loading behavior, paths, and adapter rules.
- **Google Antigravity**: discovers `.agents/skills/` and `.agents/rules/` natively. It remains supported for shared portable content, but it is outside the primary Claude Code, Codex, and OpenCode compatibility matrix in this migration.
- **OpenCode**: `opencode.json` loads this file. Skills are routed from `.agents/skills/` via `.opencode/skills` symlink.

### Integrated Agentic Toolsuite

Optional tools. Each is explicit-only — none changes reasoning or the verification checklist.

| Tool | What it does | Where |
| --- | --- | --- |
| `rtk` | Filters repetitive build and shell output to cut token use | § RTK (Rust Token Killer) Rules below, including the availability check and fallback |
| `caveman` | Presentation-only output compression, on explicit user trigger | [`.agents/skills/caveman/SKILL.md`](.agents/skills/caveman/SKILL.md) |
| `graphify` | Code and doc knowledge-graph builder and query tool | [`.agents/skills/graphify/SKILL.md`](.agents/skills/graphify/SKILL.md) and § graphify below |
| `mattpocock` | Issue-tracker, triage-label, and domain-doc setup for planning skills | [`.agents/skills/setup-matt-pocock-skills/SKILL.md`](.agents/skills/setup-matt-pocock-skills/SKILL.md) |

The simplicity-first, surgical-changes, direct-execution principles sometimes labelled "karpathy" are not a tool — they are the § Shared Behavioral Guidelines above and apply unconditionally.

## Agent System References

Use these documents when changing the agent system rather than application behavior:

- **Taxonomy and operating model:** [`.agents/README.md`](.agents/README.md), [`AGENT_OPERATING_MODEL.md`](docs/engineering/AGENT_OPERATING_MODEL.md), and [`AGENT_CONTENT_REORGANIZATION.md`](docs/engineering/AGENT_CONTENT_REORGANIZATION.md).
- **Stable workflow entrypoints:** [`AGENT_INVOCATION_COMPATIBILITY.md`](docs/engineering/AGENT_INVOCATION_COMPATIBILITY.md).
- **Developer setup and local retrieval:** [`AGENTIC_DEVELOPMENT_SETUP.md`](docs/engineering/AGENTIC_DEVELOPMENT_SETUP.md) and [`LOCAL_AGENT_RETRIEVAL.md`](docs/engineering/LOCAL_AGENT_RETRIEVAL.md).
- **Knowledge and platform ownership:** [`KNOWLEDGE_AND_PLATFORM_LAYOUT.md`](docs/engineering/KNOWLEDGE_AND_PLATFORM_LAYOUT.md) and [`OKF_AGENT_CONTRACT.md`](docs/engineering/OKF_AGENT_CONTRACT.md).

When a skill is added, removed, split, consolidated, or reclassified, update the active inventory in `AGENT_CONTENT_REORGANIZATION.md` and follow the bookkeeping rules in `.agents/README.md`.

## Knowledge and OKF Contract

Claude Code, Codex, and OpenCode must follow the same Open Knowledge Format behavior. Read [`docs/engineering/OKF_AGENT_CONTRACT.md`](docs/engineering/OKF_AGENT_CONTRACT.md) before changing or materially relying on knowledge intended to become an OKF bundle.

Mandatory behavior:

- Apply strict OKF v0.2 only to canonical bundles that declare `okf_version: "0.2"` at the bundle-root `index.md`.
- Treat `ai/openwebui/knowledge/company-wiki/content/` as a legacy compatibility profile until its schema, validator, content, maintainer guidance, and publication mapping migrate together.
- Discover strict bundles progressively from the nearest `index.md`; do not load an entire bundle by default.
- Treat the bundle-relative path without `.md` as the portable concept ID for strict OKF concepts.
- Require a non-empty `type` only for strict v0.2 concepts; tolerate unknown types and preserve unknown frontmatter fields.
- For legacy company-wiki content, do not require `type`; follow its local README, AGENTS, schema, and validator.
- Inspect `status`, `stale_after`, `sources`, `generated`, and `verified` when present; surface stale, draft, deprecated, or unverified material instead of silently treating it as current.
- Use QMD or `rg` to select evidence, then inspect the canonical source before editing or making important claims.
- Prefer standard Markdown links in strict bundles. Existing `[[wikilink]]` syntax remains valid where the active legacy validator requires it.
- Treat `audiences` and `sensitivity` as policy metadata, not authorization enforcement.
- Do not invent missing company facts, source attribution, verifier identities, or freshness claims.
- Preserve repository extensions such as stable upload IDs, ownership, audience, and sensitivity metadata during round trips.

[`knowledge/`](knowledge/index.md) is the live canonical strict OKF v0.2 bundle for this repository. It declares `okf_version: "0.2"` at its bundle-root `index.md` and owns durable architecture, engineering, and domain doctrine. Thin skills under `.agents/skills/` select its concepts rather than restating them — when a fact and a procedure disagree, the knowledge concept wins.

Rules for `knowledge/`:

- Add a concept only when it is a durable fact, pattern, architecture rule, or domain model — not a procedure. Apply the routing test in [`.agents/README.md`](.agents/README.md).
- Every concept carries fenced YAML frontmatter with a non-empty `type`, a one-sentence `description`, and lifecycle fields. Only the bundle-root `index.md` carries `okf_version`.
- Update the bundle-root `index.md` whenever a concept is added, removed, or renamed.
- Move content into a concept **verbatim** when consolidating from another location. Do not resummarize doctrine into bullets — that silently drops hard-won rules and is how invented facts enter the bundle.
- Verify every code-level claim (state values, guard names, component names, script names) against the source before writing it. `pnpm agents:validate` checks bundle structure, not truth.

The current Open WebUI knowledge tree under `ai/openwebui/knowledge/` remains transitional and is governed by its own legacy compatibility profile; it has not merged into `knowledge/`. Deployment adapters and published state belong under `infra/` after a dedicated migration.

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
  - `@eridu/typescript-config`

### Workflow Rules

#### Skill-First Development

- Before implementing any feature, load the relevant skill from `.agents/skills/<skill-name>/SKILL.md`.
- Before creating, expanding, or reclassifying agent content, apply [`.agents/README.md`](.agents/README.md) and the active inventory in [`AGENT_CONTENT_REORGANIZATION.md`](docs/engineering/AGENT_CONTENT_REORGANIZATION.md).
- Prefer the routing map in this file for quick lookup, but treat the skill directory itself as authoritative for invocable behavior.
- After adding or changing a skill, run `pnpm agents:validate`.

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

- After feature delivery, behavior changes, or refactors, run the `knowledge-sync` skill.
- When a phase closes, PRDs ship, or docs are reorganized, run the `doc-lifecycle` skill for bookkeeping and artifact transitions.
- When a large committed scope needs several independently reviewed PRs but must land to `master` atomically, run [`.agents/workflows/integration-pr-delivery.md`](.agents/workflows/integration-pr-delivery.md) on top of the normal PRD, `pr-ready`, knowledge-sync, and doc-lifecycle flows. Breakdown PRs target the main integration branch; the main PR owns final wrap-up and the single merge to `master`.
- When Open WebUI skill content or a Workspace Model manifest changes, run [`.agents/workflows/openwebui-sync-delivery.md`](.agents/workflows/openwebui-sync-delivery.md) so the live instance and the PR land together. `ai/openwebui/skills/` and `ai/openwebui/models/` are the source of truth; `ai/openwebui/synced/` is a drift snapshot, not an edit surface.
- When a backwards-incompatible schema redesign lands for a shipped feature, run `.agents/workflows/feature-version-cutover.md` (manual trigger). It decides whether to update docs in place or promote the feature doc to a versioned folder (`v1.md` archived, `README.md` describing v2), and enforces same-PR updates across all related docs and skills.
- **Pattern/direction reconciliation gate (ready-to-start precondition).** Before starting a task that changes an established pattern, convention, or architectural direction — deprecating or superseding a skill, flipping a default, changing a doctrine — enumerate every skill, rule, workflow, agent, memory, vendor adapter, and doc that asserts the old pattern (`rg -l "<skill/pattern>" .agents .claude .cursor .opencode ai apps docs infra packages AGENTS.md README.md opencode.json`) and reconcile all of them in the same PR. The task is not ready to *start* until that reconciliation set is listed, and not ready to *merge* until each entry is updated or explicitly deferred with a recorded gate (e.g. pilot-gated doctrine). Partial reconciliation that leaves a canonical skill or doc asserting the superseded pattern is a blocking inconsistency. If a direction is only partly accepted, say exactly which part is active and which is gated — do not blanket-deprecate ahead of the gate. See the `agent-instruction-maintenance` skill.
- Use `docs/tech-debt/` for accepted implementation gaps and cleanup issues that should be fixed later; use `docs/ideation/` for deferred product or architecture ideas that need future discovery or PRD promotion.
- Before merging a PR, run the `pr-ready` skill, which executes `.agents/workflows/pr-review.md` end-to-end and returns a READY / NOT READY verdict. Its Wrap-up step is part of the merge-readiness verdict: it folds in `knowledge-sync.md` and the `doc-lifecycle` skill so the skill/doc/lifecycle updates this PR implies — synced skills, updated docs and links, retired design docs/PRDs/superpowers specs, roadmap status — land in the same PR with the description updated, not in a follow-up.
- During design review, optimization investigations, or phase planning, cross-check `.agents/workflows/ideation-lifecycle.md`.
- At each phase boundary or at least every three months, run the `repository-health` skill to reconcile implementation quality, package/test health, documentation lifecycle, skills, and the canonical tech-debt and ideation registers. Keep broad cleanup in separate scoped PRs.

### Core Engineering Rules

- Never expose DB internal IDs from API responses. Use UID-based external IDs.
- Backend (`erify_api`) follows controller → capability service/use case → persistence separation. Persistence may be direct through `TransactionHost.tx` for shallow single-model CRUD or private behind a repository/query provider when complexity earns that seam.
- New `erify_api` work follows the capability-first modular-monolith direction and persistence matrix ([`ARCHITECTURE.md`](apps/erify_api/docs/ARCHITECTURE.md)): place a use case with the business capability that owns the rule instead of adding another table-first or audience-first slice; do not create a Nest module or repository per Prisma model by default; keep persistence providers private, retaining a repository only when it hides real persistence complexity; introduce no global CQRS bus, speculative interface, exported repository, or folder migration without a demonstrated trigger.
- Before planning or implementing an `erify_api` feature, behavior change, or refactor, check [`REFACTORING_TARGETS.md`](apps/erify_api/docs/REFACTORING_TARGETS.md) for the touched surface and record the applicable target IDs plus trigger outcome in the plan and PR. Introduce a capability API or abstraction only when the current change needs an owned invariant, transaction, persistence policy, runtime boundary, or shared operation; do not add a speculative layer solely to make a hypothetical future refactor easier.
- Use Zod schemas and consistent snake_case (API) <-> camelCase (service/domain) transformations.
- Prefer bulk DB operations and relation includes over N+1 query patterns.
- Maintain strict typing. Do not bypass with `any` or `@ts-ignore` unless explicitly requested.
- Keep internal package dependency spec as `workspace:*`.
- Store actual timestamps, operational indicators, performance facts, and revenue facts on the narrowest entity whose fact they describe. Keep OLTP tables focused on operational workflows and exception review; defer cross-entity analytics, trends, and derived aggregates to explicit OLAP/read-model designs. Do not persist derived finance totals on operational tables.
- Use standard audit history for new override and extraction flows. Do not add new `metadata.audit.*` arrays; existing metadata audit payloads are legacy compatibility only.
- Bump optimistic-lock `version` only on semantic user-visible mutations. Do NOT bump on pre-submission bookkeeping (upload reservations, presign caches, async denormalized state) — bumping causes spurious 409s on the user's next legitimate write. See [`knowledge/architecture/database-patterns` §6](knowledge/architecture/database-patterns.md#6-optimistic-locking).
- Before storing new keys in a JSONB `metadata` column, decide: if losing the key to a concurrent overwrite breaks a business workflow, use the Audit model (or a dedicated table) — do not retrofit raw-SQL JSONB merges or advisory locks around `metadata` to make non-critical bookkeeping race-safe.
- For frontend money fields, normalize both the stored API decimal string and user input before comparison.
- Migration files must be generated by official tooling (Prisma for `erify_api`, Drizzle for `eridu_auth`; `better-auth` schema flow first for auth-domain changes). Do not hand-write new migrations. Never rewrite/squash migrations that have already been deployed to shared environments.
- Name migrations by **purpose only** (`client_mechanic_foundation`), in domain terms. Do not include PR numbers, roadmap rows, ticket IDs, phase labels, or plan/implementation specifics (`pr_20_1_*`, `phase4_*`) — the folder name is permanent and that noise is meaningless once merged. See [`knowledge/architecture/database-patterns` §12](knowledge/architecture/database-patterns.md#12-migration-policy).
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
- Runtime shared packages export JavaScript, declarations, source maps, and package-owned static assets from `dist/`. Do not point runtime export conditions at TypeScript source; package builds must materialize every exported target before consumer builds run.
- A package's `dev` script must also produce every exported target that `build` produces, including non-TS static assets `tsc --watch` won't touch (e.g. copying a stylesheet into `dist/`). A fresh clone must not need a manual `build` before `pnpm dev`/`dev:studios`/`dev:creators` works.
- Prefer package exports with both `types` and runtime entry definitions in `package.json`.
- Avoid path mappings from apps directly into workspace package sources unless the package already uses that pattern and the task explicitly requires it.
- For package or bundler changes, verify pnpm symlink behavior and affected `optimizeDeps` or build config expectations.

### Naming Conventions

| Context | Convention | Example |
| --- | --- | --- |
| Variables and functions | `camelCase` | `createUser`, `userId` |
| Components and classes | `PascalCase` | `UserCard`, `TaskService` |
| DB columns | `snake_case` | `user_id`, `created_at` |
| API JSON | `snake_case` | `user_id`, `studio_id` |
| Constants | `SCREAMING_SNAKE_CASE` | `STUDIO_ROLE`, `TASK_STATUS` |
| Utility files | `kebab-case` | `api-client.ts`, `query-keys.ts` |
| Component files | `PascalCase` | `UserCard.tsx`, `TaskForm.tsx` |
| Type suffixes | `Dto`, `Schema`, `Payload` | `CreateUserDto`, `userSchema` |

### Skill Routing (Use Before Editing)

Skills are discovered from `.agents/skills/`. Each `SKILL.md` has a name and description in its frontmatter.

For fast keyword lookup, [`.agents/skills/INDEX.md`](.agents/skills/INDEX.md) is a generated one-line-per-skill catalog — grep it to match a task to a skill before opening any `SKILL.md`. It is derived (this routing map stays canonical); regenerate with `pnpm agents:index`, and `pnpm agents:validate` fails if it is stale.

Before changing the catalog itself, read [`.agents/README.md`](.agents/README.md), [`AGENT_OPERATING_MODEL.md`](docs/engineering/AGENT_OPERATING_MODEL.md), and [`AGENT_CONTENT_REORGANIZATION.md`](docs/engineering/AGENT_CONTENT_REORGANIZATION.md).

Skills cover these categories:

- **Backend API** — service, repository, controller, orchestration, authorization, database, testing, performance, logging, security patterns
- **Frontend** — tech stack, UI components, API layer, state management, testing, error handling, performance, i18n, code quality, table views, PWA, pre-implementation UX mockup validation
- **Docs platform** — SSR auth, Astro/Starlight, doc layering, information architecture, user-facing docs
- **Architecture** — shared API types, design patterns, SOLID, domain refactoring, data compatibility, environment config, package extraction
- **Feature-specific** — admin/studio list patterns, task templates, schedule continuity, shift schedules, show production lifecycle, file uploads, spreadsheets, and more
- **Meta and tooling** — agent instruction maintenance, workflow bridges, code quality, doc hygiene, engineering best practices, database CLI, Playwright, knowledge-graph build and query (`graphify`), security, skill creation
- **AI workspace / platform ops** — Open WebUI + LiteLLM + Better Auth SSO governance, MCP exposure and tool access policy, files under `ai/` and `scripts/ai/`

### Standard Task Workflow

1. Identify impacted workspace(s).
2. Load relevant skill(s) from `.agents/skills/<skill>/SKILL.md`.
3. Read local patterns in the target module before changing code.
4. Implement the minimal change set first; avoid broad refactors unless requested.
5. For PWA work in frontend apps, follow `.agents/workflows/pwa-migration.md` in addition to feature-specific skills.
6. For UI or UX redesign and route layout quality passes, follow `.agents/workflows/ui-ux-pro-max.md`.
7. Before writing an implementation plan for a new or undecided frontend UX, validate it with the user via `ui-mockup-discussion` (rendered mockups, not prose descriptions) — see `.agents/skills/ui-mockup-discussion/SKILL.md`.
8. Verify each impacted workspace with the checklist below.
9. For feature, refactor, or behavior changes, run knowledge sync.
10. For doc or phase-boundary work, run the appropriate lifecycle skill or workflow.

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

For `erify_api` changes that can affect persistence transaction semantics,
soft-delete/restore behavior, CLS participation, or Nest runtime composition,
also run the guarded real-database gate from
[`backend-testing-patterns`](.agents/skills/backend-testing-patterns/SKILL.md#5-real-database-integration-tests)
and record the result in the PR. This remains a manual gate until the
[automated CI topic](docs/ideation/erify-api-real-database-ci-gate.md) is
promoted.

For feature/refactor work, also run the refactor-parity checks in [`.agents/workflows/verification.md`](.agents/workflows/verification.md#steps) (loading/empty/data UI states, route/search-param contracts, pagination stack parity) in addition to the commands above.

### Useful Commands

```bash
pnpm agents:doctor
pnpm agents:validate
pnpm agents:index
pnpm dev
pnpm dev:creators
pnpm dev:studios
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm sherif
pnpm architecture:signals
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
- Prefer bulk persistence operations over loops of individual creates or updates.

### Service Layer Rules

- Schemas may import Prisma types to define payload types. Services must not expose Prisma input types in public signatures.
- Services work with payload types defined in local schemas. A shallow capability service may use `TransactionHost.tx.<model>` directly; complex filters, projections, conditional writes, raw SQL, or reusable persistence policy belong in a private repository, store, or query provider.
- Direct-persistence services may build only private, bounded Prisma operations. Do not expose Prisma types or a generic Prisma query DSL through the service API.
- For `erify_api` module placement and persistence selection, load `erify-api-capability-refactoring` first. Use `service-pattern-nestjs`, `repository-pattern-nestjs`, and `orchestration-service-nestjs` for the selected implementation's correctness rules.
- Reference priority for new backend code: `show-status.service.ts` for shallow direct persistence → `task.service.ts` and its repository for complex persistence → `task-orchestration.service.ts` for workflows → `studio-membership` schema for payload types.

| Do | Don't |
| --- | --- |
| Define payload types in schemas | Expose `Prisma.*` in service signatures |
| Use direct `txHost.tx` for shallow CRUD | Add a pass-through repository by default |
| Keep complex persistence in a private provider | Export repositories for caller convenience |
| Follow verified capability references | Copy patterns from unverified models |

### Agent Memory & Supplementary References

- **Shared Agent Memory (`.agents/memory/`):** Contains tool-agnostic refactoring logs, migration history, and architectural overrides (e.g. `data-table-extraction.md`).
  - **Read Guidelines:** During the planning/research phase of a task, check `.agents/memory/` for historical context on the affected codebase areas.
  - **Write Guidelines:** When executing a major component refactoring, file relocation, or architectural cutover, document it in a new `.agents/memory/<topic>.md` file as part of the `knowledge-sync.md` workflow.
- **Tool-Specific Memory (`.claude/memory/`):** Deep-dive reference documents maintained per-tool. Consult them when you need additional reference depth after reading canonical files.

### Change Safety

- Do not revert unrelated local changes.
- Prefer targeted edits in touched modules.
- Keep migrations or schema updates and corresponding tests in the same task when possible.

### Deliverable Expectations

- Include a short summary of what changed and why.
- Call out risks, assumptions, and follow-up items.
- Report verification commands run and outcomes.

## Tool-Specific Optimizations

### RTK (Rust Token Killer) Rules

- Always prefix shell commands with `rtk` to minimize token consumption when executing commands via agents.
- **Availability Check & Fallback:** Before using `rtk` for the first time in a session or environment, verify if it is available (e.g., run `which rtk` or check command existence). If `rtk` is not installed or available, fall back to running the native command directly without the `rtk` prefix.
- Examples:
  - `rtk git status` (fallback: `git status`)
  - `rtk pnpm test` (fallback: `pnpm test`)
  - `rtk pnpm lint` (fallback: `pnpm lint`)
  - `rtk grep "pattern" src/` (fallback: `grep "pattern" src/`)
  - `rtk find "*.ts" .` (fallback: `find "*.ts" .`)
- Do not use `rtk` for commands that require interactive prompts or streaming outputs.

### graphify (Knowledge Graph)

`graphify` is an optional local CLI that builds a queryable knowledge graph of a corpus at `graphify-out/`. Installation, the optional Claude Code hooks, and troubleshooting live in [`AGENTIC_DEVELOPMENT_SETUP.md`](docs/engineering/AGENTIC_DEVELOPMENT_SETUP.md) §7. Nothing in the verification checklist depends on it.

- **Availability check & fallback:** `graphify-out/` is gitignored, so it does not exist on a fresh clone. Treat graphify as available only when both `command -v graphify` succeeds and `graphify-out/graph.json` exists. Otherwise fall back to `rg` and direct file reading without mentioning the tool.
- When available, use it to orient before reading raw files. Reach for it in this order:
  - `graphify explain "<Symbol>"` — a named symbol's source location, methods, and immediate neighbors. The strongest command; usually cheaper than opening the file.
  - `graphify path "<A>" "<B>"` — the shortest relationship chain between two symbols. Answers in one line what would otherwise take several greps.
  - `graphify query "<seed>"` — breadth-first traversal seeded by symbol or keyword match, not natural-language question answering. Seed it with an identifier, not a sentence; a prose question matches literal words and returns noise. Large result sets are truncated — narrow the seed or raise `--budget`.
  - `graphify-out/GRAPH_REPORT.md` — broad architecture review only, or when the commands above do not surface enough context.
- Prefer `rg` when you already know the exact identifier and only need its definition or call sites. Graphify earns its cost on relationships and neighborhoods, not on exact-name lookup.
- **Orientation, not authority.** Use the graph to select what to read, then inspect the canonical source before editing or making an important claim — the same evidence rule that governs QMD and `rg` under the OKF contract.
- **Does not displace Skill-First Development.** Load the relevant skill from `.agents/skills/` first; use graphify to locate the code that skill applies to.
- Dirty `graphify-out/` files after a hook or incremental update are expected and are not a reason to skip the tool.
- Refresh the graph with `graphify update .` (AST-only, no API cost). On this monorepo that is roughly 30 seconds for a full re-extract, so run it after a batch of changes or before a query you need to be accurate — not after every edit.
- To build or rebuild a graph, or to run one over another repo or corpus, load the `graphify` skill (`/graphify`).
- The rule above is the whole contract; no hook or generated instruction block is required for it. Optional per-developer `hook-guard` hooks are described in [`AGENTIC_DEVELOPMENT_SETUP.md`](docs/engineering/AGENTIC_DEVELOPMENT_SETUP.md) §7 and belong in `.claude/settings.local.json`, never in the shared `.claude/settings.json`.

### Documentation & Link Hygiene

- All markdown files must be formatted in accordance with the repository's native ESLint rules. Run `pnpm lint:markdown` to verify and `pnpm format:markdown` to automatically fix formatting.
- Markdown links in repository documentation (e.g., `docs/`, `apps/README.md`) must use **relative paths** from the current document.
- Never use absolute filesystem paths (such as `/Users/...`) in Markdown links.
- Never use `file://` URLs in repository documentation. (Note: This is separate from the agent's communication style in chat/artifacts, which must use `file://` links).
- Prefer markdown links to canonical docs rather than pasting raw path text when the target should be navigable.
- After editing docs, validate the touched doc tree for broken relative links before finishing.
