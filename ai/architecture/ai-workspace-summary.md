# AI Workspace Architecture Summary

This document summarizes the intended integration between the Eridu monorepo, Open WebUI, LiteLLM, Better Auth, and MCP services.

## Purpose

The company AI workspace should become more than a general chatbot. It should provide governed assistants that share company instructions, use approved knowledge, call safe operational tools, and respect user-level cost and rate controls.

## Component roles

| Component | Role |
|---|---|
| Better Auth / `eridu_auth` | Company SSO and identity source of truth. |
| Open WebUI | User-facing AI workspace, assistants, skills, knowledge, tools, groups, and permissions. |
| LiteLLM | LLM gateway, model aliases, provider abstraction, cost tracking, customer budgets, and rate limits. |
| MCP services | Controlled tool layer for company data access. Start with read-only tools. |
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

MCP services should start as read-only. Early tools should retrieve operational context instead of mutating production data.

Suggested first tools:

- `get_current_user_context`
- `search_company_docs`
- `get_show_schedule`
- `get_task_status`
- `get_creator_info`
- `get_order_or_fulfillment_status`

All MCP tool calls should log user identity, tool name, argument summary, result status, duration, and request ID.

## Source of truth rule

Manual UI changes are acceptable during pilots. Once a setting becomes operationally important, capture it in this directory as a manifest, skill, config, or sync script.
