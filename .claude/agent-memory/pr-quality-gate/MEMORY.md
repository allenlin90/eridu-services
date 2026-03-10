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

### Phase 4 (feat/phase-4-p-and-l): FINAL REVIEW COMPLETED 2026-03-10

**All previously noted blocking issues RESOLVED:**
- StudioMc soft-deleted creator leak: FIXED
- Bulk assignment roster scope enforcement: FIXED
- Bulk assign restore field clearing: FIXED
- FE STUDIO_ROLE_LEVEL gaps: FIXED
- `add-creator-dialog.tsx` arity mismatch: FIXED (now calls `useCreatorAvailabilityQuery(studioId, windows)` correctly)
- `studio-helper-roster-manager.tsx` missing `ext_id`: FIXED (now declared in `Membership.user` type)
- `studio-membership.service.ts` Prisma.InputJsonValue: FIXED (uses local `JsonValue` alias)
- `mapping.tsx` Badge missing import: FIXED (imported from `@eridu/ui`)

**Remaining Blocking Issues (must fix before merge):**

1. `tsconfig.app.json` reveals 25 production-file type errors in erify_studios (4 introduced by this branch).
   Newly introduced errors:
   - `show-tasks-table/columns.tsx:77` — TASK_ACTION_LABELS missing `SAVE_CONTENT` key (SAVE_CONTENT was added to api-types in this PR but labels map was not updated)
   - `show-form-fields.tsx:161` — `AsyncCombobox value` prop is `string` but `field.value` (studio_room_id) is `string | null`
   - `creators/mapping.tsx:105` — Link `search={{ from: 'creators' }}` missing required `page`/`pageSize` from parent `creatorsSearchSchema`
   - `shows/$showId/creators.tsx:40,46` — Links missing required `search` props for inherited search schemas

2. 1 ESLint warning (not error): `mapping.tsx:81` — `react/no-array-index-key` (using index as key in Badge list)

**Architecture status:**
- Service layer: CLEAN. No Prisma.* input/query types in any new services.
- Repository layer: CLEAN. All use `txHost.tx` delegate pattern.
- Migration SQL: Table renames + column adds are non-destructive. Backfill uses sequential UIDs
  (`smc_` + zero-padded number) in migration for initial roster bootstrap — not nanoid format.
  This is a WARNING (not blocking): backfill script will create proper UIDs for new records.

**Economics service: StudioMc import**
`StudioEconomicsService` imports `StudioMc`, `MC`, `ShowMC` entity types from `@prisma/client`. ACCEPTABLE —
entity types from `@prisma/client` are allowed in services; only `Prisma.XxxInput/WhereInput/etc.` is forbidden.

**`listMembershipUserCatalog` N+1 pattern:** Iterative pagination + per-page membership lookup. Bounded by `limit` (max 50), acceptable for now.
