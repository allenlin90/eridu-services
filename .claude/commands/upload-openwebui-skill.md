---
description: Upload an attached Markdown skill to Open WebUI, bind it to assistants, and open a sync PR
---

Upload the attached Markdown skill to Open WebUI, bind it to the assistants that should carry
it, and open a pull request recording both.

Run [`.agents/workflows/openwebui-sync-delivery.md`](../../.agents/workflows/openwebui-sync-delivery.md)
end to end, loading the [`openwebui-skill-sync`](../../.agents/skills/openwebui-skill-sync/SKILL.md)
skill first.

Arguments (all optional): `$ARGUMENTS`

- `--models <id,id,...>` — the assistants to bind this skill to. Determines who can read it.
- `--groups <name,...>` — groups that should additionally reach those assistants. Widens the
  model's audience, not just this skill's.
- A skill id — overrides the id inferred from the attachment's filename.
- `--no-push` — land the files and open the PR only; skip the live push.
- `--dry-run` — show the diff and stop; write nothing, open nothing.

If no file is attached and no path is given, say so and stop. Do not invent skill content.

Preserve the attached content verbatim. Add the `index.json` metadata entry; do not rewrite,
reformat, summarize, or extend the body — the pull request is where it gets reviewed.

## Ask for the audience; default to Admins only

Skill access is derived: a group can read a skill exactly when it can read a model that binds
it. So the audience is chosen by picking models, never by editing a skill's grants.

When `--models` is not given, **ask two questions** — do not guess:

1. Which assistants should carry this skill? List the models in `ai/openwebui/models/` with
   their current groups so the answer is informed.
2. Should any of those assistants reach more groups than they do now? Adding a group widens it
   to **every** skill that model binds, not just this one. Name that full list before editing.

**If the user does not name any model, mark the skill `"access": "admins-only"` in
`index.json`.** That grants Admins only, so it is testable while the audience is undecided.
Never leave a new skill unbound and unmarked — it would be readable by nobody while looking
like a successful upload.

After editing the chosen manifests, run `python3 ai/openwebui/push_config.py access` and show
the derived access delta **before** pushing or committing. State plainly which groups gain
read. If the user rejects it, revert the manifest edits rather than opening a PR granting
access they did not agree to.

If no existing assistant serves the intended audience, say so and stop. Adding a new assistant
or a new group is a separate decision — not a side effect of a skill upload.

Finish with the workflow's status report, including the binding and any step that was skipped.
