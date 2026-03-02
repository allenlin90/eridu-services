# Cloudflare R2 Integration Plan

Integrate Cloudflare R2 (S3-compatible) to allow users to securely upload images and files. The integration will feature a proper Storage abstraction layer to decouple from the chosen provider.

## User Review Required

> [!IMPORTANT]
> **Upload Architecture Strategy: Presigned URLs**
> To address concerns regarding Node.js's single-threaded nature acting as a bottleneck under high concurrency or when handling larger files (such as multi-megabyte scenes and instructions), we will implement a **Presigned URL Architecture**. 
>
> **Workflow:**
> 1. Frontend requests an upload ticket from the NestJS backend, specifying the file's intended `useCase` (e.g., `QC_SCREENSHOT`, `SCENE_REFERENCE`, `INSTRUCTION_ASSET`), `mimeType`, and `fileSize`.
> 2. Backend validates the request (e.g. checking if the user is authorized, the file size is within the allowed limits for that specific `useCase`, and the file type is allowed).
> 3. If valid, the backend generates and returns a **Presigned R2 Upload URL** granting direct HTTP PUT access to a specific R2 path for a short duration (e.g., 5 minutes).
> 4. Frontend uploads the file directly to Cloudflare R2.
> 5. (Optional, depending on need) Frontend notifies the backend that the upload is complete, OR the backend relies on an R2 event/webhook. Usually, simply saving the resulting file path in the subsequent entity update (e.g., updating an Instruction payload) is sufficient.
> 
> By skipping the backend pass-through entirely, we offload all streaming IO to Cloudflare, eliminating backend bottlenecks completely.

> [!NOTE]
> **Configuration Setup**
> We'll need new environment variables for Cloudflare R2: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`. Provide input on any preferred naming conventions if these deviate from the standard.

## Proposed Changes

### Dependencies
- Add `@aws-sdk/client-s3` for the core S3 client.
- Add `@aws-sdk/s3-request-presigner` to generate the presigned URLs securely.

### Configuration Layer
- **[MODIFY]** `apps/erify_api/src/config/...` (or equivalent `.env` and `config` service validation)
  - Add specific R2 credentials and bucket info.

### Storage Abstraction (Repository-like Layer)
- **[NEW]** `apps/erify_api/src/lib/storage/storage.service.ts`
  - Encapsulate the `S3Client`.
  - Expose a typed `generatePresignedUploadUrl(key: string, mimeType: string): Promise<string>` method to abstract the AWS SDK away from the rest of the app.
- **[NEW]** `apps/erify_api/src/lib/storage/storage.module.ts`
  - Expose the Service to other modules.

### Upload Orchestration Layer
- **[NEW]** `apps/erify_api/src/models/file-upload/file-upload.service.ts`
  - Domain service handling the business logic for uploads.
  - Contains the mappings for `Workflow Use Case -> Validation Rules (Max Size, Allowed Types)`.
  - Generates secure, randomized S3 keys (e.g., `uploads/QC_SCREENSHOT/<uuid>.png`) to prevent overwrites.
- **[NEW]** `apps/erify_api/src/controllers/upload/upload.controller.ts`
  - Expose `POST /uploads/presign`.
  - Accepts a DTO with `{ useCase, mimeType, fileSize, fileName }`.
  - Calls `fileUploadService.getPresignedUrl()`.

### Frontend API Types
- **[MODIFY]** `@eridu/api-types` to define the request DTO and the response (the presigned URL and the final accessible CDN URL).

## Verification Plan

### Automated Tests
- Unit Test the `StorageService` using a mocked `S3Client` to ensure URLs are generated correctly.
- Unit Test the `FileUploadService` to verify that size limits dynamically apply depending on the `useCase`.

### Manual Verification
- A manual testing script/Postman workflow:
  1. Hit `POST /uploads/presign` with a valid payload.
  2. Use the returned URL to perform a `PUT` request directly with a file.
  3. Verify the file is accessible via the bucket CDN.
