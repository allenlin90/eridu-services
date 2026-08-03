---
name: openwebui-assistant-adapter
description: Design and apply Open WebUI Workspace Model manifests — base model, prompt, skills, knowledge, tools, and group access.
---

# Open WebUI Assistant Adapter

Use this skill when creating or changing an Open WebUI assistant: what it is for, what it binds, and
who can use it.

## Purpose

Open WebUI assistants are staff-facing workspace products. They adapt canonical repo guidance
without creating a conflicting instruction system.

Each assistant is one file — `ai/openwebui/models/<id>.json` — and that file is the source of
truth. `ai/openwebui/synced/models.json` is a drift snapshot of the live instance, not an edit
surface.

## Source hierarchy

1. `.agents/skills/` is canonical for agent skills.
2. `.claude/memory/*.md` is secondary reference.
3. `docs/` and `apps/*/docs/` provide product and engineering context.
4. `ai/openwebui/models/` holds the manifests this skill owns.

## Manifest contract

Full field reference and examples: [`ai/openwebui/models/README.md`](../../../ai/openwebui/models/README.md).

Every manifest must define a display name, business purpose (`description`), base model, bound
skills, knowledge references, tool ids, and group access. A manifest with no stated audience is not
ready to apply.

## Rules

- **Search `.agents/skills/` before adding new instruction content.** If a canonical skill covers
  it, bind a thin adapter that links back rather than duplicating the rule.
- **Keep implementation rules in `.agents/skills/`.** Assistant content is staff-facing and
  task-oriented.
- **Use a base model that exists live.** Verify with `GET /v1/models` against LiteLLM before
  writing it. The `company-fast` / `company-balanced` / `company-reasoning` / `company-coding`
  aliases are a *planned* convention that was never created — as of the last live check every
  assistant uses a raw id (`MiniMax-M3`), and referencing a `company-*` alias fails with
  model-not-found. Do not write one into a manifest until it exists.
- **Attach only the MCP tools the audience needs**, and keep operational tools read-only unless
  auth, audit, and rate-limit behavior were designed.
- **Do not add per-user "sync" steps for tracking.** LiteLLM records each Open WebUI user as a
  customer automatically via forwarded headers.
- **Verify capabilities against the deployed versions** (LiteLLM `1.91.0`, Open WebUI `0.10.2`,
  both pinned) before relying on them.
- **Keep wiki maintenance instructions out of employee-facing assistants.** Use
  [wiki-knowledge-maintainer](../wiki-knowledge-maintainer/SKILL.md) in the repo workflow instead.

## Access is decided here

A group that can read or edit a model gets read on every skill that model binds. Open WebUI `0.10.2`
uses the same skill read grant for model-bound execution, direct menu selection, and `$` mentions.
Binding therefore defines the reconciled audience but is not an exclusive model-only path.

Practical consequence: **adding a group to a model widens that group's reach to every skill the
model binds.** Before granting access, read the model's `skill_ids` and confirm the group should
see all of them. Narrowing means splitting the model, not hand-editing a skill grant.

`write_groups` implies model and skill read. It does not grant skill write; canonical skill content
remains Admin-managed.

## Applying

```bash
python3 ai/openwebui/push_config.py models --only <id>          # dry run
python3 ai/openwebui/push_config.py models --only <id> --apply
python3 ai/openwebui/push_config.py access --apply              # reconcile derived skill grants
python3 ai/openwebui/pull_config.py                             # refresh the drift snapshot
```

`push_config.py` applies manifests via `POST /api/v1/models/import`; `/model/update` returns a bare
`500` on this instance.

## Existing sources to prefer

Operations assistants:

- `.agents/skills/show-production-lifecycle/SKILL.md`
- `.agents/skills/operations-review-surface/SKILL.md`
- `.agents/skills/frontend-ui-components/references/table-view-pattern.md`
- `apps/erify_api/docs/MCP_SERVER.md`

Engineering assistants:

- `.agents/skills/engineering-best-practices-enforcer/SKILL.md`
- `.agents/skills/agent-instruction-maintenance/SKILL.md`
- `.agents/skills/monorepo-doc-layering/SKILL.md`
- `.claude/memory/skills-integration.md`

## Quality gate

- [ ] No duplicate canonical rule from `.agents/skills/`.
- [ ] Assistant has a clear business audience.
- [ ] `base_model_id` verified to exist live.
- [ ] Every `skill_ids` entry matches a file in `ai/openwebui/skills/`.
- [ ] Tool access is minimum necessary; operational tools read-only unless separately approved.
- [ ] Group additions checked against the full bound-skill list, not just the model's purpose.
- [ ] `synced/` refreshed and committed with the manifest change.

## Related Skills

- [upload-openwebui-skill](../upload-openwebui-skill/SKILL.md) — the skill content this manifest binds
- [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md) — group creation and the derived-grant reconcile
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) — endpoint mechanics and `0.10.2` gotchas
- [openwebui-mcp-tool-integration](../openwebui-mcp-tool-integration/SKILL.md) — implements the `tool_ids` field
- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — governs the Git-first policy above
- [wiki-knowledge-maintainer](../wiki-knowledge-maintainer/SKILL.md) — maintains the knowledge collections referenced here
