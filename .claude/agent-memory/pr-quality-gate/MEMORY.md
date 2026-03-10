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
- `StudioMc` (studio_creators table) missing `version` field — introduced in feat/phase-4-p-and-l; deferred

### Phase 4 (feat/phase-4-p-and-l): MERGED — Resolved Issues

All 3 original blocking issues were fixed in commit `a6cc9b02`:

**FIXED: StudioMc Repository soft-deleted creator leak**
`mcWhere` object (with `deletedAt: null`) now always applies unconditionally, not just in the search branch.
File: `apps/erify_api/src/models/studio-mc/studio-mc.repository.ts`

**FIXED: Bulk assignment roster scope enforcement**
After resolving creators by UIDs, orchestration service now cross-checks active `StudioMc` rows for the requesting studio. Throws `HttpError.badRequest` with unrostered creator UIDs listed.
File: `apps/erify_api/src/studios/studio-show/studio-show-mc.orchestration.service.ts`

**FIXED: Bulk assign restore field clearing**
`restoreAndUpdateAssignment` now uses conditional spread (`...(params.note !== undefined && { note: params.note })`) so omitted fields are not overwritten.
File: `apps/erify_api/src/models/show-mc/show-mc.repository.ts`

**FIXED: FE route access — new roles added to STUDIO_ROLE_LEVEL**
`TALENT_MANAGER`, `DESIGNER`, `MODERATION_MANAGER` now mapped in `studio-route-access.ts`. Fixed in commit `ce6b5ed1`.

**Remaining deferred tech debt (not blocking):**
- `StudioMc` `version` field — RESOLVED: added to schema + migration SQL + `updateById` auto-increments, `updateByIdWithVersionCheck` enforces optimistic locking via `updateMany` + `VersionConflictError`
- `listUserCatalog` still uses take:1000 + client-side filter — correctness risk at >1000 members (deferred)

**Migration: single consolidated migration for Phase 4**
`apps/erify_api/prisma/migrations/20260309140327_phase4_economics_foundation/migration.sql` contains all Phase 4 schema changes:
- Table renames: `mcs`→`creators`, `show_mcs`→`show_creators` (non-destructive, with constraint/index renames)
- `ShowPlatform` new columns: `gmv`, `sales`, `orders`
- `MC`/`ShowMC` new compensation columns
- `StudioMc` (studio_creators) new table
- Backfill SQL: `studio_creators` seeded from historical show assignments
One migration only — confirmed consolidated.

**Economics service: StudioMc import**
`StudioEconomicsService` imports `StudioMc` type from `@prisma/client` for the `resolveStudioMcDefaults` helper parameter type. This is acceptable — entity types from `@prisma/client` are allowed in services; only `Prisma.XxxInput/WhereInput/etc.` construction is forbidden.
