---
name: agent-instruction-maintenance
description: Maintain and update agent instruction files (AGENTS.md, .claude/CLAUDE.md, .agent/ skills and workflows). Use when adding rules to AGENTS.md, updating agent behavioral guidelines, reorganizing agent instruction ownership, auditing CLAUDE.md parity, or integrating new skills/workflows into the canonical routing map.
---

# Agent Instruction Maintenance

Keep agent instruction files accurate, non-duplicated, and correctly layered after feature delivery, architecture changes, or agent tooling updates.

## When To Use

- A new rule, pattern, or convention must be added to agent guidance.
- A skill or workflow was created or updated and the routing map in `AGENTS.md` needs to reflect it.
- Agent guidance drifted between `AGENTS.md` and `.claude/CLAUDE.md`.
- A memory file in `.claude/memory/` contradicts current `AGENTS.md` content.
- The behavioral guidelines section needs revision.

## File Ownership

| File                       | Owns                                                                                                                                      | Updates when                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `AGENTS.md`                | All shared agent guidance: behavioral guidelines, project rules, core patterns, skill routing, verification checklist, naming conventions | Any rule, pattern, or convention changes       |
| `.claude/CLAUDE.md`        | Claude Code loading redirect only: path table, startup flow                                                                               | Claude-specific tool paths change              |
| `.agent/skills/*/SKILL.md` | Domain-specific implementation patterns                                                                                                   | Feature or architecture changes in that domain |
| `.agent/workflows/*.md`    | Repeatable process definitions                                                                                                            | Process steps change                           |
| `.agent/rules/*.md`        | Mandatory house rules                                                                                                                     | New cross-cutting constraints                  |
| `.claude/memory/*.md`      | Deep-dive supplementary references                                                                                                        | Durable project knowledge changes              |

## Architecture Rules

### AGENTS.md is the canonical source of truth

All agent tools (Antigravity, Claude Code, Codex, Copilot Workspace) should ultimately read `AGENTS.md`. Tool-specific adapter files redirect to it; they must not duplicate shared rules.

### .claude/CLAUDE.md is a thin adapter

This file exists only because Claude Code auto-loads it. It must:
- Redirect to `../AGENTS.md` as the canonical source.
- List Claude-specific paths (skills, workflows, memory, subagents).
- Describe the suggested startup flow.
- Stay under 30 lines. If it grows larger, content is leaking from `AGENTS.md`.

### No rule duplication across files

A rule must live in exactly one place:
- Shared cross-tool rule → `AGENTS.md`
- Claude-only loading behavior → `.claude/CLAUDE.md`
- Domain pattern → `.agent/skills/*/SKILL.md`
- Process steps → `.agent/workflows/*.md`
- Supplementary deep-dive → `.claude/memory/*.md`

If the same rule appears in two files, delete the copy and keep the canonical version.

## Workflow

### 1. Classify the change

Before editing, decide what kind of content you are adding or updating:

| Content type                                                             | Destination                                |
| ------------------------------------------------------------------------ | ------------------------------------------ |
| Behavioral guideline (think-before-coding, simplicity, surgical changes) | `AGENTS.md` § Shared Behavioral Guidelines |
| Project-wide engineering rule                                            | `AGENTS.md` § Core Engineering Rules       |
| Core pattern (ID strategy, schema tiers, auth chain)                     | `AGENTS.md` § Core Patterns                |
| Backend API pattern (error handling, transactions, controller responses) | `AGENTS.md` § Backend API Patterns         |
| Service layer rule                                                       | `AGENTS.md` § Service Layer Rules          |
| Naming convention                                                        | `AGENTS.md` § Naming Conventions           |
| Skill routing entry                                                      | `AGENTS.md` § Skill Routing                |
| Verification step                                                        | `AGENTS.md` § Verification Checklist       |
| New workflow trigger                                                     | `AGENTS.md` § Knowledge And Doc Lifecycle  |
| Domain implementation pattern                                            | `.agent/skills/<domain>/SKILL.md`          |
| Repeatable process                                                       | `.agent/workflows/<name>.md`               |

### 2. Edit the canonical location

- Add the content to the correct section identified in step 1.
- Preserve existing content that is unrelated to your change.
- Match the heading level and bullet style of the surrounding section.
- Update the `> **Last updated**` timestamp at the top of `AGENTS.md`.

### 3. Update the skill routing map if needed

If a new skill was created or an existing skill was renamed:
- Add or update the entry in `AGENTS.md` § Skill Routing under the correct category.
- Keep entries alphabetically sorted within each category.
- Do not add parenthetical descriptions; the skill's own `SKILL.md` is authoritative.

### 4. Check for duplication

After editing, verify:
- `.claude/CLAUDE.md` does not contain the same rule.
- `.claude/memory/*.md` files do not contradict the updated rule.
- No other skill's `SKILL.md` duplicates the new guidance verbatim.

### 5. Verify content parity

Run a quick mental or grep-based check:
- Every skill in `.agent/skills/` has a routing entry in `AGENTS.md` § Skill Routing.
- Every app and package listed in the workspace is in `AGENTS.md` § Repository Overview.
- The `Useful Commands` section includes dev commands for all apps that have them.

## Content Quality Rules

### Keep rules actionable

Bad: "Follow best practices for error handling."
Good: "Use `HttpError` utilities for cross-domain constraints instead of throwing NestJS exceptions directly from orchestration services."

### Keep explanations concise but present

When a rule is non-obvious, add a one-line blockquote explaining why:
```markdown
> **Why `build` matters**: `typecheck` runs `tsc --noEmit` against the root tsconfig. The actual build uses stricter configs.
```

### Preserve reference priority lists

When multiple reference implementations exist, state the priority explicitly:
```markdown
- Reference priority for new backend code: `ideal-pattern.md` → `task.service.ts` → `task-orchestration.service.ts`
```

### Use tables for do/don't rules

Tables are more scannable than prose for agents:
```markdown
| Do                              | Don't                                   |
| ------------------------------- | --------------------------------------- |
| Define payload types in schemas | Expose `Prisma.*` in service signatures |
```

## Integration With Other Workflows

| Workflow            | When this skill feeds into it                                                               |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `knowledge-sync.md` | Step 4: "If it should be mandatory, update `.agent/rules/*.md` and `AGENTS.md`"             |
| `doc-lifecycle.md`  | After promoting PRDs, check if any new conventions need to be added to `AGENTS.md`          |
| `skill-creator`     | After creating a new skill, update the routing map per step 3 above                         |
| `pr-review.md`      | Reviewers should verify that rule changes are in `AGENTS.md`, not duplicated in `CLAUDE.md` |

## Completion Checklist

- [ ] Content is in the correct canonical location per the ownership table.
- [ ] No duplication between `AGENTS.md` and `.claude/CLAUDE.md`.
- [ ] `.claude/CLAUDE.md` is still under 30 lines and contains no shared rules.
- [ ] Skill routing map is complete (every skill in `.agent/skills/` has an entry).
- [ ] `> **Last updated**` timestamp is current.
- [ ] Memory files do not contradict updated guidance.
- [ ] Explanatory context is preserved for non-obvious rules (build vs typecheck, reference priority, etc.).
