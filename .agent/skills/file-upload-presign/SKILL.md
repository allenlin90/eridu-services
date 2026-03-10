---
name: file-upload-presign
description: Covers the presigned upload system for Cloudflare R2. Use this skill when implementing or modifying file upload flows, adding new upload use cases, changing file size limits, or debugging upload routing. Covers backend validation rules, frontend compression, storage directory routing, and MATERIAL_ASSET template policy enforcement.
---

# File Upload — Presigned URL

> Full design doc with flow diagrams: `apps/erify_api/docs/FILE_UPLOAD.md`

## Key Files

| Layer                       | Path                                                          |
| --------------------------- | ------------------------------------------------------------- |
| API contract                | `packages/api-types/src/uploads/schemas.ts`                   |
| Backend service             | `apps/erify_api/src/uploads/upload.service.ts`                |
| Backend controller          | `apps/erify_api/src/uploads/upload.controller.ts`             |
| Shared browser upload utils | `packages/browser-upload/src/index.ts`                        |
| Compression worker          | `packages/browser-upload/src/image-compress.worker.ts`        |
| Frontend API utils          | `apps/erify_studios/src/features/tasks/api/presign-upload.ts` |
| Frontend form               | `apps/erify_studios/src/components/json-form/json-form.tsx`   |

## How It Works (Summary)

1. Client calls `POST /uploads/presign` with `{ use_case, mime_type, file_size, file_name, [task_id, field_key] }`
2. `UploadService` validates MIME type and file size against `USE_CASE_RULES`
3. For `MATERIAL_ASSET`: additionally validates against the task snapshot schema's `accept` rule for the given `field_key`
4. Returns a short-lived presigned PUT URL pointing to Cloudflare R2
5. Client PUTs the file directly to R2 — **never through the API server**

**Critical**: The direct R2 PUT uses bare `fetch()`, not `apiClient`. Adding the API `Authorization` header causes R2 to return 403.

## Use Cases & Limits

| Use Case            | Max Size | Allowed MIME Types                                         |
| ------------------- | :------: | ---------------------------------------------------------- |
| `QC_SCREENSHOT`     |  200 KB  | `image/jpeg`, `image/png`, `image/webp`                    |
| `SCENE_REFERENCE`   |  10 MB   | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| `INSTRUCTION_ASSET` |  50 MB   | `image/*`, `application/pdf`, `video/mp4`                  |
| `MATERIAL_ASSET`    |  50 MB   | `image/*`, `application/pdf`, `video/mp4`                  |

Defined in `FILE_UPLOAD_USE_CASE_RULES` in `packages/api-types/src/uploads/schemas.ts`. **When changing limits, update this table and the design doc.**

`QC_SCREENSHOT` 200 KB limit intentionally matches `SCREENSHOT_MAX_BYTES` (derived from `getImageCompressionTargetBytes()`) in `json-form.tsx`. Both must stay in sync.

## MATERIAL_ASSET Routing Rules

The `upload_routing` metadata key is typed as `UploadRoutingMetadata` (exported from `@eridu/api-types/uploads`). Both `TaskGenerationProcessor` (producer) and `UploadService.extractDirectoryFromMetadata` (consumer) use this type to enforce the contract.

Storage directory is resolved in this priority order:

1. Show-linked + `task.type === CLOSURE` → force `mc-review`
2. `task.metadata.upload_routing.material_asset_directory` — if present, use it directly
3. No show-linked target → `single-use`
4. Show-linked + `task.type === SETUP` → `pre-production`
5. Show-linked + any other type → `show-general`

Special case: `INSTRUCTION_ASSET` (non-material use case) is currently routed to `pre-production`.

## Frontend Image Compression

`JsonForm` compresses images before requesting a presign (for `MATERIAL_ASSET` only):
- Target: `min(field.validation.max_size, 200 KB)`
- Worker-first native compression (`Web Worker` + `OffscreenCanvas`) with main-thread canvas fallback
- Scale [1→0.6] and quality [0.9→0.34]
- Hard client-side size check after compression; throws before calling presign API if still too large

## Frontend Submit Gating (JsonForm)

`JsonForm` submit flow is split into two explicit phases:
1. `validateBeforeSubmit()` validates the full form but ignores required-file errors only for file fields with pending uploads.
2. `flushPendingFileUploads()` uploads pending files, writes resulting URL values back into form state, and returns final content for submit payloads.

Additional rules:
- Pending entries with `isPreparing` or `error` must block submit.
- Image preparation occurs on file selection; submit path should upload the prepared file already stored in pending state.
- Uploaded file URL cache (by per-field fingerprint `name:size:type:lastModified`) can reuse URLs and skip duplicate uploads within one form session.
- Keep upload cache across retries/partial-success uploads, and clear it only after successful submit API completion.
- Per-field cache entries should still be removed when that field file is replaced/cleared.

## Checklist: Adding a New Use Case

- [ ] Add enum value to `FILE_UPLOAD_USE_CASE` in `packages/api-types/src/uploads/schemas.ts`
- [ ] Add entry to `FILE_UPLOAD_USE_CASE_RULES` in `packages/api-types/src/uploads/schemas.ts`
- [ ] Add routing logic in `resolveStorageUseCaseForObjectKey` in `upload.service.ts` if needed
- [ ] Update the use case table in this skill and the design doc
- [ ] Add tests in `upload.service.spec.ts`

## Checklist: Changing a Size Limit

- [ ] Update `FILE_UPLOAD_USE_CASE_RULES[USE_CASE].max_file_size_bytes` in `packages/api-types/src/uploads/schemas.ts`
- [ ] If `QC_SCREENSHOT`: also verify `SCREENSHOT_MAX_BYTES` in `json-form.tsx` still matches (it's derived from `getImageCompressionTargetBytes()`)
- [ ] Update the use case table above and in the design doc
- [ ] Run `pnpm --filter erify_api test --testPathPattern=upload`
