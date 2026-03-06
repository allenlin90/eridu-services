---
description: Sync agent knowledge artifacts (docs, skills, workflows, rules, memory) after feature or refactor changes
---

# Knowledge Sync Workflow

Run this workflow for feature delivery, behavior changes, refactors, and notable architecture/contract updates.

## Trigger Conditions

Run when any of these are true:

1. API contract, schema, domain behavior, or workflow changed.
2. New feature path, role/policy, or operational runbook was introduced.
3. Existing implementation/design docs are no longer accurate.
4. A recurring implementation/review pattern should be reusable by future agents.
5. A large route/component was decomposed and the extraction pattern should be standardized.

## Steps

1. **Classify what changed**
   - `implemented behavior` (canonical)
   - `design/proposal/todo` (in-progress/planned)
   - `agent guidance` (skills/workflows/rules/memory)

2. **Update product/technical docs**
   - Implemented behavior -> `docs/` root.
   - Design/in-progress proposals -> `docs/design/`.
   - Update each app/package `docs/README.md` status/index entries.

3. **Update skills**
   - Update the most relevant skill(s) in `.agent/skills/*/SKILL.md`.
   - Capture only stable/reusable guidance (avoid one-off task logs).
   - Keep paths/references accurate.
   - When frontend access control/navigation behavior changes, document the shared policy location and guard usage so route guard + sidebar visibility remain aligned.
   - When decomposing large routes, document the standard boundary split (route container vs hooks vs presentation sections).
   - When route-shell consistency changes, document parent layout boundary + leaf wrapper convention (for example `/system/*` + `AdminLayout`, `studios/$studioId/*` + `PageLayout`).

4. **Update workflows/rules when process changed**
   - If this change introduces a repeatable process, update/create `.agent/workflows/*.md`.
   - If it should be mandatory, update `.agent/rules/*.md` and `AGENTS.md`.

5. **Update memory references**
   - Record durable project knowledge in `.claude/memory/*.md` (choose the most relevant file).
   - Prefer concise deltas: what changed, why, and where canonical docs live.

6. **Sanity check links and discoverability**
   - Ensure moved/renamed docs are referenced correctly from READMEs, skills, and related docs.
   - Ensure no stale links to old doc paths remain.
   - For route policy changes, verify route files and sidebar config both reference the same access policy source.

## Completion Checklist

- [ ] Canonical docs reflect shipped behavior.
- [ ] Design docs are isolated under `docs/design/` with clear status.
- [ ] Relevant skills updated for future agent reuse.
- [ ] Workflow/rules updated if process changed.
- [ ] Memory reference updated for durable project knowledge.
- [ ] Doc/skill links validated.
- [ ] If large route/component decomposition happened, extraction boundaries are documented for future reuse.
