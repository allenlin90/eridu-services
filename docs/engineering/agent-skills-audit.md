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

## Remaining Gaps

- A few skills are still large enough to be candidates for future progressive-disclosure cleanup:
  - `service-pattern-nestjs` at 566 lines
  - `table-view-pattern` at 527 lines
- `backend-controller-pattern-nestjs` was reduced from 579 lines to a concise workflow-oriented skill, with detailed rules moved into `references/controller-rules.md`.
- `apps/eridu_docs/src/content/docs/` still contains older top-level `features/` and `guides/` folders even though the current IA skill classifies genre-first buckets as debt. That content migration is broader than this skill audit and should be handled through `doc-lifecycle` or a focused docs IA cleanup.
- Several skills intentionally keep detailed examples in `SKILL.md` rather than `references/`. This is not currently broken, but future edits should prefer moving long examples to references instead of extending these files further.

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
