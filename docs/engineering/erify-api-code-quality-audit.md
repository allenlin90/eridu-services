# erify_api Code Quality Audit

> Status: review note
> Scope: `apps/erify_api`
> Branch: `chore/agent-skills-audit`
> Date: 2026-04-24

## Scope

This audit validates the NestJS API against repo instructions, backend skills, and current design docs. The follow-up change corrected stale controller OpenAPI text only; no endpoint behavior was changed.

Skills used:

- `.agent/skills/engineering-best-practices-enforcer/SKILL.md`
- `.agent/skills/backend-controller-pattern-nestjs/SKILL.md`
- `.agent/skills/service-pattern-nestjs/SKILL.md`
- `.agent/skills/repository-pattern-nestjs/SKILL.md`
- `.agent/skills/database-patterns/SKILL.md`
- `.agent/skills/data-validation/SKILL.md`
- `.agent/skills/backend-testing-patterns/SKILL.md`
- `.agent/skills/erify-authorization/SKILL.md`
- `.agent/skills/secure-coding-practices/SKILL.md`
- `.agent/skills/api-performance-optimization/SKILL.md`
- `.agent/skills/observability-logging/SKILL.md`
- `.agent/skills/orchestration-service-nestjs/SKILL.md`

## Active Review TODO

Use this list for follow-up discussion and implementation planning.

| ID | Priority | Item | Proposed next step |
| --- | --- | --- | --- |
| API-1 | P2 | Admin schedule mutation audit attribution uses temporary user workarounds | Use the authenticated admin for audit attribution while preserving payload user IDs that represent client-selected target/change data |
| API-2 | P2 | Some admin action request bodies bypass Zod DTO schemas | Add DTO schemas for action payloads; do not remove legitimate target user fields |
| API-3 | P2 | `erify_api` lint rules do not enforce strict typing | Stage scoped cleanup and re-enable rules gradually |
| API-4 | P2 | Some service APIs expose Prisma query-shape and transaction details | Keep model/enums as lower-risk, but move include/get-payload and transaction-client shapes behind repository or local domain types |
| API-5 | P3 | Unused hard-delete helper exists for soft-deleted studio memberships | Remove or explicitly rename/document as hard delete |

## Findings

### API-1: Admin schedule mutation audit attribution still uses temporary user workarounds

Admin schedule flows still use schedule creator or payload user IDs in places where the service call appears to need an audit actor. Payload `user_id` / `created_by` values can be valid change data chosen by the client; the issue is that the current wiring does not clearly distinguish those target/change fields from the authenticated admin actor used for auditing.

Examples:

- `apps/erify_api/src/admin/schedules/admin-schedule.controller.ts:116`
- `apps/erify_api/src/admin/schedules/admin-schedule.controller.ts:175`
- `apps/erify_api/src/admin/schedules/admin-schedule.controller.ts:218`
- `apps/erify_api/src/admin/snapshots/admin-snapshot.controller.ts:65`

Why it matters:

- Admin routes are JWT-protected, and the repo already uses `@CurrentUser()` from `@eridu/auth-sdk` in me/studio/upload controllers.
- Client-supplied `created_by` / `user_id` fields may be valid payload fields for create/update/restore semantics, depending on the client workflow.
- Admin routes should consistently infer the audit actor from the authenticated or authorized user context when recording who performed an admin action.
- This sits on publish/restore paths that affect schedule state and show generation.

Recommendation:

- For admin routes, use `@CurrentUser() user: AuthenticatedUser` and resolve the internal user in a service helper.
- Preserve client-supplied `user_id` / `created_by` fields when they represent target/change data.
- Keep this policy in docs/skills rather than inline TODO comments; comments in these controllers became noisy and were removed.
- If a field is specifically an audit actor, name and document it as such; otherwise keep the payload semantics separate from audit attribution.

### API-2: A few admin action request bodies bypass Zod DTO schemas

Two admin controller methods use inline object types for external request bodies:

- `apps/erify_api/src/admin/schedules/admin-schedule.controller.ts:218`
- `apps/erify_api/src/admin/snapshots/admin-snapshot.controller.ts:65`

Why it matters:

- TypeScript annotations do not validate runtime input.
- `data-validation` and `secure-coding-practices` require Zod validation at every API boundary.
- These bodies carry UID-like fields and names used in state-changing admin workflows.

Recommendation:

- Add schemas/DTOs beside the schedule planning or snapshot schemas.
- Validate `name` length and `created_by` / `user_id` UID prefixes.
- Keep payload user fields when they are part of the create/update/restore contract; audit attribution should be added separately from authenticated admin context.

### API-3: `erify_api` lint rules no longer enforce the repo's strict typing expectation

`apps/erify_api/eslint.config.mjs:22` disables `@typescript-eslint/no-explicit-any`, and lines 35-40 disable the unsafe assignment/return/call/member-access rules. The static scan still found many `any` usages in production files, including guards, base repository helpers, dynamic schema fields, and selected service/controller casts.

Why it matters:

- `AGENTS.md` says to maintain strict typing and not bypass with `any` unless explicitly requested.
- Some `any` usage is legitimate around JSON metadata and schema passthroughs, but blanket rule disablement prevents review from distinguishing intentional escape hatches from avoidable ones.

Recommendation:

- Stage this rather than flipping rules globally in one PR.
- First replace avoidable non-schema `any` in guards and controller casts with concrete local types.
- Then add scoped ESLint overrides for expected JSON/schema surfaces and test helpers.
- Finally re-enable `no-explicit-any` as warning for production `src` before making it blocking.

### API-4: Some service APIs expose Prisma query-shape and transaction details

This item is valid, but it should be narrower than "all Prisma imports in services." The scan found three categories:

- `apps/erify_api/src/models/task/task.service.ts:101`
- `apps/erify_api/src/schedule-planning/validation.service.ts:145`
- `apps/erify_api/src/schedule-planning/schedule-planning.service.ts:17`
- `apps/erify_api/src/schedule-planning/schedule-planning.service.ts:187`
- `apps/erify_api/src/schedule-planning/schedule-restoration-processor.service.ts:28`
- `apps/erify_api/src/task-orchestration/task-generation-processor.service.ts:157`

Assessment:

- Lower-risk: imports such as `TaskStatus`, `TaskType`, `Schedule`, `Show`, or model return types are common legacy/service typing and not the first cleanup target.
- Higher-risk: `Prisma.TaskInclude`, `Prisma.TaskGetPayload`, `Prisma.ScheduleSnapshotGetPayload`, and `Prisma.TransactionClient | PrismaService` leak query shape or database client details into service-level APIs/helpers.
- JSON cast debt: `Prisma.InputJsonValue` casts in schedule/task processors are mostly persistence-boundary casts, but they still force services to import Prisma for JSON typing. `studio-shift.service.ts` already shows a better local JSON type approach.

Why it matters:

- `service-pattern-nestjs` and `AGENTS.md` prefer payload types defined in schema files, with services staying transport- and ORM-agnostic.
- Query-shape generics such as `Prisma.*Include` and `Prisma.*GetPayload` make service callers depend on repository/ORM include mechanics.
- Transaction-client parameters blur repository/service boundaries and make validation helpers harder to reuse outside Prisma-backed flows.

Recommendation:

- Treat this as architecture debt, not an emergency rewrite.
- Prioritize `TaskService.findTasksByShowIds`: the current overload exposes `Prisma.TaskInclude` and `Prisma.TaskGetPayload`; the two current callers only need fixed include shapes (`assignee/template` and `targets/template`), so named service methods or local result types would be clearer.
- For schedule planning, move `SnapshotWithScheduleInclude` and JSON payload types into schema/local domain types or repository return helpers.
- For validation, avoid passing `Prisma.TransactionClient | PrismaService` through service helper signatures; prefer repository/helper methods that own the transaction-aware query.
- For JSON writes, follow the `studio-shift.service.ts` approach with local JSON-compatible types where practical.

### API-5: Unused hard-delete helper exists for soft-deleted studio memberships

`apps/erify_api/src/models/membership/studio-membership.repository.ts:197` defines `deleteByUnique()` using a hard Prisma delete. Current service methods use `softDeleteByUnique()` instead, and repository/service tests assert soft delete behavior.

Why it matters:

- `StudioMembership` is soft-deletable.
- Keeping an unused hard-delete helper raises the chance of accidental future misuse.

Recommendation:

- Remove `deleteByUnique()` if there is no hidden caller.
- If a real hard-delete path is needed for maintenance, rename it to `hardDeleteByUnique()` and document the allowed use case.

## Confirmed Decisions And Fixed Items

### Google Sheets throttle skip is accepted design

`apps/erify_api/src/google-sheets/schedules/google-sheets-schedule.controller.ts:56` applies `@SkipThrottle()` at the class level. This was reviewed and confirmed as intentional for the Google Sheets integration surface, which is protected by `GoogleSheetsApiKeyGuard` and designed specifically for Apps Script schedule sync traffic.

Do not treat the class-level Google Sheets throttle bypass as a defect unless the API-key or upstream traffic policy changes.

### Schedule publish OpenAPI copy is fixed

`apps/erify_api/src/google-sheets/schedules/google-sheets-schedule.controller.ts:280` previously said publish "Deletes existing shows and creates new ones from plan document." Current docs and implementation say publish uses identity-preserving diff/upsert and status transitions instead:

- `apps/erify_api/docs/SCHEDULE_CONTINUITY.md`
- `apps/erify_api/docs/SCHEDULE_PLANNING.md`
- `apps/erify_api/src/schedule-planning/publishing.service.ts`

Change made:

- Updated the Google Sheets publish `@ApiOperation.description` to describe diff/upsert, missing-show status transitions, snapshot creation, publish marking, version increment, and optimistic locking.
- Added controller skill/rule guidance to update OpenAPI operation and response descriptions whenever controller behavior changes.

## Design Alignment

No economics endpoint mismatch was found on `master`: current Phase 4 docs state show economics and studio economics review are deferred/planned, and the source tree does not expose the planned `/studios/:studioId/economics` implementation. The docs are correctly explicit that the archived economics branch is not shipped.

## Structural Risks

Large backend files deserve planned decomposition when they are next touched:

- `apps/erify_api/src/models/task/task.repository.ts` - 1173 lines
- `apps/erify_api/src/schedule-planning/publishing.service.ts` - 891 lines
- `apps/erify_api/src/models/schedule/schedule.service.ts` - 756 lines
- `apps/erify_api/src/schedule-planning/validation.service.ts` - 708 lines
- `apps/erify_api/src/show-orchestration/show-orchestration.service.ts` - 596 lines
- `apps/erify_api/src/google-sheets/schedules/google-sheets-schedule.controller.ts` - 443 lines
- `apps/erify_api/src/admin/schedules/admin-schedule.controller.ts` - 345 lines

These are not correctness bugs by themselves. The risk is that controller/service boundaries and validation/auth attribution are harder to keep consistent as schedule and task behavior grows.

## Suggested Cleanup Order

1. Replace admin schedule audit workarounds with `@CurrentUser()` plus internal user resolution for audit attribution only.
2. Add Zod DTOs for admin schedule/snapshot action bodies while preserving legitimate client-selected payload user fields.
3. Tighten non-schema `any` usage in guards/base helpers, then re-enable lint rules gradually.
4. Decompose schedule planning publishing/validation around stable helper boundaries when behavior changes are already in scope.

## Validation Performed

- Ran `.agent/skills/engineering-best-practices-enforcer/scripts/scan-quality-signals.sh apps/erify_api`.
- Counted backend source files, controllers, services, and repositories.
- Scanned controller request bodies for inline object types.
- Scanned throttle decorators.
- Scanned Prisma imports in service files.
- Cross-checked schedule planning and continuity docs against controller descriptions and publishing implementation.
- Cross-checked Phase 4 economics docs against current source tree.

No `pnpm` commands were run for this review.
