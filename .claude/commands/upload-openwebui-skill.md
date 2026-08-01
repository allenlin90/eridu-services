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
- A skill id — overrides the id inferred from the attachment's filename.
- `--no-push` — land the files and open the PR only; skip the live push.
- `--dry-run` — show the diff and stop; write nothing, open nothing.

If no file is attached and no path is given, say so and stop. Do not invent skill content.

Preserve the attached content verbatim. Add the `index.json` metadata entry; do not rewrite,
reformat, summarize, or extend the body — the pull request is where it gets reviewed.

## Binding is required, not optional

Skill access is derived: a group can read a skill exactly when it can read a model that binds it.
**A skill no model binds is readable by nobody**, so uploading without binding produces an inert
skill and a PR that looks complete.

If `--models` is not given, list the assistants from `ai/openwebui/models/` with their audiences
and ask which should carry this skill. Do not guess, and do not proceed unbound — if the user
genuinely wants it unbound, make them say so explicitly and note it in the PR.

After editing the chosen manifests' `skill_ids`, run `python3 ai/openwebui/push_config.py access`
and show the derived access delta **before** pushing or committing. State plainly which groups
gain read on this skill. If the user rejects it, revert the manifest edits rather than opening a
PR granting access they did not agree to.

If no existing assistant serves the intended audience, say so and stop. Adding a new assistant or
a new group is a separate decision — not a side effect of a skill upload.

Finish with the workflow's status report, including the binding and any step that was skipped.
