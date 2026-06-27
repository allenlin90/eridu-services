---
name: agent-instruction-maintenance
description: Maintain and update agent instruction files (AGENTS.md, .claude/CLAUDE.md, .agents/ skills and workflows). Use when adding rules to AGENTS.md, updating agent behavioral guidelines, reorganizing agent instruction ownership, auditing CLAUDE.md parity, or integrating new skills/workflows into the canonical routing map.
---

# Agent Instruction Maintenance

Keep agent instruction files accurate, non-duplicated, and correctly layered.

## File Ownership

| File | Owns | Updates when |
|---|---|---|
| `AGENTS.md` | All shared agent guidance | Any rule/pattern/convention changes |
| `.claude/CLAUDE.md` | Claude Code redirect only (≤30 lines) | Claude-specific paths change |
| `.agents/skills/*/SKILL.md` | Domain implementation patterns | Feature/architecture changes |
| `.agents/workflows/*.md` | Repeatable process definitions | Process steps change |
| `.agents/rules/*.md` | Mandatory house rules | New cross-cutting constraints |
| `.claude/memory/*.md` | Tool-specific supplementary refs | Durable knowledge changes |

## Architecture Rules

- **`AGENTS.md` is canonical** — all tools read from it; adapters redirect, don't duplicate
- **`.claude/CLAUDE.md` is thin** — redirect + Claude-specific paths + startup flow; ≤30 lines
- **No rule duplication** — one canonical location per rule; delete copies

## Workflow

### 1. Classify the Change
Map content to destination: behavioral guideline → `AGENTS.md`, domain pattern → skill, process → workflow.

### 2. Edit the Canonical Location
Preserve existing content. Match heading level and bullet style.

### 3. Update Skill Routing if Needed
New/renamed skill → update `AGENTS.md` § Skill Routing (alphabetical within category).

### 4. Check for Duplication
Verify: `.claude/CLAUDE.md` doesn't duplicate, memory files don't contradict, no verbatim copies in other skills.

### 5. Verify Parity
Every skill in `.agents/skills/` has a routing entry. Every workspace listed. Dev commands current.

## Content Quality Rules

- **Actionable**: "Use `HttpError` utilities" not "Follow best practices"
- **Concise with context**: one-line `> **Why**:` blockquote for non-obvious rules
- **Reference priority**: state explicitly when multiple implementations exist
- **Tables for do/don't**: more scannable than prose

## Checklist

- [ ] Content in correct canonical location
- [ ] No duplication between `AGENTS.md` and `.claude/CLAUDE.md`
- [ ] `.claude/CLAUDE.md` still ≤30 lines
- [ ] Skill routing map complete
- [ ] Memory files don't contradict updated guidance
