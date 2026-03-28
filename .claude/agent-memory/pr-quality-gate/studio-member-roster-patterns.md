---
name: Studio Member Roster Patterns
description: Patterns, decisions, and findings from the feat/studio-creator-roster PR (#28) implementing studio member roster CRUD.
type: project
---

## Feature: feat/studio-member-roster — PR #28

### Scope
- BE: 4 CRUD endpoints `/studios/:studioId/members`
- FE: Studio Members page under Studio Settings, `DataTable` + server-side search/pagination
- `@eridu/api-types`: `studioMemberResponseSchema`, `addStudioMemberRequestSchema`, `updateStudioMemberRequestSchema`, `STUDIO_MEMBER_ERROR`
- `@eridu/ui`: `DataTableCore` now conditionally registers `getFilteredRowModel`/`getPaginationRowModel` only when not in manual mode

### Architecture Decisions

**StudioMembership does not have `version` field.**
The original PRD required `version` for optimistic locking on PATCH. This was deliberately descoped.
PATCH is now last-write-wins. The PR correctly removes version from PRD, docs, and error codes.
This is acceptable for the current stage — flag as WARNING in future reviews if the feature adds concurrent editors.

**`addStudioMember` in service: `connect` shape built in service layer.**
The service calls `createStudioMembership` with `user: { connect: { uid } }` and `studio: { connect: { uid } }`.
This is an established pattern in this file (line 44 of service.ts does the same for the original `createStudioMembership`).
This is acceptable as `createStudioMembership` in the repository accepts `Prisma.StudioMembershipCreateInput` and
the connect shape is intrinsic to how Prisma relations work. The service does not build WHERE clauses.

**StudioMembershipRepository does NOT use `txHost.tx`.**
The repository injects `PrismaService` directly (not CLS `TransactionHost`). This is pre-existing debt for the entire
`StudioMembershipRepository` class, not introduced by this PR. New methods (`updateStudioMember`, `listStudioMembersWithUser`,
`findByUserAndStudioIncludingDeleted`) follow the same existing pattern.
Flag as WARNING that this repository is not transaction-safe for multi-step operations if a transaction context is needed.

### Security: isSelf determination is email-based (not membership UID)
FE determines isSelf by comparing `currentUserEmail` (from session) to `member.user_email` (from API).
BE uses membership UID from `request.studioMembership.uid` for self-remove/self-demotion guard.
These use different identity signals — correct and safe because:
- FE: email comparison disables the role field / hides delete button (UX guard, not security)
- BE: membership UID comparison enforces the actual guard (security)
Email comparison on FE is case-insensitive (`.toLowerCase()`). Correct.

### findByEmail: Case-sensitive match
`UserRepository.findByEmail` uses exact match (`where: { email }`). Postgres collation is case-sensitive by default.
If a user registers with 'Jane@example.com' and admin types 'jane@example.com', the lookup fails.
This is a pre-existing limitation in user repository, not introduced here. Flag as WARNING.

### FE: Redundant client-side filterFn on `user_name` column
`member-columns.tsx` defines a `filterFn` on the `user_name` column that does client-side name+email filtering.
The table uses `manualFiltering: true`, so `@tanstack/react-table` skips this filterFn entirely.
The filterFn is dead code but harmless. Could be confusing to future readers.

### URL Search Schema min limit is 10 (FE)
`studioMembersSearchSchema` has `z.coerce.number().int().min(10).max(100)`.
The minimum limit is 10, but the backend allows limit as low as 1 (via `listStudioMembersQuerySchema`).
This is intentional — the FE enforces a minimum page size of 10 for UX reasons.

### ReadBurstThrottle applied only to GET
Only the `listMembers` GET endpoint has `@ReadBurstThrottle()`. POST/PATCH/DELETE have no explicit throttle decorator.
`@StudioProtected` includes `ThrottlerGuard` in the guard chain, so write mutations are rate-limited by the global
throttler, not the burst throttle. This is consistent with other studio write endpoints.

### StudioService imported but only used for UID_PREFIX constant
`StudioMembersController` imports `StudioService` only to reference `StudioService.UID_PREFIX` as the prefix
argument to `UidValidationPipe`. No `StudioService` is injected into the controller constructor.
This is consistent with other studio controllers (e.g., `studio-membership.controller.ts`).
