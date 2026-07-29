---
name: eridu-skill-creator
description: Maintain repo-local portable Agent Skills and routing; classify knowledge, rules, workflows, and modes before creating a skill.
---

# Skill Creator

Create or refine skills so they are easy to trigger, cheap to load, procedural, and grounded in the current repo.

## Classification Gate

Before creating or expanding a skill, classify the content using [`.agents/README.md`](../../README.md):

- task-triggered reusable procedure → skill;
- multi-step orchestration across capabilities → workflow;
- compact persistent constraint → rule;
- facts, architecture state, domain concepts, policy, or reviewed reference → knowledge or docs;
- explicitly requested interaction style → mode or explicit-only compatibility skill;
- client-specific loading or display behavior → adapter.

Do not convert a knowledge document into a skill merely by adding a `When to Use` section.

When content is mixed, keep a thin skill containing trigger, procedure, and verification; move durable facts to canonical knowledge/docs and implementation depth to `references/`.

While the migration inventory is active, update [`docs/engineering/AGENT_CONTENT_REORGANIZATION.md`](../../../docs/engineering/AGENT_CONTENT_REORGANIZATION.md) whenever a skill is added, removed, split, consolidated, or reclassified.

## Workflow

1. Inventory the skill folder and nearby canonical sources first.
2. Apply the classification gate before editing.
3. Identify concrete problems:
   - stale or misleading trigger descriptions;
   - broken links or references to deleted docs/files;
   - duplicated guidance that belongs in `references/`;
   - stable knowledge embedded in a procedural file;
   - instructions that contradict current repo rules or workflows;
   - oversized `SKILL.md` files that should delegate detail;
   - overlapping trigger surfaces that should be consolidated.
4. Decide whether the job is:
   - create a new skill;
   - refine an existing skill;
   - split a mixed skill into procedure plus knowledge/reference;
   - convert a skill into a workflow wrapper;
   - mark an interaction mode explicit-only;
   - consolidate or retire a redundant skill.
5. Edit the smallest coherent set of files that resolves the problems.
6. Validate the result:
   - shared frontmatter follows the Agent Skills standard;
   - the body is procedural rather than mainly descriptive;
   - vendor extensions are isolated or explicitly justified;
   - linked references and canonical knowledge sources exist;
   - resource paths are still correct;
   - instructions reflect current repo reality, not old architecture;
   - no two files claim canonical authority for the same facts.

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
- Set `policy.allow_implicit_invocation: false` for manually initiated modes and operations that should require explicit invocation.

### Keep the body procedural

- Write imperative instructions for another coding agent.
- Include selection logic, ordered work, or both.
- Define verification or a concrete completion condition.
- Keep repo-specific guidance that an agent would not infer on its own.
- Link stable facts and current architecture rather than duplicating them.
- Keep client-specific commands and capability assumptions out of the shared body unless the workflow selects between clients explicitly.
- Remove motivational or explanatory filler.

### Use progressive disclosure

- Keep `SKILL.md` focused on workflow and selection logic.
- Move long examples, schemas, and variants into `references/`.
- Move durable domain and architecture facts into canonical docs or OKF knowledge.
- Add scripts only when determinism or repeated execution justifies them.

### Prefer repair over churn

- If a skill is mostly good, fix the stale parts instead of rewriting it.
- Preserve working references and examples unless they are incorrect or noisy.
- If repo ownership moved, update the skill to point at the new canonical location.
- Do not perform broad directory moves without routing and link reconciliation.

## Skill Shape

Every skill should follow this minimal structure:

```text
skill-name/
├── SKILL.md
├── references/   # optional, procedure-specific depth
├── scripts/      # optional, deterministic helpers
├── assets/       # optional, reusable output inputs
└── agents/
    └── openai.yaml  # optional Codex adapter
```

Use `references/` for implementation detail needed only after the skill is selected. Do not use it as a hidden canonical knowledge base.

## Create Or Refine

### 1. Understand actual usage

- Collect example prompts or repo tasks that should trigger the skill.
- For an existing skill, inspect real failure modes first: weak triggers, stale links, missing references, unclear selection guidance, or knowledge/procedure mixing.

### 2. Plan reusable contents

- Add a reference file when examples or edge cases are too long for `SKILL.md`.
- Link an OKF/docs concept when the content describes durable facts or domain state.
- Add a script when the same code would otherwise be re-authored repeatedly.
- Avoid creating extra docs that are not part of a clear authority or lifecycle.

### 3. Edit

- Tighten `description` so it names the feature area, the work, and the trigger context.
- Remove stale references to deleted files or old architecture.
- Replace generic advice with repo-specific procedures.
- If a skill supports multiple variants, keep selection logic in `SKILL.md` and push variant detail into references.
- If the file is predominantly factual, extract the facts and decide whether a thin skill wrapper is still justified.

### 4. Validate

- Run `pnpm agents:validate` from the repository root.
- Run a Markdown-link check for every touched tree.
- If scripts were added, run them or test a representative sample.
- Re-read the frontmatter description and ask whether it would trigger only for the intended requests.
- Confirm Claude Code, Codex, and OpenCode still reach the same canonical procedure.

## Repo-Specific Notes

- Invocable skills live under `.agents/skills/`.
- Codex discovers `.agents/skills/` natively.
- Claude Code loads the root contract through `.claude/CLAUDE.md` and reads canonical skills from `.agents/skills/`.
- OpenCode loads `AGENTS.md` through `opencode.json` and routes skills through `.opencode/skills`.
- If the skill governs documentation placement or roadmap ownership, align it with [monorepo-doc-layering](../monorepo-doc-layering/SKILL.md).
- Prefer repo-local examples over invented examples when refining an existing skill.
