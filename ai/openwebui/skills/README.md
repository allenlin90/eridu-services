# Open WebUI Skill Adapters

This directory is for Open WebUI-importable skill adapters, not the primary project skill source of truth.

## Canonical source of truth

The canonical repo skill system already lives in:

```text
.agents/skills/
```

The existing skills integration guide states the hierarchy:

```text
1. .agents/skills/        PRIMARY
2. .claude/memory/*.md    SECONDARY
3. Codebase examples      VALIDATION
```

Therefore, Open WebUI skills in this directory should either:

1. wrap an existing `.agents/skills/*/SKILL.md` skill for non-developer workspace use,
2. summarize several existing repo skills into an operational assistant instruction,
3. add company/user-facing behavior that is not appropriate for developer-agent skills, or
4. identify a gap and propose a new `.agents/skills/*` skill before becoming canonical.

## Existing related repo skills

Relevant existing skills discovered during this scaffold pass:

| Existing skill | Why it matters for Open WebUI |
|---|---|
| `.agents/skills/operations-review-surface/SKILL.md` | Operational-day review surfaces, read-only review model, lazy paginated sub-resources, export behavior, and operational-day date rules. |
| `.agents/skills/show-production-lifecycle/SKILL.md` | Show lifecycle, central operational record, statuses, readiness, cancellation, roles, and cross-skill references. |
| `.agents/skills/table-view-pattern/SKILL.md` | DataTable, URL state, pagination, filtering, export, and dense table UX conventions. |
| `.agents/skills/engineering-best-practices-enforcer/SKILL.md` | Engineering quality gate for implementation work. |
| `.agents/skills/agent-instruction-maintenance/SKILL.md` | Maintenance rules for agent instructions and skill updates. |
| `.agents/skills/write-a-skill/SKILL.md` / `.agents/skills/skill-creator/SKILL.md` | Existing skill authoring guidance. |

## Rule for future updates

Before adding a new Open WebUI skill here, search `.agents/skills/` first. If a matching skill exists, create an adapter that references it instead of duplicating the canonical behavior.
