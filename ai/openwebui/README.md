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

## Tests

`push_config.py` decides who loses access, so its pure logic is covered by unit tests —
no network, no API key, no live instance:

```bash
python3 ai/openwebui/test_push_config.py
```

They cover the access derivation (`derive_skill_access`), grant construction
(`grants_for`), the model diff, the revoke gate's refusal on an unattended run, and
frontmatter parsing. Run them before changing any of those.

## Apply on merge (Railway)

The `openwebui-sync` service in the `eridu-services` Railway project applies this
directory to the live instance. `Dockerfile`, `railway.json`, and `railway-entrypoint.sh`
here are its build.

**Deploying it is what runs it.** The service has no cron and
`restartPolicyType: NEVER`, so the container runs `push_config.py` once per deployment and
exits. Its watch patterns cover `skills/**`, `models/**`, and the runner's own files on
`master`, which makes a merge touching Open WebUI config the trigger. Nothing polls, and
there is no HTTP surface holding an admin key.

The trade-off is deliberate: config edited directly in the Open WebUI admin UI is *not*
detected when it happens. It gets reverted at the next merge that runs the apply, because
Git is the source of truth. To check on demand, run `push_config.py all` locally.

| Variable | Effect |
|---|---|
| `PUSH_TARGET` | `skills` / `models` / `access` / `all` (default `all`) |
| `PUSH_APPLY=1` | write; unset means the run only reports a diff |
| `PUSH_CONFIRM_REVOKES=1` | permit revoking access grants |

Without `PUSH_CONFIRM_REVOKES`, a run whose plan contains any revoke **aborts before
writing anything at all** — not partway through. `push_config.py` builds the complete plan
across skills, models, and access before the first write precisely so this gate can stop
all of it. Additive changes land unattended; anything that would remove access does not.

That guarantee covers the revoke gate only. Once past it the writes are applied in
sequence with no rollback, so an HTTP failure midway leaves earlier writes in place. Re-run
after fixing the cause — every operation is an idempotent upsert, so a repeat is safe.

`OPEN_WEBUI_HOST` is `http://open-webui.railway.internal:8080` — private networking, same
project. A slept service wakes on private-network traffic, and `push_config.py` spends a
retrying read first to absorb the cold boot.

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
