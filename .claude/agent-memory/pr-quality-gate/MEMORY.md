# PR Quality Gate - Persistent Memory

## Index of Topic Files
- `data-table-patterns.md` — DataTable component, system route migration, admin-table removal
- `upload-presign-patterns.md` — R2/S3 upload patterns, USE_CASE_RULES, browser-upload package
- `studio-scoped-patterns.md` — Studio lookup, membership endpoint, IDOR guard, @StudioParam
- `studio-shift-schedule-patterns.md` — Shift schedule feature patterns (feat/studio-shift-schedule)
- `moderation-workflow-patterns.md` — Moderation loop, idb-keyval draft persistence

## Cross-Cutting Patterns (Quick Reference)

### Service Layer Rule: No Prisma.* Types
Services MUST NOT import `Prisma.*` types — including `Prisma.JsonValue`, `Prisma.SomeUpdateInput['field']`, etc.
Use `unknown` or a local structural type alias instead. Only the repository layer can use Prisma types.
`studio-shift.service.ts` has known violations (lines 2, 21, 142, 271-273, 279) — flagged as blocking in feat/studio-shift-schedule review.

### Schema Layer: No Internal BigInt IDs in Zod schemas
`studioShiftBlockSchema` (schemas/studio-shift.schema.ts lines 32-42) contains `id: z.bigint()` and `shiftId: z.bigint()`.
These are internal DB IDs. They never escape to the API (the transform maps `block.uid` → `id`), but having them in a named Zod schema is a risk. Always use internal-only shape names or drop the fields.

### @StudioParam() vs @Param() in Studio Controllers
Established pattern: studio-scoped routes should use `@StudioParam()` to read from `req.studioMembership.studio.uid` (set by StudioGuard). Using `@Param('studioId', UidValidationPipe)` directly is a pattern inconsistency (not a security bypass in current guard config). `studio-shift.controller.ts` and `shift-calendar.controller.ts` use `@Param()` instead — flagged as warning.

### Universal Model Fields: version is mandatory
All writable models must have `version: number` for optimistic locking. `StudioShift` and `StudioShiftBlock` are missing this field (pre-existing debt introduced in feat/studio-shift-schedule).

### API Contract Types: use @eridu/api-types, not local types
Complex orchestration response shapes (`StudioShiftCalendarResponse`, `StudioShiftAlignmentResponse`) are defined as local types in `studio-shifts.types.ts`, not as Zod schemas in `@eridu/api-types`. If the backend shape changes, the frontend types silently diverge. Always define non-trivial response shapes in `@eridu/api-types/<subpath>`.

### combineDateAndTime Timezone Hazard
`shift-form.utils.ts` uses `setFullYear`/`setHours` (local clock) to build ISO timestamps. This is timezone-dependent — the same inputs produce different UTC timestamps for users in different timezones. Correct approach: `new Date(`${date}T${time}:00`)` (local-consistent) or `Date.UTC(...)` (explicit UTC).

### useStudioMemberMap Hard Limit
`STUDIO_MEMBER_MAP_DEFAULT_LIMIT = 200`, calendar uses 500. Shifts belonging to members beyond the limit show no name (silent truncation). Consider a fallback label or paginating through all members.

### Known Technical Debt in erify_studios
- `console.error` in system route delete handlers — pre-existing, inconsistent
- `DataTableCore` alias in data-table index — for test mocks only
- `requiresActionSheet` duplicated between task hooks — should extract to shared util
- Task type label i18n hardcoded in 4 files instead of using `getTaskTypeLabel()`
- `handleSubmitAction` in `use-studio-tasks-page-controller.tsx` silently drops `options.onSuccess` — pre-existing
- `studio-shift.service.ts` has Prisma type leakage and internal ID in schema — flagged in shift-schedule review
- `StudioShift`/`StudioShiftBlock` missing `version` field — introduced in feat/studio-shift-schedule
