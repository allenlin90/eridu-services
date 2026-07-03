# AI Workspace Control Plane

This directory is the repo-owned source of truth for the company AI workspace around Open WebUI, LiteLLM, Better Auth, and MCP services.

The goal is to avoid configuring each deployed tool as a separate black box. Open WebUI and LiteLLM can still be used through their UIs for monitoring and pilot changes, but durable policy should live here, be reviewed in Git, and be pushed or synchronized into the deployed services.

## Current architecture decision

```text
Better Auth / eridu_auth
  -> company SSO and user source of truth

Open WebUI
  -> user-facing AI workspace, assistants, skills, knowledge, and MCP tool UX

LiteLLM
  -> LLM gateway, provider abstraction, virtual keys, cost tracking, user/customer budgets, and rate limits

MCP services
  -> controlled access to company data and operational APIs

This monorepo
  -> versioned AI policy, assistant definitions, skills, routing templates, budget tiers, and sync scripts
```

## Design principles

1. Treat Better Auth users as the canonical company identities.
2. Treat Open WebUI users as LiteLLM customers/end-users for spend and rate governance.
3. Use one LiteLLM virtual key for the Open WebUI backend, then forward the Open WebUI user identity on every LiteLLM request.
4. Keep LiteLLM model routing, budget tiers, and customer sync policy in Git.
5. Keep Open WebUI skills and assistant definitions in Git before importing/syncing them into Open WebUI.
6. Start MCP tools as read-only; add write actions only after audit and approval workflows are defined.
7. Log business-data access in the MCP service, not only in Open WebUI.

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

## Implementation phases

### Phase 1: Document and stabilize

- Better Auth SSO into Open WebUI.
- Open WebUI connects to LiteLLM with one virtual key.
- Open WebUI forwards user email or stable ID as the LiteLLM customer/end-user ID.
- LiteLLM customers and budgets are created manually or by the scaffolded sync script.
- MCP service is connected to Open WebUI over the Railway private network.
- Skills are stored in this repo and imported into Open WebUI.

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
