# Open WebUI Scaffold

This directory contains repo-managed Open WebUI assistant definitions, tool access policy, and Open WebUI-importable skill adapters.

## Intended role

Open WebUI should be the user-facing AI workspace. It should provide a small set of curated assistants rather than exposing raw LLM provider choices to every user.

## Files

**Git is the source of truth.** `skills/` and `models/` own the live instance's skill content and
assistant configuration; the live instance is a projection of them. A change made in the Open WebUI
admin UI is drift to be reconciled, not a new version.

| File | Purpose |
|---|---|
| `skills/` | **Source of truth** for Open WebUI skill content, one `<skill-id>.md` per skill. |
| `models/` | **Source of truth** for Workspace Model (assistant) manifests, including group access. |
| `push_config.py` | Applies `skills/` and `models/` to the live instance and reconciles derived skill grants. Dry run by default; `--apply` writes. Run as `python3 ai/openwebui/push_config.py all`. |
| `pull_config.py` | Fetches live config into `synced/` for drift detection. Validates every required response before writing, and exits non-zero without changing snapshots if a read fails. Run as `python3 ai/openwebui/pull_config.py`. |
| `synced/` | Read-only drift snapshot of the live config (groups, tool-server connections, default permissions, knowledge, and a per-skill drift report). Not an edit surface. |
| `tool-access.example.json` | Example MCP tool access policy by group. |
| `knowledge/` | Git-authored Markdown knowledge sources and generated manifests for Open WebUI knowledge collections. |
| `functions/` | Canonical source for Open WebUI Functions (Pipes/Filters/Actions/Events), applied via the Admin API. Function source lives in Open WebUI's own database once deployed, not in Git — this is the reviewed copy. |

## Delivering a change

Follow [`.agents/workflows/openwebui-sync-delivery.md`](../../.agents/workflows/openwebui-sync-delivery.md),
or run `/upload-openwebui-skill` with a Markdown skill attached.

```bash
python3 ai/openwebui/push_config.py all           # dry run: what would change live
python3 ai/openwebui/push_config.py all --apply   # write
python3 ai/openwebui/pull_config.py               # refresh the drift snapshot
```

## Existing repo skill hierarchy

The monorepo already has canonical project skills in:

```text
.agents/skills/
```

Open WebUI skills in this directory should not compete with that system. They should wrap, summarize, or adapt canonical skills for non-developer workspace users.

Relevant existing sources include:

- `.claude/memory/skills-integration.md`
- `.agents/skills/openwebui-extensibility-design/SKILL.md` — which mechanism (Function, Tool, Tool Server, or legacy Pipeline) a new capability should use, and where its source lives
- `.agents/skills/operations-review-surface/SKILL.md`
- `.agents/skills/show-production-lifecycle/SKILL.md`
- `.agents/skills/table-view-pattern/SKILL.md`
- `.agents/skills/engineering-best-practices-enforcer/SKILL.md`
- `.agents/skills/agent-instruction-maintenance/SKILL.md`

## Scheduled drift check (Railway)

The `openwebui-sync` service in the `eridu-services` Railway project runs
`push_config.py` from this directory on a daily cron (`0 2 * * *` UTC). `Dockerfile` and
`railway-entrypoint.sh` here are its build and entrypoint.

**It is read-only by default.** The deployment's exit status carries the result:

| Exit | Railway shows | Meaning |
|---|---|---|
| 0 | success | live matches the repo |
| 2 | crashed | drift — someone changed config in the admin UI |
| 1 | crashed | failure |
| 3 | crashed | `OPEN_WEBUI_API_KEY` not set |

A crashed daily run is the signal to investigate, not an outage.

Writing from the runner takes two separate opt-ins, so neither happens on a schedule:

| Variable | Effect |
|---|---|
| `PUSH_TARGET` | `skills` / `models` / `access` / `all` (default `all`) |
| `PUSH_APPLY=1` | write instead of dry-run |
| `PUSH_CONFIRM_REVOKES=1` | permit revoking access grants; without it a run that would revoke aborts before writing anything |

`OPEN_WEBUI_HOST` is a Railway reference to Open WebUI's own public domain, so it follows
the service. The public domain is deliberate rather than private DNS: Open WebUI has
`sleep_application` enabled, and only proxy traffic wakes a sleeping service.

`OPEN_WEBUI_API_KEY` is an admin key — it can revoke grants and delete skills. Set it in
the Railway dashboard, and rotate it there if it leaks.

## Assistant definition pattern

See [`models/README.md`](models/README.md) for the manifest contract. Each assistant defines a
display name, business purpose, base model, bound skills, knowledge references, MCP tools, and
group access.

## Access model

Access is expressed once, on the model:

```text
model  -> skills   (manifest `skill_ids`)
model  -> groups   (manifest `access`)
skill  -> groups   DERIVED: a group reads a skill iff it reads a model binding that skill
```

There is no path to a skill except through a model, so the derivation is complete and
`push_config.py access` enforces it — grants no model implies are revoked. Widen access by editing
the model manifest, never by hand-editing a skill grant.

## Skill management rule

Skills are authored in `skills/` and pushed. Open WebUI can still be used to try something quickly,
but a UI edit is drift: `synced/skills-drift.json` will flag it, and the next push overwrites it
unless someone adopts the change back into Git first.

Before adding a new Open WebUI skill, search `.agents/skills/` first. If a matching canonical skill exists, create an adapter that references it instead of duplicating it.
