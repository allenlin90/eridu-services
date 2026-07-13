# Company Wiki

Git-authored, reviewed company knowledge that syncs into Open WebUI knowledge collections via the Sync Pipe (see [`ai/openwebui/functions/README.md`](../../functions/README.md)).

This is the Phase 1 content contract: schema, validator, and directory layout. No reviewed content has been migrated yet — see `content/README.md` for status.

## Layout

```text
company-wiki/
├── README.md            # this file
├── AGENTS.md             # agent operating rules for this wiki
├── CHANGELOG.md          # notable schema/tooling changes
├── intake/                # draft-ingestion workspace, not synced
├── content/                # reviewed documents, source of truth
├── generated/               # derived manifests/catalogs, not committed
└── tools/
    ├── wiki-schema.json      # sensitivity/status/audience vocabulary
    └── validate-wiki          # frontmatter + link validator
```

## Frontmatter contract

Every file under `content/` starts with flat YAML-like frontmatter (see `tools/validate-wiki`'s header comment for why this is not general YAML):

```text
---
id: shared.example-doc
title: Example Document
audiences: [company-wide]
owner: engineering
sensitivity: internal
status: active
reviewed_at: 2026-07-01
review_by: 2026-10-01
tags: [example]
source_refs: [ticket-0000]
---
```

Required fields, allowed `sensitivity`/`status` values, and the audience vocabulary (real Open WebUI group tags plus pillar/company-wide shorthands) are defined in [`tools/wiki-schema.json`](tools/wiki-schema.json) — treat it as the single source of truth over any description here.

`org-general` (GM, read-only) and Admins (read-write) are never listed in a document's `audiences`; they are granted automatically on every synced collection regardless of sensitivity.

## Validation

```bash
tools/validate-wiki                  # check content/, exit 1 on any error
tools/validate-wiki --write-manifest  # also write generated/wiki-manifest.json
```

The validator checks: required fields present, `sensitivity`/`status` in the allowed set, `audiences` tags resolve (including shorthand expansion), `reviewed_at`/`review_by` are valid ISO dates with `review_by >= reviewed_at`, document `id`s are unique across `content/`, and `[[wikilink]]` references resolve to a known `id`.

It does not do semantic maintenance (contradiction detection, staleness judgment, consolidation) — that's [`wiki-knowledge-maintainer`](../../../../.agents/skills/wiki-knowledge-maintainer/SKILL.md)'s job, run against validated content.

## Related

- [`ai/architecture/llm-knowledge-base-plan.md`](../../../architecture/llm-knowledge-base-plan.md) — overall migration plan this directory implements Phase 1 of.
- [`ai/openwebui/knowledge/README.md`](../README.md) — parent directory conventions.
- [`wiki-knowledge-maintainer`](../../../../.agents/skills/wiki-knowledge-maintainer/SKILL.md) — content maintenance workflow once documents exist.
