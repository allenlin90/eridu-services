---
id: shared.company-wiki-overview
title: What Is The Company Wiki
audiences: [company-wide]
owner: engineering
sensitivity: internal
status: active
tags: [wiki, meta]
source_refs: [ai/architecture/llm-knowledge-base-plan.md]
reviewed_at: 2026-07-13
review_by: 2026-10-13
---

# What Is The Company Wiki

The Company Wiki is the set of reviewed, Git-authored documents you can ask the Company Wiki assistant about in Open WebUI. It is not a separate app — it is Markdown files in this repository, synced into an Open WebUI knowledge collection.

## Where it lives

Source files live under `ai/openwebui/knowledge/company-wiki/content/` in the `eridu-services` repository, organized by domain (`shared/`, `onboarding/`, and department folders as they're added). Each document has a stable `id` and governance metadata — `owner`, `sensitivity`, `status`, `audiences`, and review dates — checked by an automated validator before anything syncs.

## How a document gets here

1. A change is drafted against the schema in `tools/wiki-schema.json` and checked with `tools/validate-wiki`.
2. It goes through normal PR review like any other repository change.
3. Once merged, the Sync Pipe (an Open WebUI Function) picks it up and creates or updates the matching file in the target knowledge collection.
4. Access follows the document's `audiences` field: your Open WebUI group membership determines which synced documents you can retrieve.

## What it is not

- Not a place for raw exports, credentials, or unreviewed drafts — those stay in `intake/` and are never synced.
- Not a substitute for the source of truth on legal, HR, finance, or approval-limit questions if a document is marked `restricted` and you don't have access, or if its review date has lapsed — ask the document owner directly.

## How to propose a change

Open a PR against `ai/openwebui/knowledge/company-wiki/content/` following the frontmatter contract, or ask the document owner listed in an existing page's `owner` field to make the change.
