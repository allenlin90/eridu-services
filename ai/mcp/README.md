# MCP Integration Scaffold

This directory documents the intended MCP integration pattern for Open WebUI and the Eridu services.

## Role

MCP services should provide controlled tool access from Open WebUI to internal operational systems.

The first MCP tools should be read-only. Write tools should require a separate approval, audit, and rollback design.

## Recommended first service

```text
apps/eridu_mcp
```

The service should depend on existing shared packages where possible:

- `@eridu/auth-sdk` for user/session/JWT validation patterns.
- `@eridu/api-types` for shared operational schemas.
- Existing APIs such as `erify_api` for operational data access.

## Suggested first tools

| Tool | Purpose | Risk |
|---|---|---|
| `get_current_user_context` | Resolve the authenticated user and groups. | Low |
| `search_company_docs` | Search approved company docs. | Low |
| `get_show_schedule` | Read livestream/show schedule context. | Medium read-only |
| `get_task_status` | Read task status and owner. | Medium read-only |
| `get_creator_info` | Read creator-related context. | Medium read-only |
| `get_order_or_fulfillment_status` | Read order or fulfillment status. | Medium read-only |

## Audit logging

Each tool call should log:

- request ID
- user ID
- user email
- user role or groups
- assistant/model if provided
- chat ID and message ID if provided by Open WebUI
- tool name
- argument summary, not sensitive raw payloads by default
- result status
- duration
- error class if failed

## Railway networking

When Open WebUI and the MCP service run in the same Railway project/environment, prefer Railway private networking and avoid exposing the MCP endpoint publicly unless required.
