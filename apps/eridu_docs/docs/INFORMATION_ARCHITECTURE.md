# eridu_docs Information Architecture

> **Status**: Active guidance
> **Scope**: `apps/eridu_docs`

## Goal

Keep `eridu_docs` organized by **function and workflow first**, not by document genre.

The site should help an operator answer:

1. What job am I trying to do?
2. Where is the workflow for that job?
3. What guide, SOP, FAQ, or reference page supports that workflow?

The site should not require the reader to decide first whether they need a guide, a procedure, or an FAQ.

## Current IA Problem

The previous top-level structure mixed incompatible axes:

- audience: `User Guides`
- document type: `SOPs & Procedures`, `FAQ`
- engineering/internal classification: `Features`, `Workflows & Standards`, `Upcoming Releases`

That split a single product area across multiple sidebar groups. For example, scheduling content ended up scattered across guide, SOP, FAQ, and reference buckets.

## Top-Level Navigation Policy

Top-tier topics in `eridu_docs` should be stable product functions or workflow areas.

Current preferred top tiers:

- `Getting Started`
- `Scheduling & Shows`
- `Assets & Uploads`
- `Reference`

Future top tiers should be added only when there is enough content for a durable area, for example:

- `Tasks & Reviews`
- `Studio Operations`
- `People & Access`

## Placement Rules

### 1. Primary axis: function / workflow area

Put pages into folders such as:

```text
src/content/docs/
  getting-started/
  scheduling/
  tasks/
  studio-operations/
  assets/
  reference/
```

### 2. Secondary axis: document mode inside that area

Keep related pages together in the same function folder:

- `overview.mdx`
- `how-to.mdx`
- `publish-sop.mdx`
- `faq.mdx`

Do not create top-level sidebar buckets for:

- `guides`
- `sop`
- `faq`

### 3. Reference stays separate

Implementation-facing or conceptual technical material belongs in `reference/` unless it is directly part of a workflow section.

### 4. Planning stays out of the primary operator nav

PRDs or upcoming-release planning pages should not sit beside operator workflows unless the site is intentionally being used as an internal planning portal.

## Sidebar Shape

Preferred Starlight sidebar:

```js
sidebar: [
  { label: 'Getting Started', autogenerate: { directory: 'getting-started' } },
  { label: 'Scheduling & Shows', autogenerate: { directory: 'scheduling' } },
  { label: 'Assets & Uploads', autogenerate: { directory: 'assets' } },
  { label: 'Reference', autogenerate: { directory: 'reference' } },
]
```

## Applied Mapping

This repo pass applies the following moves:

| Old Path | New Path | Reason |
| --- | --- | --- |
| `user-guides/operators/google-sheets-schedule-publishing.mdx` | `scheduling/google-sheets-publishing.mdx` | Scheduling workflow content should live together |
| `sop/daily-ops/update-and-publish-google-sheets-schedules.mdx` | `scheduling/publish-sop.mdx` | SOP stays inside the scheduling area |
| `faq/scheduling.mdx` | `scheduling/faq.mdx` | FAQ stays inside the scheduling area |
| `workflows/file-upload.mdx` | `assets/file-uploads.mdx` | Upload behavior is an asset workflow |
| `workflows/user-onboarding.mdx` | `getting-started/user-onboarding.mdx` | Onboarding is a starting point, not a generic workflow bucket |
| `features/shift-schedule.mdx` | `reference/shift-schedule.mdx` | Shift schedule page is reference/supporting context |

## Skill Impact

Local skills should enforce this IA:

- `user-facing-docs` should default to function-first folders in `eridu_docs`
- Starlight guidance should reject genre-first top-level buckets for this app
- docs-surface reorganization work should use the dedicated `eridu-docs-information-architecture` skill

