# Ad-hoc Task Ticketing (Pre-production Tickets)

## Overview
This document outlines the reasoning and implementation plan for introducing an "ad-hoc" ticketing system used primarily during the `SETUP` (pre-production) phase of a show.

For pre-production workflows, users need a way to assign one-off requirements (such as "adjust the design of the scene", "change the customer-facing basket", or "adjust script"). While the system already has robust `TaskTemplate` and bulk generation flows for standardized operational checklists, these pre-production tickets are unique and shouldn't require a pre-defined template.

## Architectural Reasoning

### Can we reuse the existing `Task` model?
**Yes.** The existing `Task` model is perfectly suited for this use case.

#### Why it fits:
1. **Schema Flexibility:** The Prisma schema (`apps/erify_api/prisma/schema.prisma`) already defines `templateId` and `snapshotId` as optional (`BigInt?`) on the `Task` model. This implicitly allows for "template-less" or "ad-hoc" tasks.
2. **Domain Alignment:** `TaskType.SETUP` accurately represents the pre-production phase where these tickets reside.
3. **Workflow Reusability:** The existing task state machine (`PENDING` -> `IN_PROGRESS` -> `REVIEW` -> `COMPLETED` -> `CLOSED`) and assignment logic (via `assigneeId`) naturally fit a ticketing workflow.
4. **Target Linking:** The existing polymorphic `TaskTarget` model allows ad-hoc tasks to be associated directly with a specific `Show` or `Studio`. The ticket content, description, and metadata can be stored natively in the `Task` record.

### Identified Gaps
Currently, the system is highly optimized for the template-to-task workflow:
1. **API Types:** `packages/api-types/src/task-management/task.schema.ts` strictly enforces `snapshotId` to be non-nullable, assuming all tasks come from a template snapshot.
2. **Backend API:** `StudioTaskController` only provides endpoints for bulk generation via templates. There is no controller action to create a single, one-off task.

## Implementation Plan

### 1. Update API Types (`@eridu/api-types`)
Relax the strictness around template associations and define the contract for creating ad-hoc tasks.

- **Modify `task.schema.ts`:**
  - Update the base `taskSchema` to make `snapshotId` nullable: 
    ```typescript
    snapshotId: z.bigint().nullable()
    ```
  - Extend the API types to introduce a `createAdhocTaskRequestSchema`:
    ```typescript
    export const createAdhocTaskRequestSchema = z.object({
      show_uid: z.string().startsWith(UID_PREFIXES.SHOW),
      description: z.string().min(1),
      assignee_uid: z.string().nullable().optional(),
      due_date: z.string().datetime().nullable().optional(),
      content: z.record(z.string(), z.any()).optional()
    });
    ```

### 2. Update Backend Service (`erify_api`)
Implement the core logic for ad-hoc task creation, ensuring the proper targets are established.

- **Modify `TaskRepository`:**
  - Add `createAdhocTask` method to instantiate a `Task` with `snapshotId: null`.
  - Automatically create the corresponding `TaskTarget` to link the new task directly to the intended `Show` and its parent `Studio`.

- **Modify `TaskService`:**
  - Wrap the repository call in `createAdhocTask`, validating inputs, and fetching the target show to extract `studioId`.

### 3. Update Backend Controller (`erify_api`)
Expose the new functionality to the frontend studio applications.

- **Modify `StudioTaskController`:**
  - Add a new endpoint: `POST /studios/:studioId/tasks/ad-hoc`.
  - Validate the payload using the newly created `createAdhocTaskRequestSchema`.
  - Secure the endpoint using `StudioProtected` ensuring only authorized studio members can create these tickets.

## Verification
- Add backend unit/integration tests ensuring a `Task` can be successfully saved and retrieved when `snapshotId` is `null`.
- Verify the ad-hoc task appears correctly in the standard unified task lists (`listTasks` / `listMyTasks`), since those endpoints shouldn't care whether `snapshotId` is populated.
