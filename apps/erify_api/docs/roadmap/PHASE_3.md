# Phase 3: Ticketing System, Shift Schedules & File Uploads

> **TLDR**: 🚧 **In Progress**. File Upload (Cloudflare R2 presigned URLs) implemented March 2026. Studio Shift Schedules implemented March 2026. Ticketing system is the current focus. Material Management deferred to Phase 4.

**Status**: 🚧 In Progress — File Upload complete; Studio Shift Schedules complete ✅; Ticketing System in progress

## Overview

Phase 3 pivots to deliver the **Ticketing System** (ad-hoc task creation, task reopening, complex reassignment) and **Studio Shift Schedules**, building on the Task Management foundation from Phase 2. Material Management has been deferred to Phase 4 to unblock pre-production ticketing workflows sooner.

**Timeline**: Dependent on Phase 2 completion

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE_OVERVIEW.md)** - System architecture and module design
- **[Schedule Planning](../SCHEDULE_PLANNING.md)** - Schedule upload system design
- **[Studio Shift Schedule Design](../design/STUDIO_SHIFT_SCHEDULE_DESIGN.md)** - Shift data model, services, and alignment logic
- **[File Upload Design](../design/FILE_UPLOAD_DESIGN.md)** - Presigned URL architecture and storage abstraction
- **[Ad-hoc Task Ticketing Design](../design/AD_HOC_TASK_TICKETING.md)** - Template-less ticketing design

## Core Features

### 1. Ticketing System

- **Ad-hoc Task Ticketing**: Template-less task creation for pre-production one-off requirements (e.g., "adjust the design of the scene"). Reuses existing `Task` model with `snapshotId: null`.
- **Task Reopening Workflow**: Formal process for reopening `completed` tasks (requiring reason/approval), distinct from simple status updates.
- **Complex Reassignment Rules**: Advanced validation for reassignment requests based on strict Show status.

> See [Ad-hoc Task Ticketing Design](../design/AD_HOC_TASK_TICKETING.md) for detailed design.

### 2. Studio Shift Schedule

- **Shift Management**: Track part-timer shifts, including gaps and multi-block shifts, with date/midnight-crossing support. Status tracked via `StudioShiftStatus` Prisma enum (`SCHEDULED`, `COMPLETED`, `CANCELLED`).
- **Task & Show Alignment (MVP)**: Cross-reference shift hours against assigned **Shows only** (via `Show.startTime`/`endTime`) to identify idle members or missing shifts. Standalone tasks without a show target are excluded from alignment in this phase.
- **Cost Calculation**: Auto-calculate projected costs based on hourly rates, with manual overrides for admins to approve final payments.
- **Calendar Views**: Provide Day, Week, and Month timeline views to visualize studio coverage and costs.

### 3. File Upload System ✅ Implemented (March 2026)

- **General File Uploads**: Secure upload for materials, tasks (QC screenshots), and other assets
- **Storage Integration**: Cloudflare R2 integration via Presigned URLs to support variable sizes and high concurrency. Frontend uploads directly to R2, bypassing the backend.

## Implementation Scope

### Ticketing System

- [ ] `POST /studios/:studioId/tasks` — ad-hoc task creation (no template, `snapshotId: null`)
- [ ] Task reopening endpoint with reason/approval flow
- [ ] Reassignment validation against Show status rules
- [ ] Shared Zod schemas in `@eridu/api-types` for ticketing contracts

### Studio Shift Schedule

- [x] Define `StudioShiftStatus` Prisma enum (`SCHEDULED`, `COMPLETED`, `CANCELLED`)
- [x] `StudioShift` and `StudioShiftBlock` Prisma models + migration
- [x] Add `baseHourlyRate Decimal?` to `StudioMembership`
- [x] `StudioShiftService` — CRUD, cost auto-calculation, rate copy-on-create
- [x] `StudioShiftController` — CRUD endpoints under `/studios/:id/shifts/`
- [x] `ShiftCalendarOrchestrationService` — Day/Week/Month timeline views, financial aggregation
- [x] `ShiftAlignmentOrchestrationService` — Cross-check shifts against **Shows only** (idle members, missing shifts)
- [x] Calendar and alignment controllers
- [x] Shared Zod schemas in `@eridu/api-types`
- [ ] Calendar event interactivity (admin edit/member popover) — deferred to Phase 4

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

### Material Management ⏸ Deferred to Phase 4

Material Management has been deferred to reduce scope and ship the ticketing system sooner.

- [ ] Write [Material Management Design Doc](../design/MATERIAL_MANAGEMENT_DESIGN.md) (prerequisite — to be done in Phase 4)
- [ ] Material, MaterialType, ShowMaterial Prisma models + migration
- [ ] CRUD operations, versioning (version label), platform targeting
- [ ] Wire `resource_url` to file upload system

## Technical Considerations

### API Design

- RESTful endpoints
- Expand Parameter support
- Ticketing: ad-hoc tasks use existing `Task` model — no new DB models required for MVP
- Presigned URL flow: backend generates short-lived upload URL → frontend uploads directly to R2

## Success Criteria

### Ticketing System

- [ ] Studio members can create ad-hoc tasks without a template.
- [ ] Completed tasks can be formally reopened with a reason.
- [ ] Reassignment validation enforces Show status rules correctly.

### Studio Shift Schedule

- [x] Shift timelines are visible across day, week, and month views.
- [x] Cost calculations and administrative overrides trigger correctly.
- [x] Show alignment flags members working without shift coverage (shows only).

### File Upload ✅

- [x] Users can request presigned URLs and upload files directly to R2.
- [x] Uploaded file URLs are accessible via CDN and usable in material/task entities.
- [x] MATERIAL_ASSET uploads validate against task snapshot schema and reserve upload versions atomically.
- [x] Images are compressed client-side before upload (worker + canvas fallback).

## Dependencies

- Phase 2 complete: Task Management and Studio association.
- Cloudflare R2 bucket provisioned with API credentials.
