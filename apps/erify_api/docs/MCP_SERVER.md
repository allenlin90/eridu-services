# MCP Server

> **Status**: ✅ Foundation
> **Entrypoint**: `apps/erify_api/src/main.mcp.ts`
> **Tool registry**: `apps/erify_api/src/mcp/mcp-server.factory.ts`

## Purpose

`erify_api` exposes a separate NestJS MCP entrypoint for private, in-cluster AI tool access. The first phase is intentionally narrow: it reuses existing Nest modules and business services, accepts only stateless Streamable HTTP MCP requests, and exposes a small read-only tool surface for scoped record lookup.

This is not a replacement for the public REST API. It is an internal integration path for consumers such as OpenWebUI and LiteLLM running in the same Railway cluster.

The first concrete target is OpenWebUI as an internal Railway service. Do not create a public production endpoint for that rollout. A public URL is only expected for local development or explicit integration testing.

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

## Rollout Targets

| Phase | Target | Endpoint posture | Auth posture |
| --- | --- | --- | --- |
| 1 | OpenWebUI inside the same Railway cluster | Private service only; no public production endpoint | Internal network boundary plus `MCP_ALLOWED_STUDIO_IDS` |
| 1 follow-up | LiteLLM inside the same Railway cluster | Private service only | Internal app-to-app auth to be designed |
| Later | Partners or client systems | Separate public MCP surface or separate service | `eridu_auth` / Better Auth API keys with rate limits and RBAC |

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
- Future internal app-to-app access should authenticate OpenWebUI/LiteLLM as trusted internal clients instead of relying on network reachability alone.

## Deferred TODOs

These items are intentionally deferred from the foundation PR and should be designed before widening access:

- Internal app-to-app auth for OpenWebUI and LiteLLM calling the private MCP service in Railway.
- RBAC for tool access, including studio scope, role scope, and tool-level permissions.
- A private/public MCP split, either by separate Railway services, separate route prefixes, or separate tool registries, so internal operational tools do not leak into partner/client integrations.
- `eridu_auth` integration for partner/client access using Better Auth API keys, rate limits, key ownership, revocation, and audit attribution.
- Public endpoint hardening for any future external MCP surface, including rate limiting, request logging, abuse handling, and a clear tenant/studio binding model.

## Extension Rules

- Keep business logic in existing services or framework-free extracted core modules; the MCP layer should remain a transport adapter.
- Reuse existing Nest modules directly when the logic already lives in `erify_api`.
- Keep new tools read-only unless auth, audit, idempotency, and rate-limit behavior are explicitly designed.
- Keep private-only tools out of any future public MCP registry unless they pass an explicit RBAC and partner-scope review.
- Return UID-based records only; never expose internal database IDs in MCP-specific response shaping.
- Add focused unit tests for each new tool and policy branch under `apps/erify_api/src/mcp/`.

## Verification

The MCP foundation is covered by focused unit tests:

- `apps/erify_api/src/mcp/mcp-studio-policy.spec.ts`
- `apps/erify_api/src/mcp/mcp-tool.service.spec.ts`
