# Open WebUI Skill Adapters

This directory contains repo-authored adapter or import artifacts for Open WebUI skills. It is separate from `../synced/skills/`, which is the read-only export of skill content currently deployed in Open WebUI.

## Adapters in this directory

- `citation-escalation-contract.md` — the citation-format and information-gap escalation behavior for any assistant with a Company Wiki knowledge collection attached. Generated from `ai/architecture/llm-knowledge-base-plan.md` § Citation And Escalation Contract — update that section first, not this file directly.

Do not put canonical agent skills here. Actual agent skills must live in:

```text
.agents/skills/
```

## Current canonical AI workspace skills

- `.agents/skills/ai-workspace-control-plane/SKILL.md`
- `.agents/skills/openwebui-extensibility-design/SKILL.md`
- `.agents/skills/openwebui-assistant-adapter/SKILL.md`
- `.agents/skills/openwebui-rest-api/SKILL.md`
- `.agents/skills/openwebui-groups-permissions/SKILL.md`
- `.agents/skills/openwebui-mcp-tool-integration/SKILL.md`

## Existing related repo skills

Open WebUI assistants should also reference existing domain skills when relevant:

| Existing skill | Why it matters for Open WebUI |
|---|---|
| `.agents/skills/operations-review-surface/SKILL.md` | Operational-day review surfaces and read-only review model rules. |
| `.agents/skills/show-production-lifecycle/SKILL.md` | Show lifecycle, statuses, readiness, cancellation, roles, and lifecycle boundaries. |
| `.agents/skills/table-view-pattern/SKILL.md` | Table, pagination, filtering, export, and dense view conventions. |
| `.agents/skills/engineering-best-practices-enforcer/SKILL.md` | Engineering quality gate for implementation work. |
| `.agents/skills/agent-instruction-maintenance/SKILL.md` | Maintenance rules for agent instructions and skill updates. |

## Adapter rule

If Open WebUI needs an imported skill, generate it from the canonical `.agents/skills/` source or create a thin adapter that clearly links back to the canonical skill.

Do not create standalone Open WebUI instruction files here that diverge from `.agents/skills/`.
