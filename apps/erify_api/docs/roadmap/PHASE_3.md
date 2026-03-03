# Phase 3: Material Management, Shift Schedules & File Uploads

> **TLDR**: 🚧 **In Progress**. File Upload (Cloudflare R2 presigned URLs) implemented March 2026. Material management and studio shift schedules still pending.

**Status**: 🚧 In Progress — File Upload complete; Material Management and Shift Schedules pending

## Overview

Phase 3 implements the Material Management System, Studio Shift Schedules, and File Uploads (via Cloudflare R2 presigned URLs). This phase builds upon the core functions and Task Management system established in Phase 2.

**Timeline**: Dependent on Phase 2 completion

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE_OVERVIEW.md)** - System architecture and module design
- **[Schedule Planning](../SCHEDULE_PLANNING.md)** - Schedule upload system design
- **[Studio Shift Schedule Design](../design/STUDIO_SHIFT_SCHEDULE_DESIGN.md)** - Shift data model, services, and alignment logic
- **[File Upload Design](../design/FILE_UPLOAD_DESIGN.md)** - Presigned URL architecture and storage abstraction
- **[Material Management Design](../design/MATERIAL_MANAGEMENT_DESIGN.md)** - Material data model, versioning, and platform targeting *(to be written)*

## Core Features

### 1. Material Management System

- **CRUD Operations**: Complete material management with client and platform associations
- **Versioning**: Track material versions with version label strings for history management (no snapshot table — simple in-place updates with version bump)
- **Platform Targeting**: Materials can be targeted to specific platforms or used across all platforms
- **Lifecycle Management**: Active/inactive status, expiration date tracking
- **Show-Material Associations**: Associate materials with shows
- **File Integration**: Material `resource_url` populated via File Upload System (feature #3)

> **Prerequisite**: A [Material Management Design Doc](../design/MATERIAL_MANAGEMENT_DESIGN.md) must be written before implementation. Material + File Upload are tightly coupled — the upload flow produces the URLs that materials store.

### 2. Studio Shift Schedule

- **Shift Management**: Track part-timer shifts, including gaps and multi-block shifts, with date/midnight-crossing support. Status tracked via `StudioShiftStatus` Prisma enum (`SCHEDULED`, `COMPLETED`, `CANCELLED`).
- **Task & Show Alignment (MVP)**: Cross-reference shift hours against assigned **Shows only** (via `Show.startTime`/`endTime`) to identify idle members or missing shifts. Standalone tasks without a show target are excluded from alignment in this phase.
- **Cost Calculation**: Auto-calculate projected costs based on hourly rates, with manual overrides for admins to approve final payments.
- **Calendar Views**: Provide Day, Week, and Month timeline views to visualize studio coverage and costs.

### 3. File Upload System

- **General File Uploads**: Secure upload for materials, tasks (QC screenshots), and other assets
- **Storage Integration**: Cloudflare R2 integration via Presigned URLs to support variable sizes and high concurrency. Frontend uploads directly to R2, bypassing the backend.

## Implementation Scope

### Material Management

- [ ] Write [Material Management Design Doc](../design/MATERIAL_MANAGEMENT_DESIGN.md) (prerequisite)
- [ ] Material, MaterialType, ShowMaterial Prisma models + migration
- [ ] CRUD operations, versioning (version label), platform targeting
- [ ] Wire `resource_url` to file upload system

### Studio Shift Schedule

- [ ] Define `StudioShiftStatus` Prisma enum (`SCHEDULED`, `COMPLETED`, `CANCELLED`)
- [ ] `StudioShift` and `StudioShiftBlock` Prisma models + migration
- [ ] Add `baseHourlyRate Decimal?` to `StudioMembership`
- [ ] `StudioShiftService` — CRUD, cost auto-calculation, rate copy-on-create
- [ ] `StudioShiftController` — CRUD endpoints under `/studios/:id/shifts/`
- [ ] `ShiftCalendarOrchestrationService` — Day/Week/Month timeline views, financial aggregation
- [ ] `ShiftAlignmentOrchestrationService` — Cross-check shifts against **Shows only** (idle members, missing shifts)
- [ ] Calendar and alignment controllers
- [ ] Shared Zod schemas in `@eridu/api-types`

### File Upload System ✅ Implemented (March 2026)

- [x] Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` dependencies
- [x] Add R2 env vars (`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) to `env.schema.ts`
- [x] `StorageService` — S3/R2 abstraction layer with presigned URL generation
- [x] `UploadService` — Use-case validation (size limits, allowed types per use case), MATERIAL_ASSET template policy enforcement, upload version reservation
- [x] `UploadController` — `POST /uploads/presign` endpoint (200 OK)
- [x] Define upload request/response schemas in `@eridu/api-types/uploads`
- [x] `@eridu/browser-upload` — worker-based image compression with main-thread canvas fallback
- [x] `JsonForm` integration — file field rendering, client-side compression, flush-on-submit
- [x] `UploadRoutingMetadata` shared type for typed `upload_routing` metadata contract

## Technical Considerations

### Database Design

- **Materials**: Material-client/platform relationships. Simple version label (no snapshot table). `resource_url` stores the R2 CDN path after upload.
- **Shifts**: `StudioShift` and `StudioShiftBlock` parent-child relationships linked to `User` and `Studio`. `StudioShiftStatus` Prisma enum for DB-level validation. `baseHourlyRate` on `StudioMembership` copied to shift at creation (immutable record pattern).

### API Design

- RESTful endpoints
- Expand Parameter support
- Presigned URL flow: backend generates short-lived upload URL → frontend uploads directly to R2

## Success Criteria

### Material Management

- [ ] Complete Material Management System with CRUD, versioning, and platform targeting.
- [ ] Materials can be associated with shows and have uploaded file URLs.

### Studio Shift Schedule

- [ ] Shift timelines are visible across day, week, and month views.
- [ ] Cost calculations and administrative overrides trigger correctly.
- [ ] Show alignment flags members working without shift coverage (shows only).

### File Upload ✅

- [x] Users can request presigned URLs and upload files directly to R2.
- [x] Uploaded file URLs are accessible via CDN and usable in material/task entities.
- [x] MATERIAL_ASSET uploads validate against task snapshot schema and reserve upload versions atomically.
- [x] Images are compressed client-side before upload (worker + canvas fallback).

## Dependencies

- Phase 2 complete: Task Management and Studio association.
- Cloudflare R2 bucket provisioned with API credentials.

### Advanced Task Management (Deferred from Phase 2)

- **Ad-hoc Task Ticketing**: Template-less task creation for pre-production one-off requirements (e.g., "adjust the design of the scene"). Reuses existing `Task` model with `snapshotId: null`. See [Ad-hoc Task Ticketing Design](../design/AD_HOC_TASK_TICKETING.md).
- **Task Reopening Workflow**: Formal process for reopening `completed` tasks (requiring reason/approval), distinct from simple status updates.
- **Complex Reassignment Rules**: Advanced validation for reassignment requests based on strict Show status.
