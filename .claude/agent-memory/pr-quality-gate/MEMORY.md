# PR Quality Gate - Persistent Memory

## Index of Topic Files
- `data-table-patterns.md` — DataTable component, system route migration, admin-table removal
- `upload-presign-patterns.md` — R2/S3 upload patterns, USE_CASE_RULES, browser-upload package
- `studio-scoped-patterns.md` — Studio lookup, membership endpoint, IDOR guard, @StudioParam
- `studio-shift-schedule-patterns.md` — Shift schedule feature patterns (feat/studio-shift-schedule)
- `moderation-workflow-patterns.md` — Moderation loop, idb-keyval draft persistence

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

### Phase 4 Merge Program Policy (2026-03-11)
- Cross-session tracker: `docs/roadmap/PHASE_4_MERGE_PROGRAM.md`
- Merge strategy: scope-first branches from `master`, using `feat/phase-4-p-and-l` as reference only
- Policy: direct `mc` -> `creator` cutover is preferred (alpha/low-traffic), avoid adding new compatibility layers
- PR standard: one topic per PR, explicit in-scope/out-of-scope/rollback, verify touched workspaces before merge
