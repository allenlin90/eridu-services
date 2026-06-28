# Ideation: Public MCP Access Control

> **Status**: Deferred ideation
> **Origin**: MCP foundation architecture review
> **Related**: [MCP Server](../../apps/erify_api/docs/MCP_SERVER.md), [Backend Runtime Boundaries](./backend-runtime-boundaries.md), [System Architecture Overview](../engineering/ARCHITECTURE_OVERVIEW.md), [eridu_auth](../../apps/eridu_auth/README.md), [RBAC Roles](../features/rbac-roles.md)

## What

Define the authentication, authorization, rate limiting, and abuse-control model required before an MCP surface is exposed to partners, clients, or other public internet callers.

The current MCP foundation is private-first: OpenWebUI calls the MCP service through Railway private networking, the service has no public production domain, and access is constrained to a small read-only registry plus `MCP_ALLOWED_STUDIO_IDS`. Public MCP access is a separate product/API posture and should not inherit the private runtime's assumptions.

## Boundary

Keep two access postures distinct:

| Surface | Audience | Endpoint posture | Access model |
| --- | --- | --- | --- |
| Private MCP | OpenWebUI first; LiteLLM later | Railway private service only | Internal network boundary, narrow studio allowlist, future app-to-app auth |
| Public MCP | Partners and client-owned services | Public domain or external ingress | `eridu_auth` API keys, RBAC/tool scopes, rate limits, audit attribution |

The public surface can be a separate Railway service, a separate route prefix, or a separate tool registry. A separate service is the clearest starting point when partner/client access needs different deploy, monitoring, and abuse-control behavior from internal OpenWebUI usage.

## Authentication

Use `eridu_auth` as the authority for external MCP callers. Better Auth API keys are already available in the auth service and its schema includes key lifecycle and rate-limit fields.

The public MCP design needs explicit contracts for:

- API key issuance and ownership: partner, client, user, or organization identity.
- Key binding to environment and tenant/studio scope.
- Rotation, expiration, revocation, and disabled-key behavior.
- Audit attribution from MCP request to API key owner and effective studio.
- Whether first-party user clients use JWT/session auth while partner services use API keys.

Private OpenWebUI and LiteLLM traffic can use a lighter internal app-to-app mechanism, but it should still produce caller identity for logs and audit events.

## Authorization

Public MCP authorization should be deny-by-default and tool-scoped. A valid API key should not automatically grant every tool available to private internal clients.

Authorization should include:

- Tenant/studio binding for every request.
- Tool-level permissions or scopes, such as `shows:read` and `tasks:read`.
- Role or policy mapping when a tool needs existing `erify_api` studio/admin semantics.
- Response shaping that continues to expose only UID-based records.
- Cross-studio denial before service calls that can load records by UID.

Private-only operational tools should remain out of the public registry unless they pass a partner/client scope review.

## Rate Limiting And Abuse Controls

Rate limiting should be enforced before expensive tool execution and should combine:

- Per-key limits using the Better Auth API key rate-limit fields.
- Per-studio or per-tenant limits so one key cannot overload a shared tenant surface.
- Global public MCP limits for burst and sustained traffic.
- Request body size limits, tool argument validation, timeouts, and concurrency caps.
- Structured logs for denied, throttled, timed-out, and failed requests.

The private in-cluster MCP service can use different operational limits from a public partner service, but both should keep timeout and request-size ceilings.

## Runtime Direction

Public MCP should remain an adapter over shared services/use-cases, not a second business-logic implementation.

```text
Private MCP Tool ┐
Public MCP Tool  ├─> Use Case / Service ─> Repository ─> Database
REST Controller  ┘
```

Keep the public registry explicitly curated. Shared use-cases can be reused, but authentication, authorization, rate-limit, and audit middleware should be public-surface-specific.

## Decision Gates For Promotion

Promote this topic to a PRD or implementation design when any of these are true:

1. A public domain or external ingress is required for MCP.
2. A partner or client integration needs API-key-based MCP access.
3. MCP tools expand beyond narrow read-only lookups.
4. Tool access must differ by role, studio, client, or partner contract.
5. Rate-limit, audit, billing, or abuse-control behavior becomes part of the API contract.

## Open Questions

- Where should partners or clients create, rotate, and revoke MCP API keys?
- Should MCP tool scopes reuse Better Auth API key `permissions`, `metadata`, or a dedicated access table?
- Which audit model should record MCP tool calls and denied attempts?
- Do public MCP quotas map to key, studio, organization, or partner contract?
- Should public MCP be versioned separately from private internal MCP tools?
