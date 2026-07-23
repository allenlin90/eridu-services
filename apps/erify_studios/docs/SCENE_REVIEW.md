# Scene Review

Scene Review is the dedicated, read-only workspace for inspecting screenshot evidence from submitted tasks. It separates a Designer's visual review from the Manager/Admin Task Review approval queue.

## Access and routes

- `DESIGNER`, `MANAGER`, and `ADMIN` can open `/studios/:studioId/scene-review`.
- Only `MANAGER` and `ADMIN` can open `/studios/:studioId/task-review`.
- Scene Review exposes no task selection, due-date editing, approval, rejection, status action, or bulk action.
- Route guards and sidebar visibility share the policies in `src/lib/constants/studio-route-access.ts`.

## Review modes

The route has two URL-addressable modes:

- **Analysis** shows any task with submitted image evidence in the selected show-date range, with available performance context.
- **QC Inbox** narrows the evidence to tasks awaiting manager confirmation. It is an advisory inbox only and does not gate a task state transition.

Both modes use the same screenshot workspace. Desktop presents a compact evidence queue beside a persistent large viewer. Mobile opens the selected evidence in a full-height drawer with previous, next, and thumbnail navigation.

## Filter contract

- Show date is the primary filter and uses the shared 06:00–05:59 operational-day range.
- Client uses the shared asynchronous combobox.
- Platform and Client are secondary filters grouped in a responsive Popover or Sheet.
- Mode, range, secondary filters, search, selected task, page, and limit are URL state.
- The API accepts at most 31 operational days and returns at most 50 evidence rows per page.

## Evidence and context

The read model includes only tasks containing image evidence. The compact preview and large viewer use the same evidence list, and Layout QC adds generic safe-area, host-focus, and product-zone guides.

Show, client, platform, task, submission activity, and available GMV/viewer/CTR/CTO values appear as supporting context. A missing scene reference is shown honestly; reference material upload and reference-version comparison are not implemented.

The detail response is an evidence-specific projection. It does not return the frozen task schema, raw submission content, hydration context, notes, or other form answers to Designer-accessible clients.

## Backend query decision

Scene Review uses named repository candidate and detail queries because both must enforce studio/show-target scope and hydrate the snapshot schema plus show relations before schema-aware image-evidence extraction. The list cannot use generic database pagination before that extraction: doing so would produce partially filled pages and incorrect totals when non-image submissions occupy candidate rows. The service filters and maps the bounded candidate set, then paginates the evidence read model.

## Extension boundary

The current surface is read-only. Future comments, notes, AI-assisted QC, persisted QC outcomes, and task-state gates must be additive capabilities beside the evidence viewer. Any future gate must define its own persisted result, override permissions, audit history, reference-version pinning, stale-result handling, and low-confidence behavior instead of coupling task transitions to the current UI state.

## Canonical implementation

- Route: `src/routes/studios/$studioId/scene-review.tsx`
- Workspace: `src/features/scene-review/components/scene-review-workspace.tsx`
- URL state: `src/features/scene-review/config/scene-review-search-schema.ts`
- API integration: `src/features/scene-review/api/get-scene-review.ts`
- Shared evidence viewer: `src/features/tasks/components/task-qc-evidence-viewer.tsx`
- API contract: `packages/api-types/src/task-management/scene-review.schema.ts`
- Backend controller: `apps/erify_api/src/studios/studio-task/studio-scene-review.controller.ts`
