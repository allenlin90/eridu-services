---
name: agent-instruction-maintenance
description: Maintain shared agent instructions, adapters, skills, rules, and workflows for routing changes.
---

# Agent Instruction Maintenance

Keep agent instruction files accurate, non-duplicated, and correctly layered.

## File Ownership

| File | Owns | Updates when |
|---|---|---|
| `AGENTS.md` | All shared agent guidance | Any rule/pattern/convention changes |
| `.claude/CLAUDE.md` | Claude Code redirect only (≤30 lines) | Claude-specific paths change |
| `.agents/skills/*/SKILL.md` | Domain implementation patterns | Feature/architecture changes |
| `.agents/skills/*/agents/openai.yaml` | Codex-only skill presentation, invocation policy, and MCP dependencies | Codex integration changes |
| `.agents/workflows/*.md` | Repeatable process definitions | Process steps change |
| `.agents/rules/*.{md,mdc}` | Mandatory house rules | New cross-cutting constraints |
| `.agents/memory/*.md` | Shared durable implementation context | Cross-tool architectural context changes |
| `.claude/memory/*.md` | Claude-specific supplementary refs | Claude-only context changes |

## Architecture Rules

- **`AGENTS.md` is canonical** — all tools read from it; adapters redirect, don't duplicate
- **`.agents/skills/` is portable** — shared skill instructions must work across supported agents
- **`.claude/CLAUDE.md` is thin** — redirect + Claude-specific paths + startup flow; ≤30 lines
- **Vendor adapters stay local** — use `agents/openai.yaml` for Codex-only skill metadata; keep Claude-only configuration in `.claude/` or justified Claude frontmatter
- **No rule duplication** — one canonical location per rule; delete copies

## Workflow

### 1. Classify the Change
Map content to destination: behavioral guideline → `AGENTS.md`, domain pattern → skill, process → workflow.

### 2. Edit the Canonical Location
Preserve existing content. Match heading level and bullet style.

### 3. Update Skill Routing if Needed
New/renamed skill → update the matching category in `AGENTS.md` § Skill Routing.

### 4. Check for Duplication
Verify: `.claude/CLAUDE.md` doesn't duplicate, shared guidance has not leaked into a vendor adapter, memory files don't contradict, and no verbatim copies exist in other skills.

### 5. Verify Parity
Every skill in `.agents/skills/` is represented by a routing category. Every workspace is listed. Dev commands are current. Run `pnpm agents:validate` after any skill change.

## Pattern or Direction Change Gate

When a task changes an established pattern, convention, or architectural direction — deprecating or superseding a skill, flipping a default, changing a doctrine — the change is only complete when every artifact that asserts the old pattern is reconciled in the **same PR**. This is a *ready-to-start* precondition, not a cleanup afterthought: enumerate the reconciliation set before writing the change.

1. **Enumerate.** Grep the pattern name and the owning skill across the instruction surface:
   ```bash
   grep -rln "<skill-name>\|<pattern-term>" .agents .claude docs apps/*/docs AGENTS.md
   ```
   Include `.claude/` — Claude-specific agents (`.claude/agents/`) and memory (`.claude/memory/`) can route work to the old pattern too.
2. **Classify each hit** — reconcile now (asserts the superseded pattern as canonical), routing pointer (add a direction note), or intentionally deferred (record the gate — e.g. pilot-gated doctrine; never leave it silently stale).
3. **Reconcile in the same PR.** A canonical skill or doc left asserting the superseded pattern is a blocking inconsistency, not a follow-up.
4. **Keep scope honest.** If a direction is only partly accepted (e.g. placement now, persistence pilot-gated), the skills must state exactly which part is active and which is gated — never blanket-deprecate ahead of the gate.

## Content Quality Rules

- **Actionable**: "Use `HttpError` utilities" not "Follow best practices"
- **Concise with context**: one-line `> **Why**:` blockquote for non-obvious rules
- **Reference priority**: state explicitly when multiple implementations exist
- **Tables for do/don't**: more scannable than prose

## Checklist

- [ ] Content in correct canonical location
- [ ] Pattern/direction changes: every skill/doc asserting the old pattern reconciled in this PR, or deferred with a recorded gate
- [ ] No duplication between `AGENTS.md` and `.claude/CLAUDE.md`
- [ ] `.claude/CLAUDE.md` still ≤30 lines
- [ ] Skill routing map complete
- [ ] `pnpm agents:validate` passes
- [ ] Vendor-specific content lives in the correct adapter
- [ ] Memory files don't contradict updated guidance
