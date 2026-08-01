# Agent Invocation Compatibility

## Purpose

Reorganizing agent content must not break the commands and named workflows developers already use.

Treat every intentionally exposed workflow name as a **public agent interface**. Internal files may move, knowledge may be extracted, and workflow bodies may be consolidated, but the stable identifier and expected result remain compatible until a deliberate deprecation is completed.

## Canonical Identity

Each public workflow has one canonical kebab-case ID:

```text
pr-ready
knowledge-sync
repository-health
```

That ID should remain aligned across:

- `.agents/skills/<id>/SKILL.md`;
- the skill frontmatter `name`;
- skill-local client metadata such as `agents/openai.yaml`;
- optional Claude Code, OpenCode, Cursor, or Copilot adapters;
- documentation and onboarding examples;
- compatibility tests.

The canonical ID is more stable than any client's invocation sigil.

## Client Entry Points

| Client | Primary entrypoint | Compatibility policy |
| --- | --- | --- |
| Claude Code | `/pr-ready` or natural-language selection of the `pr-ready` skill | Preserve the slash-visible skill ID and bridge behavior |
| Codex | `$pr-ready` in current skill metadata; team-used aliases such as `#pr-ready` must be tested explicitly | Preserve `.agents/skills/pr-ready` and `agents/openai.yaml`; do not assume an undocumented alias is portable |
| OpenCode | `/pr-ready` when exposed in the slash catalog, or native on-demand skill loading | Preserve the exact path-derived skill ID and avoid duplicate higher-precedence definitions |
| Google Antigravity | Native shared skill and rule discovery | Portable shared content remains supported, but Antigravity is outside this migration's primary compatibility test matrix |
| Cursor / Copilot | Secondary adapter or natural-language invocation | Preserve only after the primary three clients pass compatibility tests |

The repository should document the invocation forms actually verified against supported client versions. Do not infer that the same punctuation has identical behavior across clients.

The required compatibility matrix for this migration is Claude Code, Codex, and OpenCode. Adding Antigravity, Cursor, or Copilot to a release gate requires an explicit scope change and corresponding adapter tests.

## Bridge Pattern

Public workflow entrypoints should use a thin bridge:

```text
client invocation
  → .agents/skills/pr-ready/SKILL.md
  → .agents/workflows/pr-review.md
  → READY / NOT READY result
```

The bridge skill owns:

- public ID and discovery description;
- explicit versus implicit invocation policy;
- argument/default-target resolution;
- pointer to the canonical workflow;
- output contract.

The workflow owns:

- ordered gates;
- review and verification procedure;
- wrap-up and bookkeeping;
- completion criteria.

Pattern and knowledge sources own the facts used by the workflow.

No layer should duplicate the full workflow.

## Compatibility Requirements

A reorganization affecting a public workflow must preserve:

1. **Identifier** — the canonical ID remains unchanged unless explicitly deprecated.
2. **Invocation** — verified client-native entrypoints still resolve.
3. **Arguments** — current default and explicit target behavior remains compatible.
4. **Authority** — the bridge points to one canonical workflow body.
5. **Result** — the expected verdict or artifact remains equivalent.
6. **Invocation policy** — explicit-only workflows do not become implicitly selected accidentally.
7. **Client metadata** — Codex/OpenCode/Claude adapters remain valid and non-conflicting.
8. **Links** — moved workflow and knowledge references resolve from the bridge.

## Example: `pr-ready`

Current contract:

- canonical ID: `pr-ready`;
- bridge: `.agents/skills/pr-ready/SKILL.md`;
- authoritative process: `.agents/workflows/pr-review.md`;
- output: explicit `READY` or `NOT READY` verdict with blockers and evidence;
- Codex policy: explicit-only through `agents/openai.yaml`;
- current Codex default prompt uses `$pr-ready`.

Reorganization may simplify or relocate supporting patterns and references, but it must not remove the `pr-ready` bridge while developers rely on its client entrypoints.

## Open WebUI skill delivery entrypoints

`upload-openwebui-skill` is the canonical ID for the Git-first Open WebUI delivery workflow:

- Claude Code: `/upload-openwebui-skill` through native shared-skill discovery;
- Codex: explicit `$upload-openwebui-skill` through `agents/openai.yaml`;
- OpenCode: the exact `upload-openwebui-skill` native skill ID;
- Claude Chat/Cowork: the separately packaged skill under
  `ai/openwebui/claude-skills/upload-openwebui-skill/`.

All entrypoints preserve supplied Markdown, review model binding and the direct-use implication of
skill read grants, create a pull request, and report deployment as pending merge. Only the trusted
post-merge workflow receives the Open WebUI key and writes live state.

## Deprecation Policy

A public ID may be renamed or removed only through a compatibility window:

1. introduce the replacement ID;
2. keep the old bridge as an explicit-only forwarding alias;
3. update all repository docs and adapters;
4. test Claude Code, Codex, and OpenCode;
5. announce the removal point;
6. remove the alias only after the agreed window.

Avoid aliases unless a rename is necessary. Every alias occupies discovery surface and creates another compatibility obligation.

## Compatibility Test Matrix

For every public workflow changed by a PR, record:

| Check | Claude Code | Codex | OpenCode |
| --- | --- | --- | --- |
| Skill is discoverable | required | required | required |
| Explicit invocation resolves | required | required | required |
| Canonical workflow is loaded | required | required | required |
| Default target resolution matches | required | required | required |
| Expected output contract matches | required | required | required |
| Explicit-only policy is respected | where supported | required through metadata | where supported |

For `pr-ready`, representative tests should include:

```text
Claude Code: /pr-ready
Codex:      $pr-ready
Codex team alias: #pr-ready, only when the installed client actually supports it
OpenCode:   /pr-ready or exact skill ID through native skill loading
```

Record the client version and observed result. A documented command is not considered portable merely because it works in one developer's current installation.

## Migration Rule

Do not remove thin workflow bridges merely to reduce the skill count. Count them separately as stable public interfaces.

Catalog reduction should come primarily from:

- extracting pattern and knowledge entries;
- merging overlapping review and reasoning capabilities;
- moving duplicated bodies into canonical workflows;
- making manual workflows and presentation modes explicit-only.

Stable, frequently used workflow bridges such as `pr-ready` are expected to remain.
