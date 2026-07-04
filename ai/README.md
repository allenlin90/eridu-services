# AI Workspace Control Plane

This directory contains repo-owned policy and manifests for the company AI workspace around Open WebUI, LiteLLM, Better Auth, and the existing `erify_api` MCP foundation.

Actual agent skills live in `.agents/skills/`. Files under `ai/` are policy manifests, deployment templates, sync scaffolds, and Open WebUI export notes.

## Canonical AI workspace skills

Use these actual agent skills before changing AI workspace files:

- `.agents/skills/ai-workspace-control-plane/SKILL.md`
- `.agents/skills/openwebui-assistant-adapter/SKILL.md`

## Component map

| Area | Purpose |
|---|---|
| `eridu_auth` / Better Auth | Company SSO and user source of truth. |
| Open WebUI | User-facing AI workspace, assistants, knowledge, and MCP tool UX. |
| LiteLLM | LLM gateway, provider abstraction, virtual keys, user/customer budgets, and rate limits. |
| `erify_api` MCP | Existing private Railway MCP service for read-only, studio-scoped operational tools. |
| `.agents/skills/` | Canonical project skills and agent behavior. |
| `ai/` | Workspace policy, Open WebUI manifests, LiteLLM templates, and sync scripts. |

## Design principles

1. Treat Better Auth users as the canonical company identities.
2. Treat Open WebUI users as LiteLLM customers/end-users for spend and rate governance.
3. Use one LiteLLM virtual key for the Open WebUI backend, then forward the Open WebUI user identity on every LiteLLM request.
4. Keep LiteLLM model routing, budget tiers, and customer sync policy in Git.
5. Treat `.agents/skills/` as the canonical repo skill source of truth.
6. Treat `ai/openwebui/skills/` as export-only; do not put canonical skills there.
7. Use the existing `erify_api` MCP entrypoint as the first operational MCP surface.
8. Start MCP tools as read-only; add write actions only after audit and approval workflows are defined.
9. Log business-data access in the MCP service, not only in Open WebUI.

## Directory map

```text
.agents/skills/
├─ ai-workspace-control-plane/
│  └─ SKILL.md
└─ openwebui-assistant-adapter/
   └─ SKILL.md

ai/
├─ architecture/
│  └─ ai-workspace-summary.md
├─ litellm/
│  ├─ budget-tiers.example.json
│  ├─ customer-sync.example.json
│  ├─ model-groups.example.yaml
│  └─ README.md
├─ openwebui/
│  ├─ README.md
│  ├─ workspace-models.example.json
│  ├─ tool-access.example.json
│  └─ skills/
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
