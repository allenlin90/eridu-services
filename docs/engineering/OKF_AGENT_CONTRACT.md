# OKF Agent Compatibility Contract

> **Status:** Pilot contract. This document is expected to evolve while the repository layout and knowledge migration are evaluated.

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

## Scope

Apply this contract when an agent reads or changes:

- the future `knowledge/` tree;
- a separate private repository containing OKF bundles;
- the transitional company knowledge currently under `ai/openwebui/knowledge/`;
- generated publication artifacts derived from canonical knowledge.

Do not apply OKF requirements to every Markdown file in `docs/`, application documentation, package READMEs, source code, or `.agents/skills/`.

## Consumer Contract

### 1. Discover progressively

Start at the bundle root `index.md`, then follow the most relevant child `index.md`, then open individual concepts. Do not load the entire bundle unless the task explicitly requires a corpus-wide audit.

When no `index.md` exists, search frontmatter and filenames through QMD or `rg`, then open the selected source documents.

### 2. Treat the path as the portable concept ID

The portable OKF concept ID is its bundle-relative path without `.md`.

A repository-specific `id` frontmatter field may remain during migration for stable Open WebUI document identity. Preserve it, but do not assume another OKF consumer requires it.

### 3. Parse frontmatter tolerantly

For concept documents:

- require a non-empty `type`;
- tolerate unknown `type` values;
- tolerate and preserve unknown extension fields;
- preserve `owner`, `audiences`, `sensitivity`, and migration metadata when rewriting;
- do not reject a concept merely because optional trust, provenance, or lifecycle fields are absent.

Reserved `index.md` and `log.md` files are navigation and history files, not normal concept documents.

### 4. Evaluate lifecycle and trust before relying on content

Inspect these fields when present:

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

Repository extensions such as `review_by` and `reviewed_at` remain valid during migration. Apply the stricter interpretation when both legacy and OKF lifecycle fields exist.

### 5. Use retrieval as selection, not authority

Use the least expensive reliable route:

1. Exact ID, key, filename, or phrase: `rg` or QMD lexical search.
2. Conceptual policy, SOP, or domain question: QMD hybrid query.
3. Code relationships and impact paths: Graphify.
4. Current business state: operational MCP or the owning application API.

After retrieval, inspect the canonical source file before changing code, changing knowledge, or making an important claim.

### 6. Follow standard Markdown relationships

Prefer standard Markdown links between OKF concepts. During migration, consumers may resolve existing `[[wikilink]]` syntax, but writers should not introduce new wikilinks unless the active validator still requires them.

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

When creating or materially rewriting an OKF concept:

1. Keep one durable concept per file.
2. Add a descriptive `type` and title.
3. Add a one-sentence `description` that supports catalog and search previews.
4. Record source materials in structured `sources` entries.
5. Record `generated` only when the producer identity and timestamp are known.
6. Record `verified` only after a real human or deterministic process checks the content.
7. Add lifecycle fields appropriate to the content.
8. Preserve repository extensions required for ownership and publication.
9. Use normal Markdown headings, lists, tables, and links.
10. Update the nearest `index.md` when the concept changes bundle navigation.

## Read, Write, and Serve Compatibility

Compatibility is intentionally staged:

| Level | Meaning | Current target |
| --- | --- | --- |
| Read-compatible | Agent can navigate and interpret OKF without dropping extension metadata | Required for Claude, Codex, and OpenCode |
| Write-compatible | Agent can create and update concepts that pass the repository validator | Pilot after validator extension |
| Publish-compatible | Open WebUI sync can derive collection files, stable IDs, and grants | Existing path to be adapted |
| Serve-compatible | A shared query surface returns OKF identity, trust, lifecycle, and citations | Future gate; not required for local CLI use |

## Compatibility Evaluation

Use the same fixed questions with Claude Code, Codex, and OpenCode:

- Find the canonical concept from a root `index.md` without scanning the whole bundle.
- Refuse to treat a deprecated concept as active.
- Surface an expired `stale_after` value.
- Preserve an unknown extension field during a rewrite.
- Resolve a standard Markdown relationship.
- Distinguish a source document from a generated Open WebUI artifact.
- Return an information-gap result when no authoritative concept exists.

Record client, model, retrieval method, source selected, lifecycle interpretation, and whether the final answer preserved citations.

## Iteration Policy

The repository structure and contract may require several passes. Each iteration should change one boundary at a time:

1. consumer behavior and setup;
2. validator compatibility;
3. pilot bundle structure;
4. Open WebUI publication mapping;
5. physical directory migration;
6. optional shared serving.

Do not perform a large path migration merely to make the tree look final. Promote a layout only after the three primary coding agents and the Open WebUI publication path can consume it without duplicated authority.