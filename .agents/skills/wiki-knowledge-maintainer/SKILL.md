---
name: wiki-knowledge-maintainer
description: Maintain ai/openwebui/knowledge through ingest, review, conflict resolution, link repair, routing, and deduplication.
---

# Wiki Knowledge Maintainer

Maintain the company wiki as a small, trustworthy compiled knowledge surface over reviewed source material.

This is a repository-maintenance skill. Do not attach it to employee-facing Open WebUI assistants. Their prompts should contain only answering, citation, escalation, and role-specific behavior.

## Sources To Read

Before changing the wiki, read:

- `ai/architecture/llm-knowledge-base-plan.md`
- `ai/openwebui/knowledge/README.md`
- the target wiki's `README.md` and `AGENTS.md`, when present
- the affected content files and their declared `source_refs`

Use [doc-hygiene](../doc-hygiene/SKILL.md) when rewriting maintained pages. Use [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) when collection boundaries, Open WebUI grants, sync behavior, or runtime retrieval changes.

## Ownership Boundary

Use deterministic validation for facts a script can prove:

- required frontmatter and allowed values;
- stable and unique document IDs;
- valid links and source references;
- duplicate titles or aliases;
- review deadlines;
- collection and audience mappings;
- orphan pages and routing entries;
- generated manifest consistency.

Use model judgment for semantic maintenance:

- unclear, vague, or internally inconsistent statements;
- claims contradicted or superseded by newer reviewed sources;
- duplicated concepts that should be consolidated;
- pages that mix unrelated audiences or responsibilities;
- missing abstractions, summaries, or cross-links;
- hierarchy changes needed to keep routing surfaces compact.

Never use model confidence as evidence that a company fact is correct.

## Change-Triggered Workflow

Run this workflow whenever reviewed content is added, replaced, or materially changed:

1. Validate the changed files and their source references.
2. Search titles, aliases, tags, links, and key claims for overlap with existing pages.
3. Prefer updating an existing canonical page when the new information changes an existing concept, policy, entity, or procedure.
4. Create a new page only when it represents a separately linkable concept, entity, policy, or procedure.
5. Identify statements that are ambiguous, unsupported, conflicting, or scoped to an unclear audience.
6. Update affected summaries, cross-links, section catalogs, and generated routing metadata.
7. Record unresolved semantic issues for the document owner; do not guess or silently choose between conflicting sources.
8. Run the focused retrieval evaluation for the affected domain before publishing.

## Routine Health Check

Run a scheduled lint pass weekly for active pilot content and at least monthly after the corpus stabilizes. Increase the cadence for legal, HR, finance, access, and operational deadline content.

Check:

1. **Schema integrity**: missing, invalid, or inconsistent metadata.
2. **Review status**: approaching or exceeded `review_by` dates and missing owners.
3. **Contradictions**: pages or claims that disagree without an explicit scope or effective-date explanation.
4. **Clarity**: undefined acronyms, vague actors, missing prerequisites, unclear deadlines, and instructions without a success condition.
5. **Coverage**: frequently referenced concepts, teams, tools, or procedures without a canonical page.
6. **Graph health**: broken links, orphan pages, weakly connected clusters, and missing related-page links.
7. **Duplication**: near-identical pages, repeated policy text, and summaries that have become alternate sources of truth.
8. **Routing drift**: catalogs that are too large, descriptions that no longer identify the right documents, or domain boundaries that cause broad retrieval.
9. **Lifecycle hygiene**: drafts published as active, superseded pages still routed, and obsolete content without redirects or replacement IDs.
10. **Retrieval quality**: evaluation questions retrieving too many documents, missing the canonical document, or crossing audience boundaries.

Produce a concise maintenance report grouped into automatic repairs, proposed editorial changes, owner decisions, access risks, and routing changes. Do not create permanent audit narration inside maintained pages.

## Deadline Policy

- `review_by` is a required owner commitment for time-sensitive documents, not a freshness decoration.
- Never advance `reviewed_at` or `review_by` without actual owner review.
- Flag documents before expiry so owners have time to act.
- An overdue general document remains visible with a review warning unless local policy says otherwise.
- An overdue legal, HR, finance, safety, credential, or approval-limit document must escalate and should be excluded from confident procedural answers until reviewed.
- Never delete expired content automatically. Mark it for review, supersession, or archival with a replacement link.

## Routing And Abstraction

Keep routing hierarchical so no assistant needs every page's metadata in context:

```text
root catalog
  -> domain catalog
    -> canonical summary or procedure
      -> detailed supporting pages and source references
```

- The root catalog contains domain names, one-line scope descriptions, sensitivity boundaries, and links to domain catalogs.
- A domain catalog contains stable document IDs, one-line retrieval summaries, aliases, and links for that domain only.
- Canonical pages summarize the current reviewed understanding and link to details.
- Detailed pages carry procedural depth and source references.
- Generated manifests may contain complete metadata for validation and tools, but are not injected wholesale into prompts.

Split a catalog when it becomes difficult to select candidate pages without reading most entries. Consolidate pages when several pages repeat the same rule and differ only in examples or source history.

At moderate scale, use deterministic title, alias, tag, and full-text search over catalogs. Add hybrid or vector search only after retrieval evaluations show that structured catalogs and lexical search miss required queries.

## Safe Edit Rules

The maintainer may directly repair unambiguous metadata, links, routing summaries, and generated artifacts.

Require owner review before:

- changing policy meaning, amounts, deadlines, approvals, legal interpretations, or role authority;
- resolving contradictory sources;
- changing sensitivity or audience classification;
- merging pages when information could be lost;
- archiving a still-referenced page;
- changing an Open WebUI collection or group grant.

Preserve immutable source material. The compiled wiki may be revised, split, merged, or superseded, but every factual claim must remain traceable to a reviewed source reference.

## Completion Checklist

- [ ] Deterministic validation passes.
- [ ] New content updates existing concepts instead of creating avoidable duplicates.
- [ ] Ambiguous and conflicting statements have an owner decision or explicit escalation.
- [ ] Review deadlines and sensitive expired content are handled.
- [ ] Root and domain routing surfaces remain compact.
- [ ] Cross-links, summaries, and manifests reflect the change.
- [ ] Access classification is unchanged or separately approved.
- [ ] Affected retrieval and citation evaluations pass.
