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

This is intentionally not a zero-RAG design. Open WebUI's built-in retrieval is the most practical MVP for the deployed stack. Deterministic file selection, stronger citations, or retrieval observability are built as Open WebUI Functions running inside the existing deployment, not a new standalone service — see Optional Deterministic Retrieval. A separate service is added only if something outside Open WebUI genuinely needs to call this logic directly, and even then it wraps the same Function rather than duplicating its logic.

Prompt caching, large context windows, and generated role packs are optimizations. They do not replace retrieval or access control.

## Component Ownership

| Component | Responsibility |
| --- | --- |
| Git knowledge source | Reviewed Markdown, ownership and sensitivity metadata, source references, and change history. |
| Knowledge sync Pipe | Runs inside Open WebUI. Validation, diff/upload/cleanup, and reconciliation, triggered by a minimal external event — not a standalone service. |
| Open WebUI | Staff-facing assistants, retrieval, knowledge collections, groups, grants, and chat UX. |
| Open WebUI skills | Small assistant behavior adapters: citation, escalation, tone, and tool-use rules. Stay few and small by design — company content does not belong here (see Skills Versus Knowledge). |
| `wiki-knowledge-maintainer` skill | Ingestion impact analysis, semantic linting, consolidation, review deadlines, and routing hierarchy maintenance. Runs at PR-authoring time, not as separate CI. |
| LiteLLM | Stable model aliases, provider routing, usage tracking, budgets, and rate limits. It does not select wiki content. Its MCP semantic tool filter is the reference answer if MCP tool count grows large later (see Optional Deterministic Retrieval). |
| Better Auth / `eridu_auth` | Canonical user identity and SSO for Open WebUI. |
| Optional deterministic retrieval | An Open WebUI Filter Function first; a standalone `wiki_mcp` only if sharing outside Open WebUI is later required. |
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

`apps/eridu_docs` (Astro Starlight developer documentation) is currently suspended in favor of AI-integration priorities and is out of scope for this plan; the wiki here does not depend on it or block on its status. If `eridu_docs` resumes, its content-collection and build tooling may be worth evaluating as a future consolidation target — this plan keeps the wiki independent for now rather than coupling to paused work.

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

The change-triggered pass runs at PR-authoring time: the agent drafting a content change runs the skill's deterministic validation and semantic lint before opening the PR, so the PR itself already carries validation results for the human reviewer. This matches the repository's existing convention (`.agents/workflows/pr-review.md`, gated by `/pr-ready`) of agent-run checks ahead of human review rather than a separate CI service; the repo does not currently use GitHub Actions for policy enforcement. Add a GitHub Actions backstop only if agent-run checks prove to be bypassed in practice, not by default.

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

Use catalogs and deterministic lexical search over the generated routing surface first — this governs navigation of the catalogs themselves, not how Open WebUI retrieves knowledge-collection content. Open WebUI's own chunk retrieval is vector-similarity by default; hybrid (BM25 + vector) is an opt-in mode, and there is no standalone lexical-only content-retrieval mode. Split catalogs by domain when selection requires scanning most entries. Move to deterministic file-level retrieval (see Optional Deterministic Retrieval) only when retrieval evaluations show that native Open WebUI retrieval and hierarchical routing are no longer sufficient.

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

### Routing And Indexing At Scale

This migration is also the primary answer to metadata growing unbounded, not an afterthought to it:

- **Knowledge scales by construction.** Under Open WebUI's Native (Agentic) function calling, attached knowledge is not enumerated into the prompt; the model calls `list_knowledge` / `query_knowledge_files` on demand. Adding more knowledge collections does not linearly grow what's injected per request. Confirm Native function calling is active as part of Phase 0's disposable-collection verification.
- **Skills must stay small and few by design.** Once company content lives in Knowledge, the remaining Open WebUI skills are only citation/escalation/tone/tool-use rules — a short, bounded list per assistant. If the skill count or size starts growing again, that is a signal content is being misclassified as a skill, not evidence the routing layer needs to get smarter. Skills already injected full content on every request before Open WebUI `0.10.0`'s on-demand skill loading (`view_skill`) shipped; `Eridu Brain` carrying 17 skills, some tens of KB, was a live cost problem this migration fixes independently of everything else in this plan, and on-demand loading (available now that the instance is pinned to `0.10.2`) is a useful backstop, not the primary control. Confirm it's actually active as part of Phase 0's Native function-calling check.
- **MCP tools are the one surface without a native Open WebUI fix**, and are out of scope for this plan's initial tool count (four `erify_api` tools). If wiki-related or other MCP tools later push the count into the dozens, LiteLLM's `mcp_semantic_tool_filter` is the reference architecture — it semantically ranks and forwards only the top-K relevant tools per request — but using it requires routing MCP tool connections through LiteLLM's MCP gateway instead of Open WebUI's current direct tool-server connections. That re-routing is a Phase 5+ concern, not required now.

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

The generated manifest is for validation, sync reconciliation, and optional deterministic retrieval. It is not automatically included in every model prompt.

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

Pilot evaluation must confirm that the deployed Open WebUI version reliably exposes usable source citations. If it cannot, do not fake `[[filename]]` citations in the prompt; use the Optional Deterministic Retrieval Filter Function, which returns explicit document IDs via its own citation events.

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

The sync logic runs as an Open WebUI Pipe (a custom model callable via `POST /api/chat/completions`), not a separate service. A minimal external event — a CI step, or any authenticated caller — sends a short trigger message to the Pipe; the Pipe itself performs the sync in-process, using credentials Open WebUI already holds. This keeps the trust boundary inside Open WebUI instead of handing an external runner an admin-equivalent API key. The instance is pinned to `0.10.2`, so Event Functions are also available — consider migrating the trigger to one, since it registers its own endpoint instead of masquerading as a chat completion.

The sync must be repeatable and fail closed:

1. Validate metadata, links, ownership, review dates, and collection/group mappings.
2. Build one artifact set per knowledge collection and record content checksums.
3. Produce a dry-run reconciliation showing creates, updates, removals, and grant changes.
4. Upload changed files, poll Open WebUI processing status, and attach them to the intended collection.
5. Apply explicit group grants and reject public wildcard grants unless the collection is intentionally public.
6. Remove obsolete files only after replacements finish processing successfully.
7. Export the live state back to `ai/openwebui/synced/` and compare it with the intended state.
8. Run known-answer, missing-answer, citation, and unauthorized-access smoke tests.

Use `open-webui/oikb`'s algorithm (checksum diffing, dry-run reconciliation, incremental upload, cleanup) as the reference for steps 2, 3, 4, and 6 when writing the Pipe's sync logic, rather than designing it from scratch — but the code runs inside the Pipe, not as an external CLI invocation. `oikb` does not create knowledge collections or manage group grants, so steps 1, 5, 7, and 8 remain this project's own responsibility either way.

Exact API payloads must be verified against the actually-deployed Open WebUI version (`0.10.2`, pinned per Phase 0) before implementing mutations. The current endpoint catalog tracks newer upstream documentation and is not sufficient proof of compatibility.

## Optional Deterministic Retrieval

Add deterministic file-level retrieval only if the MVP shows a measured need for it, explicit source IDs, or better retrieval diagnostics than native Open WebUI retrieval provides. Build it as an Open WebUI Filter Function, and do not stand up a separate service for it, including to share it:

1. **Implement as an Open WebUI Filter Function.** A Filter (`file_handler = True`) can read attached collection references, run a deterministic manifest/lexical lookup over the generated wiki tree instead of native chunk retrieval, and emit `citation` events with explicit document IDs — with no new Railway service and no new auth surface, since `__user__` is already available in-process for group-based filtering.
   Accept these tradeoffs knowingly rather than by default: Functions run arbitrary Python in-process with no sandboxing (Open WebUI has shipped an RCE via exactly this trust model — treat Function-authoring access as admin-equivalent and audit it); their source lives in the Open WebUI database rather than Git, so keep the retrieval logic itself thin and re-derivable from the same generated manifest the sync job already produces.
2. **If another MCP client (Claude Code, `erify_api` MCP consumers) later needs to call this directly, wrap the same Filter/Function's OpenAPI-compatible endpoint with a thin adapter** — the inverse of the existing `mcpo` project's MCP-to-OpenAPI direction — rather than rebuilding a standalone `wiki_mcp` service with duplicated retrieval logic. Reach for process isolation or a fully independent service only if the adapter itself proves insufficient (e.g. a caller that cannot be Open WebUI-authenticated at all).

If a document-search tool surface is exposed this way (via Filter or its adapter), the tools are:

| Tool | Purpose |
| --- | --- |
| `wiki_list_sections` | Return visible knowledge areas for the authenticated caller. |
| `wiki_search_manifest` | Search visible titles, tags, summaries, and owners. |
| `wiki_get_doc` | Return one visible reviewed document by stable ID. |
| `wiki_get_related` | Return visible related documents. |

Whatever the surface, it must enforce caller identity and document visibility itself — reuse `@eridu/auth-sdk/server/ssr` (the existing framework-agnostic JWKS verification pattern against `eridu_auth`) for identity if a standalone adapter is ever built rather than building auth from scratch; Open WebUI assistant attachment is not an authorization boundary. Any such surface stays conceptually separate from `erify_api` MCP because document access and operational-data access have different policies and audit needs, even if both end up served through similarly thin adapters.

## Phased Delivery

### Phase 0: Inventory And Access Remediation

- Map each existing live brain skill and knowledge file to behavior, shared knowledge, department knowledge, restricted knowledge, draft, or obsolete content — see [`skill-classification-inventory.md`](skill-classification-inventory.md) for a first pass. This is a content-owner review task, not a pipeline dependency; the sync/retrieval pipeline itself is content-agnostic and doesn't need this done first.
- Verify the `Eridu CMD` collection contents and replace wildcard grants with approved groups before adding sensitive content.
- Remediate the `eridu_mcp` tool-server connection's instance-wide grant (empty function filter, access granted to all groups) alongside the `Eridu CMD` wildcard; scope both to approved groups before expanding sensitive content.
- Define the audience and sensitivity vocabulary and its exact Open WebUI group mapping.
- Open WebUI is pinned to `0.10.2` on Railway with auto-updates disabled (it was previously unpinned and had silently drifted past the `0.9.6` this plan originally assumed — a real risk on its own, independent of this project). Future version changes go through [`ai-platform-release-management`](../../.agents/skills/ai-platform-release-management/SKILL.md)'s check-and-maintainer-confirm routine, not another silent drift or a manual one-off.
- LiteLLM is pinned to `1.91.0` on Railway with auto-updates disabled (it was previously tracking the moving `main-stable` tag). Applied via the same check-and-stage-and-confirm routine as the Open WebUI pin.
- Verify Native (Agentic) function calling is active by default on `0.10.2`, since knowledge and skill on-demand loading both depend on it.
- Verify Open WebUI upload, processing, collection, grant, deletion, and citation behavior through a disposable test collection, and test the Pipe-based sync trigger, against `0.10.2`.

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
- Build deterministic retrieval as an Open WebUI Filter Function if Open WebUI retrieval or citations miss agreed thresholds; only wrap it for external MCP clients if a real caller needs that, and only add process isolation if the adapter itself proves insufficient (see Optional Deterministic Retrieval).
- If MCP tool count has grown enough to matter, evaluate routing tool connections through LiteLLM's MCP gateway with `mcp_semantic_tool_filter` rather than building custom tool-filtering logic.
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
