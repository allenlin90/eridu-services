# AI Workspace Control Plane

This directory contains repo-owned policy and manifests for the company AI workspace around Open WebUI, LiteLLM, Better Auth, and the existing `erify_api` MCP foundation.

Actual agent skills live in `.agents/skills/`. Files under `ai/` are policy manifests, deployment references, budget-tier policy tables, and Open WebUI export notes.

## Deployed baseline

The current deployment runs Open WebUI `0.10.2` and LiteLLM `1.91.0` as two separate Railway services, each with its own PostgreSQL and Redis:

```text
Company users -> Open WebUI -> [OpenAI-compatible API] -> LiteLLM -> providers (OpenRouter / OpenAI / Anthropic / Gemini)
```

- Open WebUI reaches LiteLLM over Railway private networking (`http://<litellm-service>.railway.internal:4000/v1`); public LiteLLM URLs are for the admin UI and external testing only.
- LiteLLM models, provider credentials, and company model aliases are managed through the LiteLLM Admin UI ("Store Model in DB") or its equivalent Management API, not a repo-managed `config.yaml` — the Railway deployment does not conveniently expose `config.yaml`. See [`litellm/README.md`](litellm/README.md) and [`litellm-admin-api`](../.agents/skills/litellm-admin-api/SKILL.md).
- Per-user usage tracking is automatic: Open WebUI forwards each user's identity to LiteLLM via global env vars, so no pre-provisioning or sync step is required to record customer usage.
- Version-sensitive: verify any LiteLLM/Open WebUI capability against `1.91.0` / `0.10.2` before relying on it; do not assume latest-docs behavior applies. Both Railway images are pinned to explicit tags with auto-updates disabled, so these figures stay accurate until a version change goes through [`ai-platform-release-management`](../.agents/skills/ai-platform-release-management/SKILL.md)'s check-and-maintainer-confirm routine.

## Canonical AI workspace skills

Use these actual agent skills before changing AI workspace files:

- `.agents/skills/ai-workspace-control-plane/SKILL.md`
- `.agents/skills/openwebui-assistant-adapter/SKILL.md`
- `.agents/skills/openwebui-rest-api/SKILL.md`
- `.agents/skills/openwebui-groups-permissions/SKILL.md`
- `.agents/skills/openwebui-mcp-tool-integration/SKILL.md`
- `.agents/skills/litellm-admin-api/SKILL.md`
- `.agents/skills/wiki-knowledge-maintainer/SKILL.md`
- `.agents/skills/ai-platform-release-management/SKILL.md`
- `.agents/skills/ai-platform-capability-verification/SKILL.md`

## Component map

| Area | Purpose |
|---|---|
| `eridu_auth` / Better Auth | Company SSO and user source of truth. |
| Open WebUI | User-facing AI workspace, assistants, knowledge, and MCP tool UX. |
| LiteLLM | LLM gateway, provider abstraction, virtual keys, user/customer budgets, and rate limits. |
| `erify_api` MCP | Existing private Railway MCP service for read-only, studio-scoped operational tools. |
| `.agents/skills/` | Canonical project skills and agent behavior. |
| `ai/` | Workspace policy, Open WebUI manifests, and LiteLLM templates. |

## Design principles

1. Treat Better Auth users as the canonical company identities.
2. Treat Open WebUI users as LiteLLM customers/end-users for spend and rate governance.
3. Use one LiteLLM virtual key for the Open WebUI backend, then forward the Open WebUI user identity on every LiteLLM request via Open WebUI's global user-info header-forwarding env vars (not connection-level custom headers, which are unreliable on this Railway setup).
4. Keep LiteLLM model routing, budget tiers, and budget-tier assignment policy in Git as reference; apply it via the Admin UI or the Management API (`litellm-admin-api`).
5. Treat `.agents/skills/` as the canonical repo skill source of truth.
6. Treat `ai/openwebui/skills/` as Open WebUI adapter/import artifacts; do not put canonical engineering skills there.
7. Use the existing `erify_api` MCP entrypoint as the first operational MCP surface.
8. Start MCP tools as read-only; add write actions only after audit and approval workflows are defined.
9. Log business-data access in the MCP service, not only in Open WebUI.

## Directory map

```text
.agents/skills/
├─ ai-workspace-control-plane/
│  └─ SKILL.md
├─ openwebui-assistant-adapter/
│  └─ SKILL.md
├─ openwebui-rest-api/
│  ├─ SKILL.md
│  └─ references/
│     └─ endpoints.md
├─ openwebui-groups-permissions/
│  └─ SKILL.md
├─ openwebui-mcp-tool-integration/
│  └─ SKILL.md
├─ litellm-admin-api/
│  ├─ SKILL.md
│  └─ references/
│     └─ endpoints.md
├─ wiki-knowledge-maintainer/
│  └─ SKILL.md
├─ ai-platform-release-management/
│  ├─ SKILL.md
│  └─ references/
│     └─ procedure.md
└─ ai-platform-capability-verification/
   ├─ SKILL.md
   └─ references/
      └─ known-gaps.md

ai/
├─ architecture/
│  ├─ ai-workspace-summary.md
│  ├─ llm-knowledge-base-plan.md
│  └─ skill-classification-inventory.md
├─ litellm/
│  ├─ .env.example
│  ├─ budget-tiers.example.json
│  ├─ customer-sync.example.json
│  ├─ model-groups.example.yaml
│  └─ README.md
├─ openwebui/
│  ├─ README.md
│  ├─ workspace-models.example.json
│  ├─ tool-access.example.json
│  ├─ functions/
│  │  ├─ README.md
│  │  └─ sync-pipe.py
│  ├─ knowledge/
│  │  └─ README.md
│  ├─ skills/
│  │  └─ README.md
│  └─ synced/
│     └─ README.md
└─ mcp/
   └─ README.md
```

## Existing canonical sources

Before changing AI workspace policy, also check these existing sources:

- `.claude/memory/skills-integration.md`
- `.agents/skills/operations-review-surface/SKILL.md`
- `.agents/skills/show-production-lifecycle/SKILL.md`
- `.agents/skills/table-view-pattern/SKILL.md`
- `.agents/skills/engineering-best-practices-enforcer/SKILL.md`
- `apps/erify_api/docs/MCP_SERVER.md`

## Architecture plans

- [`architecture/ai-workspace-summary.md`](architecture/ai-workspace-summary.md) — Open WebUI, LiteLLM, Better Auth, and MCP platform baseline.
- [`architecture/llm-knowledge-base-plan.md`](architecture/llm-knowledge-base-plan.md) — Migration plan for a Git-backed company wiki using Open WebUI retrieval, scoped knowledge collections, and optional documentation-only MCP lazy loading.
- [`architecture/skill-classification-inventory.md`](architecture/skill-classification-inventory.md) — Per-file classification of the 19 live Open WebUI skills, reference input for Phase 1/3 content migration.
