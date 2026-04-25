# Agent Skills Audit

Date: 2026-04-24
Branch: `chore/agent-skills-audit`

## Summary

Audited the repo-local agent skills under `.agent/skills/` for trigger quality, frontmatter shape, routing coverage, local links, and alignment with `AGENTS.md`, `skill-creator`, `agent-instruction-maintenance`, and current `eridu_docs` information architecture guidance.

The audit found the skill set is broadly healthy:

- 50 skill directories exist under `.agent/skills/`.
- All 50 skills are represented in `AGENTS.md` skill routing.
- No stale routing entries remain after filtering only skill-route bullets.
- No skill name/directory mismatches were found.
- No broken non-template Markdown links or inline repo paths remain after the fixes in this branch.

## Fixes Applied

- Removed unsupported `metadata` frontmatter from seven skills so frontmatter contains only `name` and `description`, matching `.agent/skills/skill-creator/SKILL.md`:
  - `authentication-authorization-nestjs`
  - `backend-controller-pattern-nestjs`
  - `orchestration-service-nestjs`
  - `repository-pattern-nestjs`
  - `service-pattern-nestjs`
  - `shift-schedule-pattern`
  - `ssr-auth-integration`
- Fixed a broken relative link in `package-extraction-strategy` that pointed one directory too shallow for `.claude/memory/monorepo-package-rules.md`.
- Updated `user-facing-docs` sidebar and directory guidance to match `eridu-docs-information-architecture` and the current `apps/eridu_docs/astro.config.mjs` default sidebar.
- Reduced `backend-controller-pattern-nestjs` from 579 lines to a concise workflow-oriented skill, with detailed rules moved into `references/controller-rules.md`.
- Updated `authentication-authorization-nestjs` frontend guidance to match the current `@eridu/auth-sdk` client, TanStack Router app shell, `SessionProvider`, and shared API client token refresh/interceptor flow.
- Updated `frontend-error-handling` examples to use the shared API client and auth redirect flow instead of localStorage token handling.
- Updated `frontend-tech-stack` and `frontend-code-quality` examples to use the repo's current ESLint flat config style (`eslint.config.js`) instead of legacy `.eslintrc.cjs`.
- Updated `data-validation` to name Zod and `createZodDto` as the repo-standard validation stack instead of generic non-repo alternatives.

## Currentness Basis

The review checked skill content against the current repository, not live upstream release notes. The installed stack observed in `package.json` files is:

| Area | Current repo version/pattern |
| --- | --- |
| Node | `>=22` |
| Package manager | `pnpm@10.32.1` |
| Backend | NestJS 11, Prisma 7, Zod 4, Jest 29 |
| Frontend apps | React 19, Vite 7, Tailwind 4, TanStack Query 5, TanStack Router 1, Vitest 4 |
| Docs app | Astro 6, Starlight 0.38, Tailwind 4 |
| Auth | Better Auth 1.5, `@eridu/auth-sdk`, SSR JWKS pattern |

## Full Skill Review Status

| Skill | Status | Notes |
| --- | --- | --- |
| `admin-list-pattern` | Current | Aligns with admin list/search/pagination patterns and table URL state guidance. |
| `agent-instruction-maintenance` | Current | Correctly keeps `AGENTS.md` canonical and `.claude/CLAUDE.md` as adapter. |
| `api-performance-optimization` | Current | Repo paths and Prisma query-performance guidance are valid. |
| `astro-starlight-best-practices` | Current | Matches current SSR Starlight/Pagefind configuration. |
| `authentication-authorization-nestjs` | Updated | Replaced stale `react-router-dom`/local token guidance with current auth SDK, TanStack Router, and shared API client patterns. |
| `backend-controller-pattern-nestjs` | Updated | Split into concise `SKILL.md` plus `references/controller-rules.md` and existing examples. |
| `backend-testing-patterns` | Current | Correctly distinguishes backend Jest from frontend Vitest. |
| `code-quality` | Current | General guidance remains valid. |
| `data-compatibility-migration` | Current | Phase/cutover-specific guidance is still intentionally scoped. |
| `data-validation` | Updated | Checklist now names Zod/createZodDto as the repo standard. |
| `database-patterns` | Current | Matches Prisma/BaseRepository/transaction guidance and migration policy. |
| `design-patterns` | Current | Legacy naming notes are intentional and match current model/API boundary guidance. |
| `domain-refactor-cutover-strategy` | Current | Phase-derived but still useful for future domain renames. |
| `engineering-best-practices-enforcer` | Current | Still matches repo review/refactor expectations; verification commands remain broader than this docs-only task. |
| `environment-configuration-zod` | Current | Matches Zod env schema pattern and Vite/Astro caveats. |
| `eridu-docs-information-architecture` | Current | Skill is correct; docs content has separate IA cleanup debt noted below. |
| `erify-authorization` | Current | Correctly separates implemented StudioMembership/AdminGuard behavior from planned RBAC ideas. |
| `file-upload-presign` | Current | Legacy R2 path note is intentional storage-compatibility guidance. |
| `frontend-api-layer` | Current | Aligns with TanStack Query 5 and repo API/query-key conventions. |
| `frontend-code-quality` | Updated | ESLint examples now use flat config. |
| `frontend-error-handling` | Updated | Aligns with TanStack Router error components, TanStack Query meta guidance, and shared API client auth handling. |
| `frontend-i18n` | Current | Matches Paraglide/shared package terminology override guidance. |
| `frontend-performance` | Current | Aligns with TanStack Router, Vite, and current memoization guidance. |
| `frontend-state-management` | Current | Aligns with TanStack Query/Router URL state patterns. |
| `frontend-tech-stack` | Updated | Fixed heading typo and legacy ESLint config example. |
| `frontend-testing-patterns` | Current | Matches frontend Vitest/Testing Library stack. |
| `frontend-ui-components` | Current | Matches shared UI and searchable-control guidance in `AGENTS.md`. |
| `jsonb-analytics-snapshot` | Current | Pattern remains valid for read-heavy immutable analytics snapshots. |
| `monorepo-doc-layering` | Current | Matches current docs directory ownership. |
| `observability-logging` | Current | Logging guidance remains consistent with security and frontend error patterns. |
| `orchestration-service-nestjs` | Current | Frontmatter fixed earlier; content matches orchestration/processor patterns. |
| `package-extraction-strategy` | Current | Broken memory link fixed earlier; extraction criteria remain valid. |
| `playwright` | Current | Wrapper-first CLI guidance is valid for browser automation tasks. |
| `pwa-best-practices` | Current | TanStack Query/Workbox double-cache guidance remains appropriate. |
| `repository-pattern-nestjs` | Current | ModelWrapper simplification note matches current BaseRepository implementation debt. |
| `schedule-continuity-workflow` | Current | Phase 4 schedule direction remains intentionally feature-specific. |
| `secure-coding-practices` | Current | Input validation, UID exposure, and raw SQL guidance remain valid. |
| `security-threat-model` | Current | Scope and output expectations are clear. |
| `service-pattern-nestjs` | Current, follow-up | Correct but still large; good next candidate for progressive-disclosure split. |
| `shared-api-types` | Current | Correctly emphasizes UID mapping, Zod contracts, and installed-package API checks. |
| `shift-schedule-pattern` | Current | Frontmatter fixed earlier; current feature-specific references validate. |
| `skill-creator` | Current | Used as the benchmark for this audit. |
| `soft-delete-restore` | Current | Restore/version-conflict guidance remains valid. |
| `solid-principles` | Current | General design guidance is valid and reference-backed. |
| `spreadsheet` | Current | Self-contained external-style skill; no repo mismatch found. |
| `ssr-auth-integration` | Current | Frontmatter fixed earlier; Astro SSR auth guidance matches current docs app files. |
| `studio-list-pattern` | Current | Matches studio card/list infinite-scroll patterns. |
| `table-view-pattern` | Current, follow-up | Correct and highly useful, but large enough to split when next touched. |
| `task-template-builder` | Current | Explicitly marks IndexedDB draft persistence as future/intended, not current behavior. |
| `user-facing-docs` | Current | Sidebar/directory guidance updated earlier to match docs IA skill and config. |

## Remaining Gaps

- A few skills are still large enough to be candidates for future progressive-disclosure cleanup:
  - `service-pattern-nestjs` at 566 lines
  - `table-view-pattern` at 527 lines
- `apps/eridu_docs/src/content/docs/` still contains older top-level `features/` and `guides/` folders even though the current IA skill classifies genre-first buckets as debt. That content migration is broader than this skill audit and should be handled through `doc-lifecycle` or a focused docs IA cleanup.
- Several skills intentionally keep detailed examples in `SKILL.md` rather than `references/`. This is not currently broken, but future edits should prefer moving long examples to references instead of extending these files further.

## Best-Practice Suggestions

- Add a reusable docs-only skill validator script if this audit will recur. The script should check frontmatter keys, name/directory parity, routing coverage, Markdown links, and repo path references.
- Split `service-pattern-nestjs` next: keep service role/decision rules in `SKILL.md`, move payload/transaction/error examples into references.
- Split `table-view-pattern` after that: keep route/table decision rules in `SKILL.md`, move URL-state examples, pagination examples, and review scenarios into references.
- Add a short "Current vs future" status section to feature-specific skills when they intentionally include planned behavior, matching the useful pattern already present in `erify-authorization`.
- For framework-specific skills, add a lightweight "validated against installed versions" line when updating them so future agents know whether guidance came from repo state or upstream docs.

## Validation

Docs-only validation was run as requested. No `pnpm` commands were run.

Checks performed:

- Skill inventory count
- Frontmatter key validation
- Skill directory/name matching
- Markdown link/path validation for `.agent/skills/**/*.md`
- Inline repo path validation for `.agent/skills/**/*.md`
- `AGENTS.md` skill-routing coverage

Result:

```text
skill_count=50
routed_count=50
missing_route=[]
stale_route=[]
frontmatter_issues=[]
markdown_link_issues=[]
inline_path_issues=[]
```
