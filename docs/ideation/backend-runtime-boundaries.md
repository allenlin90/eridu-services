# Ideation: Backend Runtime Boundaries

> **Status**: Active ideation
> **Origin**: MCP foundation architecture review
> **Related**: [System Architecture Overview](../engineering/ARCHITECTURE_OVERVIEW.md), [MCP Server](../../apps/erify_api/docs/MCP_SERVER.md), [Public MCP Access Control](./public-mcp-access-control.md), [BullMQ Async Processing](./bullmq-async-processing.md)

## What

Define `erify_api` as a modular NestJS backend with multiple runtime entrypoints instead of one process that serves every audience and transport. The package can keep sharing model services, orchestration services, repositories, Prisma, auth helpers, and Zod contracts, while each runtime imports only the surface it exposes.

Target runtime surfaces:

| Runtime | Audience | Transport | Exposure |
| --- | --- | --- | --- |
| REST | Studio operators, creators, system admins, integrations | HTTP routes | Public or API-key guarded, depending on route |
| MCP | OpenWebUI first; LiteLLM and partners later | Streamable HTTP MCP | Private Railway service in Phase 1; public access requires a separate access-control design |
| Worker | Async jobs such as notifications and report generation | BullMQ processors | Private worker process, no public HTTP API |

REST itself can remain one runtime initially, but the route groups should stay semantically separated:

| REST scope | Route prefix | Access model |
| --- | --- | --- |
| Admin | `admin/*` | System admin access |
| Studio | `studios/:studioId/*` | Studio membership and role checks |
| Me | `me/*` | Authenticated user self-service |
| Integration | `backdoor/*`, `google-sheets/*`, future service APIs | Explicit service/API-key guard or private network |

## Why It Matters

- MCP and BullMQ should reuse business logic without booting the full REST route surface.
- Admin, studio, user, integration, MCP, and worker surfaces have different exposure and authorization assumptions.
- Runtime-specific module graphs make deploys easier to reason about: OpenWebUI calls the private MCP process; HTTP clients call the REST process; background jobs run in worker processes.
- Keeping business logic in services/use-cases avoids duplicating domain rules across REST controllers, MCP tools, and BullMQ processors.

## Design Direction

Use separate NestJS entrypoints and runtime modules:

```text
apps/erify_api
├─ src/main.ts              REST runtime
├─ src/main.mcp.ts          MCP runtime
├─ src/main.worker.ts       Worker runtime, when BullMQ is introduced
├─ src/app.module.ts        REST AppModule
├─ src/mcp/mcp-app.module.ts
└─ src/workers/worker-app.module.ts
```

Transport adapters should remain thin:

```text
REST Controller ┐
MCP Tool        ├─> Use Case / Service ─> Repository ─> Database
BullMQ Worker   ┘
```

Controllers, MCP handlers, and BullMQ processors should not contain business logic. They translate protocol-specific inputs into service/use-case calls and translate errors/results back to the transport.

## Why It Is Deferred

1. The MCP foundation needs a private OpenWebUI integration before a broad backend runtime refactor.
2. The current REST route contracts are already grouped by prefix and authorization boundary, so a runtime split can be incremental.
3. BullMQ is not yet in the codebase; worker runtime decisions should land with the first concrete async job surface.
4. Package extraction is premature until multiple real consumers stabilize the shared business interfaces.

## Decision Gates for Promotion

Promote to a PRD or implementation design when any of these are true:

1. MCP adds more than narrow read-only lookups and its module graph starts importing broad orchestration modules.
2. BullMQ notification or report workers are selected for active implementation.
3. Admin-only APIs require a different deployment, network, or access posture from studio/user APIs.
4. Route/module ownership becomes a blocker for review, testing, or deploy confidence.
5. Public partner MCP access is planned and needs a separate runtime or registry from internal MCP tools.

## Implementation Notes

### Near-term MCP cleanup

- Keep `main.mcp.ts` as a separate Railway service.
- Slim `McpAppModule` so it imports narrow read/use-case modules instead of broad REST orchestration modules.
- Keep private-only tools out of future public MCP registries unless they pass explicit RBAC and partner-scope review.
- Use [Public MCP Access Control](./public-mcp-access-control.md) before attaching a public domain or accepting partner/client MCP traffic.

### Worker runtime shape

- Add `main.worker.ts` and `WorkerAppModule` when BullMQ is introduced.
- REST endpoints enqueue jobs; worker processors execute jobs.
- Worker processors call services/use-cases; they do not call REST controllers and do not own business rules.
- Worker runtime health checks should be minimal and private.

### REST boundary cleanup

- Keep route prefixes aligned with audience boundaries: `admin/*`, `studios/:studioId/*`, `me/*`, and explicit integration prefixes.
- Avoid adding new cross-audience controllers under generic route prefixes.
- Move repeated authorization role sets into named policy constants before splitting runtime modules.
- Consider separate REST runtime modules only after the current route groups need different deploy/network posture.

### Package extraction

- Keep pure business rules in framework-free `lib/` files when they are likely to be reused.
- Extract a package only after the interface has a real second consumer and no NestJS/Prisma dependency leakage.
