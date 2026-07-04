# AI Workspace Architecture Summary

This document summarizes the intended integration between the Eridu monorepo, Open WebUI, LiteLLM, Better Auth, and the existing `erify_api` MCP foundation.

## Purpose

The company AI workspace should become more than a general chatbot. It should provide governed assistants that share company instructions, use approved knowledge, call safe operational tools, and respect user-level cost and rate controls.

## Component roles

| Component | Role |
|---|---|
| Better Auth / `eridu_auth` | Company SSO and identity source of truth. |
| Open WebUI | User-facing AI workspace, assistants, skills, knowledge, tools, groups, and permissions. |
| LiteLLM | LLM gateway, model aliases, provider abstraction, cost tracking, customer budgets, and rate limits. |
| `erify_api` MCP | Existing private operational MCP surface for read-only, studio-scoped lookup tools. |
| Monorepo | Source of truth for AI policy, assistant definitions, skills, routing templates, and sync scripts. |

## Identity model

Better Auth should own the canonical user account. Open WebUI should authenticate users through Better Auth SSO. LiteLLM Admin UI can also use Better Auth SSO for operators, but normal staff should not need LiteLLM accounts.

Open WebUI should call LiteLLM using a shared LiteLLM virtual key. Per-user governance should come from forwarding the Open WebUI user identity with each request. LiteLLM should record those Open WebUI users as customers or end users.

For a pilot, the customer identity can be the user email. For production, prefer a stable Better Auth user ID and keep the email as metadata.

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

Manual UI changes are acceptable during pilots. Once a setting becomes operationally important, capture it in this directory as a manifest, skill, config, or sync script.
