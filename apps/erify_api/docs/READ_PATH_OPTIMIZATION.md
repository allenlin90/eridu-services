# Read-Path Optimization

> Status: Implemented, March 2026

This document records the shipped backend read-path optimization pass for `erify_api`. The work reduced over-fetching in existing endpoints without changing API contracts or user-facing behavior.

## Scope

The implemented optimization pass covers:

- show list and studio/me show DTO reads
- show orchestration reads used for creator/platform assignment flows
- studio show reads used by task summary and single-show task pages
- admin task-template usage list reads

The pass does not change pagination contracts, business rules, or response schemas.

## Canonical Source Files

- Shared DTO-shaped include constants: `apps/erify_api/src/models/show/schemas/show.schema.ts`
- Show list/default service include shaping: `apps/erify_api/src/models/show/show.service.ts`
- Me shows read path: `apps/erify_api/src/me/shows/shows.service.ts`
- Studio task-summary query shaping: `apps/erify_api/src/models/show/show.repository.ts`
- Show orchestration default include shaping: `apps/erify_api/src/show-orchestration/show-orchestration.service.ts`
- Show orchestration assignment include constant: `apps/erify_api/src/show-orchestration/schemas/show-orchestration.schema.ts`
- Studio single-show task-page lookup shaping: `apps/erify_api/src/task-orchestration/task-orchestration.service.ts`
- Admin task-template usage list optimization: `apps/erify_api/src/models/task-template/task-template.repository.ts`

## Implemented Patterns

### 1. Shared DTO-shaped relation includes

Show-based endpoints now use shared relation include constants instead of repeating broad `include: true` trees inline.

Canonical constants:

- `showDtoListInclude` in `apps/erify_api/src/models/show/schemas/show.schema.ts`
- `showWithTaskSummaryInclude` in `apps/erify_api/src/models/show/schemas/show.schema.ts`
- `showWithAssignmentsInclude` in `apps/erify_api/src/show-orchestration/schemas/show-orchestration.schema.ts`

These constants project only the relation fields consumed by existing DTO transforms and endpoint responses.

### 2. Service-owned default query shape for generic reads

Generic repository methods remain flexible and continue accepting caller-provided includes. Services own the default include/select shape for endpoint-facing reads.

Canonical examples:

- `ShowService.getPaginatedShows()` in `apps/erify_api/src/models/show/show.service.ts`
- `TaskOrchestrationService.getStudioShow()` in `apps/erify_api/src/task-orchestration/task-orchestration.service.ts`

### 3. DTO-shaped repository methods for endpoint-specific reads

Specialized repository methods that already serve one response shape are allowed to return lean DTO-oriented projections instead of broad entity graphs.

Canonical examples:

- `ShowRepository.findPaginatedWithTaskSummary()` in `apps/erify_api/src/models/show/show.repository.ts`
- `TaskTemplateRepository.findPaginatedAdminWithUsage()` in `apps/erify_api/src/models/task-template/task-template.repository.ts`

### 4. Avoid full JSON/blob reads in list endpoints

List endpoints should not load full JSONB/document blobs when they only need one derived value or lightweight metadata.

Canonical example:

- `TaskTemplateRepository.findPaginatedAdminWithUsage()` reads `task_type` from `current_schema` without loading the full schema payload in `apps/erify_api/src/models/task-template/task-template.repository.ts`

## Boundary Rules

- Generic repository methods should stay reusable and caller-driven.
- Service layer should provide the default include/select shape for generic endpoint reads.
- Endpoint-specific repository methods may use DTO-shaped `select`/`include` projections.
- Large JSONB fields should stay out of list queries unless the list response explicitly needs them.

## Regression Coverage

Lean query shape regressions are covered by targeted specs:

- `apps/erify_api/src/models/show/show.repository.spec.ts`
- `apps/erify_api/src/models/task-template/task-template.repository.spec.ts`
- `apps/erify_api/src/show-orchestration/show-orchestration.service.spec.ts`
- `apps/erify_api/src/task-orchestration/task-orchestration.service.spec.ts`

## Follow-Up Boundary

This optimization pass intentionally stops at show/task-template read paths. Schedule planning, Google Sheets, and other adjacent read flows should be evaluated in separate performance passes so the scope remains reviewable and behavior-safe.
