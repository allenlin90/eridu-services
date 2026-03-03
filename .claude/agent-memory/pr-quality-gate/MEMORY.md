# PR Quality Gate - Persistent Memory

## erify_studios Frontend Patterns

### DataTable Component (components/data-table/)
- Canonical location: `apps/erify_studios/src/components/data-table/`
- Exports: `DataTable`, `DataTableCore` (alias), `DataTableToolbar`, `DataTableActions`, `DataTablePagination`, adapters
- `DataTableCore` is a backward-compat alias for `DataTable` - only exists for test mocks; no production code uses it directly
- `'use client'` directive is present in `data-table-toolbar.tsx` (inherited from admin-table-toolbar pattern) - this is a Vite app so it is a no-op but consistent with sub-components
- `data-table-core.tsx` has `eslint-disable-next-line react-hooks/incompatible-library` on line 73 for `useReactTable` - carried over from deleted `admin-table.tsx`, legitimate suppression for known library incompatibility with react-hooks lint plugin
- Inline `import('@tanstack/react-table').Row<TData>` type references in props are verbose but valid

### System Route Migration Pattern
All system list routes (`/system/users/`, `/system/clients/`, etc.) follow:
```
DataTable + DataTableToolbar + adaptPaginationChange + adaptColumnFiltersChange
+ DataTableActions + DataTablePagination + AdminLayout
```
Routes that previously used `AdminTable` from `@/features/admin/components` now import directly from `@/components/data-table`.
`AdminTable` and `AdminTableToolbar` are fully removed from production code after PR `feat/schedule-show-upload`.

### Action-Sheet Logic Duplication (Known)
Two hooks define equivalent "requires action sheet" logic:
- `use-studio-show-tasks-page-mutations.ts`: ACTIONS_REQUIRING_FORM + ACTIONS_REQUIRING_NOTE sets (Set-based)
- `use-studio-tasks-page-controller.tsx`: `requiresActionSheet` function with === checks
Both cover the same 4 actions. Could be extracted to a shared util but not a blocker.

### React.ReactNode Without Import
Files using `React.ReactNode` without importing React:
- `tasks-table-section.tsx` (line 14), `data-table-actions.tsx` (line 21), `toolbar/types.ts` (line 33)
This is valid in `react-jsx` JSX mode (tsconfig: `"jsx": "react-jsx"`). Not a bug.

### tablePagination Object Without useMemo
`system/shows/$showId/tasks.tsx` and `system/tasks/index.tsx` build `tablePagination` inline without `useMemo`.
Pre-existing pattern. Minor perf concern but not a blocker.

### Test Coverage Gap
`admin-table.test.tsx` was deleted (5 tests) with no direct replacement for DataTable internals.
`DataTable` component has no dedicated unit test file.
Integration tests (users-list.test.tsx, studios/index.test.tsx, data-table-toolbar.test.tsx) provide coverage.

### adaptPaginationChange Guard
The `!pagination` guard in `adaptPaginationChange` correctly returns `undefined` when pagination is not defined. Routes that always have pagination pass a non-undefined object, so this is fine.

### Error Handling Inconsistency in System Routes (Pre-existing Debt)
Some system routes wrap `mutateAsync` in try/catch with `console.error`, others do not:
- WITH try/catch: users, studios, clients, mcs, memberships, show-types, show-statuses, show-standards, studio-rooms
- WITHOUT try/catch: schedules, task-templates, shows ($showId/tasks)
This inconsistency is pre-existing technical debt. Should eventually be addressed uniformly.

## Known Technical Debt in erify_studios
- `console.error` in multiple system route delete handlers - pre-existing, inconsistently applied
- `DataTableCore` alias exported from index - intended for backward compat with test mocks; can be removed once all test mocks are updated
- `tablePagination` objects built inline (without `useMemo`) in some routes - minor perf concern, pre-existing
- `requiresActionSheet`/`requiresTaskActionSheet` duplicated between task hooks - should be extracted to shared util

## erify_api Upload / Storage Patterns (feat/file-upload-presign-phase3)

### Module Structure
- `StorageService` lives in `apps/erify_api/src/lib/storage/` (shared lib) — not in models/ because it's infrastructure
- `UploadModule` lives in `apps/erify_api/src/uploads/` (not under models/ - correct, no DB entity)
- `@eridu/api-types/uploads` subpath added with `presignUploadRequestSchema`, `presignUploadResponseSchema`, `FILE_UPLOAD_USE_CASE`

### Import Convention Violation Found
All other backend schema/service files import from `@eridu/api-types/<subpath>` (e.g. `@eridu/api-types/task-management`).
The uploads domain incorrectly uses the barrel `@eridu/api-types` in:
- `upload.service.ts`, `schemas/upload.schema.ts`, test files
This is inconsistent with project convention. Should be `@eridu/api-types/uploads`.

### S3Client Singleton Pattern in StorageService
`StorageService` caches the `S3Client` instance in a private field. This means credentials are read twice on first call — once at the top of `generatePresignedUploadUrl` (validation-only, discarded), then again inside `getS3Client`. This is not a bug (it's defensive validation before calling AWS) but is slightly redundant. Pre-existing acceptable pattern.

### R2 Config: All Optional in env.schema
All five R2 env vars (`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`) are optional in `env.schema.ts`. Runtime errors are thrown in `StorageService.getRequiredConfig()` when actually invoked. This is intentional — allows the API to start without R2 configured. The endpoint has no DB entity, no `deletedAt`/`version`/`metadata` fields needed.

### forcePathStyle on R2
`S3Client` uses `forcePathStyle: true`. For Cloudflare R2 presigned URLs this is correct — R2 supports path-style requests and the presigned URL generation matches the endpoint pattern.

### file_size: Schema-Level Upper Bound Added in Phase 3
`presignUploadRequestSchema` uses `z.number().int().positive().max(100 * 1024 * 1024)` — a 100MB hard cap at schema level. Per-use-case limits (10/25/50MB) are additionally enforced in `USE_CASE_RULES` inside `UploadService`. Defense in depth: schema rejects anything over 100MB, service enforces tighter per-use-case limits.

### buildPublicFileUrl (cleaned up in Phase 3)
`buildPublicFileUrl(objectKey: string)` — unused params were removed in Phase 3. The public URL always uses `R2_PUBLIC_BASE_URL`.

### Task Metadata upload_routing Pattern (NEW in Phase 3)
`TaskGenerationProcessor.buildShowGeneratedTaskMetadata()` stamps every generated task with:
```json
{ "upload_routing": { "source": "show_task_generation", "scope": "show", "material_asset_directory": "<pre-production|mc-review|show-general>" } }
```
`UploadService.extractDirectoryFromMetadata()` reads `task.metadata.upload_routing.material_asset_directory` to override the default storage directory. This is an implicit coupling via opaque metadata — not enforced by TypeScript shared type. A shared type constant for the `upload_routing` key structure would be safer long-term.

### SCREENSHOT_MAX_BYTES Compression Target (200KB) vs QC_SCREENSHOT API Limit (200KB)
In `json-form.tsx`, `SCREENSHOT_MAX_BYTES = 200 * 1024` is the client-side image compression TARGET before upload for MATERIAL_ASSET image fields. The `QC_SCREENSHOT` backend API limit is also 200KB — both are in sync. `QC_SCREENSHOT` is not called from any erify_studios frontend code in Phase 3 (enum exists, but no UI path uses it yet).

### Zod v4 z.url() Usage
`presignUploadResponseSchema` uses `z.url()` which is a Zod v4 API. Project uses `zod@^4.3.6` in api-types. This is correct and passes typecheck and build. Do not flag as an issue.

### UploadController Extends BaseController (Correct)
`UploadController` DOES extend `BaseController`. Global guard chain (Throttler → JwtAuth) via `APP_GUARD` in `app.module.ts` covers this controller. No `@StudioProtected` needed — presign is a cross-studio POST action authenticated by JWT.

### mime_type Schema Enum vs image/* in Design Doc
The `presignUploadRequestSchema` limits `mime_type` to a closed enum: jpeg/png/webp/pdf/mp4. SKILL.md describes MATERIAL_ASSET as `image/*` but the schema is the authoritative gate. Service USE_CASE_RULES list the same 5 types. Both consistent — design doc `image/*` is aspirational shorthand.

### findByUidWithSnapshot Returns Full Task Including metadata
`TaskRepository.findByUidWithSnapshot` uses `include` (not `select`) for snapshot/targets — all root scalar fields including `metadata` are returned automatically. `UploadService.extractDirectoryFromMetadata` relies on this. Not a bug.

### flushPendingFileUploads Sequential Upload Loop
Processes uploads sequentially. On failure: throws (remaining uploads abort), failed field stays in `pendingFilesByKey` (user can retry), `uploadingByKey` always reset in `finally`. Intentional and correct.

### JsonForm File Validation — Two-Layer Pattern
Layer 1 (`onFileSelect`): checks MIME against `SUPPORTED_UPLOAD_MIME_TYPES` + `doesFileMatchAccept` — surfaces via `toast.error` immediately.
Layer 2 (`flushPendingFileUploads`): re-validates before presign request, throws on failure — callers catch and call `toast.error`.

### QC_SCREENSHOT Not Used in Frontend (Phase 3)
Commit title `feat(erify_studios): add QC screenshot upload flow in task sheet` is misleading. Frontend uses MATERIAL_ASSET use case only. `QC_SCREENSHOT` enum exists at backend but has no frontend call path yet.

### browser-upload Package: src-direct Export Is Established Pattern
`@eridu/browser-upload` exports `"default": "./src/index.ts"`. This mirrors `@eridu/ui` (same pattern). Both are Vite-consumed packages resolved via bundler moduleResolution. Do NOT flag src-direct export as a violation for these packages. Worker URL (`new URL('./image-compress.worker.ts', import.meta.url)`) is correctly handled by Vite — confirmed by build output emitting a separate worker chunk. Package is NOT in `optimizeDeps.include` or `exclude` which is correct (worker packages with `import.meta.url` should not be pre-bundled).

### getMaterialAssetImageMaxBytes Naming (Confirmed in Phase 3 Review)
Returns `min(fieldMax, QC_SCREENSHOT limit = 200KB)`. Name is misleading (sounds like material asset limit = 50MB) but it's the image COMPRESSION TARGET cap, not the upload limit. Both uses in `json-form.tsx` are correct.

### reserveMaterialAssetUploadVersion: $transaction in Repository Is Correct
`TaskRepository.reserveMaterialAssetUploadVersion()` uses `prisma.$transaction` directly. `@Transactional()` decorator applies only to SERVICE layer. Repository layer uses `prisma.$transaction()` for atomic ops — consistent with all other transactional methods in `task.repository.ts`.

### USE_CASE_RULES in api-types (Phase 3)
`FILE_UPLOAD_USE_CASE_RULES`, `getUploadMaxFileSizeBytes`, `isUploadMimeTypeAllowed`, `getMaterialAssetImageMaxBytes` live in `packages/api-types/src/uploads/schemas.ts`. Backend imports from `@eridu/api-types/uploads`. Frontend imports from `@eridu/api-types/uploads`. Single source of truth for validation constants — correct pattern.

### Upload Controller: HTTP 201 for Presign POST (Accepted)
`POST /uploads/presign` returns 201 CREATED. Semantically 200 OK would be more accurate (computed result, no persisted resource), but 201 is consistent with other POST endpoints in the project. Acceptable as-is.

### isSupportedUploadMimeType: Redundant Double-Check (Known Suggestion)
In `json-form.tsx`, `isSupportedUploadMimeType(value)` checks `MATERIAL_ASSET_ALLOWED_MIME_TYPES.has(value) && isUploadMimeTypeAllowed(MATERIAL_ASSET, value)`. Both checks query the same data structure. The Set.has() is redundant with the includes() inside isUploadMimeTypeAllowed. Minor dead-code smell, not a blocker.

## Studio-Scoped Lookup Pattern (fix/studio-membership-scoped-routes)

### StudioLookupModule Location and Design
- `apps/erify_api/src/studios/studio-lookup/` holds thin routing adapters for show-types, show-standards, show-statuses, platforms under `/studios/:studioId/`
- studioId param is validated by UidValidationPipe but intentionally DISCARDED (`_studioId`) — these are global reference data, not studio-scoped data; studioId serves only as auth gate
- StudioGuard validates user membership in the studio before serving the response — security model is correct
- Pattern: `@StudioProtected()` on class (any member), studioId validated by pipe but ignored in method body

### Frontend Lookup Hook Dual-Endpoint Pattern
- `getPlatforms`, `getShowTypes`, `getShowStandards`, `getShowStatuses` all accept optional `studioId?: string`
- When studioId is present: hits `/studios/:studioId/<resource>`; when absent: hits `/admin/<resource>`
- Query keys use `studioId ?? 'admin'` as discriminator — prevents cache collisions between studio and admin contexts
- show-form-fields.tsx uses hooks WITHOUT studioId (always admin path) — safe because ShowUpdateDialog is ONLY used in system (admin) routes, never in studio routes
- system/shows route uses the hooks without studioId — correct (admin auth context)
- studios/$studioId/shows route uses hooks WITH studioId — correct (studio auth context)

### Shared memberSearch State Across AssigneeCell Rows (Known Design)
- `use-studio-show-tasks-page-controller.tsx` holds a single `memberSearch` state and passes `setMemberSearch` to ALL AssigneeCell rows via `onMemberSearch` in getColumns
- Each AssigneeCell has its own local `inputValue` state in AsyncCombobox, but onSearch is shared
- Only one popover can be open at a time so shared search state works in practice; edge case: opening row B clears row A's search (acceptable UX tradeoff)
- `membersRef` pattern: useRef<Membership[]> stores current member list, passed as `() => membersRef.current` getter to getColumns to prevent column re-creation on member data changes
- `react-hooks/refs` ESLint suppressions are LEGITIMATE — this rule (`eslint-plugin-react-hooks@7.0.1`) flags ref mutation outside useEffect; the pattern here (update ref in render body) is intentional for stable getters in memoized callbacks

### Unstaged Repository Change (name filter)
- In `fix/studio-membership-scoped-routes`, `studio-membership.repository.ts` has an unstaged `name` filter addition
- This is the `if (params.name)` filter on `user.name` — it was being added to implement search-by-name but not committed
- The schema (`listStudioMembershipsFilterSchema`) accepts `name` field; service passes it through; but repository silently ignores it until committed
- This is pre-existing debt per MEMORY.md ("name filter: accepted by schema, not implemented in repository")

### getMemberOptions Called Per Render in AssigneeCell (Known Perf Note)
- `getMemberOptions(getMembers())` is called inside AssigneeCell on every render (no useMemo)
- Maps members array to options array — O(N) per cell per render; with 50 tasks × 50 members = 2500 ops
- Low-cost string mapping; not a performance blocker but worth noting for large member/task lists

## Studio-Scoped Module Pattern (feat/studio-membership-endpoint)

### StudioMembershipModule Location
- The NEW studio-scoped controller for memberships lives at `apps/erify_api/src/studios/studio-membership/` (not under `models/`).
- This is correct: `studios/` sub-modules are thin routing adapters, they import `MembershipModule` from `models/membership/`.
- Route: `GET /studios/:studioId/studio-memberships` — different from admin `GET /admin/studio-memberships`.

### Double @StudioProtected Is Intentional and Correct
`BaseStudioController` applies `@StudioProtected()` (no roles = any member).
Each concrete controller applies its own `@StudioProtected([ROLE])` to tighten.
`StudioGuard` uses `reflector.getAllAndOverride()` — the METHOD decorator wins over CLASS decorator; CLASS decorator wins over BASE CLASS decorator.
Net effect: `@StudioProtected([STUDIO_ROLE.ADMIN])` on the controller class overrides the base class `@StudioProtected()`. No double execution issue.

### listStudioMembershipsQuerySchema: studioId from schema transform is IGNORED by controller
The `listStudioMembershipsQuerySchema` transforms `studio_id` → `studioId`. In the studio-scoped controller, this client-supplied `studioId` is intentionally destructured and discarded (`_ignoredStudioId`), and the route-param `studioId` is substituted. This prevents IDOR — clients cannot query another studio's memberships by passing a different `studio_id`.

### Frontend Query Key Namespace: 'studio-memberships' vs 'memberships'
- Admin endpoint query key: `['memberships', 'list', params]`
- Studio-scoped endpoint query key: `['studio-memberships', 'list', studioId, params]`
These are intentionally different namespaces. Mutations on admin memberships DO invalidate `['memberships']` but NOT `['studio-memberships']`. If an admin creates/updates/deletes a membership while the studio view is open, the studio-membership cache will go stale. This is acceptable for current usage (studio members list is a dropdown, not a live-updated critical view). If real-time consistency becomes important, invalidation should cross namespaces.

### Frontend: get-studio-memberships.ts id param maps to uid filter
`GetStudioMembershipsParams.id` maps to backend `listStudioMembershipsQuerySchema`'s `id` field which transforms to `uid`. The backend filter does a `contains/insensitive` search on uid — not exact match. This is the established pattern from the admin endpoint.

### name filter: accepted by schema, not implemented in repository
`listStudioMembershipsFilterSchema` accepts a `name?: string` field. The repository `listStudioMemberships` does not filter by name. This is pre-existing debt carried over from the admin endpoint — the field is silently ignored at query time.
