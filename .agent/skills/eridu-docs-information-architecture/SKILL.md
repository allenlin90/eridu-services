---
name: eridu-docs-information-architecture
description: Use when restructuring eridu_docs content, sidebar navigation, landing pages, or doc placement rules. Enforces a workflow and function-first information architecture for the Astro Starlight docs app instead of genre-first buckets like guides, SOPs, and FAQ.
---

# eridu_docs Information Architecture

Use this skill for `apps/eridu_docs` whenever the task involves:

- sidebar or landing-page structure
- top-level topic design
- moving docs between sections
- deciding where new content should live
- reviewing or refining local docs-generation guidance

## Core Rule

Organize `eridu_docs` by **function/workflow first**.

Bad first-level buckets:

- `guides`
- `sop`
- `faq`
- `features`
- `workflows`

Good first-level buckets:

- `getting-started`
- `scheduling`
- `tasks`
- `studio-operations`
- `assets`
- `reference`

Document type is secondary and should usually be expressed by page naming inside a function folder:

- `overview.mdx`
- `publish-sop.mdx`
- `faq.mdx`

## Placement Rules

1. Put user-facing workflow content in the relevant function folder.
2. Keep guide, SOP, and FAQ pages for the same workflow together.
3. Put technical or implementation-facing support material in `reference/`.
4. Keep PRDs or planning pages out of the main operator navigation unless the task explicitly asks for an internal planning surface.
5. Add a new top-level topic only when there is enough stable content to justify it.

## Sidebar Policy

Prefer a short sidebar with stable product areas. For current `eridu_docs`, default to:

```js
sidebar: [
  { label: 'Getting Started', autogenerate: { directory: 'getting-started' } },
  { label: 'Scheduling & Shows', autogenerate: { directory: 'scheduling' } },
  { label: 'Assets & Uploads', autogenerate: { directory: 'assets' } },
  { label: 'Reference', autogenerate: { directory: 'reference' } },
]
```

## Workflow

1. Inventory the current top-level folders and sidebar groups.
2. Identify whether they are organized by audience, document genre, lifecycle stage, or function.
3. Collapse genre-first groups into function-first areas.
4. Move related guide/SOP/FAQ pages into the same function folder.
5. Update landing-page links and cross-links after moves.
6. Update the relevant local skills when the IA rule changes.

## References

- [apps/eridu_docs/docs/INFORMATION_ARCHITECTURE.md](../../../apps/eridu_docs/docs/INFORMATION_ARCHITECTURE.md)
- [astro-starlight-best-practices](../astro-starlight-best-practices/SKILL.md)
- [user-facing-docs](../user-facing-docs/SKILL.md)
