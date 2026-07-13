---
name: eridu-skill-creator
description: Maintain repo-local portable Agent Skills and routing. Use write-a-skill for generic skill creation.
---

# Skill Creator

Create or refine skills so they are easy to trigger, cheap to load, and grounded in the current repo.

## Workflow

1. Inventory the skill folder first.
2. Identify concrete problems before editing:
   - stale or misleading trigger descriptions
   - broken links or references to deleted docs/files
   - duplicated guidance that belongs in `references/`
   - instructions that contradict current repo rules or workflows
   - oversized `SKILL.md` files that should delegate detail to references
3. Decide whether the job is:
   - create a new skill
   - refine an existing skill
   - split one overloaded skill into references/resources
4. Edit the smallest set of files that resolves the problems.
5. Validate the result:
   - shared frontmatter follows the Agent Skills standard
   - vendor extensions are isolated or explicitly justified
   - linked references exist
   - resource paths in the skill are still correct
   - instructions reflect current repo reality, not old architecture

## Core Rules

### Keep frontmatter sharp

- `description` is the trigger surface. State both what the skill does and when it should be used.
- Prefer 80–160 characters and never exceed 200. Lead with the capability, then the trigger, plus at most one important exclusion or neighboring skill.
- Keep the implicitly invocable catalog within the validator's 8,000-character fallback budget.
- Prefer concrete repo language over generic prose.
- Keep `name` and `description` portable across supported agents.
- Use optional Agent Skills fields only when the shared skill needs them.
- Preserve client-specific frontmatter only when that client requires it in `SKILL.md`; document why it cannot live in an adapter.
- Put Codex-only display metadata, invocation policy, and MCP dependencies in `agents/openai.yaml`.
- Set `policy.allow_implicit_invocation: false` for manually initiated modes and operations that should require explicit `$skill-name` invocation.

### Keep the body procedural

- Write imperative instructions for another coding agent.
- Keep repo-specific guidance that an agent would not infer on its own.
- Keep client-specific commands and capability assumptions out of the shared body unless the workflow selects between clients explicitly.
- Remove motivational or explanatory filler.

### Use progressive disclosure

- Keep `SKILL.md` focused on workflow and selection logic.
- Move long examples, schemas, and variants into `references/`.
- Add scripts only when determinism or repeated execution justifies them.

### Prefer repair over churn

- If a skill is mostly good, fix the stale parts instead of rewriting it.
- Preserve working references and examples unless they are incorrect or noisy.
- If repo ownership moved, update the skill to point at the new canonical location.

## Skill Shape

Every skill should follow this minimal structure:

```text
skill-name/
├── SKILL.md
├── references/   # optional
├── scripts/      # optional
├── assets/       # optional
└── agents/
    └── openai.yaml  # optional Codex adapter
```

Use `references/` for long examples or domain detail. Use `scripts/` for deterministic helper automation. Use `assets/` only when the skill needs reusable output files.

## Create Or Refine

### 1. Understand actual usage

- Collect example prompts or repo tasks that should trigger the skill.
- For an existing skill, inspect real failure modes first: weak triggers, stale links, missing references, or unclear selection guidance.

### 2. Plan reusable contents

- Add a reference file when examples or edge cases are too long for `SKILL.md`.
- Add a script when the same code would otherwise be re-authored repeatedly.
- Avoid creating extra docs that are not part of the skill contract.

### 3. Edit

- Tighten `description` so it names the feature area, the type of work, and the trigger contexts.
- Remove stale references to deleted files or old architecture.
- Replace generic advice with repo-specific procedures.
- If a skill supports multiple variants, keep the selection logic in `SKILL.md` and push the variant detail into `references/`.

### 4. Validate

- Run `pnpm agents:validate` from the repository root.
- Run a markdown-link check for the touched skill tree.
- If you added scripts, run them or test a representative sample.
- Re-read the frontmatter description and ask whether it would actually trigger for the intended requests.

## Repo-Specific Notes

- Skills in this repo live under `.agents/skills/`.
- Codex and Google Antigravity discover that directory natively; Claude Code and OpenCode use repo symlinks to the same canonical files.
- If the skill governs documentation placement or roadmap ownership, align it with [monorepo-doc-layering](../monorepo-doc-layering/SKILL.md).
- Prefer repo-local examples over invented examples when refining an existing skill.
