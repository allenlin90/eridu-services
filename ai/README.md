# AI Workspace Control Plane

This directory is the repo-owned source of truth for the company AI workspace around Open WebUI, LiteLLM, Better Auth, and the existing `erify_api` MCP foundation.

The goal is to avoid configuring each deployed tool as a separate black box. Open WebUI and LiteLLM can still be used through their UIs for monitoring and pilot changes, but durable policy should live here, be reviewed in Git, and be pushed or synchronized into the deployed services.

## Current architecture decision

```text
Better Auth / eridu_auth
  -> company SSO and user source of truth

Open WebUI
  -> user-facing AI workspace, assistants, skill adapters, knowledge, and MCP tool UX

LiteLLM
  -> LLM gateway, provider abstraction, virtual keys, cost tracking, user/customer budgets, and rate limits

erify_api MCP
  -> existing private Railway MCP service for read-only, studio-scoped operational tools

.agents/skills
  -> canonical project skills and engineering/operations guidance

This ai/ directory
  -> AI workspace policy, Open WebUI adapters, LiteLLM templates, and sync scripts
```

## Design principles

1. Treat Better Auth users as the canonical company identities.
2. Treat Open WebUI users as LiteLLM customers/end-users for spend and rate governance.
3. Use one LiteLLM virtual key for the Open WebUI backend, then forward the Open WebUI user identity on every LiteLLM request.
4. Keep LiteLLM model routing, budget tiers, and customer sync policy in Git.
5. Treat `.agents/skills/` as the canonical repo skill source of truth.
6. Keep `ai/openwebui/skills/` as Open WebUI-importable adapters over canonical skills, not a competing skill system.
7. Use the existing `erify_api` MCP entrypoint as the first operational MCP surface.
8. Start MCP tools as read-only; add write actions only after audit and approval workflows are defined.
9. Log business-data access in the MCP service, not only in Open WebUI.

## Directory map

```text
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
│     ├─ README.md
│     ├─ company-writing-style.md
│     ├─ ecommerce-ops-assistant.md
│     ├─ engineering-code-review.md
│     └─ thai-english-ops-interpreter.md
└─ mcp/
   └─ README.md

scripts/ai/
├─ sync-litellm-customers.ts
└─ verify-ai-stack.ts
```

## Existing canonical sources

Before changing AI workspace policy, check these existing sources:

- `.claude/memory/skills-integration.md`
- `.agents/skills/operations-review-surface/SKILL.md`
- `.agents/skills/show-production-lifecycle/SKILL.md`
- `.agents/skills/table-view-pattern/SKILL.md`
- `.agents/skills/engineering-best-practices-enforcer/SKILL.md`
- `apps/erify_api/docs/MCP_SERVER.md`

## Implementation phases

### Phase 1: Document and stabilize

- Better Auth SSO into Open WebUI.
- Open WebUI connects to LiteLLM with one virtual key.
- Open WebUI forwards user email or stable ID as the LiteLLM customer/end-user ID.
- LiteLLM customers and budgets are created manually or by the scaffolded sync script.
- Open WebUI connects to the existing `erify_api` MCP Railway service over the private network.
- Open WebUI skills are stored as adapters in this repo and aligned with `.agents/skills/`.

### Phase 2: Config as code

- Promote LiteLLM budget tiers and model groups from examples to production manifests.
- Add a scheduled sync job for Better Auth users -> LiteLLM customers.
- Add validation checks for the AI stack.

### Phase 3: Department assistants

- Create Workspace Model definitions for operations, fulfillment, livestream, management, and engineering.
- Attach only the skills, knowledge, and MCP tools each role needs.

### Phase 4: Governance and reporting

- Generate reports by user, team, model, provider, and MCP tool.
- Alert when usage, errors, or cost exceed thresholds.
- Review assistant quality and update skills through pull requests.
