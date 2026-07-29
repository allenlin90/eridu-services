# Local Agent Retrieval and Tooling

## Decision

Engineering agents working from a local checkout use a **CLI-first retrieval model**.

- QMD indexes and searches Markdown and other text-oriented repository knowledge.
- Graphify builds and queries a structural graph of the codebase.
- RTK compresses verbose shell output before it reaches an agent.
- `rg`, direct file reads, and Git remain the authoritative fallback.

A new NestJS knowledge MCP service is **not required** for this local workflow. MCP is an optional adapter around an existing local tool, not the default architecture and not another source of truth.

## Correct Mental Model

```text
Git checkout                           Local derived state
├── AGENTS.md                          ├── QMD index
├── .agents/skills                     └── graphify-out/graph.json
├── docs
├── apps/*/docs
├── code
└── ai
        │
        ▼
Local agent invokes CLI
├── qmd query ...
├── graphify query ...
├── rg ...
└── normal shell commands through RTK
```

The repository owns source content. QMD and Graphify own rebuildable local indexes. RTK does not index anything; it only reduces command-output noise.

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
- every tool can be called by Claude Code, Codex, OpenCode, Copilot CLI, or another shell-capable agent;
- the agent can inspect the original files after retrieval.

### 2. Local MCP adapter — optional

Some clients work better with structured tools than shell output. QMD can run as a local stdio or HTTP MCP process, and Graphify can expose its graph through an MCP adapter.

This remains local:

```text
agent client -> locally launched QMD/Graphify MCP -> local index -> local checkout
```

It is not a NestJS application, shared team service, or new authoritative knowledge store. Use it only when structured tool calls materially improve the selected client.

### 3. Shared remote retrieval — future gate

A shared retrieval service becomes justified only when at least one of these is true:

- a consumer has no local repository checkout;
- Open WebUI or a browser application must query the same index;
- private knowledge requires centralized authentication and authorization;
- one centrally refreshed index is preferable to per-developer indexing;
- access needs auditing, stable source citations, or tenant boundaries;
- local model/index loading is too expensive to repeat per client.

At that point, design a dedicated document-retrieval boundary. Do not add document tools to the existing operational `erify_api` MCP registry merely because both use MCP transport.

## Repository Content Boundaries

| Path | Purpose | Local indexing |
| --- | --- | --- |
| `AGENTS.md` | Canonical repository-wide agent instructions | Yes |
| `.agents/skills/` | Reusable procedures, scripts, functions, and implementation guides | Yes |
| `.agents/workflows/` | Multi-step engineering workflows | Yes |
| `.agents/rules/` | Persistent engineering constraints | Yes |
| `docs/` | Cross-app engineering, domain, feature, and roadmap knowledge | Yes |
| `apps/*/docs/` | App-owned architecture and implemented behavior | Yes |
| `ai/` | Platform-specific Open WebUI, LiteLLM, and MCP policy, manifests, adapters, and deployment references | Yes, when relevant |
| application source | Executable implementation and final validation evidence | Graphify and direct source tools |

Indexing a path does not change its ownership.

In particular, `/ai` should remain platform-specific. Engineering agents may search it because they maintain those platforms, but that does not make every `/ai` document generic engineering knowledge.

Move or extract content from `/ai` only when its **authoritative audience and lifecycle** become platform-neutral. For example:

- Open WebUI model manifests stay under `ai/openwebui/`.
- LiteLLM deployment policy stays under `ai/litellm/`.
- A company policy used only through the current Open WebUI knowledge deployment may stay under that deployment tree.
- A company corpus intentionally shared by Open WebUI, Claude Code, Codex, and other clients should eventually have a platform-neutral canonical location or a separate private knowledge repository. Open WebUI sync artifacts remain under `/ai`.

This is a later content-governance decision, not a prerequisite for local engineering search.

## Tool Roles

| Tool | Role | Status |
| --- | --- | --- |
| Git | Source history, review, provenance | Required |
| Node.js and pnpm | Monorepo runtime and scripts | Required |
| `rg` | Exact identifiers, paths, symbols, and low-latency source search | Recommended |
| RTK | Compress verbose shell output and transparently rewrite supported commands | Recommended |
| QMD (`@tobilu/qmd`) | BM25, vector, and reranked search over Markdown collections | Recommended pilot |
| Graphify (`graphifyy`) | Tree-sitter code graph, relationship/path queries, architecture report | Experimental pilot |
| `uv` | Isolated Graphify installation | Required only for the recommended Graphify install path |
| `jq` | JSON inspection and support for shell integrations | Recommended |
| GitHub CLI (`gh`) | PR, issue, and Actions workflows from local agents | Optional |

QMD and Graphify overlap only partially:

- Use QMD for prose, rules, ADRs, skills, SOPs, and conceptual lookup.
- Use Graphify for imports, calls, ownership boundaries, dependencies, and cross-file paths.
- Use `rg` first for exact names when semantic interpretation adds no value.

## Installation

Run the repository doctor first:

```bash
pnpm agents:doctor
pnpm agents:doctor --strict
```

The normal mode reports required, recommended, and optional tools. Strict mode also fails when recommended tools are absent.

### RTK

Verify that the installed binary is **Rust Token Killer**, not another package with the same command name:

```bash
rtk --version
rtk gain
```

Install the binary using the official RTK distribution for the developer's operating system. Then initialize only the agent integrations that developer actually uses.

Examples:

```bash
rtk init -g                    # Claude Code
rtk init -g --copilot          # GitHub Copilot
rtk init -g --opencode         # OpenCode
rtk init -g --codex            # Codex
rtk init --agent antigravity   # Google Antigravity, project-scoped
rtk init --show                # verify integration
```

Do not run every initializer blindly. Agent integrations are developer-machine configuration. Generated global hooks and plugins are not repository source.

This repository already contains the Antigravity RTK rule. Re-running the project-scoped Antigravity initializer should not create a second competing rule.

For integrations that modify a repository instruction file, review the diff before committing. `AGENTS.md` remains canonical and must not be replaced by generated vendor instructions.

### QMD

Install the Node package globally:

```bash
npm install -g @tobilu/qmd
qmd --version
```

Create local collections once per checkout:

```bash
qmd collection add .agents --name eridu-agent-capabilities --mask "**/*.md"
qmd collection add docs --name eridu-engineering-docs --mask "**/*.md"
qmd collection add apps --name eridu-app-docs --mask "*/docs/**/*.md"
qmd collection add ai --name eridu-ai-platform --mask "**/*.md"

qmd update
qmd embed
```

Example usage:

```bash
qmd search "MCP_ALLOWED_STUDIO_IDS"
qmd query "when should a NestJS repository be introduced?"
qmd query "how is the Open WebUI knowledge sync governed?" --intent "eridu-services repository policy"
```

Collection configuration and the index are local user state. They are not committed to the monorepo.

QMD's local MCP mode is optional:

```bash
qmd mcp
qmd mcp --http
```

Prefer CLI calls during the pilot. Enable MCP for a client only when its structured integration is measurably better than CLI invocation.

### Graphify

Install Graphify in an isolated Python tool environment:

```bash
uv tool install graphifyy
graphify --version
```

For the first pilot, build a deterministic code-only graph:

```bash
graphify extract . --code-only
```

Or install Graphify for the developer's agent and run its `/graphify .` workflow:

```bash
graphify install
```

Query the generated graph later without reparsing the repository:

```bash
graphify query "which modules depend on the authentication boundary?"
graphify explain "TaskOrchestrationService"
```

Do not use `graphify install --project` by default. It writes tool-specific skill and hook adapters into the repository, while this monorepo already owns canonical conventions under `.agents/` and thin vendor adapters elsewhere. Add project-generated Graphify adapters only through an explicit instruction-reconciliation change.

`graphify-out/` is treated as local derived state during the pilot and is ignored by Git. If the team later decides that a reviewed graph snapshot materially improves onboarding, introduce a deliberate artifact/versioning policy rather than committing incidental local output.

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
| Open WebUI deployment configuration | QMD over `/ai`, then source verification |

Record:

- authoritative source found in the top five results;
- incorrect or stale retrievals;
- query latency;
- index/update duration;
- output size reaching the agent;
- whether MCP improved the result over CLI;
- maintenance or adapter drift.

Only introduce a shared knowledge service after this evidence demonstrates a need beyond local CLI retrieval.
