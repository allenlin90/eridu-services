# Engineering Reference

Engineering-focused persistent references — architecture, patterns, and governance policies that apply across the monorepo.

## Documents

| Document | Purpose |
| --- | --- |
| [System Architecture Overview](./ARCHITECTURE_OVERVIEW.md) | Module layers, controller scopes, auth chain, UID strategy |
| [DB Migration Policy](./DB_MIGRATION_POLICY.md) | Migration governance, framework-first rule, branch-local scoping |
| [Finance Guardrails](./FINANCE_GUARDRAILS.md) | Platform rules for monetary computation, financial storage, and audit |
| [DataTable Package Extraction](./DATA_TABLE_EXTRACTION.md) | Rationale, design decisions, and consequences of extracting DataTable |
| [Agentic Development Setup](./AGENTIC_DEVELOPMENT_SETUP.md) | macOS/WSL setup for Claude Code, Codex, OpenCode, RTK, QMD, and optional Graphify |
| [Target Agent Operating Model](./AGENT_OPERATING_MODEL.md) | Reasoning lifecycle, mode timing, pattern consumers, catalog targets, and measurable exit criteria |
| [Agent Invocation Compatibility](./AGENT_INVOCATION_COMPATIBILITY.md) | Stable workflow IDs and cross-client entrypoint compatibility for Claude Code, Codex, and OpenCode |
| [Agent Content Reorganization](./AGENT_CONTENT_REORGANIZATION.md) | Taxonomy, full 94-entry skill audit, migration waves, and bookkeeping requirements |
| [OKF Agent Compatibility Contract](./OKF_AGENT_CONTRACT.md) | Shared read/write behavior for OKF lifecycle, provenance, extensions, and progressive disclosure |
| [Knowledge and Platform Layout](./KNOWLEDGE_AND_PLATFORM_LAYOUT.md) | `infra/`, OKF `knowledge/`, `.agents/`, Compose topology, and migration boundaries |
| [Local Agent Retrieval and Tooling](./LOCAL_AGENT_RETRIEVAL.md) | CLI-first QMD, Graphify, RTK, and OKF roles; optional local MCP and shared-service gates |

## Usage

These documents describe **how the system is built** — not what it does for users (see [docs/domain/](../domain/BUSINESS.md)) and not what features are being built (see [docs/features/README.md](../features/README.md)).

Reference these when making architectural decisions, onboarding to the codebase, or evaluating whether a new convention fits the existing model.