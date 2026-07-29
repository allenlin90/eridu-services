---
name: agent-instruction-maintenance
description: Maintain shared agent instructions, adapters, skills, rules, and workflows for routing changes.
---

# Agent Instruction Maintenance

Keep agent instruction files accurate, non-duplicated, and correctly layered.

## File Ownership

| File | Owns | Updates when |
| --- | --- | --- |
| `AGENTS.md` | Shared runtime guidance and routes to deeper contracts | Any rule, pattern, convention, or agent-system route changes |
| `.agents/README.md` | Agent-content taxonomy, admission rules, workflow-bridge rules, and reorganization bookkeeping | Content classes, skill admission, catalog targets, or bookkeeping rules change |
| `.claude/CLAUDE.md` | Claude Code redirect only (≤30 lines) | Claude-specific paths change |
| `.cursor/rules/*.mdc` | Cursor-specific routing and compatibility adapters | Canonical guidance or Cursor routing changes |
| `.agents/skills/*/SKILL.md` | Invocable procedures, review lenses, reasoning capabilities, and stable workflow bridges | Capability, review, reasoning, or invocation behavior changes |
| `.agents/skills/*/agents/openai.yaml` | Codex-only skill presentation, invocation policy, and MCP dependencies | Codex integration changes |
| `.agents/workflows/*.md` | Repeatable process definitions | Process steps change |
| `.agents/rules/*.{md,mdc}` | Mandatory house rules | New cross-cutting constraints |
| `.agents/memory/*.md` | Shared durable implementation context | Cross-tool architectural context changes |
| `.claude/memory/*.md` | Claude-specific supplementary refs | Claude-only context changes |
| `docs/engineering/AGENT_CONTENT_REORGANIZATION.md` | Active classification inventory and migration status | A skill is added, removed, split, consolidated, or reclassified |

## Architecture Rules

- **`AGENTS.md` is the runtime entrypoint** — supported tools read it; adapters redirect and do not duplicate.
- **`.agents/README.md` is the taxonomy authority** — it classifies agent content and is linked from `AGENTS.md`; it does not replace runtime instructions.
- **`.agents/skills/` is portable** — shared skill instructions must work across supported agents.
- **`.claude/CLAUDE.md` is thin** — redirect + Claude-specific paths + startup flow; ≤30 lines.
- **Vendor adapters stay local** — use `agents/openai.yaml` for Codex-only skill metadata; keep Claude-only configuration in `.claude/` or justified Claude frontmatter.
- **No rule duplication** — one canonical location per rule; delete copies.
- **Knowledge is not disguised as behavior** — stable facts, architecture, domain models, and current-state references belong in canonical docs or OKF knowledge and are selected by procedural skills.

## Workflow

### 1. Classify the Change

Apply `.agents/README.md` before editing:

- runtime behavioral guideline → `AGENTS.md`;
- content taxonomy or admission rule → `.agents/README.md`;
- task-triggered procedure or review lens → skill;
- stable public workflow name → thin bridge skill plus one canonical workflow;
- multi-step orchestration → workflow;
- persistent constraint → rule;
- durable fact, pattern, architecture, or domain state → canonical docs or OKF knowledge;
- client-specific loading or display → adapter.

### 2. Edit the Canonical Location

Preserve existing content. Match heading level and bullet style. Do not introduce a second authoritative copy.

### 3. Update Routing and Inventory

- New or renamed skill → update the matching category in `AGENTS.md` § Skill Routing.
- New or renamed agent-system contract → add or update its route in `AGENTS.md` § Agent System References.
- Added, removed, split, consolidated, or reclassified skill → update `docs/engineering/AGENT_CONTENT_REORGANIZATION.md` while that inventory is active.
- Stable workflow bridge change → preserve its canonical ID and client metadata or follow the documented deprecation window.

### 4. Check for Duplication

Verify that `.claude/CLAUDE.md` does not duplicate shared guidance, vendor adapters contain only vendor-specific behavior, memory files do not contradict canonical sources, and no knowledge document has been copied into a procedural skill.

### 5. Verify Parity

Every skill in `.agents/skills/` is represented by a routing category or explicitly classified as a manual bridge/mode. Every workspace is listed. Developer commands are current. Run `pnpm agents:validate` after any skill change.

For changes to the supported client model, verify Claude Code, Codex, and OpenCode first. Google Antigravity may continue consuming portable shared content but is outside the primary compatibility matrix unless a task explicitly expands that scope.

## Pattern or Direction Change Gate

When a task changes an established pattern, convention, or architectural direction — deprecating or superseding a skill, flipping a default, changing a doctrine — the change is only complete when every artifact that asserts the old pattern is reconciled in the **same PR**. This is a *ready-to-start* precondition, not a cleanup afterthought: enumerate the reconciliation set before writing the change.

1. **Enumerate.** Search the pattern name and the owning skill across the instruction surface:

   ```bash
   rg -l "<skill-name>|<pattern-term>" .agents .claude .cursor .opencode ai apps docs infra packages AGENTS.md README.md opencode.json
   ```

   Include vendor-specific surfaces: Claude agents and memory under `.claude/` and Cursor adapters under `.cursor/` can route work to the old pattern too.
2. **Classify each hit** — reconcile now (asserts the superseded pattern as canonical), routing pointer (add a direction note), or intentionally deferred (record the gate — e.g. pilot-gated doctrine; never leave it silently stale).
3. **Reconcile in the same PR.** A canonical skill or doc left asserting the superseded pattern is a blocking inconsistency, not a follow-up.
4. **Keep scope honest.** If a direction is only partly accepted (e.g. placement now, persistence pilot-gated), the skills must state exactly which part is active and which is gated — never blanket-deprecate ahead of the gate.

## Content Quality Rules

- **Actionable**: "Use `HttpError` utilities" not "Follow best practices".
- **Concise with context**: one-line `> **Why**:` blockquote for non-obvious rules.
- **Reference priority**: state explicitly when multiple implementations exist.
- **Tables for do/don't**: more scannable than prose.

## Checklist

- [ ] Content is in the correct canonical location.
- [ ] `.agents/README.md` classification was applied for agent-content changes.
- [ ] Pattern/direction changes: every skill/doc asserting the old pattern is reconciled in this PR, or deferred with a recorded gate.
- [ ] `AGENTS.md` routes to every new agent-system contract that supported clients must discover.
- [ ] The active reorganization inventory is updated for every added, removed, split, consolidated, or reclassified skill.
- [ ] No duplication exists between `AGENTS.md` and `.claude/CLAUDE.md`.
- [ ] `.claude/CLAUDE.md` is still ≤30 lines.
- [ ] Skill routing map is complete.
- [ ] `pnpm agents:validate` passes.
- [ ] Vendor-specific content lives in the correct adapter.
- [ ] Memory files do not contradict updated guidance.
