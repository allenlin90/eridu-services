# PR Quality Gate - Persistent Memory

## Index of Topic Files
- `data-table-patterns.md` — DataTable component, system route migration, admin-table removal
- `upload-presign-patterns.md` — R2/S3 upload patterns, USE_CASE_RULES, browser-upload package
- `studio-scoped-patterns.md` — Studio lookup, membership endpoint, IDOR guard, @StudioParam
- `studio-shift-schedule-patterns.md` — Shift schedule feature patterns (feat/studio-shift-schedule)
- `moderation-workflow-patterns.md` — Moderation loop, idb-keyval draft persistence
- `studio-member-roster-patterns.md` — Studio member roster CRUD (PR #28), isSelf logic, version descope, filterFn dead code
- `studio-creator-roster-patterns.md` — Creator roster CRUD (PR #30), duplicate validation, updateWithVersionCheck 3-query pattern, CREATOR_INACTIVE_IN_ROSTER hardcoded string

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

### JsonForm Upload Cache Pattern (confirmed in json-form-upload-fix PR)
- Two-phase submit: `validateBeforeSubmit()` exempts pending-file fields from blocking Zod errors, then `flushPendingFileUploads()` uploads and writes URLs.
- Image compression happens at file-select time (stored in `pendingFilesByKey[key].file` as prepared file). The flush path uploads the already-prepared file — no second `prepareImageForUpload` call during submit.
- `uploadedFileCacheRef` keyed by fieldKey, stores `{ fingerprint, fileUrl }`. Fingerprint = `name:size:type:lastModified`. Cache reuse is safe because the same fingerprint implies same bytes.
- `clearUploadedFileCache()` must be called only after successful API submit (inside the success branch, not `finally`). Both `task-execution-sheet.tsx` and `studio-task-action-sheet.tsx` follow this correctly.
- Per-field cache invalidation: when user selects new file or clears a field, `delete uploadedFileCacheRef.current[key]` is called synchronously before setting new pending state.
- `handleFormChange` wrapper pattern warning: wrapping `useDebounceCallback` result in an inline arrow function creates a new function reference each render. JsonForm's `onChange` useEffect dep on this unstable ref causes form.watch() subscription churn on every parent re-render. Should use `useCallback` for stable identity.

### Task Reporting Feature Patterns (feat/task-submission-reporting) — MERGED (final state after df5d5cd4)
- `TaskReportDefinition` Prisma model has `version` field (added in fix commit). Optimistic lock check is in service layer (`existing.version !== payload.version` → 409 conflict). `version: { increment: 1 }` is passed inside `data` to repository. CORRECT.
- `TaskReportDefinitionRepository` now uses `txHost.tx` via `delegate` getter for all write operations. Matches established pattern in creator/shift/show repositories. CLS module is global — no local module import needed.
- `TaskReportScopeRepository` uses `this.prisma` directly (not `txHost`) — intentional. Read-only analytics class, never participates in transactions.
- `TaskReportDefinitionRepository.updateInStudio()` accepts `Prisma.TaskReportDefinitionUpdateInput` in its params type — acceptable. Service never imports Prisma; passes plain-compatible object.
- `TaskReportScopeRepository` exported types contain `Prisma.JsonValue` — services use via `Awaited<ReturnType<...>>` inference without importing `Prisma` directly. Accepted pattern.
- `getTaskReportSourcesQuerySchema` uses `superRefine` + typed `.transform()` instead of inner `.parse()`. Correct — inner Zod parse inside a transform bypasses ZodValidationPipe and exposes raw ZodError to caller.
- `sharedFieldsListSchema` in `StudioService` uses `safeParse` + `HttpError.internalServerError()` — keeps error propagation in the service layer. CORRECT.
- `readStringValues` only definition is in `filter-rows.ts` (exported). `view-filter-options.ts` imports from `filter-rows.ts`. No duplication.
- `TASK_REPORT_SYSTEM_COLUMN.SHOW_ID` = `'show_id'` (plain string, not BigInt). Intentional — show UIDs safe to expose.
- `studioMembership!.role as StudioRole` — established pattern; guard guarantees membership exists.
- `eslint-disable-next-line react-hooks/incompatible-library` above `useVirtualizer` — standard TanStack Virtual suppression.
- `enforcePreflightLimit` makes 2 parallel COUNT queries before extraction — intentional Layer 1 guardrail. Show-exceeds branch checked first; task-exceeds falls through. When BOTH exceed, only the show message is shown (asymmetric). Known deferred follow-up.
- 409 conflict on definition update now handled in FE `useTaskReportDefinitionMutations.updateMutation.onError` with specific "reload" message. FIXED in df5d5cd4.
- `console.error` removed from mutation hook `onError` callbacks. Two `console.error` calls remain in COMPONENT-LEVEL try/catch blocks (`report-builder.tsx:247`, `task-report-definitions-viewer.tsx:76`). These are inside `handleSaveDefinition` and `handleDelete` respectively — pre-pattern, non-blocking. Acceptable for now.
- `date_preset` accepted in API scope but never resolved to a date range on the backend. FE resolves preset to explicit dates before sending request. Intentional per PRD.
- `parseDateBoundary` in `TaskReportScopeService` uses local-tz parse (`new Date(\`\${date}T00:00:00\`)`). Intentional — matches existing show/task filtering behavior. See `combineDateAndTime` pattern note above for context.
- `sortedAllRows` (pre-filter sorted rows) is used for CSV export; `sortedRows` (post-filter) is used for the visible table. This is correct — CSV exports all rows regardless of view filters.

### TaskTemplateResetService: Deliberate Prisma-in-Service Exception
`task-template-reset.service.ts` is an internal operator-only migration aid (not a regular domain service).
It uses `PrismaService` directly and imports `Prisma.TaskWhereInput` for `buildRelatedTaskWhere()`.
This is INTENTIONAL — it's a one-off script service accessed only via CLI, not through HTTP controllers.
Accept this pattern for internal reset/migration services that are not in the regular request path.
The `Prisma.*` import is type-only (`import type`) — it does not bleed into public API contracts.

### TaskTemplateModeratorCsvService: Same Script-Service Exception
`task-template-moderator-csv.service.ts` injects `PrismaService` directly to do a raw `taskTemplate.count()`
in `planMigration()`. This is also an internal operator tool, same exception applies.

### Double-planReset in Migration Execution Chain
`executeMigration` in `TaskTemplateModeratorCsvService` calls `planMigration` (which calls `resetService.planReset`),
then calls `resetService.executeReset` (which internally calls `planReset` again).
This causes **two sequential planReset DB round-trips** for the reset portion of a migration.
For an operator script used infrequently on small datasets, this is acceptable overhead.
Flag as a WARNING (not blocking) in future reviews of this service.

### templateKind filter: JSONB path probe via `metadata.loops[0]`
The `templateKind` filter in `task-template.repository.ts` uses Prisma JSONB path query:
`currentSchema -> 'metadata' -> 'loops' -> '0'` — presence means moderation, absence means standard.
`STANDARD` filter wraps the same check in `NOT`. Both work at DB level (PostgreSQL jsonb operators).
This is the canonical approach for detecting moderation templates until a DB-level `templateKind` column is added.

### Studio Creator Onboarding Patterns (PR #32) — MERGED
- `StudioCreatorService.onboardCreator` is `@Transactional()`. Both `CreatorService.createCreator` and `StudioCreatorRepository.createRosterEntry` use `txHost.tx` internally so they participate correctly.
- `UserRepository.searchUsersForCreatorOnboarding` uses `this.model.findMany` (PrismaModelWrapper backed by static `prisma.user`). This is a read-only method never called inside a transaction — acceptable.
- `onboardCreatorInputSchema` in `@eridu/api-types` re-uses `studioCreatorRosterDefaultsInputSchema` (private base schema) for the `roster` sub-object. This enforces compensation validation in the shared package layer, not duplicated in the API layer.
- `userUidSchema` validates `user_id` starts with `'user_'` (not the UID_PREFIXES constant). Intentional — user UIDs use a fixed prefix not derived from the shared enum.
- Two separate action buttons in the roster table toolbar: "Onboard Creator" (new global identity) and "Add Creator" (add existing from catalog). This is a deliberate UX split that diverges from the design doc's single "Add Creator" flow — but is consistent with SOLID split into `OnboardCreatorDialog` + `AddStudioCreatorDialog`.
- `BulkCreatorAssignmentDialog.onSuccess` prop type stays `() => void` (no args). The internal `useBulkAssignCreatorsToShows.onSuccess` receives the full response and decides internally whether to call the prop's `onSuccess`. This intentional layering is correct.
- `show-orchestration.service.ts` fix: `existingAssignment` (already-active) check now comes BEFORE roster check so idempotent re-assignment of a previously-assigned creator is always skipped, even when that creator has since left the roster. This is intentional.
- Schema spec file `studio-creator-onboard.schema.spec.ts` lives in `apps/erify_api/src/studios/studio-creator/schemas/` but tests `@eridu/api-types` schemas. This is non-standard but accepted — it co-locates validation tests near the DTO that consumes those schemas.
- `OnboardStudioCreatorDto` uses `.transform()` in `createZodDto()` to convert snake_case wire format to camelCase. The controller then re-reads `dto.creator.name`, `dto.creator.aliasName` (already camelCase). This is correct; the `declare` fields on the class reflect the post-transform shape.

### Studio Show Management Patterns (PR #36 — feat/phase4-1e-show-management-design) — THIRD REVIEW CYCLE (FINAL)
- `ShowWithPayload<T>` is defined in `show.schema.ts` (schema layer, Prisma-ok). The management service imports it as `import type` for use in a PRIVATE method return type only — accepted.
- `ShowCreateData`/`ShowUpdateData` type aliases (in management service via `Parameters<ShowRepository['create/update']>[N]`) effectively alias Prisma input types without importing Prisma directly. Used only in private builder methods. Accepted gray area.
- The private builder methods (`buildCreatePayload`, `buildCreateRestorePayload`, `buildUpdatePayload`) construct Prisma relation objects (`{ connect: { uid: ... } }`) inside the service. Accepted for now since types are not in public signatures.
- `studio-lookup.controller.ts` TS2345 (partial ListClientsQueryDto) was FIXED in commit 6b49c8d7 with full object including `page, limit, take, skip, sort`.
- BLOCKING REGRESSION from commit 6b49c8d7: `declare` fields added to `CreateStudioShowDto`/`UpdateStudioShowDto` to fix controller errors broke the spec files' `satisfies` assertions. The test objects don't include `externalId`, `metadata`, `studioRoomId` properties required by the new `declare` overrides. 5 TS errors in 2 spec files.
  - `studio-show.controller.spec.ts` (lines 108, 112, 126, 130) — TS1360 and TS2345
  - `studio-show-management.service.spec.ts` (line 147) — TS2345
  - Fix: update test objects to include missing optional fields as `undefined`, OR use type assertion `as CreateStudioShowDto` in tests instead of `satisfies`.
- `Show` Prisma model is MISSING `version` field (no optimistic locking). Known technical debt; deferred.
- `replaceShowPlatforms` uses `Promise.all([...toRestore.map(item => restoreAndUpdateAssignment(...))])` — N individual UPDATE queries for restores. Acceptable for MVP given typical platform count.
- `studioService.getStudioById` called in `createShow` for fast-fail 404 before transaction. Acceptable defense-in-depth (guard already validated membership but not studio existence per se).
- `getMutationErrorMessage` utility in `get-mutation-error-message.ts` is a clean shared helper — good pattern, should be extracted to shared `lib/` later if other features need it.
- `invalidateStudioTaskQueries` uses `refetchType: 'active'` on show-task invalidation — correct to avoid ghost fetches on non-mounted queries.
- `sidebar-config.test.tsx` updated to include "Shows" nav item in Operations section — test is in the pre-existing failing set due to `@eridu/auth-sdk/client/react` build issue, not a new regression.
- `updateShow` calls `getStudioById` to get `studio.id` (BigInt) for schedule ownership validation, but `existingShow.studioId` is already a BigInt field on the returned Show model. This is a redundant DB round-trip; the optimization is to use `existingShow.studioId` directly. Flagged as WARNING, not blocking.
- `studioShowDetailDto` uses `.pipe(studioShowDetailSchema as any)` — Zod 4 `.extend()` breaks pipe-compatibility due to internal branded types. The `as any` cast is intentional and documented in a comment. The output is structurally validated by `studioShowDetailSchema` at runtime. Accepted.
- `erify_api` typecheck fails in this worktree due to missing generated Prisma client (`.prisma/client/default`). All TS errors shown are pre-existing worktree setup issues, not regressions from this PR. `erify_studios` typecheck passes clean.
- FE form `studioShowFormSchema` overrides `schedule_id` to be required (`startsWith(...)`). The underlying `createStudioShowInputSchema` marks `schedule_id` as optional. This is an intentional tightening — the management form requires a schedule; external imports that skip schedule are for programmatic creation only.
- `useUpdateStudioShow` does NOT invalidate `showLookupsKeys` on success, but `useCreateStudioShow` does. This asymmetry is intentional — creating a show may add it to lookup lists, updating does not change lookup data.

### Phase 4 Merge Program Policy (2026-03-11)
- Cross-session tracker: `docs/roadmap/PHASE_4_MERGE_PROGRAM.md`
- Merge strategy: scope-first branches from `master`, using `feat/phase-4-p-and-l` as reference only
- Policy: direct `mc` -> `creator` cutover is preferred (alpha/low-traffic), avoid adding new compatibility layers
- PR standard: one topic per PR, explicit in-scope/out-of-scope/rollback, verify touched workspaces before merge
