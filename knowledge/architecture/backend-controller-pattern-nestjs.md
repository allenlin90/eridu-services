# NestJS Controller Architecture Standard

okf_version: "0.2"
type: architecture_doctrine
status: active
stale_after: "2027-01-01"

## Overview

Canonical controller patterns for NestJS API endpoints in `apps/erify_api`.

## Controller Rules

1. **Thin Controllers**: Controllers contain NO business logic, database queries, or data transformation. Their sole job is request routing, guard binding, DTO parsing, and delegating to Capability Services.
2. **DTO & Validation**: All query parameters and request bodies must be validated via Zod schemas or NestJS validation pipes.
3. **Response Formatting**: Return typed response objects matching shared `@eridu/api-types` contracts.
4. **Guards & Authorization**: Decorate endpoints with `@UseGuards(JwtAuthGuard, RolesGuard)` or domain permission decorators (`@RequirePermission(...)`).
