# MCP Server

> **Status**: ✅ Foundation
> **Entrypoint**: `apps/erify_api/src/main.mcp.ts`
> **Tool registry**: `apps/erify_api/src/mcp/mcp-server.factory.ts`

## Purpose

`erify_api` exposes a separate NestJS MCP entrypoint for private, in-cluster AI tool access. The first phase is intentionally narrow: it reuses existing Nest modules and business services, accepts only stateless Streamable HTTP MCP requests, and exposes a small read-only tool surface for scoped record lookup.

This is not a replacement for the public REST API. It is an internal integration path for consumers such as OpenWebUI and LiteLLM running in the same Railway cluster.

## Runtime Shape

| Concern | Decision |
| --- | --- |
| Process | Same NestJS app package, separate `main.mcp.ts` entrypoint |
| Transport | MCP Streamable HTTP at `POST /mcp` |
| Session mode | Stateless per request |
| Health checks | `GET /health` and `GET /health/ready` |
| Initial network boundary | Private Railway service / in-cluster traffic |
| Initial auth boundary | Studio allowlist via `MCP_ALLOWED_STUDIO_IDS` |

Run locally with `pnpm --filter erify_api dev:mcp`. Production uses `pnpm --filter erify_api start:prod:mcp` after the normal app build.

## Tools

The phase-1 registry exposes only read-only record lookup tools:

| Tool | Purpose | Service reuse |
| --- | --- | --- |
| `erify_get_show` | Load a studio-scoped show by UID | `TaskOrchestrationService.getStudioShow` |
| `erify_get_task` | Load a studio-scoped task by UID after confirming studio ownership | `TaskService.findOne`, then `TaskService.findByUidWithRelationsAdmin` |

Do not add broad list, report, mutation, or cross-studio tools without a new design review. The current foundation is deliberately small while OpenWebUI/LiteLLM integration details and auth hardening are still being discussed.

## Access Policy

`McpStudioPolicy` validates that `studio_id` is a Studio UID and optionally checks it against `MCP_ALLOWED_STUDIO_IDS`.

- Empty `MCP_ALLOWED_STUDIO_IDS` means every Studio UID is allowed. Use this only for local development or tightly private environments.
- Production Railway deployments should configure a narrow comma-separated allowlist until the MCP server is connected to `eridu_auth`.
- Future external access should move to `eridu_auth`/Better Auth API keys with rate limits rather than expanding this allowlist gate.

## Extension Rules

- Keep business logic in existing services or framework-free extracted core modules; the MCP layer should remain a transport adapter.
- Reuse existing Nest modules directly when the logic already lives in `erify_api`.
- Keep new tools read-only unless auth, audit, idempotency, and rate-limit behavior are explicitly designed.
- Return UID-based records only; never expose internal database IDs in MCP-specific response shaping.
- Add focused unit tests for each new tool and policy branch under `apps/erify_api/src/mcp/`.

## Verification

The MCP foundation is covered by focused unit tests:

- `apps/erify_api/src/mcp/mcp-studio-policy.spec.ts`
- `apps/erify_api/src/mcp/mcp-tool.service.spec.ts`
