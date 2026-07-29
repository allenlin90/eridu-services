# Agent Content Taxonomy

`.agents/` contains the repository-owned behavior layer for coding agents. It is not the default home for every document an agent may need.

The current tree predates the knowledge/OKF separation and therefore contains mixed, knowledge-heavy, workflow-shaped, and presentation-oriented entries under `.agents/skills/`. Treat that as migration debt, not as a precedent for adding more skill-shaped files.

See [`docs/engineering/AGENT_OPERATING_MODEL.md`](../docs/engineering/AGENT_OPERATING_MODEL.md) for the target reasoning lifecycle, mode timing, pattern-consumer model, catalog targets, and measurable exit criteria.

## Content Classes

| Class | Purpose | Canonical location |
| --- | --- | --- |
| Lifecycle/reasoning skill | Select the next task stage, resolve uncertainty, choose evidence, or route review lenses | `.agents/skills/` while cross-client invocation requires it |
| Capability skill | Task-triggered procedure with selection logic, steps, and verification | `.agents/skills/<name>/SKILL.md` |
| Review skill | Apply a declared risk or quality lens and produce findings | `.agents/skills/<name>/SKILL.md` |
| Workflow | Multi-step orchestration across skills or repository lifecycle stages | `.agents/workflows/` |
| Rule | Compact constraint that should apply persistently without task-specific invocation | `.agents/rules/` |
| Presentation mode | Explicitly requested output style that does not alter reasoning | Temporarily a manually invoked skill; dedicated registry under review |
| Knowledge | Facts, domain concepts, architecture state, patterns, policies, and reviewed references | `knowledge/` as OKF bundles, or existing canonical `docs/` during migration |
| Skill reference | Deep implementation detail needed only after a capability is selected | `.agents/skills/<name>/references/` |
| Memory/history | Point-in-time migration history, decisions, and temporary compatibility context | `.agents/memory/` only while agent-specific; otherwise `docs/` or OKF history |
| Adapter | Client-specific loading, hooks, commands, or presentation metadata | `.claude/`, `.opencode/`, `.cursor/`, or skill-local `agents/` |
| Generated catalog | Derived routing/index output | `.agents/skills/INDEX.md` |

## Skill Admission Test

A new entry belongs in `.agents/skills/` only when all of these are true:

1. A concrete task, reasoning gate, or review need should trigger it.
2. The body tells an agent what to do, not mainly what is true.
3. It contains selection logic, an ordered procedure, or both.
4. It defines a verifiable outcome or completion check.
5. The procedure is reusable across more than one immediate task.
6. Stable facts, patterns, and long reference material are linked rather than duplicated.
7. Its trigger and output are materially distinct from existing skills.

Adding a `When to Use` section to a knowledge document does not make it a skill.

A pattern or guide is not independently invocable merely because an agent may need it. Pattern knowledge should normally be selected and consumed by a reasoning, implementation, or review skill.

## Routing Test

Before creating or expanding agent content, classify it:

- **Which stage should the task enter next?** Lifecycle/reasoning skill.
- **How to perform a concrete task?** Capability skill.
- **How to inspect work through a particular risk lens?** Review skill.
- **How to coordinate several procedures?** Workflow.
- **What must always be obeyed?** Rule.
- **What is true about the company, domain, architecture, pattern, or deployed stack?** Knowledge.
- **How should an answer be presented after reasoning?** Presentation mode.
- **What happened previously and may explain compatibility state?** Memory/history.
- **How should one agent client load or display shared content?** Adapter.

When a file is mixed, split by authority:

```text
.agents/skills/<capability>/SKILL.md    thin procedure and routing
knowledge/<bundle>/<concept>.md        durable facts, patterns, and concepts
.agents/skills/<capability>/references implementation detail needed only by the procedure
docs/...                               product or engineering documentation with its own lifecycle
```

## Reasoning Lifecycle

Non-trivial tasks follow these gates:

```text
orient → resolve decisions → select knowledge/procedure → implement → review → verify/bookkeep → present
```

- **Zoom-out behavior** belongs to orientation and should run automatically when context, scope, callers, or ownership are unclear.
- **Grilling behavior** belongs to decision resolution and should run only for material choices that code and canonical knowledge cannot answer.
- **Domain-document contradiction checks** belong to orientation and review, not a separate persistent conversation mode.
- **Caveman/compact behavior** belongs only to presentation and requires an explicit user request.

Presentation style must not remove uncertainty, warnings, decisions, or verification evidence.

## Thin Skill Wrappers

A skill may remain as a thin discoverable wrapper around a workflow or knowledge concept when agent clients need an invocable routing surface.

A wrapper should contain only:

- trigger conditions;
- source-selection instructions;
- the task procedure;
- verification and output expectations;
- links to canonical workflow or knowledge sources.

The wrapper must not duplicate the full pattern library, domain model, architecture reference, SOP, or current deployment state.

## Target Catalog

The first milestone is no more than 50 implicitly invocable skills. The post-consolidation target is 35 or fewer, provided each remaining trigger and output is materially distinct.

The implicit catalog should contain:

- lifecycle and reasoning capabilities;
- concrete implementation and operational capabilities;
- declared review lenses.

It should not contain:

- standalone pattern or technology guides;
- domain and architecture reference documents;
- duplicated workflow bodies;
- presentation modes that were not explicitly requested.

## Bookkeeping

When adding, removing, splitting, or reclassifying agent content:

1. Update the canonical source and all affected links.
2. Update [`docs/engineering/AGENT_CONTENT_REORGANIZATION.md`](../docs/engineering/AGENT_CONTENT_REORGANIZATION.md) while the migration inventory is active.
3. Update or remove client adapters that point at the old location.
4. Regenerate `.agents/skills/INDEX.md` with `pnpm agents:index` when a skill trigger changes.
5. Run `pnpm agents:validate`.
6. Run Markdown link validation for all touched trees.
7. Record deferred moves explicitly; do not leave two files both claiming canonical authority.
8. Verify representative routing with Claude Code, Codex, and OpenCode.

## Current Migration Rule

Do not perform a broad directory move solely to make the tree look clean. Migrate one coherent cluster at a time, land the consumer skill or workflow together with extracted knowledge, preserve routing compatibility, and verify the same task with Claude Code, Codex, and OpenCode before removing an old path.