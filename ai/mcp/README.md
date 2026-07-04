# MCP Integration Scaffold

This directory documents how the existing `erify_api` MCP foundation should fit into the Open WebUI / LiteLLM / Better Auth AI workspace.

## Existing implementation

The monorepo already has an MCP implementation inside `erify_api`:

| Area | Existing path / behavior |
|---|---|
| MCP docs | `apps/erify_api/docs/MCP_SERVER.md` |
| MCP entrypoint | `apps/erify_api/src/main.mcp.ts` |
| Tool registry | `apps/erify_api/src/mcp/mcp-server.factory.ts` |
| Railway service config | `.railway/erify_api_mcp.json` |
| Local command | `pnpm --filter erify_api dev:mcp` |
| Production command | `pnpm --filter erify_api start:prod:mcp` |
| Transport | Streamable HTTP at `POST /mcp` |
| Health checks | `GET /health`, `GET /health/ready` |
| Network posture | Private Railway service for Open WebUI first |

This means the AI workspace should treat `erify_api` MCP as the first operational MCP surface. Do not create a separate `apps/eridu_mcp` service unless there is a clear future need to split public/private registries or isolate different runtime concerns.

## Current tool surface

The current registry exposes read-only, studio-scoped tools:

| Tool | Purpose | Risk |
|---|---|---|
| `erify_get_show` | Load a studio-scoped show by UID. | Medium read-only |
| `erify_get_task` | Load a studio-scoped task by UID after confirming studio ownership. | Medium read-only |
| `erify_query_shows` | Paginated, studio-scoped show list with date range, search, status, creator, and attention filters. | Medium read-only |
| `erify_query_tasks` | Paginated, studio-scoped task/submission list with completion, due-date, status, and type filters. | Medium read-only |

These tools reuse existing `erify_api` services and return UID-shaped DTOs instead of internal database IDs.

## Open WebUI connection pattern

For the initial internal rollout, connect Open WebUI to the Railway-private MCP service:

```text
http://<mcp-service-name>.railway.internal:${PORT}/mcp
```

Example:

```text
http://erify-api-mcp.railway.internal:3000/mcp
```

Keep the service private in Railway. Do not attach a public domain for production use until a separate public access-control design is implemented.

## Current access boundary

The current foundation uses studio allowlisting through `MCP_ALLOWED_STUDIO_IDS`.

Important constraints:

- In production, `MCP_ALLOWED_STUDIO_IDS` is required.
- The current `/mcp` endpoint does not yet have caller authentication.
- Network reachability and studio allowlisting are acceptable only for the private Railway foundation phase.
- Future external access should use `eridu_auth` / Better Auth API keys, tenant/studio binding, tool scopes, rate limits, revocation, and audit attribution.

## AI workspace policy

For Open WebUI assistant access, treat the existing `erify_*` tools as operational read tools. Attach them only to assistants and groups that need operational context.

Suggested group mapping:

| Group | Allowed tools |
|---|---|
| `operations` | `erify_get_show`, `erify_get_task`, `erify_query_shows`, `erify_query_tasks` |
| `fulfillment` | `erify_get_task`, `erify_query_tasks` |
| `livestream` | `erify_get_show`, `erify_query_shows` |
| `manager` | all current `erify_*` tools |
| `admin` | all current `erify_*` tools |
| `staff` | no operational MCP tools by default |

## Audit logging

Each MCP tool call should log, or be extended to log:

- request ID
- Open WebUI user ID or email when forwarded
- user role or groups when available
- assistant/model if provided
- chat ID and message ID if provided by Open WebUI
- studio ID
- tool name
- argument summary, not sensitive raw payloads by default
- result status
- duration
- error class if failed

## Extension rules

Keep these rules aligned with `apps/erify_api/docs/MCP_SERVER.md`:

- Keep MCP tools read-only unless auth, audit, idempotency, and rate-limit behavior are explicitly designed.
- Keep tools studio-scoped.
- Keep tools paginated and capped for list queries.
- Return UID-based records only; never expose internal database IDs.
- Keep business logic in existing services or narrow extracted use cases; MCP handlers should remain transport adapters.
- Do not add report, mutation, cross-studio, or higher-level business-answer tools without a separate design review.

## Future split decision

A separate MCP service may still make sense later for:

- public partner/client MCP tools,
- documentation-only tools,
- read/write separation,
- stronger isolation between operational data and knowledge/doc access,
- different auth and rate-limit boundaries.

Until then, the existing `erify_api` MCP entrypoint is the canonical operational MCP implementation.
