# Scene Review Design

## Status

Approved for implementation planning. This document defines the product and UI boundary; it does not authorize a task-state gate in Phase 5.

## Purpose

Scene Review gives studio Designers a screenshot-first workspace for two related jobs:

1. Analyze how a scene was executed and how that execution relates to performance.
2. Perform lightweight visual QC on submitted task evidence and surface useful observations to studio Managers.

The Designer workflow is separate from manager task approval. Managers continue to approve and mutate tasks in Task Review.

## Goals

- Make scene analysis the Designer's primary workflow.
- Keep repetitive submission QC available without making it the main page hierarchy.
- Show real screenshot evidence at a useful review size on desktop and mobile.
- Scope evidence by show date, Client, and Platform.
- Preserve a clean extension path for scene-material references, human feedback, agent-assisted QC, and an optional future lifecycle gate.
- Keep Phase 5 QC advisory and read-only.

## Non-goals

- Enforcing QC before a task can be approved, completed, or otherwise transitioned.
- Uploading or versioning scene materials.
- Persisting Designer comments, notes, findings, or QC decisions.
- Running AI evaluation or presenting an AI-generated compliance score.
- Replacing Task Review for Managers and Admins.
- Designing the future reference-material ownership model.

## Information Architecture

### Route ownership

Add a dedicated studio route:

```text
/studios/:studioId/scene-review
```

The sidebar label is **Scene Review** under Operations. `DESIGNER`, `MANAGER`, and `ADMIN` may read the route. Task Review remains the Manager/Admin operational approval queue.

Scene Review has two URL-addressable modes:

- **Analysis** — the default mode and primary Designer workspace.
- **QC Inbox** — a secondary mode incorporated into the submitted-task review flow.

The active mode, date range, Client, Platform, search, selection, and pagination remain URL-backed so a review can be shared and restored.

### Analysis mode

Analysis contains historical and current submissions with image evidence, independent of whether the associated task is still awaiting approval. It supports close inspection of the scene itself and correlation with available show/platform metrics such as GMV, viewers, CTR, and CTO.

Analysis does not imply that a screenshot failed QC. Metrics are reference context, not an automated quality verdict.

### QC Inbox mode

QC Inbox contains submitted task evidence currently in the manager review flow. In the initial delivery, this means tasks in `REVIEW` with image evidence. A task leaving `REVIEW` disappears from the inbox but remains discoverable in Analysis.

QC Inbox does not add a QC-completed state, decision, or transition. The inbox is an advisory inspection surface until a later design introduces persisted findings and lifecycle policy.

## Layout and Interaction

Use the focused review workspace pattern.

### Desktop

- A compact evidence queue occupies the left pane.
- The selected screenshot occupies the largest area in the right pane.
- A narrow context region shows show/client/platform details and available metrics.
- Selecting another queue item updates the viewer without opening or closing a modal.
- Layout QC is a viewer control that overlays safe-area, host-focus, and product-zone guides.
- Show details remain collapsed by default.
- The queue includes a small screenshot preview, task/show identity, platform, and only the minimal status signal relevant to the active mode.

### Mobile

- The queue is the entry screen.
- Selecting an item opens a full-height responsive Drawer with evidence navigation.
- Previous/next controls and thumbnails appear when multiple screenshots exist.
- Layout QC and collapsed context remain available without horizontal overflow.
- Closing the Drawer returns to the same queue position and filters.

### Filters and controls

- Show date is the primary `DatePickerWithRange` and uses the 06:00–05:59 operational-day boundary.
- Client uses the shared asynchronous combobox pattern.
- Platform is a secondary filter.
- Two or more secondary filters live behind the shared responsive Filters trigger: Popover on desktop and Drawer/Sheet on mobile.
- Refresh and other view controls remain outside filter reset.
- The implementation composes Shadcn/Radix primitives through `@eridu/ui` and the existing responsive Sheet/Drawer wrappers.

## Read Model and Data Flow

Scene Review consumes a screenshot-oriented read model rather than exposing a general task-management table.

Each queue row provides:

- task and show external UIDs;
- task type, submission/review status, and submission timestamp;
- show name and operational start time;
- Client and Platform identity;
- evidence count and compact preview URL;
- available screenshot labels;
- available GMV, viewers, CTR, and CTO values;
- reference availability, which remains false until the scene-material flow exists.

The selected-item detail provides the frozen task schema, submitted content, hydrated show context, and all image evidence. API responses continue to expose external UIDs only.

Both modes reuse the same evidence viewer and detail contract. Their queue queries remain distinct:

- Analysis: image evidence across applicable task statuses.
- QC Inbox: `REVIEW` tasks with image evidence.

Summary counts and queue rows derive from the same backend criteria. Pagination and evidence filtering happen server-side so the page count cannot drift from the rendered queue.

## Reference Comparison

Scene materials will become the intended-state input for QC. A future reference may include an approved layout image, composition zones, product placement, platform constraints, brand rules, and show-specific instructions.

Until that flow exists:

- Layout QC uses generic composition guides only.
- The viewer may state that no scene reference is configured.
- Missing reference material never blocks task approval or another transition.
- The UI does not render nonfunctional upload, compare, comment, or gate controls.

The reference ownership, versioning, applicability, and upload workflow require a separate design before implementation.

## Human and Agent-assisted Findings

A later findings layer will consume three input groups:

1. Intended state: scene material, visual specification, brand rules, and platform requirements.
2. Actual state: submitted screenshots and show/client/platform context.
3. Outcome context: available performance metrics.

Agent-assisted QC uses independent evaluators for different specifications and perspectives, including scene alignment, brand/spec compliance, platform safety, and performance analysis. Evaluators produce explainable findings with supporting evidence regions and confidence, rather than one opaque quality score.

Role-specific presentation keeps the same finding useful to different users:

- Designers receive visual deviations, comparative analysis, and evidence-level detail.
- Managers receive operational risks and actionable feedback associated with the task review flow.

Human review remains authoritative. Agent output is advisory unless a separately approved state-machine policy explicitly promotes a resolved finding into a gate.

## State-machine Boundary

Phase 5 introduces no new task status, transition precondition, or automatic mutation.

Scene Review reads task and show state but does not own either state machine. A future gate must be introduced as an explicit policy that consumes a persisted, resolved QC result. The later design must define override permissions, audit history, reference-version pinning, stale-result handling, and behavior when agent confidence is insufficient.

## Authorization

- `DESIGNER`, `MANAGER`, and `ADMIN` may list Scene Review evidence and load evidence detail.
- Scene Review exposes no task-selection, due-date, approval, rejection, block, close, or bulk-action controls.
- Existing Task Review mutations remain guarded to `MANAGER` and `ADMIN` in the API.
- Route visibility, frontend guards, and backend read guards use the same role policy.

## States and Failure Handling

- **Loading:** skeleton queue and viewer placeholders preserve the final layout.
- **No matching evidence:** explain that no submitted screenshots match the date and filters; keep filter reset available.
- **No active selection:** prompt the user to select evidence from the queue.
- **Evidence unavailable:** retain the row context and show an image-specific retry/error state.
- **Metrics unavailable:** omit missing metrics without treating the submission as erroneous.
- **No reference configured:** keep generic Layout QC available and state that reference comparison is not configured.
- **Unauthorized:** use the established studio route guard and access-denied treatment.

## Extensibility Rules

- Evidence navigation, context, findings, and lifecycle policy remain separate components.
- Future comments and notes attach beside the evidence viewer; they do not become part of image navigation.
- Future reference comparison consumes a versioned reference contract and does not infer intended state from the latest mutable upload.
- Future agent evaluators write or return structured findings through a dedicated boundary; they do not mutate task status directly.
- Shared viewer behavior is reused by Analysis and QC Inbox without duplicating rendering or extraction logic.

## Verification

Implementation verification must cover:

- role access for Designer/Manager/Admin and denial for unrelated roles;
- absence of mutation controls and rejected mutation requests for Designer;
- Analysis retaining evidence after the task leaves `REVIEW`;
- QC Inbox containing only `REVIEW` tasks with image evidence;
- server-filtered date, async Client, and Platform behavior with URL restoration;
- summary/queue pagination parity;
- single-image, multi-image, missing-image, unavailable-image, and missing-metric states;
- Layout QC at desktop and mobile widths;
- mobile queue-to-Drawer navigation without overflow;
- keyboard focus, accessible labels, contrast, loading, empty, and failure states;
- screenshot evidence for desktop and mobile, including open filters and Layout QC.

## Delivery Stages

### Phase 5

- Add the Scene Review route with Analysis and QC Inbox.
- Reuse and adapt the screenshot evidence viewer.
- Add screenshot-oriented queue queries and filters.
- Keep the experience read-only and advisory.
- Preserve Task Review for Manager/Admin task approval.

### Reference and feedback flow

- Design and implement versioned scene-material upload and applicability.
- Add reference comparison and persisted human findings.
- Surface Designer feedback to Managers without changing task-state policy.

### Agent-assisted QC and optional gating

- Add multi-perspective evaluators and explainable structured findings.
- Add role-specific prioritization for Designers and Managers.
- Design and approve a state-machine policy before any finding can gate a transition.
