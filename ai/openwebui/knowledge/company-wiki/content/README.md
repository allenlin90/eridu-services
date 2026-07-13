# Content

Reviewed company knowledge, source of truth for the synced wiki. Empty for now — real content migration is deferred until the technical pipeline (this directory) is in place and the classification pass ([`ai/architecture/skill-classification-inventory.md`](../../../../architecture/skill-classification-inventory.md)) is acted on.

No fixed subdirectory structure is imposed here; organize by domain as content is added (`commerce/`, `erify/`, `erisa/`, company-wide docs at the top level, etc.) and let `tools/validate-wiki` — which walks `content/` recursively — pick up whatever layout emerges.

## Document shape

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

# Example Document

Body content. Use `[[other-doc-id]]` to link to another document by its `id`.
```

Full field definitions: [`../tools/wiki-schema.json`](../tools/wiki-schema.json). Validation: `../tools/validate-wiki`.
