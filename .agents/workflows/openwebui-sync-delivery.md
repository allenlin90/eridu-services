---
description: Deliver an Open WebUI skill or model change to the live instance and to a pull request in one pass
---

# Open WebUI Sync Delivery Workflow

End-to-end sequence for getting a Git-authored Open WebUI change (a skill, a Workspace Model, or
both) onto the live instance **and** into a reviewable pull request.

This is what `/upload-openwebui-skill` runs. It also runs unattended from Cowork, where the live
push half degrades to a reported skip.

## Trigger Conditions

Run when any of these are true:

1. A Markdown skill is attached in chat for upload to Open WebUI.
2. `ai/openwebui/skills/*.md` or `ai/openwebui/models/*.json` changed.
3. `synced/skills-drift.json` reports `drifted`, `live-only`, or `repo-only` entries.
4. Group membership or model access changed, so derived skill grants need recomputing.

## Load First

| Change | Skill |
|---|---|
| Skill content | [openwebui-skill-sync](../skills/openwebui-skill-sync/SKILL.md) |
| Model settings, skill bindings, access | [openwebui-assistant-adapter](../skills/openwebui-assistant-adapter/SKILL.md) |
| Groups, permissions, grant reconcile | [openwebui-groups-permissions](../skills/openwebui-groups-permissions/SKILL.md) |
| Endpoint mechanics, `0.10.2` gotchas | [openwebui-rest-api](../skills/openwebui-rest-api/SKILL.md) |
| Whether the change is even the right shape | [ai-workspace-control-plane](../skills/ai-workspace-control-plane/SKILL.md) |

## Steps

### 1. Classify

Decide which surface actually changed. Skill content and model configuration are different files
with different review stakes — do not fold a model access change into a "skill upload" PR without
saying so.

If the capability needs new code rather than new instructions, stop and use
[openwebui-extensibility-design](../skills/openwebui-extensibility-design/SKILL.md) instead.

### 2. Branch

Never work on `master`. Branch name states the surface: `feat/openwebui-skill-<id>`.

### 3. Land the file

- Skill → `ai/openwebui/skills/<id>.md`, following the frontmatter contract in `openwebui-skill-sync`.
- Model → `ai/openwebui/models/<id>.json`, following the manifest contract in `openwebui-assistant-adapter`.

For an attachment, write the file verbatim except for the frontmatter block. Do not rewrite,
summarize, or "improve" the user's content — it is theirs, and the PR is where it gets reviewed.

### 4. Dry run

```bash
python3 ai/openwebui/push_config.py all
```

Exit `2` means differences exist; exit `0` means live already matches; exit `3` means no API key is
configured (see step 7). Read the diff. Anything under `access` prefixed `-` is a **revoke** — a
group losing access — and needs the user's explicit agreement before applying.

### 5. Push, gated on merge

```bash
python3 ai/openwebui/push_config.py skills --only <id> --apply
python3 ai/openwebui/push_config.py access --pending <id> --apply
```

`--pending` grants `Admins` only. Unreviewed content stays out of staff hands while the PR is open.
If the PR is abandoned, the worst outcome is an Admins-only skill, not company-wide policy nobody
approved.

Model changes have no `--pending` equivalent — a model's access **is** its manifest. Apply model
changes only after the user has seen the diff.

### 6. Refresh the snapshot

```bash
python3 ai/openwebui/pull_config.py
```

Commit `ai/openwebui/synced/` in the same change. A snapshot refreshed in a later PR is how the
repo goes quietly stale.

### 7. Cowork / no-key degrade

`ai/openwebui/.env` is gitignored, so a fresh checkout has no key and `push_config.py` exits `3`.
That is a supported mode, not an error:

- Complete steps 3, 6 (skip — nothing to pull), and 8.
- Report the push as `skipped (not configured)` with the exact command to run later.
- Never report a push, a grant change, or a live state you did not verify.

### 8. Open the PR

Target `master` on `allenlin/eridu-services`. The PR body states:

- which skills and models changed;
- the derived access delta, revokes called out separately;
- whether live was pushed or skipped, and whether grants are still `--pending`;
- the post-merge command, when one is outstanding.

### 9. Post-merge — usually automatic

Merging to `master` deploys the `openwebui-sync` Railway service, and deploying it **is** what
runs `push_config.py --apply`. That widens `--pending` skills from `Admins` to their derived
groups with no manual step.

Two cases still need a human:

- **The run aborted on a revoke.** Intended: the service does not set `PUSH_CONFIRM_REVOKES`, so
  any plan containing a revoke stops before writing anything at all. Review the revokes, then
  apply locally once with `--yes`.
- **Nothing deployed.** The change did not match the service's watch patterns (`skills/**`,
  `models/**`, runner files).

```bash
python3 ai/openwebui/push_config.py all --apply
python3 ai/openwebui/pull_config.py
```

Commit the refreshed `synced/` afterwards — the Railway run writes to Open WebUI, not to Git.

## Status Report

Report every step with an explicit outcome. A step that was skipped is reported as skipped, with the
reason — silence reads as success.

```text
File     ai/openwebui/skills/<id>.md — created
Push     pushed (live) | skipped (not configured) | failed: <reason>
Access   admins-only (PR pending) | derived: <groups> | skipped
Snapshot synced/ refreshed | skipped (no key)
PR       <url> | not opened: <reason>
```

## Verification

- [ ] `python3 ai/openwebui/test_push_config.py` passes if `push_config.py` changed.
- [ ] `push_config.py all` re-run after applying; the remaining diff is understood, not ignored.
- [ ] Revokes were shown to the user and agreed before `--apply`.
- [ ] `synced/` refreshed and committed in the same change.
- [ ] `pnpm agents:validate` passes if any `.agents/` file changed.
- [ ] Status report states all outcomes, including skips.
