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
| Initial network boundary | Private Railway service / in-cluster traffic only |
| Initial auth boundary | Studio allowlist via `MCP_ALLOWED_STUDIO_IDS` |

Run locally with `pnpm --filter erify_api dev:mcp`. Production uses `pnpm --filter erify_api start:prod:mcp` after the normal app build.

## Backend Runtime Boundary

The MCP server is a separate runtime entrypoint, not another REST controller group. It reuses the same NestJS package and service layer as `erify_api`, but it should keep its module graph narrow and transport-specific.

```text
REST Controller ┐
MCP Tool        ├─> Use Case / Service ─> Repository ─> Database
BullMQ Worker   ┘
```

The foundation implementation may reuse existing Nest modules directly. As the MCP surface grows, move shared read/use-case logic behind narrower services and keep MCP handlers as adapters. Do not let MCP tools import broad REST orchestration modules merely for convenience.

## Railway Private-Only Deployment

Use `.railway/erify_api_mcp.json` for the MCP Railway service. This deploys the same `erify_api` package with the MCP entrypoint instead of the REST API entrypoint.

For the OpenWebUI rollout:

1. Create a separate Railway service for MCP using `.railway/erify_api_mcp.json`.
2. Keep the MCP service in the same Railway project and environment as OpenWebUI.
3. Do not attach a Railway public domain or custom public domain to the MCP service.
4. Configure OpenWebUI to call the MCP service through Railway private DNS:

```text
http://<mcp-service-name>.railway.internal:${PORT}/mcp
```

For example, if the Railway service is named `erify-api-mcp` and `PORT=3000`:

```text
http://erify-api-mcp.railway.internal:3000/mcp
```

Railway private networking keeps service-to-service traffic inside the project environment. Railway's private DNS uses the `<service-name>.railway.internal` pattern, and internal HTTP traffic should use `http://` because Railway encrypts the private network with WireGuard.

The MCP entrypoint already listens on `::`, which is compatible with Railway private networking, including IPv6-only legacy environments.

If a public domain is later attached to this service, the endpoint is no longer private-only and must get token/API-key auth before production use. Public MCP access should follow the [Public MCP Access Control](../../../docs/ideation/public-mcp-access-control.md) plan before it is exposed to partners, clients, or other internet callers.

## Rollout Targets

| Phase | Target | Endpoint posture | Auth posture |
| --- | --- | --- | --- |
| 1 | OpenWebUI inside the same Railway cluster | Private service only; no public production endpoint | Internal network boundary plus `MCP_ALLOWED_STUDIO_IDS` |
| 1 follow-up | LiteLLM inside the same Railway cluster | Private service only | Internal app-to-app auth to be designed |
| Later | Partners or client systems | Separate public MCP surface or separate service | `eridu_auth` / Better Auth API keys with rate limits and RBAC |

## Tools

The phase-1 registry exposes only read-only record lookup tools:

| Tool | Purpose | Service reuse | Response DTO |
| --- | --- | --- | --- |
| `erify_get_show` | Load a studio-scoped show by UID | `TaskOrchestrationService.getStudioShow` | `showDto` |
| `erify_get_task` | Load a studio-scoped task by UID after confirming studio ownership | `TaskService.findOne`, then `TaskService.findByUidWithRelationsAdmin` | `taskWithRelationsDto` |

Both tools parse the raw service result through the same Zod DTO used by the REST API before returning it to the MCP client — this strips internal `BigInt` database ids/foreign keys (which `JSON.stringify` cannot serialize) and maps the row to the public UID-based response shape.

Do not add broad list, report, mutation, or cross-studio tools without a new design review. The current foundation is deliberately small while OpenWebUI/LiteLLM integration details and auth hardening are still being discussed.

## Access Policy

`McpStudioPolicy` validates that `studio_id` is a Studio UID and optionally checks it against `MCP_ALLOWED_STUDIO_IDS`.

- Empty `MCP_ALLOWED_STUDIO_IDS` means every Studio UID is allowed. Use this only for local development or tightly private environments.
- Production Railway deployments should configure a narrow comma-separated allowlist until the MCP server is connected to `eridu_auth`.
- Future external access should move to `eridu_auth`/Better Auth API keys with rate limits rather than expanding this allowlist gate.
- Future internal app-to-app access should authenticate OpenWebUI/LiteLLM as trusted internal clients instead of relying on network reachability alone.

## Public Access Gate

Do not use `MCP_ALLOWED_STUDIO_IDS` as a public security boundary. Before attaching a public Railway domain, custom domain, or external ingress to MCP, define and implement:

- `eridu_auth` API-key authentication for service callers.
- Studio/tenant binding for each key and request.
- Tool-level RBAC or scopes for the public registry.
- Per-key, per-studio, and global rate limits.
- Request logging, audit attribution, revocation, and abuse handling.

Track the design in [Public MCP Access Control](../../../docs/ideation/public-mcp-access-control.md).

## Deferred TODOs

These items are intentionally deferred from the foundation PR and should be designed before widening access:

- Internal app-to-app auth for OpenWebUI and LiteLLM calling the private MCP service in Railway.
- RBAC for tool access, including studio scope, role scope, and tool-level permissions.
- A private/public MCP split, either by separate Railway services, separate route prefixes, or separate tool registries, so internal operational tools do not leak into partner/client integrations.
- `eridu_auth` integration for partner/client access using Better Auth API keys, rate limits, key ownership, revocation, and audit attribution, as scoped in [Public MCP Access Control](../../../docs/ideation/public-mcp-access-control.md).
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
