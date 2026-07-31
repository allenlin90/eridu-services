---
description: Upload an attached Markdown skill to Open WebUI and open a sync PR against eridu-services
---

Upload the attached Markdown skill to Open WebUI and open a pull request recording it.

Run [`.agents/workflows/openwebui-sync-delivery.md`](../../.agents/workflows/openwebui-sync-delivery.md)
end to end, loading the [`openwebui-skill-sync`](../../.agents/skills/openwebui-skill-sync/SKILL.md)
skill first.

Arguments (all optional): `$ARGUMENTS`

- A skill id — overrides the id inferred from the attachment's filename.
- `--no-push` — land the file and open the PR only; skip the live push.
- `--dry-run` — show the diff and stop; write nothing, open nothing.

If no file is attached and no path is given, say so and stop. Do not invent skill content.

Preserve the attached content verbatim. Add the frontmatter block if it is missing; do not rewrite,
reformat, summarize, or extend the body — the pull request is where it gets reviewed.

Finish with the workflow's four-line status report, including any step that was skipped.
