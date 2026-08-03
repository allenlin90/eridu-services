# Open WebUI Skills

**Source of truth** for Open WebUI skill content. One file per live skill, named `<skill-id>.md`.
The live instance is a projection of this directory — a skill edited in the Open WebUI admin UI is
drift, recorded in [`../synced/skills-drift.json`](../synced/skills-drift.json).

Full authoring contract and workflow:
[`upload-openwebui-skill`](../../../.agents/skills/upload-openwebui-skill/SKILL.md).

## File contract

Two files per skill, by different owners:

| File | Holds |
|---|---|
| `<skill-id>.md` | The skill **content**, whole and unmodified — what the file contains is exactly what Open WebUI stores |
| `index.json` | The skill's API **metadata** — display `name` and `description`, keyed by id |

Metadata is deliberately *not* a frontmatter block in the `.md`. Keeping it out is what lets a skill
adopted from the live instance round-trip byte-for-byte, with no push needed to reach agreement.
Several skills' content happens to start with its own YAML header — that header is part of the
content the model reads, and is left alone.

```jsonc
// index.json
{
  "core-principles": {
    "name": "Core Principles",
    "description": "One line telling the model when to load this skill."
  },
  "citation-escalation-contract": {
    "name": "Citation And Escalation Contract",
    "description": "...",
    "source": "repo-authored"      // written here first, not adopted from live
  }
}
```

- **The filename stem is the skill id, byte-exact.** Live ids carry oddities that model manifests
  reference verbatim — `affiliate-management-.md` has a trailing hyphen on purpose. Renaming a file
  breaks every `skill_ids` entry pointing at it.
- **Every `.md` needs an `index.json` entry.** A missing one is a hard error, not a default — a
  skill pushed with a guessed display name is worse than one that refuses to push.
- **`description` decides whether the skill ever loads.** With on-demand loading the model sees only
  id + name + description and calls `view_skill(id)` from that alone. Eight skills currently have a
  0–2 character description (`eu-essentials`, `communication-protocol`, `adp-analysis`,
  `sales-training`, `affiliate-management`, `affiliate-management-`, `loreal-brand-case`,
  `talent-development-framework`); they are effectively unloadable until it is written.

## Not linted, on purpose

`eslint.config.mjs` ignores `ai/openwebui/skills/!(README).md`. These files mirror the live
instance's own text; auto-formatting them (trailing newlines, collapsed blank lines) would rewrite
company content and reintroduce the drift the mirror exists to eliminate. This README is
repo-authored and stays linted.

## Applying

```bash
python3 ai/openwebui/push_config.py skills            # dry run
python3 ai/openwebui/push_config.py skills --apply     # write
python3 ai/openwebui/push_config.py access --apply     # reconcile derived group grants
python3 ai/openwebui/pull_config.py                    # refresh the drift snapshot
```

## Access

Not authored here. A group reads a skill when it can read a Workspace Model that binds it. On Open
WebUI `0.10.2`, that read grant also permits direct menu and `$`-mention use; it is not restricted to
the model path. Canonical skill write access remains Admin-only. See
[`../models/README.md`](../models/README.md).

## Repo-authored adapters

Two files are written here first and pushed outward, rather than originating live:

- `citation-escalation-contract.md` — citation format and information-gap escalation for any
  assistant with a Company Wiki knowledge collection attached. Generated from
  `ai/architecture/llm-knowledge-base-plan.md` § Citation And Escalation Contract — update that
  section first.
- `platform-incentive-dispatch.md` — dispatch and answering rules for ERISA Platform PoC work.
  Its source of truth is `ai/openwebui/knowledge/erisa-platform-ops/` — update that directory first.
  Internal ERISA audience only.

## Not canonical agent skills

Canonical agent skills live in `.agents/skills/`. Content here is staff-facing workspace material.
If Open WebUI needs guidance a canonical skill already covers, write a thin adapter that links back
to it rather than a copy.

Current canonical AI workspace skills:

- `.agents/skills/ai-workspace-control-plane/SKILL.md`
- `.agents/skills/upload-openwebui-skill/SKILL.md`
- `.agents/skills/openwebui-assistant-adapter/SKILL.md`
- `.agents/skills/openwebui-groups-permissions/SKILL.md`
- `.agents/skills/openwebui-rest-api/SKILL.md`
- `.agents/skills/openwebui-mcp-tool-integration/SKILL.md`
- `.agents/skills/openwebui-extensibility-design/SKILL.md`

Assistants should also reference existing domain skills where relevant:

| Existing skill | Why it matters for Open WebUI |
|---|---|
| `.agents/skills/operations-review-surface/SKILL.md` | Operational-day review surfaces and read-only review model rules. |
| `.agents/skills/show-production-lifecycle/SKILL.md` | Show lifecycle, statuses, readiness, cancellation, roles, and lifecycle boundaries. |
| `.agents/skills/frontend-ui-components/references/table-view-pattern.md` | Table, pagination, filtering, export, and dense view conventions. |
| `.agents/skills/engineering-best-practices-enforcer/SKILL.md` | Engineering quality gate for implementation work. |
| `.agents/skills/agent-instruction-maintenance/SKILL.md` | Maintenance rules for agent instructions and skill updates. |
