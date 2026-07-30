# Local Agent Retrieval and Tooling

> Installation and machine onboarding are owned by [Agentic Development Setup](./AGENTIC_DEVELOPMENT_SETUP.md). This document owns retrieval architecture, tool selection, and index lifecycle.

## Decision

Engineering agents working from a local checkout use a **CLI-first retrieval model**.

- QMD indexes and searches Markdown and other text-oriented repository knowledge.
- Graphify builds and queries a structural graph of the codebase.
- RTK compresses verbose shell output before it reaches an agent.
- `rg`, direct file reads, and Git remain the authoritative fallback.
- Open Knowledge Format (OKF) structures portable canonical knowledge; it is a file format, not a retrieval engine.

A new NestJS knowledge MCP service is **not required** for this local workflow. MCP is an optional adapter around an existing local tool, not the default architecture and not another source of truth.

## Correct Mental Model

```text
Git checkout                           Local derived state
├── AGENTS.md                          ├── QMD index
├── .agents/skills                     └── graphify-out/graph.json
├── docs
├── apps/*/docs
├── infra                              # target platform-service material
├── knowledge                          # target OKF bundles
├── ai                                 # transitional current platform/knowledge tree
└── application source
        │
        ▼
Local agent invokes CLI
├── qmd query ...
├── graphify query ...
├── rg ...
└── normal shell commands through RTK
```

The repository owns source content. QMD and Graphify own rebuildable local indexes. RTK does not index anything. OKF describes how canonical knowledge is packaged, not how it is searched or served.

See [Knowledge and Platform Layout](./KNOWLEDGE_AND_PLATFORM_LAYOUT.md) for the target `infra/`, `knowledge/`, and `.agents/` boundaries.

## Three Retrieval Modes

### 1. Local CLI — default

The coding agent has a repository checkout and invokes tools through its shell:

```bash
qmd query "how should erify_api choose a persistence boundary?"
graphify query "how does authentication flow from eridu_auth to erify_api?"
rg "MCP_ALLOWED_STUDIO_IDS" .
```

This mode is closest to other developer CLIs such as RTK:

- no long-running service is required;
- indexes stay local to each developer;
- Claude Code, Codex, OpenCode, Copilot CLI, or another shell-capable agent can call the same tools;
- the agent can inspect the original source after retrieval.

### 2. Local MCP adapter — optional

Some clients work better with structured tools than shell output. QMD can run as a local stdio or HTTP MCP process, and Graphify may be placed behind a local MCP adapter.

```text
agent client -> local QMD/Graphify MCP adapter -> local index -> local checkout
```

This is not a NestJS application, shared team service, or authoritative store. Use it only when structured calls materially improve the selected client.

### 3. Shared remote retrieval — future gate

A shared retrieval service becomes justified when at least one of these is true:

- a consumer has no local repository checkout;
- Open WebUI or a browser application must query the same index;
- private knowledge requires centralized authentication and authorization;
- one centrally refreshed index is preferable to per-developer indexing;
- access needs auditing, stable citations, or tenant boundaries;
- local model or index loading is too expensive to repeat per client.

At that point, design a dedicated document-retrieval boundary. Do not add document tools to the existing operational `erify_api` MCP registry merely because both use MCP transport.

## Repository Content Boundaries

| Path | Purpose | Local indexing |
| --- | --- | --- |
| `AGENTS.md` | Canonical repository-wide agent instructions | Yes |
| `.agents/skills/` | Reusable procedures, scripts, functions, and implementation guides | Yes |
| `.agents/workflows/` | Multi-step engineering workflows | Yes |
| `.agents/rules/` | Persistent engineering constraints | Yes |
| `docs/` | Cross-app engineering, domain, feature, and roadmap documentation | Yes |
| `apps/*/docs/` | App-owned architecture and implemented behavior | Yes |
| `infra/` | Deployed third-party services, stack topology, and deployment adapters | Yes, when maintaining the stack |
| `knowledge/` | Portable canonical knowledge bundles, preferably OKF-compatible | Yes |
| `ai/` | Transitional current location for Open WebUI/LiteLLM material and knowledge-sync sources | Yes until migrated |
| application source | Executable implementation and final validation evidence | Graphify and direct source tools |

Indexing a path does not change its ownership.

Open WebUI manifests, functions, access mappings, and live exports should ultimately live under `infra/openwebui/`; LiteLLM material under `infra/litellm/`. Canonical knowledge intended for multiple clients should live under `knowledge/` or in a private knowledge repository. The current `ai/` tree remains active until a dedicated migration reconciles all references.

## OKF's Role

OKF applies only to canonical knowledge bundles. It should not be imposed on every Markdown file in the Turborepo.

An OKF concept is Markdown with YAML frontmatter and a required `type`. Hierarchical `index.md` files support progressive disclosure, and optional `log.md` files record changes. Existing ownership, audience, sensitivity, and stable-ID metadata can remain as extension fields.

Use OKF for:

- policies and SOPs;
- durable domain concepts;
- cross-tool architecture concepts;
- reviewed references;
- generated knowledge with provenance and verification metadata.

Do not use OKF as a replacement for:

- `.agents/skills/`;
- application or package layout;
- operational databases;
- QMD or Graphify;
- Open WebUI collections;
- MCP transport.

The target flow is:

```text
knowledge/ OKF source
├── QMD local indexing for coding agents
├── Open WebUI sync into access-controlled collections
└── future export or serving to other OKF-aware consumers
```

## Tool Roles

| Tool | Role | Status |
| --- | --- | --- |
| Git | Source history, review, and provenance | Required |
| Node.js and pnpm | Monorepo runtime and scripts | Required |
| `rg` | Exact identifiers, paths, symbols, and low-latency source search | Recommended |
| RTK | Compress verbose shell output and transparently rewrite supported commands | Recommended |
| QMD (`@tobilu/qmd`) | BM25, vector, and reranked search over Markdown collections | Recommended pilot |
| Graphify (`graphifyy`) | Tree-sitter code graph, relationship/path queries, architecture report | Experimental pilot |
| OKF | Portable Markdown/frontmatter knowledge format | Format pilot; no runtime required |
| `uv` | Isolated Graphify installation | Required only for the recommended Graphify install path |
| `jq` | JSON inspection and shell-integration support | Recommended |
| GitHub CLI (`gh`) | PR, issue, and Actions workflows from local agents | Optional |

QMD and Graphify overlap only partially:

- Use QMD for prose, rules, ADRs, skills, SOPs, and conceptual lookup.
- Use Graphify for imports, calls, ownership boundaries, dependencies, and cross-file paths.
- Use `rg` first for exact names when semantic interpretation adds no value.
- Use OKF metadata to improve routing, provenance, lifecycle checks, and portability of canonical knowledge.

## Installation

Use [Agentic Development Setup](./AGENTIC_DEVELOPMENT_SETUP.md) for macOS/WSL prerequisites, primary agent installation, RTK integration, QMD setup, Graphify installation, authentication, and doctor commands.

This guide intentionally does not maintain a second set of installation commands.

## Agent Query Policy

Use the least expensive reliable method:

1. Exact identifier, filename, error code, environment key, or symbol: use `rg`.
2. Rule, ADR, guide, skill, policy, or natural-language question: use QMD.
3. Call path, import relation, architectural hub, or impact path: use Graphify.
4. Current operational data: use the existing operational MCP tools or application APIs.
5. Confirm important conclusions against canonical source files before editing or citing them.

Retrieval output is evidence selection, not authority. Source files and operational systems remain authoritative.

## Index Lifecycle

Local indexes are deliberately rebuildable:

```text
git pull
  -> qmd update
  -> qmd embed when vectors are stale
  -> graphify extract . --code-only or incremental agent workflow
  -> query without rereading the whole repository
```

Do not run full indexing on every Turbo build, test, or lint operation. Indexing is developer tooling, not an application build dependency.

Possible later automation:

- a manual `knowledge:index` script that invokes installed CLIs;
- a post-checkout or opt-in Git hook;
- scheduled local refresh;
- CI-built shared artifacts after the pilot proves value.

Do not add these until indexing time and retrieval quality have been measured on this repository.

## Pilot Evaluation

Evaluate QMD and Graphify separately with real questions:

| Question class | Expected tool |
| --- | --- |
| Exact policy or environment key | `rg` or QMD lexical search |
| Relevant skill for a task | QMD |
| Architecture decision and rationale | QMD |
| Caller/import/dependency path | Graphify |
| Current show or task records | Operational MCP |
| Open WebUI deployment configuration | QMD over transitional `ai/` or target `infra/`, then source verification |

Record:

- authoritative source found in the top five results;
- incorrect or stale retrievals;
- query latency;
- index/update duration;
- output size reaching the agent;
- whether MCP improved the result over CLI;
- maintenance or adapter drift.

Only introduce a shared knowledge service after this evidence demonstrates a need beyond local CLI retrieval.
