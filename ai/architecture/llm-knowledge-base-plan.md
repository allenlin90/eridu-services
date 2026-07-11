# LLM Knowledge Base Architecture Plan

## Goal

Build a Git-governed company knowledge base that Open WebUI assistants can use as a reliable onboarding and SOP guide. Retrieval must remain useful as the content grows, preserve department and confidentiality boundaries, cite reviewed sources, and expose missing knowledge instead of inventing answers.

## Current Baseline

This is a migration and governance project, not a greenfield wiki.

The deployed Open WebUI instance already has an `Eridu Brain`, department assistants, company content stored as Open WebUI skills, and an `Eridu CMD` knowledge collection. The read-only export under `ai/openwebui/synced/` is the current evidence of that live state.

Before expanding the system:

- separate assistant behavior from company facts and SOPs;
- classify the existing content by audience and sensitivity;
- replace broad knowledge grants with explicit group grants;
- remove project-history narration and stale drafts from runtime prompts;
- preserve stable document IDs while moving reviewed content into Git-authored knowledge files.

## Core Decision

Use Git-backed Markdown as the durable source of truth and Open WebUI knowledge collections as the first retrieval layer. Do not send the whole wiki or a complete manifest with every request.

This is intentionally not a zero-RAG design. Open WebUI's built-in retrieval is the most practical MVP for the deployed stack. A private documentation-only MCP service is a later option when deterministic file selection, stronger citations, or retrieval observability justify the extra service.

Prompt caching, large context windows, and generated role packs are optimizations. They do not replace retrieval or access control.

## Component Ownership

| Component | Responsibility |
| --- | --- |
| Git knowledge source | Reviewed Markdown, ownership and sensitivity metadata, source references, and change history. |
| Knowledge build and sync job | Validation, collection artifact generation, Open WebUI upload/update, processing checks, and reconciliation. |
| Open WebUI | Staff-facing assistants, retrieval, knowledge collections, groups, grants, and chat UX. |
| Open WebUI skills | Small assistant behavior adapters: citation, escalation, tone, and tool-use rules. |
| `wiki-knowledge-maintainer` skill | Ingestion impact analysis, semantic linting, consolidation, review deadlines, and routing hierarchy maintenance. |
| LiteLLM | Stable model aliases, provider routing, usage tracking, budgets, and rate limits. It does not select wiki content. |
| Better Auth / `eridu_auth` | Canonical user identity and SSO for Open WebUI. |
| Optional `wiki_mcp` | Private, read-only, deterministic document search and fetch. |
| Existing `erify_api` MCP | Operational business-data reads. It remains separate from document retrieval. |

## Repository Placement

Keep the wiki in this monorepo, but outside `ai/openwebui/skills/`.

| Path | Purpose |
| --- | --- |
| `ai/openwebui/skills/` | Repo-authored adapters or exports for Open WebUI assistant behavior. Canonical engineering skills remain under `.agents/skills/`. |
| `ai/openwebui/synced/skills/` | Read-only point-in-time export of live Open WebUI skill content. |
| `ai/openwebui/knowledge/company-wiki/` | Git-authored company facts, policies, and SOPs used to build knowledge collections. |

The human entrypoint is `README.md`. Machine routing and collection membership come from generated metadata, not a manually maintained `index.md`.

```text
ai/openwebui/knowledge/company-wiki/
├── README.md
├── AGENTS.md
├── CHANGELOG.md
├── content/
│   ├── shared/
│   ├── onboarding/
│   ├── operations/
│   ├── engineering/
│   ├── finance/
│   └── hr/
├── intake/
│   └── README.md
├── generated/
│   ├── wiki-manifest.json
│   ├── catalogs/
│   └── collections/
└── tools/
    └── validate-wiki
```

- `README.md` explains ownership, human navigation, and the change workflow.
- `AGENTS.md` defines builder and answering-agent rules for this knowledge tree.
- `content/` contains reviewed source documents only.
- `intake/` defines the staging workflow. Raw Slack exports, credentials, personal data, and unreviewed bulk dumps are not committed by default.
- `generated/` contains disposable manifests, routing catalogs, and collection artifacts; people do not edit them.

## Content Contract

Each reviewed content file has a stable ID and explicit governance metadata:

```yaml
---
id: onboarding.first-day-environment-setup
title: First Day Environment Setup
audiences: [staff, engineering]
owner: engineering
sensitivity: internal
status: active
tags: [onboarding, setup, tools]
source_refs: [ticket-1234]
reviewed_at: 2026-07-09
review_by: 2026-10-09
---
```

Allowed values for `sensitivity`, `status`, and `audiences` must be centrally defined and validated. Collection membership and access grants are derived from these values. A document cannot be published when its metadata has no valid collection and group mapping.

Wikilinks are optional authoring conveniences. The validator resolves them to stable document IDs and reports missing or ambiguous targets.

## Maintenance Architecture

Use `.agents/skills/wiki-knowledge-maintainer/SKILL.md` as the canonical maintenance workflow. Trigger it whenever reviewed knowledge changes and through a scheduled health check. Do not attach this skill to employee-facing assistants; maintenance instructions do not belong in normal question-answering context.

The maintenance workflow follows the LLM-wiki separation of responsibilities:

- immutable reviewed sources preserve provenance;
- the compiled wiki is revised as sources accumulate;
- the maintenance skill defines ingest, query-support, lint, and reorganization behavior;
- deterministic tooling validates metadata, links, dates, collection mappings, and generated artifacts;
- human owners approve policy meaning, conflict resolution, sensitivity changes, and archival decisions.

Routine linting checks review deadlines, unclear statements, contradictions, stale or superseded claims, missing concepts, broken or orphan links, duplication, routing drift, and retrieval evaluation failures. It proposes semantic changes and may directly repair only unambiguous metadata and routing defects.

### Hierarchical Routing

Keep the model-visible routing surface smaller than the corpus:

```text
root catalog
  -> relevant domain catalog
    -> canonical summary or SOP
      -> detailed pages and source references
```

The generated root catalog describes domains and access boundaries only. Generated domain catalogs contain one-line retrieval summaries, aliases, and stable IDs for their own pages. `README.md` remains the human entrypoint. Full metadata remains in the generated manifest for validation, sync, and tool use; it is not loaded into every assistant prompt.

Use catalogs and deterministic lexical search first. Split catalogs by domain when selection requires scanning most entries. Add hybrid or vector search, or `wiki_mcp`, only when retrieval evaluations show that hierarchical routing is no longer sufficient.

## Skills Versus Knowledge

Open WebUI skills should contain reusable behavior, not the company corpus.

Keep these in skills:

- use only attached knowledge for company-policy answers;
- cite retrieved sources;
- escalate when evidence is missing or conflicting;
- follow assistant-specific tone and tool rules.

Move these into knowledge files:

- company facts and organizational contacts;
- onboarding instructions;
- policies and financial guardrails;
- operational and department SOPs;
- legal and HR reference material.

This migration reduces duplicated prompts and allows Open WebUI to retrieve only relevant documents. The existing live skill IDs remain unchanged until their replacement knowledge collections and assistants pass the pilot evaluations.

## Retrieval Architecture

The MVP delegates chunk retrieval to Open WebUI:

```text
Employee
  -> access-controlled Open WebUI assistant
  -> attached, access-controlled knowledge collections
  -> Open WebUI retrieves relevant chunks
  -> LiteLLM model alias generates the answer
  -> answer cites retrieved filenames or returns an information-gap response
```

The generated manifest is for validation, sync reconciliation, and a possible future `wiki_mcp`. It is not automatically included in every model prompt.

Create collections around access boundaries first, then retrieval domains. Do not put restricted and general documents in one collection and rely on the system prompt to hide them.

| Collection | Example access | Contents |
| --- | --- | --- |
| `wiki-shared` | Org - General | Company overview, non-sensitive contacts, common tools, escalation paths. |
| `wiki-onboarding` | Org - General | Reviewed first-day and access-request procedures. |
| `wiki-commerce` | Commerce groups | Commerce SOPs and sales workflows. |
| `wiki-erify` | Erify groups | Production, scheduling, and performance SOPs. |
| `wiki-erisa` | Erisa groups | Creator and affiliate workflows. |
| `wiki-finance-ops` | Finance-approved groups | Finance operations without confidential management figures. |
| `wiki-finance-confidential` | Explicit finance leadership groups | Cash, rates, and other restricted figures. |
| `wiki-hr` | HR-approved groups | HR procedures and appropriately classified employee material. |

Each assistant attaches only the collections, skills, and MCP tools needed by its audience. Use existing LiteLLM aliases such as `company-balanced`. Disable web search for assistants whose contract requires answers exclusively from internal knowledge.

## Citation And Escalation Contract

Procedural answers cite the retrieved source at paragraph or step level. For the MVP, the citation target is the stable uploaded filename/document ID exposed by Open WebUI retrieval.

Pilot evaluation must confirm that Open WebUI `0.9.6` reliably exposes usable source citations. If it cannot, do not fake `[[filename]]` citations in the prompt; use `wiki_mcp` or another retrieval adapter that returns explicit document IDs.

When sources are absent, insufficient, stale, or conflicting, return:

```text
AI Information Gap - Escalation Required
- Employee question: <summary>
- Sources checked: <retrieved document names or collections>
- Reason: <missing, stale, or conflicting information>
- Next action: Contact <document owner or team lead> and request a wiki update.
```

The assistant may summarize the gap but must not fill it with external knowledge. Legal, HR, finance, and safety-sensitive answers may require human confirmation even when a source exists.

## Builder Workflow

The builder creates reviewable drafts; it never publishes directly.

```text
Selected source material
  -> builder draft with source references and unresolved questions
  -> owner review and sensitivity classification
  -> Git pull request
  -> validation
  -> merge
  -> Open WebUI sync and post-sync checks
```

The draft includes a proposed path, frontmatter, source references, unresolved questions, owner, reviewer, and related document IDs. Source material must be selected and sanitized before submission; bulk ingestion from Slack or the parent-company Confluence is outside the pilot.

## Sync Contract

The Git-to-Open-WebUI sync must be repeatable and fail closed:

1. Validate metadata, links, ownership, review dates, and collection/group mappings.
2. Build one artifact set per knowledge collection and record content checksums.
3. Produce a dry-run reconciliation showing creates, updates, removals, and grant changes.
4. Upload changed files, poll Open WebUI processing status, and attach them to the intended collection.
5. Apply explicit group grants and reject public wildcard grants unless the collection is intentionally public.
6. Remove obsolete files only after replacements finish processing successfully.
7. Export the live state back to `ai/openwebui/synced/` and compare it with the intended state.
8. Run known-answer, missing-answer, citation, and unauthorized-access smoke tests.

Exact API payloads must be verified against deployed Open WebUI `0.9.6` before implementing mutations. The current endpoint catalog tracks newer upstream documentation and is not sufficient proof of compatibility.

## Optional Deterministic Retrieval

Add a private `wiki_mcp` only if the MVP shows a measured need for deterministic file-level retrieval, explicit source IDs, or better retrieval diagnostics.

| Tool | Purpose |
| --- | --- |
| `wiki_list_sections` | Return visible knowledge areas for the authenticated caller. |
| `wiki_search_manifest` | Search visible titles, tags, summaries, and owners. |
| `wiki_get_doc` | Return one visible reviewed document by stable ID. |
| `wiki_get_related` | Return visible related documents. |

The service remains read-only and private on Railway. It must enforce caller identity and document visibility itself; Open WebUI assistant attachment is not an authorization boundary. It stays separate from `erify_api` MCP because document access and operational-data access have different policies and audit needs.

## Phased Delivery

### Phase 0: Inventory And Access Remediation

- Map each existing live brain skill and knowledge file to behavior, shared knowledge, department knowledge, restricted knowledge, draft, or obsolete content.
- Verify the `Eridu CMD` collection contents and replace wildcard grants with approved groups before adding sensitive content.
- Define the audience and sensitivity vocabulary and its exact Open WebUI group mapping.
- Verify Open WebUI `0.9.6` upload, processing, collection, grant, deletion, and citation behavior through a disposable test collection.

### Phase 1: Content Contract And Pilot Corpus

- Create the wiki structure, frontmatter schema, validator, and generated manifest.
- Add the `wiki-knowledge-maintainer` change-triggered and routine lint workflows.
- Migrate a small shared/onboarding corpus from existing live content.
- Keep raw intake outside the published content path.
- Add a fixed evaluation set with authoritative expected source IDs.

### Phase 2: Open WebUI Pilot

- Create scoped collections and one Company Wiki pilot assistant using `company-balanced`.
- Attach only shared and onboarding knowledge.
- Disable external web search and unnecessary MCP tools.
- Test known answers, missing answers, stale/conflicting sources, citations, and cross-group denial.

### Phase 3: Controlled Department Migration

- Migrate one department at a time from large Open WebUI skills to knowledge collections.
- Keep behavior-only skill adapters small.
- Compare pilot answers with the current assistants before retiring old skill content.
- Expand group grants only after each department's access tests pass.

### Phase 4: Automated Sync And Governance

- Implement dry-run and apply modes for Git-to-Open-WebUI reconciliation.
- Add post-sync export, drift detection, processing checks, and evaluation gates.
- Define owner review reminders and expired-document handling.
- Schedule wiki health checks and track unresolved contradictions, clarity gaps, orphan pages, duplication, and routing drift to document owners.

### Phase 5: Retrieval And Cost Optimization

- Measure retrieval quality, prompt size, latency, and cost by assistant.
- Add `wiki_mcp` only if Open WebUI retrieval or citations miss agreed thresholds.
- Test generated role packs and provider prompt caching against real traffic.
- Tune LiteLLM aliases, budgets, and rate limits without moving content routing into LiteLLM.

## Pilot Acceptance Criteria

The pilot is ready when evidence shows all of these scenarios pass:

- A general employee receives a correct onboarding answer with the expected source citation.
- A question absent from the corpus produces the information-gap response and names the responsible owner.
- Conflicting or expired sources produce escalation instead of silent source selection.
- A user without Finance or HR access cannot discover, retrieve, cite, or infer restricted content through search, direct file reference, assistant use, or conversation follow-ups.
- A reviewed Git change is reflected in Open WebUI and an obsolete document is removed without an availability gap.
- A failed upload or processing job leaves the prior collection usable and reports the failure.
- LiteLLM records usage under the actual Open WebUI user identity.
- The intended assistants, collections, grants, and knowledge content can be reconciled from Git without undocumented UI-only decisions.

## Non-Goals

- No full parent-company Confluence ingestion.
- No unattended bulk Slack ingestion.
- No public wiki MCP endpoint.
- No write-capable operational MCP tools for the wiki pilot.
- No manually maintained `index.md` as a machine source of truth.
- No full-wiki prompt as the default retrieval method.
- No prompt-caching savings or latency claims before measurement.
