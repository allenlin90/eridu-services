---
name: openwebui-skill-sync
description: Upload, sync, and PR Open WebUI skill content from Git, with drift detection and a chat status report.
---

# Open WebUI Skill Sync

Use this skill to get a Markdown skill from a chat attachment (or a repo edit) into the live
Open WebUI instance **and** into a pull request, in one pass.

Git is the source of truth. `ai/openwebui/skills/<id>.md` owns skill content; the live instance is
a projection of it. A skill edited in the Open WebUI admin UI is **drift**, not a new version.

For the end-to-end sequence the `/upload-openwebui-skill` command runs, follow
[`.agents/workflows/openwebui-sync-delivery.md`](../../workflows/openwebui-sync-delivery.md).

## Before using this skill

- Access policy is not authored here. A skill's group access is *derived* from the models that
  bind it — see [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md).
- If the change is really about an assistant's configuration (base model, prompt, knowledge, which
  skills it binds), that belongs in [openwebui-assistant-adapter](../openwebui-assistant-adapter/SKILL.md).
- Check `.agents/skills/` first. An Open WebUI skill that restates a canonical repo skill should be
  a thin adapter that links back to it, not a copy.

## Skill file contract

Content and metadata are separate files:

- `ai/openwebui/skills/<skill-id>.md` — the content, whole and unmodified. What the file contains is
  exactly what Open WebUI stores. No frontmatter is added or stripped.
- `ai/openwebui/skills/index.json` — `{ "<skill-id>": { "name", "description" } }`, the skill's API
  fields, plus an optional `"access": "admins-only"` marker for a skill no model binds yet.

Metadata stays out of the `.md` on purpose: it is what lets a skill adopted from the live instance
round-trip byte-for-byte instead of showing a permanent phantom diff. Some skills' content begins
with its own YAML header — that is part of the content the model reads. Leave it alone.

- **Filename stem is the skill id, byte-exact.** Live ids carry oddities that models reference
  verbatim (`affiliate-management-` has a trailing hyphen). Renaming the file breaks every
  `skill_ids` entry pointing at it.
- **Every `.md` needs an `index.json` entry.** Missing one is a hard error — pushing a guessed
  display name is worse than refusing.
- **`description` is load-bearing.** With on-demand loading the model sees only id + name +
  description and decides from that whether to call `view_skill(id)`. An empty description means the
  skill effectively never loads.

## Workflow

### 1. Land the file

Write the attachment to `ai/openwebui/skills/<id>.md` verbatim, and add its `name`/`description` to
`ai/openwebui/skills/index.json`. For an edit to an existing skill, edit in place — do not create a
second file.

Adopting a skill that already exists live works the other way: pull its content and metadata down
first, so the repo baseline is what live actually has. Never seed a Git file from a rewritten or
summarized copy — that turns adoption into an unreviewed content change.

### 2. Ask which models carry it, and whether their audience changes

Two questions, always asked when not supplied — never guessed:

1. **Which assistants should carry this skill?** List the models in `ai/openwebui/models/`
   with their current groups so the choice is informed.
2. **Should any of those assistants reach more groups than they do now?** Adding a group to a
   model is a separate, larger change — it widens that group's access to **every** skill the
   model binds, not just this one. Name the full `skill_ids` list before making the edit.

Then add the skill id to each chosen model's `skill_ids`, and show the result before writing
anything:

```bash
python3 ai/openwebui/push_config.py access
```

Name the groups that gain read. Binding to a broad assistant like `eridu-brain` reaches every
group that reads it — check that list rather than assuming the skill's topic implies its
audience.

If no existing assistant serves the intended audience, stop and say so. A new assistant or a new
group is a separate decision, not a side effect of an upload.

#### Default when no model is given: Admins only

**Never leave a new skill unbound and unmarked** — it would derive an empty grant set and be
readable by nobody, which looks identical to a successful upload.

Mark it in `index.json` instead:

```json
"foo": { "name": "Foo", "description": "...", "access": "admins-only" }
```

That grants Admins read and write, so the skill is testable while its audience is still being
decided. Unlike the transient `--pending` flag, this lives in Git and survives merges.
`push_config.py access` reports it under `STAGED`, and reports the marker as a `STALE MARKER`
once a model does bind the skill — a binding always wins, so remove the field then.

### 3. Diff against live

```bash
python3 ai/openwebui/push_config.py skills --only <id>
```

Dry run by default. Read the diff before writing anything: `create` means new, `update` with
`differs: content` means the live copy will be replaced, and `live-only` means a skill exists in
Open WebUI that Git does not own yet.

### 4. Push, gated

A skill whose PR has not merged is granted to `Admins` only, so unreviewed content cannot reach
staff:

```bash
python3 ai/openwebui/push_config.py skills --only <id> --apply
python3 ai/openwebui/push_config.py access --pending <id> --apply
```

After the PR merges this happens on its own: merging to `master` runs the `openwebui-sync`
GitHub Actions workflow, which applies `push_config.py all --apply` and recomputes grants
without the `--pending` override. Run it by hand only if the workflow aborted on a revoke, or
if the change did not match its path filters:

```bash
python3 ai/openwebui/push_config.py all --apply
```

### 5. Refresh the snapshot and open the PR

```bash
python3 ai/openwebui/pull_config.py
```

Commit the skill file plus the refreshed `ai/openwebui/synced/` snapshot together, then open the PR
against `master`.

## Drift handling

`ai/openwebui/synced/skills-drift.json` records, per skill, whether live still matches the repo:

| `state` | Meaning | Action |
|---|---|---|
| `in-sync` | Live matches Git | none |
| `drifted` | Someone edited the skill in the Open WebUI UI | decide which side wins, then converge |
| `live-only` | Skill exists live with no Git file | adopt it into `ai/openwebui/skills/` or delete it live |
| `repo-only` | Git file never pushed | `push_config.py skills --only <id> --apply` |

Never resolve `drifted` by silently re-pushing. Show the user both sides first: a UI edit is
usually a real change someone made deliberately, and re-pushing destroys it.

## Status report

Every run reports these four facts in chat, each with an explicit outcome — never omit one because
it succeeded, and never imply a step ran when it did not:

| Step | Reported as |
|---|---|
| File written | path + `created` / `updated` |
| Bound to | model ids, or `admins-only (staged, no model yet)` |
| Live push | `pushed` / `skipped (not configured)` / `failed: <reason>` |
| Access | `admins-only (PR pending)` / `derived: <groups>` / `skipped` |
| PR | URL, or why none was opened |

`push_config.py` exits `3` when `OPEN_WEBUI_API_KEY` / `OPEN_WEBUI_HOST` are missing — expected in
Cowork, where `ai/openwebui/.env` is gitignored and absent. That is not a failure: land the file,
open the PR, and report the push as `skipped (not configured)` with the exact command to run once a
key is available. Do not report a push that did not happen.

## Quality gate

- [ ] Filename stem matches the intended skill id byte-exactly.
- [ ] `index.json` entry exists with a non-empty `description` saying *when* to load the skill.
- [ ] Bound to at least one model, **or** marked `"access": "admins-only"` — never left unbound and unmarked.
- [ ] `push_config.py access` reports no `UNREACHABLE` or `STALE MARKER` entry for it.
- [ ] The groups the binding grants were named to the user before the manifest edit was committed.
- [ ] Dry run reviewed before `--apply`.
- [ ] Unmerged content pushed with `--pending`, not with full derived grants.
- [ ] `pull_config.py` re-run and `synced/` committed in the same change.
- [ ] Chat status report states every outcome, including skipped steps.

## Related Skills

- [openwebui-assistant-adapter](../openwebui-assistant-adapter/SKILL.md) — model manifests, which decide who can read a skill
- [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md) — the derived-grant reconcile this skill triggers
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) — underlying endpoint mechanics and known `0.10.2` gotchas
- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — governs the Git-first policy this skill implements
- [wiki-knowledge-maintainer](../wiki-knowledge-maintainer/SKILL.md) — for knowledge collections, which are a different surface from skills
