---
name: openwebui-mcp-tool-integration
description: Register, verify, and reference MCP or OpenAPI tool servers — such as this monorepo's erify_api MCP — as Open WebUI Tool Server connections via the API. Use when wiring a new MCP integration from this monorepo into Open WebUI, adding an external tool server, or troubleshooting an existing tool-server connection.
---

# Open WebUI MCP / Tool Server Integration

Task-focused workflow for connecting an MCP server or OpenAPI tool server to Open WebUI. Read
[openwebui-rest-api](../openwebui-rest-api/SKILL.md) first for auth setup and general call
mechanics — this skill only covers the tool-server-specific pieces.

## Before using this skill

- Check `ai/mcp/README.md` for current policy on which MCP surface to use — the existing
  `erify_api` MCP entrypoint is canonical. Don't stand up a separate MCP service without a
  documented reason (see that file's "Future split decision" section).
- Registering an MCP tool server is **admin-only**, even for a user with the `direct_tool_servers`
  permission — that permission only covers OpenAPI servers, not MCP. See
  [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md).
- Open WebUI supports MCP natively via **Streamable HTTP** — the same transport `erify_api`'s MCP
  entrypoint already speaks (`POST /mcp`, per `apps/erify_api/docs/MCP_SERVER.md`). No `mcpo` proxy
  bridge is needed for this integration; `mcpo` is only required for MCP servers using stdio or
  other non-HTTP transports.

## Tool server connection API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/configs/tool_servers` | Current `TOOL_SERVER_CONNECTIONS` list |
| POST | `/api/v1/configs/tool_servers` | Replace the full list — GET first, this is a full-object config like other `configs` endpoints |
| POST | `/api/v1/configs/tool_servers/verify` | Dry-run a single connection; returns discovered server specs/tools if reachable, without persisting it |

Connection object shape:

```json
{
  "type": "mcp",
  "url": "http://erify-api-mcp.railway.internal:3000/mcp",
  "spec_type": "url",
  "spec": "",
  "path": "openapi.json",
  "auth_type": "none",
  "key": "",
  "config": { "enable": true },
  "info": {
    "id": "erify_api_mcp",
    "name": "erify_api MCP",
    "description": "Studio-scoped read-only operational tools."
  }
}
```

- `type: "mcp"` — a native MCP Streamable HTTP server (this is what `erify_api` is).
- `type: "openapi"` — a plain OpenAPI tool server, or an MCP server bridged through `mcpo`.
- `auth_type` — `none` for the current private-Railway-network `erify_api` MCP (no caller auth yet,
  per `MCP_SERVER.md`); revisit once that foundation adds authentication.
- `info.id` becomes the server ID referenced in chat completions as `tool_ids: ["server:mcp:<info.id>"]`.

## Workflow: wiring in the erify_api MCP

1. `POST /api/v1/configs/tool_servers/verify` with the connection object above to confirm Open WebUI
   can reach `http://erify-api-mcp.railway.internal:<PORT>/mcp` and see the current tool list
   (`erify_get_show`, `erify_get_task`, `erify_query_shows`, `erify_query_tasks`).
2. `GET` the existing `tool_servers` config, append the new connection, and `POST` the full list back.
3. Grant groups access per `ai/openwebui/tool-access.example.json` — see
   [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md).
4. Reference the server in a chat completion or Workspace Model with `tool_ids: ["server:mcp:erify_api_mcp"]`.

## Core rules

- Keep the connection `url` on Railway private networking (`*.railway.internal`) — do not point
  Open WebUI at a public MCP domain until `apps/erify_api/docs/MCP_SERVER.md`'s public-access design
  is implemented.
- New tools added to `erify_api`'s MCP registry need a matching access-grant update; don't assume a
  newly added tool inherits the old access list.
- If a tool server's exposed tool list changes (tools added/removed on the `erify_api` side),
  re-verify the connection — Open WebUI caches the discovered spec.
- Out of scope: Open WebUI's separate "Pipelines" plugin framework (custom filter/pipe/action
  functions run as a companion service) is a different extensibility mechanism from Tool Servers.
  Consult the official Open WebUI docs directly if a task specifically needs Pipelines rather than
  an MCP/OpenAPI tool server — this skill doesn't cover it.

## Quality gate

- [ ] Connection verified (`tool_servers/verify`) before persisting it.
- [ ] `url` stays on Railway private networking unless a public-access design is signed off.
- [ ] Group access grants updated to match `ai/mcp/README.md` policy, not left at default-deny or default-open by accident.
- [ ] Registration performed with an admin key.

## Related Skills

- [openwebui-rest-api](../openwebui-rest-api/SKILL.md) — auth and call mechanics this skill builds on
- [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md) — grant groups access to the tools this server exposes
- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — MCP decision path and governance
