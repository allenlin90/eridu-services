# PR Quality Gate - Persistent Memory

## Index of Topic Files
- `data-table-patterns.md` — DataTable component, system route migration, admin-table removal
- `upload-presign-patterns.md` — R2/S3 upload patterns, USE_CASE_RULES, browser-upload package
- `studio-scoped-patterns.md` — Studio lookup, membership endpoint, IDOR guard, @StudioParam
- `studio-shift-schedule-patterns.md` — Shift schedule feature patterns (feat/studio-shift-schedule)
- `moderation-workflow-patterns.md` — Moderation loop, idb-keyval draft persistence

## Review Methodology (CRITICAL)

**Tests confirm intent but do not verify implementation.**

- Always read the actual implementation files. Do not infer correctness from a passing test suite.
- When a PR includes test changes, read both the test and the code: verify the test would fail if the logic reverted, assertions check arguments (not just call count), and mocks don't mask incorrect query construction.
- Report a fix as "verified" only after reading the corrected code and confirming the logic is sound.
- Flag tests updated to match new behavior without clear rationale — that is a coverage regression, not a fix.

## Cross-Cutting Patterns (Quick Reference)

### Service Layer Rule: No Prisma.* Types
Services MUST NOT import `Prisma.*` types — including `Prisma.JsonValue`, `Prisma.ShowGetPayload`, etc.
Use `unknown` or a local structural type alias instead. Only the repository layer can use Prisma types.
- `studio-shift.service.ts` — CLEAN. No Prisma imports; uses local JsonValue/JsonObject alias and repository pass-through.
- `shift-alignment.service.ts` — CLEAN (fixed in feat/studio-shift-schedule PR review). Replaced `Prisma.ShowGetPayload<>` with local `ShowWithPlanningContext` interface; replaced `TaskType` enum with `REQUIRED_SHOW_TASK_TYPES` string literal array.

### Schema Layer: Internal BigInt Risk Mitigated
Previously flagged `studioShiftBlockSchema` with `id: z.bigint()` — this was CORRECTED in the final branch.
The schema now uses `_internalShiftBlockShape` (prefixed with `_` to signal internal use only) which has no BigInt fields.
The BigInt PKs exist only in repository code (`StudioShiftWithRelations` type). No public Zod schemas expose BigInt.

### @StudioParam() vs @Param() in Studio Controllers
Established pattern: studio-scoped routes should use `@StudioParam()` to read from `req.studioMembership.studio.uid`.
`studio-shift.controller.ts` and `shift-calendar.controller.ts` use `@Param('studioId', UidValidationPipe)` instead.
This is a pattern inconsistency (not a security bypass — StudioProtected guard still validates membership).
Flagged as warning in all shift controller reviews. **Note**: `@StudioParam()` decorator does not actually exist in the codebase — confirmed false positive. All studio controllers use `@Param('studioId', new UidValidationPipe(...))` consistently.

### Universal Model Fields: version is mandatory
All writable models must have `version: number` for optimistic locking.
`StudioShift` and `StudioShiftBlock` are MISSING this field — introduced in feat/studio-shift-schedule.
This is technical debt deferred to next migration pass. See `known-issues.md`.

### Repository Pattern: CLS Transaction Participation
All repositories must use `this.txHost.tx` (CLS transaction adapter) instead of `this.prisma` directly.
`StudioShiftRepository` — FIXED in feat/studio-shift-schedule PR review. Now injects `TransactionHost<TransactionalAdapterPrisma>` and uses `this.txHost.tx.*` via a `delegate` getter for all DB calls.

### buildBlocksReplacePayload: Domain Type Pattern (RESOLVED)
Previously `buildBlocksUpdateData` constructed a Prisma nested write shape in the service layer.
FIXED in feat/studio-shift-schedule PR review:
- Renamed to `buildBlocksReplacePayload`, returns `BlocksReplacePayload` domain type (defined in schema, no Prisma imports)
- Repository builds the Prisma-specific `{ updateMany, upsert }` shape internally from `blocksPayload`
- Service never touches Prisma structure; only passes domain objects to repository

### combineDateAndTime: Timezone-Correct Implementation (RESOLVED)
Previous review noted a risk. The actual code is `new Date(`${date}T${time}:00`).toISOString()` which is LOCAL-time parse → UTC.
This is intentional and correct: user enters local time in form, we convert to UTC for the API.
`toDisplayDate()` uses `setFullYear`/`setHours` for local-clock display rendering — also intentional (date-only fields for display).
Both are correct. Remove the timezone-hazard warning from future reviews of this file.

### me/shifts Studio Existence Oracle (RESOLVED)
Previously `MeShiftsService.listMyShifts` called `studioService.findByUid` and threw 404 for unknown studio.
FIXED in feat/studio-shift-schedule PR review: check removed entirely. User-scoped DB query naturally returns
zero rows for an unknown or unrelated studio, so no existence information leaks to authenticated users.

### useStudioMemberMap Hard Limit
`STUDIO_MEMBER_MAP_DEFAULT_LIMIT = 200`, calendar uses `STUDIO_MEMBER_MAP_CALENDAR_LIMIT = 500`.
Shifts belonging to members beyond the limit show no name (silent truncation).
Fallback behavior: roster card shows `shift.user_name` (always present) and `user?.email ?? 'Member details unavailable'`.
This is a UX degradation, not a crash — acceptable for now. Flagged as warning.

### Known Technical Debt in erify_studios
- `console.error` in system route delete handlers — pre-existing, inconsistent
- `DataTableCore` alias in data-table index — for test mocks only
- `requiresActionSheet` duplicated between task hooks — should extract to shared util
- Task type label i18n hardcoded in 4 files instead of using `getTaskTypeLabel()`
- `handleSubmitAction` in `use-studio-tasks-page-controller.tsx` silently drops `options.onSuccess` — pre-existing
- `StudioShift`/`StudioShiftBlock` missing `version` field — introduced in feat/studio-shift-schedule; deferred
- `StudioMc` (studio_creators table) `version` field — RESOLVED in feat/phase-4-p-and-l: present in schema + migration + `updateById` auto-increments + `updateByIdWithVersionCheck` enforces optimistic locking

### Phase 4 (feat/phase-4-p-and-l): UNDER REVIEW — New Blocking Issues Found

Previously known backend fixes from commit `a6cc9b02` confirmed correct:
- StudioMc soft-deleted creator leak: FIXED
- Bulk assignment roster scope enforcement: FIXED
- Bulk assign restore field clearing: FIXED
- FE STUDIO_ROLE_LEVEL gaps: FIXED

**New Blocking Issues Found in Final PR Review (2026-03-10):**

**BLOCKING: `tsconfig.app.json` reveals 48 production-file type errors in erify_studios**
- `pnpm --filter erify_studios typecheck` uses root `tsconfig.json --noEmit` which DOES NOT catch these errors.
- Running `tsc -p tsconfig.app.json` in erify_studios reveals 48 errors in production files (non-test).
- Root cause: the "mc → creator" field rename was partially applied in the FE layer.

**BLOCKING: `bulk-creator-assign-dialog.tsx` — stale field access after rename**
Accesses `assignment.creator_id`, `assignment.creator_name`, `assignment.creator_aliasname` but
`ShowWithTaskSummaryDto.mcs` still has `mc_id`, `mc_name`, `mc_aliasname` fields. Runtime crash on bulk dialog open.
File: `apps/erify_studios/src/features/studio-show-creators/components/bulk-creator-assign-dialog.tsx:73-83`

**BLOCKING: `add-creator-dialog.tsx` — arity mismatch**
`useCreatorAvailabilityQuery(studioId, showStartTime, showEndTime)` called with 3 args but function signature
only accepts `(studioId, windows: AvailabilityWindow[])` (2 args). Runtime crash on dialog mount.
File: `apps/erify_studios/src/features/studio-show-creators/components/add-creator-dialog.tsx:42`

**BLOCKING: `studio-helper-roster-manager.tsx` — missing `ext_id` on FE Membership type**
Accesses `membership.user.ext_id` (lines 164, 267) but `Membership.user` type in `get-memberships.ts`
only declares `{ id, email, name }`. BE schema includes `ext_id` but FE type doesn't expose it.
File: `apps/erify_studios/src/features/memberships/components/studio-helper-roster-manager.tsx`

**BLOCKING: `studio-membership.service.ts` uses `Prisma.InputJsonValue` (service layer violation)**
`toggleTaskHelperStatus()` casts metadata to `Prisma.InputJsonValue` at line 246. Repository signature for
`updateMetadataIfUnchanged` takes `metadata: Prisma.InputJsonValue` — the Prisma type leaks to the service.
Service should cast to `unknown` or define a local `JsonValue` alias instead.
File: `apps/erify_api/src/models/membership/studio-membership.service.ts:246`

**BLOCKED: `mapping.tsx` — `Badge` used without import**
`Badge` is used in creators column cells (lines 80-90) but not imported from `@eridu/ui`.
Typecheck and Vite build pass due to module bundling quirks, but the component reference is undefined at runtime.
File: `apps/erify_studios/src/routes/studios/$studioId/creators/mapping.tsx:80-90`

**Deferred tech debt (not blocking):**
- `listUserCatalog` N+1 DB pattern — bounded by max 50 limit, acceptable
- `StudioMc` `version` field — confirmed present in schema, migration SQL, and enforced in repository

**Economics service: StudioMc import**
`StudioEconomicsService` imports `StudioMc` type from `@prisma/client` for `resolveStudioMcDefaults`. ACCEPTABLE —
entity types from `@prisma/client` are allowed in services; only `Prisma.XxxInput/WhereInput/etc.` is forbidden.
