# NestJS Service Architecture & Capability Boundary Standard

okf_version: "0.2"
type: architecture_doctrine
status: active
stale_after: "2027-01-01"

## Overview

Canonical service layer patterns for NestJS applications (`apps/erify_api`, `apps/eridu_auth`).

## Service Layering Rules

1. **Capability Services (Use Case Services)**:
   - High-level orchestration services (e.g. `ShowCatalogService`, `ShiftScheduleService`).
   - Own business transactions (`TransactionHost.tx`), cross-module communication, and external UID translation (`{prefix}_{nanoid}`).
   - Inject domain repositories or lower-level model services.
2. **Model Services**:
   - Encapsulate raw Prisma model operations or entity CRUD when multi-step validation is needed.
   - Must NOT own business transactions across modules.
3. **Repository Layer**:
   - Provide typed queries (`findMany`, `create`, `update`).
   - Must be stateless and transactional-context transparent (`TransactionHost.tx`).
4. **UID Invariant**:
   - Controller endpoints consume and return public string UIDs (`show_xyz123`).
   - Internal integer database IDs stay internal to service and repository implementations.
