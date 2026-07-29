# Agent Content Taxonomy

`.agents/` contains the repository-owned behavior layer for coding agents. It is not the default home for every document an agent may need.

The current tree predates the knowledge/OKF separation and therefore contains some mixed or knowledge-heavy entries under `.agents/skills/`. Treat that as migration debt, not as a precedent for adding more knowledge-shaped skills.

## Content Classes

| Class | Purpose | Canonical location |
| --- | --- | --- |
| Skill | Task-triggered procedure with selection logic, steps, and verification | `.agents/skills/<name>/SKILL.md` |
| Workflow | Multi-step orchestration across skills or repository lifecycle stages | `.agents/workflows/` |
| Rule | Compact constraint that should apply persistently without task-specific invocation | `.agents/rules/` |
| Mode | Explicitly requested interaction or execution style | Temporarily a manually invoked skill; future location is under review |
| Knowledge | Facts, domain concepts, architecture state, policies, and reviewed references | `knowledge/` as OKF bundles, or existing canonical `docs/` during migration |
| Skill reference | Deep implementation detail needed only after a skill is selected | `.agents/skills/<name>/references/` |
| Memory/history | Point-in-time migration history, decisions, and temporary compatibility context | `.agents/memory/` only while agent-specific; otherwise `docs/` or OKF history |
| Adapter | Client-specific loading, hooks, commands, or presentation metadata | `.claude/`, `.opencode/`, `.cursor/`, or skill-local `agents/` |
| Generated catalog | Derived routing/index output | `.agents/skills/INDEX.md` |

## Skill Admission Test

A new entry belongs in `.agents/skills/` only when all of these are true:

1. A concrete task or prompt should trigger it.
2. The body tells an agent what to do, not mainly what is true.
3. It contains selection logic, an ordered procedure, or both.
4. It defines a verifiable outcome or completion check.
5. The procedure is reusable across more than one immediate task.
6. Stable facts and long reference material are linked rather than duplicated.

Adding a `When to Use` section to a knowledge document does not make it a skill.

## Routing Test

Before creating or expanding agent content, classify it:

- **How to perform a task?** Skill.
- **How to coordinate several task procedures?** Workflow.
- **What must always be obeyed?** Rule.
- **What is true about the company, domain, architecture, or deployed stack?** Knowledge.
- **What happened previously and may explain compatibility state?** Memory/history.
- **How should one agent client load or display shared content?** Adapter.

When a file is mixed, split by authority:

```text
.agents/skills/<capability>/SKILL.md    thin procedure and routing
knowledge/<bundle>/<concept>.md        durable facts and concepts
.agents/skills/<capability>/references implementation detail needed only by the procedure
docs/...                               product or engineering documentation with its own lifecycle
```

## Thin Skill Wrappers

A skill may remain as a thin discoverable wrapper around a workflow or knowledge concept when agent clients need an invocable routing surface.

A wrapper should contain only:

- trigger conditions;
- source-selection instructions;
- the task procedure;
- verification and output expectations;
- links to canonical workflow or knowledge sources.

The wrapper must not duplicate the full domain model, architecture reference, SOP, or current deployment state.

## Bookkeeping

When adding, removing, splitting, or reclassifying agent content:

1. Update the canonical source and all affected links.
2. Update [`docs/engineering/AGENT_CONTENT_REORGANIZATION.md`](../docs/engineering/AGENT_CONTENT_REORGANIZATION.md) while the migration inventory is active.
3. Update or remove client adapters that point at the old location.
4. Regenerate `.agents/skills/INDEX.md` with `pnpm agents:index` when a skill trigger changes.
5. Run `pnpm agents:validate`.
6. Run Markdown link validation for all touched trees.
7. Record deferred moves explicitly; do not leave two files both claiming canonical authority.

## Current Migration Rule

Do not perform a broad directory move solely to make the tree look clean. Migrate one coherent cluster at a time, preserve routing compatibility, and verify the same task with Claude Code, Codex, and OpenCode before removing an old path.
