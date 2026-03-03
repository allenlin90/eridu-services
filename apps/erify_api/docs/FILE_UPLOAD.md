# File Upload — Presigned URL

> **Status**: ✅ Implemented (Phase 3, March 2026)

## Overview

All file uploads bypass the API server entirely. The client requests a short-lived presigned PUT URL from the API, then uploads the file directly to Cloudflare R2. This eliminates backend streaming bottlenecks and keeps upload throughput uncapped.

## Upload Flow

```mermaid
sequenceDiagram
    participant FE as Frontend (erify_studios)
    participant API as POST /uploads/presign
    participant SVC as UploadService
    participant R2 as Cloudflare R2

    FE->>API: { use_case, mime_type, file_size, file_name, [task_id, field_key] }
    API->>SVC: createPresignedUpload({ ...body, actorId: user.ext_id })

    SVC->>SVC: 1. Validate MIME type vs USE_CASE_RULES
    SVC->>SVC: 2. Validate file_size vs USE_CASE_RULES
    SVC->>SVC: 3. If MATERIAL_ASSET → validateTemplateFilePolicy()
    SVC->>SVC: 4. resolveStorageUseCaseForObjectKey()
    SVC->>R2: generatePresignedUploadUrl(objectKey, 300s)
    R2-->>SVC: presigned PUT URL + CDN file_url
    SVC-->>API: PresignUploadResponse
    API-->>FE: { upload_url, upload_method, upload_headers, object_key, file_url, expires_in_seconds }

    Note over FE,R2: Direct upload — NO API involvement
    FE->>R2: PUT {upload_url} — Content-Type header only, NO Authorization
    R2-->>FE: 200 OK
    FE->>FE: Store file_url in form field
```

> **Important**: The direct R2 PUT must NOT include the API `Authorization` header. Doing so causes R2 to return 403. Frontend code uses bare `fetch()`, never `apiClient`.

## Use Cases & File Size Limits

| Use Case | Max Size | Allowed MIME Types | Notes |
|----------|:--------:|-------------------|-------|
| `QC_SCREENSHOT` | **200 KB** | `image/jpeg`, `image/png`, `image/webp` | Frontend compresses to ≤200 KB before upload |
| `SCENE_REFERENCE` | **10 MB** | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | |
| `INSTRUCTION_ASSET` | **50 MB** | `image/*`, `application/pdf`, `video/mp4` | |
| `MATERIAL_ASSET` | **50 MB** | `image/*`, `application/pdf`, `video/mp4` | Also validates against task snapshot schema |

Rules are enforced in `FILE_UPLOAD_USE_CASE_RULES` constant in [`packages/api-types/src/uploads/schemas.ts`](../../../../packages/api-types/src/uploads/schemas.ts).

## Backend Validation Pipeline

```mermaid
flowchart TD
    A[POST /uploads/presign] --> B{MIME allowed\nfor use_case?}
    B -- No --> E1[400 Bad Request]
    B -- Yes --> C{file_size ≤\nmax for use_case?}
    C -- No --> E2[400 Bad Request]
    C -- Yes --> D{use_case ==\nMATERIAL_ASSET?}

    D -- No --> ROUTE[Resolve storage\nuse case]
    D -- Yes --> F{task_id &\nfield_key present?}
    F -- No --> E3[400 Bad Request]
    F -- Yes --> G[Load task +\nparse snapshot schema]
    G --> H{Schema valid &\nfield exists?}
    H -- No --> E4[400 / 404]
    H -- Yes --> I{field.type == 'file'?}
    I -- No --> E5[400 Bad Request]
    I -- Yes --> J{MIME matches\nfield accept rule?}
    J -- No --> E6[400 Bad Request]
    J -- Yes --> ROUTE

    ROUTE --> K[generateObjectKey\nstorageService]
    K --> L[generatePresignedUploadUrl]
    L --> M[PresignUploadResponse]
```

## MATERIAL_ASSET Storage Routing

`MATERIAL_ASSET` uploads are routed to different R2 directories based on task context. This allows uploaded files to be organized semantically (by show, production phase, or custom template-defined buckets).

```mermaid
flowchart TD
    A[MATERIAL_ASSET] --> B{task.metadata\nupload_routing.\nmaterial_asset_directory\nset?}
    B -- Yes --> DIR["Use metadata value\ne.g. 'wardrobe-archive'"]
    B -- No --> C{task has a\nshow-linked target?}
    C -- No --> SINGLE[single-use]
    C -- Yes --> D{task.type?}
    D -- SETUP --> PRE[pre-production]
    D -- CLOSURE --> MC[mc-review]
    D -- ACTIVE / other --> GEN[show-general]
```

The `upload_routing.material_asset_directory` key is stamped onto task metadata by `TaskGenerationProcessor` when the source template declares a `material_asset_directory` field. This lets template authors pin generated tasks to a custom R2 directory at generation time.

The metadata shape is typed as `UploadRoutingMetadata` (exported from `@eridu/api-types/uploads`). Both the producer (`TaskGenerationProcessor`) and the consumer (`UploadService.extractDirectoryFromMetadata`) use `Partial<UploadRoutingMetadata>` for typed access, eliminating stringly-typed double casts.

> TODO(upload-workflow): dedicated UI workflow handling for `pre-production` and `mc-review` directories is pending.

## Object Key Format

**Non-MATERIAL_ASSET** (via `StorageService.generateObjectKey`):
```
{useCase_lower}/{actorId}/{YYYY-MM-DD}/{uuid}-{safeName}

Example:
  qc_screenshot/ext_abc123/2026-03-03/a1b2c3d4-screen.png
```

**MATERIAL_ASSET — show-linked** (via `buildMaterialAssetObjectKey`):
```
{storageDir}/{YYYY-MM-DD}/{showRef}-v{uploadVersion}{ext}

Example:
  pre-production/2026-03-03/show-1-v1.png
  mc-review/2026-03-03/show-xyz-v2.jpg
```

**MATERIAL_ASSET — no show target**:
```
{storageDir}/{YYYY-MM-DD}/{fieldKey}-v{uploadVersion}{ext}

Example:
  single-use/2026-03-03/proof-photo-v1.png
```

`actorId` = `user.ext_id` (external UID, never internal DB id). Note: MATERIAL_ASSET keys use show UID or field key as the base name — `actorId` is **not** included in MATERIAL_ASSET paths.

## Frontend Compression (erify_studios)

For `MATERIAL_ASSET` image uploads inside `JsonForm`, images are compressed client-side before the presign request:

```
File selected
    │
    ▼
Validate MIME vs field accept rule — toast error if mismatch
    │
    ▼
Is file an image/* ?
  No  ──► use file as-is
  Yes ──► maxBytes = min(item.validation.max_size ?? ∞, 200 KB)
              │
              ▼
          prepareImageForUpload(file, { targetMaxBytes, accept, preferWorker: true })
            ├─ Worker-first via native Web Worker + OffscreenCanvas
            ├─ Fallback to main-thread canvas if worker path unsupported/fails
            ├─ Tries scale × quality: [1.0→0.6] × [0.9→0.34]
            └─ Falls back to best (smallest) attempt
              │
              ▼
          Hard check: uploadFile.size ≤ maxBytes → throws if not
    │
    ▼
requestPresignedUpload({ use_case: MATERIAL_ASSET, ... })
    │
    ▼
uploadFileToPresignedUrl(presigned, uploadFile)  ← bare fetch
    │
    ▼
form.setValue(fieldKey, presigned.file_url)
```

The 200 KB compression cap (`SCREENSHOT_MAX_BYTES` constant in `json-form.tsx`) intentionally matches the `QC_SCREENSHOT` backend limit. Both must stay in sync when changed.

## Key Files

| Layer | Path | Role |
|-------|------|------|
| API contract | `packages/api-types/src/uploads/schemas.ts` | Zod schemas, `FILE_UPLOAD_USE_CASE` enum |
| Backend service | `apps/erify_api/src/uploads/upload.service.ts` | Validation rules, routing, presign |
| Backend controller | `apps/erify_api/src/uploads/upload.controller.ts` | `POST /uploads/presign` |
| Storage abstraction | `apps/erify_api/src/lib/storage/storage.service.ts` | R2 client, key generation, presigning |
| Shared browser upload utils | `packages/browser-upload/src/index.ts` | Accept matching + worker/fallback compression |
| Compression worker | `packages/browser-upload/src/image-compress.worker.ts` | Off-main-thread image compression |
| Frontend API utils | `apps/erify_studios/src/features/tasks/api/presign-upload.ts` | `requestPresignedUpload`, `uploadFileToPresignedUrl` |
| Frontend form | `apps/erify_studios/src/components/json-form/json-form.tsx` | Image compression, flush-on-submit |
| Metadata stamp | `apps/erify_api/src/task-orchestration/task-generation-processor.service.ts` | Writes `upload_routing` metadata |
