# Agent Rules — Company Wiki

Scope: `ai/openwebui/knowledge/company-wiki/`.

## Before editing

- Read `README.md` in this directory and [`wiki-knowledge-maintainer`](../../../../.agents/skills/wiki-knowledge-maintainer/SKILL.md) — that skill is canonical for content maintenance workflow; this file only covers directory-local mechanics.

## Rules

- Run `tools/validate-wiki` after any change under `content/` and before proposing a sync. Do not hand-wave validation.
- Do not commit files under `generated/` — they are derived from `content/` via `tools/validate-wiki --write-manifest` and regenerate deterministically.
- Do not commit raw intake material (Slack exports, personal data, unreviewed bulk dumps) under `intake/`. See `intake/README.md`.
- Do not widen the `audiences` list on a `sensitivity: restricted` document without the document owner's explicit sign-off — an author's own edit is not sufficient (see `tools/wiki-schema.json`).
- Never advance `reviewed_at` or `review_by` without an actual owner review having happened.
- A document with `status: draft` must never be synced to a live Open WebUI knowledge collection.
- Treat `tools/wiki-schema.json` as the single source of truth for allowed `sensitivity`, `status`, and `audiences` values — do not invent new tags inline in a document.
