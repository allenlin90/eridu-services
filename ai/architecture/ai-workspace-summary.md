# AI Workspace Architecture Summary

This document summarizes the integration between the Eridu monorepo, Open WebUI, LiteLLM, Better Auth, and the existing `erify_api` MCP foundation.

The deployed baseline runs Open WebUI `0.10.2` and LiteLLM `1.91.0` (both pinned to explicit image tags with auto-updates disabled) as two separate Railway services, each with its own PostgreSQL and Redis:

```text
Company users -> Open WebUI -> [OpenAI-compatible API] -> LiteLLM -> providers (OpenRouter / OpenAI / Anthropic / Gemini)
```

Open WebUI reaches LiteLLM over Railway private networking (`http://<litellm-service>.railway.internal:4000/v1`); public URLs are for the admin UI and external testing only. Verify LiteLLM/Open WebUI capabilities against these versions before relying on them.

## Purpose

The company AI workspace should become more than a general chatbot. It should provide governed assistants that share company instructions, use approved knowledge, call safe operational tools, and respect user-level cost and rate controls.

## Component roles

| Component | Role |
|---|---|
| Better Auth / `eridu_auth` | Company SSO and identity source of truth. |
| Open WebUI | User-facing AI workspace, assistants, skills, knowledge, tools, groups, and permissions. |
| LiteLLM | LLM gateway, model aliases, provider abstraction, cost tracking, customer budgets, and rate limits. |
| `erify_api` MCP | Existing private operational MCP surface for read-only, studio-scoped lookup tools. |
| Monorepo | Source of truth for AI policy, assistant definitions, skills, routing references, and budget-governance scripts. |

## Identity model

Better Auth should own the canonical user account. Open WebUI should authenticate users through Better Auth SSO. LiteLLM Admin UI can also use Better Auth SSO for operators, but normal staff should not need LiteLLM accounts.

Open WebUI calls LiteLLM using a shared LiteLLM virtual key (never the master key). Per-user governance comes from Open WebUI's **global** user-info header-forwarding env vars set on the Open WebUI Railway service (`ENABLE_FORWARD_USER_INFO_HEADERS=True`, `FORWARD_USER_INFO_HEADER_USER_ID=x-litellm-customer-id`). Open WebUI then sends `x-litellm-customer-id` on every request and LiteLLM records that user as a customer automatically as requests arrive — no separate sync or pre-provisioning step is required for tracking. Connection-level custom headers were tested and are unreliable on this Railway setup, so they are not used.

The customer identity is the Open WebUI user UUID by default (governance-grade). Email mode is available for readable names in the LiteLLM UI during rollout, at the cost of email-in-logs; only one mode is active at a time. To map a UUID back to a person, query the Open WebUI Postgres `user` table and join on `customer_id = user.id`.

## Assistant model

Do not expose raw provider complexity to staff. Define a small catalog of company assistants:

- Company Assistant
- Operations Assistant
- Fulfillment Assistant
- Livestream Assistant
- Engineering Assistant
- Manager Review Assistant

Each assistant should define its base LiteLLM model alias, required skills, knowledge collections, MCP tools, and allowed groups.

## MCP model

The first operational MCP surface already lives in `erify_api`:

- docs: `apps/erify_api/docs/MCP_SERVER.md`
- entrypoint: `apps/erify_api/src/main.mcp.ts`
- tool registry: `apps/erify_api/src/mcp/mcp-server.factory.ts`
- Railway config: `.railway/erify_api_mcp.json`
- transport: Streamable HTTP `POST /mcp`
- health checks: `GET /health`, `GET /health/ready`

The current tool surface is read-only and studio-scoped:

- `erify_get_show`
- `erify_get_task`
- `erify_query_shows`
- `erify_query_tasks`

The Open WebUI rollout should connect to this private Railway service before introducing a separate MCP app. A future split may still be useful for public partner tools, documentation-only tools, or stronger read/write isolation.

## Audit model

All operational MCP tool calls should log user identity when Open WebUI forwards it, the studio scope, tool name, argument summary, result status, duration, and request ID.

## Source of truth rule

Manual UI changes are acceptable during pilots. Once a setting becomes operationally important, capture it in this directory as a manifest, skill, config, or script.

Note that on this Railway deployment the LiteLLM Admin UI ("Store Model in DB") is the primary surface for models, provider credentials, and company model aliases — the deployment does not conveniently expose `config.yaml`. Repo files under `ai/litellm/` are reference/policy for that UI (or a future repo-managed config path), not an actively-applied config.
