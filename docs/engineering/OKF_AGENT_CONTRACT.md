# OKF Agent Compatibility Contract

> **Status:** Pilot contract. This document is expected to evolve while the repository layout and knowledge migration are evaluated.
>
> **Target specification:** [Open Knowledge Format v0.2, pinned at `3fcbb9f8`](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/3fcbb9f828c2f23d109c855ee403c3a4c81f3a96/okf/SPEC.md).

## Purpose

Claude Code, Codex, OpenCode, and other coding agents do not need a proprietary OKF integration. They need a shared, tool-neutral contract for discovering, reading, evaluating, and preserving Open Knowledge Format (OKF) bundles.

The repository adapter chain is:

```text
AGENTS.md                       canonical shared instructions
├── .claude/CLAUDE.md           Claude Code adapter
├── Codex                       reads AGENTS.md and .agents/skills
└── opencode.json               loads AGENTS.md and .agents/rules
```

Cursor and Copilot may consume the same contract through thin adapters later. They must not become separate sources of knowledge behavior.

## Version Profile

This repository targets **OKF v0.2** for every new repository-produced OKF bundle.

Although the upstream v0.2 specification makes the declaration optional, this repository requires each new bundle root to contain an `index.md` with this frontmatter:

```yaml
---
okf_version: "0.2"
---
```

The bundle-root `index.md` is the only `index.md` that should carry version frontmatter. Consumers that encounter an unknown version should report it and attempt best-effort read-only consumption; writers must not silently rewrite a bundle to another version.

## Scope and Compatibility Profiles

### Strict OKF v0.2 profile

Apply strict v0.2 conformance to:

- the future `knowledge/` tree after a bundle is introduced;
- a separate private repository containing a bundle that declares `okf_version: "0.2"`;
- generated publication artifacts derived from a canonical v0.2 bundle.

Repository-produced v0.2 bundles must have a bundle-root `index.md` and must follow the consumer and writer contracts below.

### Legacy company-wiki compatibility profile

The current company wiki under `ai/openwebui/knowledge/company-wiki/content/` is **not yet an OKF v0.2 bundle**. It remains governed by:

- `ai/openwebui/knowledge/company-wiki/README.md`;
- `ai/openwebui/knowledge/company-wiki/AGENTS.md`;
- `ai/openwebui/knowledge/company-wiki/tools/wiki-schema.json`;
- `ai/openwebui/knowledge/company-wiki/tools/validate-wiki`;
- `.agents/skills/wiki-knowledge-maintainer/SKILL.md`.

For that legacy corpus:

- missing `type` is valid and must not be reported as an OKF conformance error;
- the legacy required fields remain authoritative;
- agents must run the existing validator after content changes;
- agents must not add isolated OKF fields merely to make one document appear conformant;
- strict v0.2 writing begins only after the schema, validator, content, maintainer guidance, and Open WebUI publication mapping migrate together.

Other transitional knowledge trees under `ai/openwebui/knowledge/` remain local-schema content unless a bundle-root `index.md` explicitly declares `okf_version: "0.2"`.

Do not apply OKF requirements to every Markdown file in `docs/`, application documentation, package READMEs, source code, or `.agents/skills/`.

## Legacy Read Mapping

Agents may interpret legacy metadata through the following compatibility mapping, but must preserve the original fields until the atomic migration lands:

| Legacy field/value | v0.2 read interpretation | Migration rule |
| --- | --- | --- |
| `id` | Repository publication identity | Preserve as an extension; the future portable OKF ID is the bundle-relative path |
| `status: draft` | `draft` | Do not publish |
| `status: active` | `stable` | Treat as current only after legacy review checks pass |
| `status: superseded` | `deprecated` | Preserve replacement references |
| `status: archived` | `deprecated` | Exclude from current routing/publication |
| `review_by` | Legacy freshness deadline comparable to `stale_after` | Surface expiry; do not silently rename |
| `reviewed_at` | Evidence that a review date was recorded | Never fabricate a `verified` actor from the date |
| `source_refs` | Legacy source references | Do not convert to structured `sources` without resolving concrete resources |
| `owner`, `audiences`, `sensitivity` | Repository extensions | Preserve during every round trip |

When legacy and v0.2 lifecycle fields coexist during a controlled migration, apply the stricter interpretation and report the mixed state.

## Consumer Contract

### 1. Discover progressively

For a strict repository-produced bundle, start at the bundle-root `index.md`, confirm `okf_version: "0.2"`, follow the most relevant child `index.md`, then open individual concepts. Do not load the entire bundle unless the task explicitly requires a corpus-wide audit.

For an external bundle with no root `index.md`, search frontmatter and filenames through QMD or `rg`, then open the selected source documents. Report the missing repository profile marker without treating the upstream bundle as unreadable.

For the legacy company wiki, use its catalogs, filenames, frontmatter, and validator-defined IDs rather than requiring an OKF root index.

### 2. Treat the path as the portable concept ID

For strict OKF concepts, the portable concept ID is the bundle-relative path without `.md`.

A repository-specific `id` frontmatter field may remain as an extension for stable Open WebUI document identity. Preserve it, but do not assume another OKF consumer requires it.

### 3. Parse frontmatter according to the active profile

For strict v0.2 concept documents:

- require a non-empty `type`;
- tolerate unknown `type` values;
- tolerate and preserve unknown extension fields;
- preserve `owner`, `audiences`, `sensitivity`, and migration metadata when rewriting;
- do not reject a concept merely because optional trust, provenance, or lifecycle fields are absent.

For the legacy company wiki:

- do not require `type`;
- validate against `tools/wiki-schema.json` and `tools/validate-wiki`;
- preserve all legacy fields and allowed values;
- use the legacy read mapping only for interpretation, not ad hoc rewriting.

Reserved `index.md` and `log.md` files are navigation and history files, not normal concept documents.

### 4. Evaluate lifecycle and trust before relying on content

For strict v0.2 concepts, inspect these fields when present:

- `status`;
- `stale_after`;
- `sources`;
- `generated`;
- `verified`.

Behavior:

- Prefer `stable` content over `draft` content.
- Do not present `deprecated` content as current guidance.
- Surface when `stale_after` has passed.
- Distinguish machine-generated content from human-reviewed content.
- Do not invent a verifier from `reviewed_at`, Git history, or an owner name.
- Open the cited source when a high-impact claim depends on it and the source is locally available.

For legacy content, apply the compatibility mapping above and continue enforcing `reviewed_at`, `review_by`, and the local status vocabulary.

### 5. Use retrieval as selection, not authority

Use the least expensive reliable route:

1. Exact ID, key, filename, or phrase: `rg` or QMD lexical search.
2. Conceptual policy, SOP, or domain question: QMD hybrid query.
3. Code relationships and impact paths: Graphify.
4. Current business state: operational MCP or the owning application API.

After retrieval, inspect the canonical source file before changing code, changing knowledge, or making an important claim.

### 6. Follow standard Markdown relationships

Prefer standard Markdown links between strict OKF concepts. During migration, consumers may resolve existing `[[wikilink]]` syntax, but legacy writers should continue following the active local validator until the migration changes link rules atomically.

Treat links as relationships, not transclusion instructions. Load linked concepts only when they are relevant to the task.

### 7. Preserve access boundaries

`audiences` and `sensitivity` are policy metadata, not enforcement.

- Do not assume a locally readable file is authorized for publication.
- Do not copy restricted material into this public repository.
- Open WebUI collection grants remain responsible for Open WebUI access.
- A future MCP or HTTP consumer must enforce identity and visibility itself.

### 8. Report information gaps

When the relevant concepts are missing, stale, contradictory, draft-only, or insufficient:

- identify the sources checked;
- describe the gap;
- name the documented owner when available;
- avoid filling company-specific gaps with generic model knowledge;
- propose a knowledge update rather than silently creating a fact.

## Writer Contract

### Strict v0.2 bundles

When creating or materially rewriting a strict OKF concept:

1. Confirm the bundle-root `index.md` declares `okf_version: "0.2"`.
2. Keep one durable concept per file.
3. Add a descriptive `type` and title.
4. Add a one-sentence `description` that supports catalog and search previews.
5. Record source materials in structured `sources` entries.
6. Record `generated` only when the producer identity and timestamp are known.
7. Record `verified` only after a real human or deterministic process checks the content.
8. Add lifecycle fields appropriate to the content.
9. Preserve repository extensions required for ownership and publication.
10. Use normal Markdown headings, lists, tables, and links.
11. Update the nearest `index.md` when the concept changes bundle navigation.

### Legacy company wiki

When editing the legacy company wiki:

1. Follow its local README, AGENTS, schema, and validator.
2. Preserve legacy `id`, lifecycle, audience, ownership, sensitivity, and source-reference fields.
3. Do not add `type`, `okf_version`, `sources`, `generated`, `verified`, or `stale_after` piecemeal unless the task is the reviewed atomic migration.
4. Run `tools/validate-wiki` after every content change.
5. Keep Open WebUI sync and grant behavior unchanged unless separately reviewed.

## Atomic Migration Gate

The company wiki becomes strict OKF v0.2 only in a change that reconciles all of the following together:

1. add a bundle-root `index.md` with `okf_version: "0.2"`;
2. update `tools/wiki-schema.json` and `tools/validate-wiki`;
3. migrate every concept to a non-empty `type` and the agreed lifecycle/provenance mapping;
4. update local README and AGENTS guidance;
5. update `wiki-knowledge-maintainer` behavior;
6. update Open WebUI sync, stable-ID, and collection mapping where required;
7. run legacy-to-v0.2 validation and retrieval compatibility tests for Claude Code, Codex, and OpenCode.

Until all seven parts land, the corpus remains in the legacy compatibility profile.

## Read, Write, and Serve Compatibility

Compatibility is intentionally staged:

| Level | Meaning | Current target |
| --- | --- | --- |
| Read-compatible | Agent can read strict v0.2 bundles and the legacy wiki without dropping extension metadata | Required for Claude, Codex, and OpenCode |
| Write-compatible | Agent can create and update strict concepts that pass the repository validator | Pilot after validator extension |
| Publish-compatible | Open WebUI sync can derive collection files, stable IDs, and grants from strict bundles | Existing path to be adapted |
| Serve-compatible | A shared query surface returns OKF identity, trust, lifecycle, version, and citations | Future gate; not required for local CLI use |

## Compatibility Evaluation

Use the same fixed questions with Claude Code, Codex, and OpenCode:

- Find the canonical concept from a root `index.md` without scanning the whole strict bundle.
- Report the declared `okf_version`.
- Refuse to treat a deprecated concept as active.
- Surface an expired `stale_after` value.
- Preserve an unknown extension field during a rewrite.
- Resolve a standard Markdown relationship.
- Distinguish a source document from a generated Open WebUI artifact.
- Read a legacy company-wiki document without requiring `type`.
- Map legacy lifecycle fields without silently rewriting them.
- Return an information-gap result when no authoritative concept exists.

Record client, client version, model, retrieval method, source selected, compatibility profile, lifecycle interpretation, and whether the final answer preserved citations.

## Iteration Policy

The repository structure and contract may require several passes. Each iteration should change one boundary at a time:

1. consumer behavior and setup;
2. validator compatibility;
3. pilot bundle structure;
4. Open WebUI publication mapping;
5. physical directory migration;
6. optional shared serving.

Do not perform a large path migration merely to make the tree look final. Promote a layout only after the three primary coding agents and the Open WebUI publication path can consume it without duplicated authority.
