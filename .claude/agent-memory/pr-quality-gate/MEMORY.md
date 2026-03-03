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

### file_size: No Schema-Level Upper Bound
`presignUploadRequestSchema` uses `z.number().int().positive()` for `file_size` — no max cap at schema level. Upper bound enforcement is per-use-case in `USE_CASE_RULES` inside `UploadService`. This means a client can send a very large number that still passes Zod validation before being rejected by the service. Low risk since it's just a number check, not actual data transfer.

### _endpoint and _bucket params in buildPublicFileUrl
`buildPublicFileUrl(_endpoint: URL, _bucket: string, objectKey: string)` ignores its first two params (prefixed with `_`). The public URL always uses `R2_PUBLIC_BASE_URL`. The unused params are there for potential future use. The leading underscore convention is correct for TypeScript unused params.
