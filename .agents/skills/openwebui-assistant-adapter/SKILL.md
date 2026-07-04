---
name: openwebui-assistant-adapter
description: Design Open WebUI Workspace Models and assistant manifests from canonical repo skills. Use when creating or updating Open WebUI assistants, imported skill adapters, tool access manifests, or files under ai/openwebui/.
---

# Open WebUI Assistant Adapter

Use this skill when turning repo knowledge into Open WebUI-facing assistants.

## Purpose

Open WebUI assistants are staff-facing workspace products. They should adapt canonical repo guidance without creating a conflicting instruction system.

## Source hierarchy

1. `.agents/skills/` is canonical for agent skills.
2. `.claude/memory/*.md` is secondary reference.
3. `docs/` and `apps/*/docs/` provide product and engineering context.
4. `ai/openwebui/` holds Open WebUI manifests and import/export notes.

## Rules

- Search `.agents/skills/` before adding new Open WebUI instructions.
- If a relevant canonical skill exists, reference or adapt it instead of duplicating it.
- Keep assistant instructions staff-facing and task-oriented.
- Keep implementation rules in `.agents/skills/`.
- Prefer LiteLLM model aliases over raw provider names.
- Attach only the MCP tools needed by the assistant's audience.
- For operational assistants, use the existing `erify_api` MCP tools and preserve read-only/studio-scoped constraints.

## Manifest checklist

Each Workspace Model manifest should define:

- display name;
- business purpose;
- LiteLLM model alias;
- skill adapters or canonical skill references;
- knowledge collections;
- MCP tools;
- allowed groups;
- risk level.

## Existing sources to prefer

Operations assistants:

- `.agents/skills/show-production-lifecycle/SKILL.md`
- `.agents/skills/operations-review-surface/SKILL.md`
- `.agents/skills/table-view-pattern/SKILL.md`
- `apps/erify_api/docs/MCP_SERVER.md`

Engineering assistants:

- `.agents/skills/engineering-best-practices-enforcer/SKILL.md`
- `.agents/skills/agent-instruction-maintenance/SKILL.md`
- `.agents/skills/monorepo-doc-layering/SKILL.md`
- `.claude/memory/skills-integration.md`

## Quality gate

- [ ] No duplicate canonical rule from `.agents/skills/`.
- [ ] Assistant has a clear business audience.
- [ ] Tool access is minimum necessary.
- [ ] Operational tools are read-only unless separately approved.
- [ ] Model alias is stable and provider-agnostic.
