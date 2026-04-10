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
   - Implemented product behavior -> `docs/features/` with acceptance record and canonical references.
   - Implemented app/package technical behavior -> `apps/*/docs/` or `packages/*/docs/` root as the canonical reference (what it does, code refs, key rules). No design rationale.
   - Design/in-progress proposals -> `apps/*/docs/design/`, `packages/*/docs/design/`, or other design folders only while not yet implemented.
   - When an app/package design doc is implemented: delete it from the design folder, create or update the canonical root doc, update the local `docs/README.md`, and replace all references to the old design path. Do not keep stubs in `docs/design/`.
   - Feature descriptions must reference actual source files, not contain inline code examples.
   - Update each app/package `docs/README.md` status/index entries and any roadmap/feature-doc references that still point at the old design path.

3. **Update skills**
   - Update the most relevant skill(s) in `.agent/skills/*/SKILL.md`.
   - Capture only stable/reusable guidance (avoid one-off task logs).
   - Keep paths/references accurate.
   - When frontend access control/navigation behavior changes, document the shared policy location and guard usage so route guard + sidebar visibility remain aligned.
   - When frontend pagination behavior is standardized or corrected, update `table-view-pattern` and the relevant review-oriented skill/checklist so future implementations and reviews enforce the same stack.
   - When decomposing large routes, document the standard boundary split (route container vs hooks vs presentation sections).
   - When route-shell consistency changes, document parent layout boundary + leaf wrapper convention (for example `/system/*` + `AdminLayout`, `studios/$studioId/*` + `PageLayout`).

4. **Update workflows/rules when process changed**
   - If this change introduces a repeatable process, update/create `.agent/workflows/*.md`.
   - If it should be mandatory, update `.agent/rules/*.md` and `AGENTS.md`.
   - For pagination consistency mandates, update both implementation guidance and review gates so the shared stack is checked during coding, code review, and PR review.

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
- [ ] Implemented app/package design docs are promoted to canonical root docs and removed from design indexes.
- [ ] Relevant skills updated for future agent reuse.
- [ ] Workflow/rules updated if process changed.
- [ ] Memory reference updated for durable project knowledge.
- [ ] Doc/skill links validated.
- [ ] If large route/component decomposition happened, extraction boundaries are documented for future reuse.
