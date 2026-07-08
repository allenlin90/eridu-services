# Open WebUI Scaffold

This directory contains repo-managed Open WebUI assistant definitions, tool access policy, and Open WebUI-importable skill adapters.

## Intended role

Open WebUI should be the user-facing AI workspace. It should provide a small set of curated assistants rather than exposing raw LLM provider choices to every user.

## Files

| File | Purpose |
|---|---|
| `workspace-models.example.json` | Example assistant definitions for Workspace Models. |
| `tool-access.example.json` | Example MCP tool access policy by group. |
| `skills/` | Open WebUI-importable skill adapters and workspace-facing instructions. |
| `synced/` | Git-tracked knowledge base of the **live** Open WebUI config (assistants, groups, tool-server connections, default permissions, and full skill content), pulled read-only via the API. Treat this as the current source of truth for the live setup — the example files above are illustrative templates and may drift from it. |

## Existing repo skill hierarchy

The monorepo already has canonical project skills in:

```text
.agents/skills/
```

Open WebUI skills in this directory should not compete with that system. They should wrap, summarize, or adapt canonical skills for non-developer workspace users.

Relevant existing sources include:

- `.claude/memory/skills-integration.md`
- `.agents/skills/operations-review-surface/SKILL.md`
- `.agents/skills/show-production-lifecycle/SKILL.md`
- `.agents/skills/table-view-pattern/SKILL.md`
- `.agents/skills/engineering-best-practices-enforcer/SKILL.md`
- `.agents/skills/agent-instruction-maintenance/SKILL.md`

## Assistant definition pattern

Each assistant should define:

- Display name
- LiteLLM model alias
- Required Open WebUI skill adapters
- Optional knowledge collections
- Allowed MCP tools
- Allowed groups
- Operational risk level

## Skill management rule

Open WebUI may be used to test skills quickly, but stable company skills should be copied back into this directory and updated through pull requests.

Before adding a new Open WebUI skill, search `.agents/skills/` first. If a matching canonical skill exists, create an adapter that references it instead of duplicating it.
