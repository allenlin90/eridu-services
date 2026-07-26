# PRD: Scene Quality Control

> **Status**: Product requirements accepted; implementation plan ready — assigned to [Phase 5 item 23](../roadmap/PHASE_5.md#23-scene-qc-replacement)
> **Workstream**: Replace the read-only Scene Review workspace with a persisted, Show-level Scene QC workflow
> **Related**: [implementation plan](../../apps/erify_api/docs/design/SCENE_QC_IMPLEMENTATION_PLAN.md), [Phase 5 Scene Review](../roadmap/PHASE_5.md#22-scene-review-workspace), [current frontend workflow](../../apps/erify_studios/docs/SCENE_REVIEW.md), [task and operations review](../workflows/task-and-operations-review.md), [material management ideation](../ideation/material-management.md), [studio settings ideation](../ideation/studio-config-settings.md)

## Summary

Scene QC is a daily operational workflow for reviewing the visual setup of livestream Shows. An authorized Scene QC operator examines all eligible evidence for one Show, compares it with the Client's expected-scene reference image when available, records Pass, Minor, or Fail, and supplies feedback for every Minor or Fail result.

The operational day is the completion boundary. When every expected Show has been reviewed, an authorized Scene QC operator confirms the day and makes its manager report available. Confirmed results remain queryable by date range, Client, platform, and outcome.

Scene QC is advisory. It does not approve or reject Tasks, change Show lifecycle state, or block operational work.

## Problem

The current `/studios/:studioId/scene-review` route provides secure screenshot inspection but persists no QC outcome. Reviewers cannot:

- record a Show-level scene result;
- compare evidence with the Client's expected-scene reference;
- explain a Minor or Fail decision;
- measure completion across an operational day;
- confirm a completed day;
- query historical QC records; or
- generate a manager-facing QC report.

The replacement workflow must add these capabilities without coupling visual QC decisions to Task Review or Show lifecycle transitions.

## Goals

- Give Scene QC operators a fast daily workflow for reviewing scene setup one Show at a time.
- Keep the review boundary at the Show while supporting multiple evidence assets.
- Compare evidence with the Client's single active Scene Profile reference image.
- Require actionable feedback for every Minor or Fail result.
- Make operational-day review coverage explicit and confirmable.
- Gate manager report availability on complete daily review coverage.
- Preserve secure, queryable, auditable review history.
- Reuse existing Show, Client, platform, Task evidence, R2 upload, operational-day, and authorization infrastructure.
- Resolve every operational day from one canonical shared operational-timezone constant so every operator and server caller agrees on the same durable window; promote to a per-Studio column only when a second timezone studio actually appears ([Studio Configuration & Settings](../ideation/studio-config-settings.md) §6).
- Leave clear extension points for profile composition, amendments, taxonomy, structured findings, and analytics.

## Non-Goals

- Changing Task status, approving or rejecting Tasks, or replacing Task Review.
- Changing Show status or enforcing Show lifecycle gates.
- Automatically creating a `ShowIssue` for every Minor or Fail result.
- Using CSV upload as the source of Shows.
- Building a general-purpose material management domain in the first release.
- Reusable, versioned, or composed Scene Materials distinct from a Client's single active reference image, and any per-Show or per-platform Scene Profile override. Stage 1 gives each Client exactly one active, replaceable reference image and scene type.
- A required per-Studio `timezone` column. Stage 1 uses one shared, hardcoded operational-timezone constant (`Asia/Bangkok`); promotion criteria live in [Studio Configuration & Settings](../ideation/studio-config-settings.md) §6.
- Shipping user-managed QC taxonomy, trend analytics, or PDF export in the first release.
- Preserving the PoC's localStorage, Google Apps Script, dark-only theme, simulated phone frame, or swipe gestures.
- Migrating legacy QC outcomes. The current Scene Review implementation persists no QC decisions.

## Terminology

| Term | Meaning |
| --- | --- |
| Operational day | One studio business day, resolved server-side as 06:00 through 05:59 from one canonical shared operational-timezone constant (Stage 1: `Asia/Bangkok`; promoted to a per-Studio column per [Studio Configuration & Settings](../ideation/studio-config-settings.md) §6 when a second timezone studio appears) |
| Scene QC operator | A user with Designer, Manager, or Admin role performing this workflow |
| Daily review | The collection of expected Show reviews for one operational day |
| Show review | One effective QC outcome for one Show, covering all evidence selected for that review |
| Evidence | One or more explicitly eligible scene images associated with a Show, commonly supplied through a Task |
| Scene Profile | A Client's single active reference image and scene type, used as the expected-scene comparison target |
| Daily confirmation | The authorized Scene QC operator's sign-off that all expected Shows in the operational day have an outcome |
| Manager report | A read-only summary available only after the daily review is complete and confirmed |
| Amendment | A reasoned, audited correction to confirmed QC data |

## Users and Authorization

| Role | Scene QC access | Initial workflow |
| --- | --- | --- |
| `DESIGNER` | Yes | Manage Client Scene Profiles, review Shows, edit draft results, confirm a completed operational day, and inspect records and reports |
| `MANAGER` | Yes | Same Scene QC workflow as Designer |
| `ADMIN` | Yes | Same Scene QC workflow as Designer |
| `MODERATION_MANAGER` | No | No Scene QC route or API access |
| Other studio roles | No | No Scene QC route or API access |

Designer, Manager, and Admin have the same Stage 1 Scene QC permissions, including the minimum Client Scene Profile management needed by the workflow. Daily confirmation attests that the advisory Scene QC dataset is complete; it is not an independent quality approval and does not require segregation between reviewer and confirmer. The confirmation preserves the actor and time for accountability.

Existing Task Template administration permissions remain unchanged: designating a Task field as Scene QC evidence is part of Task Template management, not Scene QC review access. A Manager performing Scene QC is not performing the separate Manager Review process. Scene QC never grants Task Review mutations or changes the semantics of Manager Review.

## Product Rules

### Review Boundary

- One QC result belongs to one Show.
- A Show review can contain multiple evidence assets.
- Evidence selection and navigation do not create separate outcomes.
- A result applies to the evidence set and, when available, the exact expected image and scene type shown for that review.
- A Show must not receive multiple competing effective results for the same operational-day review scope.
- Every review pins its operational date and server-resolved window. A review from a prior date is not effective after the Show moves across the operational-day boundary.

### Outcomes and Feedback

- The allowed outcomes are `PASS`, `MINOR`, and `FAIL`.
- `PASS` requires no feedback.
- `MINOR` requires non-empty reviewer feedback.
- `FAIL` requires non-empty reviewer feedback.
- Reviewer feedback explains the visible difference from the expected scene setup or why the evidence is unusable.
- A blank, corrupted, or non-viewable image can be recorded as `FAIL` with feedback.
- Stage 1 feedback is text. Structured findings extend the review later without replacing its identity or history.

### Daily Completion

- Daily Review sends a date-only operational date; the server resolves its exact boundary from the shared operational-timezone constant.
- A scheduled Show is eligible unless it is in terminal `cancelled` state.
- `cancelled_pending_resolution` remains eligible because production may have occurred and the cancellation is not final.
- The queue shows total, reviewed, and remaining Show counts.
- Client, platform, and review-state filters narrow the current day without changing its completion scope.
- Every eligible Show remains in the completion denominator.
- An eligible Show with no image evidence is blocked, remains incomplete, and cannot receive a QC outcome.
- A missing Scene Profile is a warning and does not prevent review.
- There is no Stage 1 waiver for a blocked Show. Incorrect Show lifecycle data must be corrected at its source.
- The day is complete only when every expected Show has an effective outcome.
- An incomplete day cannot be confirmed and does not produce a manager report.
- Daily confirmation records the confirming operator, confirmation time, included Shows, and effective review revision.
- Daily confirmation does not mutate Task or Show state.
- A latest confirmation becomes stale when the current eligible Show set no longer matches its pinned scope, including when a Show is added, reactivated, rescheduled into the day, rescheduled out of the day, or terminally cancelled.
- A stale day requires confirmation again after every currently eligible Show has an effective review. Reconfirmation appends a new confirmation revision and never rewrites the prior confirmation.

### Records

- Records are server-backed and queryable independently from the daily workflow.
- Required filters are date range, Client, platform, and outcome.
- Records show the Show, operational day, Client, platform, outcome, feedback, reviewer, and current revision state.
- List responses are paginated and exclude heavy evidence and audit payloads.
- Record detail loads the evidence, the expected-scene reference shown at review time, review history, and amendments only when requested.

### Manager Report

- A manager report is available only for a confirmed daily review.
- The Stage 1 report is available in the application and as a CSV export.
- Report identity includes studio, operational date and timezone, confirmation status, confirming operator, confirmation time, report generation time, and confirmation revision.
- Confirmed scope includes the total confirmed Shows and Pass/Minor/Fail totals and percentages.
- Breakdowns summarize results by Client and platform.
- Show-level detail includes scheduled time, Show, Client, platform, result, reviewer, reviewer feedback, evidence count, and the expected scene type shown, when available.
- An exceptions section lists every Minor and Fail result, its feedback, and whether the confirmed result was later amended.
- A report identifies its confirmation and any later amendments honestly.
- Report identity and breakdown dimensions are pinned at confirmation so later Show, Client, platform, or Scene Profile label changes do not rewrite a historical report.
- Reviewed and blocked counts remain Daily Review completion metrics. They are omitted from a confirmed report because every confirmed Show is reviewed and confirmation requires zero blockers.
- The manager report remains advisory and cannot trigger Task or Show transitions.
- The Stage 1 report implementation keeps cross-day trends, taxonomy issue breakdowns, heatmaps, period comparisons, and PDF export out of scope.
- The report module must contain an actionable `TODO(scene-qc-reporting)` comment naming those deferred extensions so later reporting work stays discoverable in the same capability.

## Scene Profile

### Ownership

- A Scene Profile is owned by a Client.
- A Client has at most one active Scene Profile: one reference image plus a required scene type.
- A Show resolves the Client's active Scene Profile for review when available. Stage 1 has no per-Show, per-platform, or per-Studio override — a Client's Scene Profile applies everywhere that Client is reviewed.
- A profile declares whether its physical setup is `GRAPHIC_BG` or `REAL_BACKDROP`.

### Replacement Behavior

- A Scene Profile is a single mutable reference, not a composition or a version history.
- Replacing the reference image or scene type updates the Client's Scene Profile in place.
- Replacing a Scene Profile does not silently rewrite previously confirmed review context: each Show review snapshots the exact expected image and scene type it was shown at save time, not a pointer back to the Client's current or historical Scene Profile.

### First-Release Boundary

- Stage 1 supports the minimum profile administration required to supply one expected-scene reference per Client: upload, replace, and retire.
- Stage 1 does not create a reusable Material identity, immutable material/profile revision history, ordered multi-reference composition, per-Studio/per-platform applicability, or a general Material, MaterialType, ShowMaterial, ticket-attachment, or production-asset workflow.
- Broader material lifecycle, reuse across profiles, and per-Show/platform overrides remain in [Material Management](../ideation/material-management.md); promote when its decision gates are met.
- Because Stage 1 has no cross-Studio applicability, a Scene Profile mutation only ever affects the owning Client's own Studios through the normal Studio-membership Scene QC role check — there is no separate cross-Studio-impact authorization step.

## Evidence Requirements

- Shows come from the existing Show schedule and persistence model, not a Scene QC CSV import.
- Evidence commonly originates from submitted Task content, but Scene QC owns the purpose-specific projection.
- Only explicitly designated scene-QC evidence is eligible; arbitrary image fields must not enter the queue through filename or schema heuristics.
- Evidence retains its source Task, source field, and source revision identity.
- A Show with multiple evidence assets remains one review item.
- Evidence retains its durable storage object key. Render URLs are re-signed through existing upload and storage infrastructure rather than treated as permanent history.
- At least one image evidence record is the only hard prerequisite for recording a Show review.
- A Show with no image evidence is blocked and cannot receive Pass, Minor, or Fail.
- An image record that renders blank, is corrupted, or cannot be viewed can receive Fail with required reviewer feedback.
- A missing applicable Scene Profile is shown as a warning and does not block the review.
- Blocked Shows remain in daily completion until evidence is supplied or the Show lifecycle state is corrected.

## UX Requirements

### Daily Review

- `/studios/:studioId/scene-review` remains the primary route unless implementation planning identifies a migration requirement.
- The default surface is one operational day, with explicit previous, next, and date selection.
- The daily Show queue and completion progress remain visible while reviewing.
- Selecting a Show opens a focused review workspace.
- Multiple evidence controls appear adjacent to the evidence.
- Live evidence and expected scene default to side-by-side comparison on desktop.
- The Pass/Minor/Fail form appears immediately below the evidence comparison.
- Minor/Fail feedback appears inline in the same review form.
- Saving advances to the next unreviewed Show.
- Mobile preserves the focused workflow and keeps the result form immediately after the evidence. A Live/Expected toggle may replace side-by-side layout when width requires it.

### Records

- Records are a separate surface from the daily review queue.
- Filters include date range, Client, platform, and result.
- Filter state is URL-addressable.
- Lists use server pagination and purpose-specific projections.
- Selecting a record opens its full review context and revision history.

### States

The UI handles:

- loading daily scope;
- no Shows in scope;
- Show missing eligible evidence;
- Show missing an applicable Scene Profile;
- blank, corrupted, or non-viewable evidence with an available Fail action;
- unreviewed, draft-reviewed, and confirmed results;
- incomplete and complete daily review;
- confirmation success and failure;
- empty filtered record results; and
- amended confirmed data.

## Lifecycle and Audit

### Stage 1

- Draft Show reviews remain editable until daily confirmation.
- Stage 1 confirmation makes the daily review immutable through normal review controls.
- A later change to the eligible Show scope marks the latest confirmation stale and requires a new confirmation revision after the current scope is complete.
- Review creation, draft changes, and confirmation use standard actor-aware audit history.

### Stage 2

- Confirmed results can be amended through an explicit command.
- An amendment requires a reason and preserves the original result.
- Amendments increment the effective revision and remain visible in record detail.
- Manager reports identify amended data and use the latest effective confirmed revision.

No QC history is publicly deletable.

## Taxonomy and Structured Findings

Structured taxonomy findings and self-service taxonomy configuration are deferred from the first release. Stage 1 free-text feedback provides the actionable explanation required for Minor and Fail without fixing catalog ownership, retirement, or shared-versus-studio governance prematurely. It is not expected to produce a better vocabulary than the source specification.

The source specification's two axes—scene element and defect type—plus the optional related element remain the seed candidate for Stage 3. Stage 1 stores `GRAPHIC_BG` or `REAL_BACKDROP` on each Client's Scene Profile so that adding structured findings does not require a profile-history migration.

When promoted:

- structured findings describe where the problem is and what kind of defect occurred;
- findings remain children of the existing Show review;
- a shared system catalog can coexist with studio-scoped additions;
- taxonomy entries are retired rather than deleted;
- historical findings preserve stable codes and display labels;
- taxonomy governance belongs with future Studio Configuration and Settings;
- every taxonomy consumer, including reports, uses centralized counting and labeling behavior rather than reading raw finding keys directly; and
- free-text feedback remains required for Minor and Fail unless product evidence supports relaxing it.

The deferred configuration scope is tracked in [Studio Configuration and Settings](../ideation/studio-config-settings.md).

## Delivery Stages

### Stage 1 — Daily Scene QC

- Replace the read-only Scene Review workflow with persisted Show-level outcomes.
- Preserve Designer, Manager, and Admin access and exclude Moderation Manager.
- Give Designer, Manager, and Admin the same Stage 1 Scene QC permissions without entering the separate Manager Review flow.
- Resolve operational-day boundaries from the shared operational-timezone constant.
- Provide the minimum Scene Profile manager required to supply one expected-scene reference per Client.
- Record Graphic BG or Real Backdrop on each Client's Scene Profile.
- Load one operational-day Show queue with Client, platform, and state filters.
- Support multiple explicit evidence assets per Show.
- Resolve the Client's active Scene Profile when available.
- Present evidence/reference comparison with the review form immediately adjacent.
- Require feedback for Minor and Fail.
- Track daily completion and authorized-operator confirmation.
- Gate a simple manager report on confirmed completion.
- Add filtered, paginated records.
- Keep Task and Show lifecycle behavior unchanged.

### Stage 2 — Governance and Advanced Profile Operations

- Add reusable, versioned Scene Materials distinct from a Client's single Stage 1 reference, ordered multi-reference composition, and per-Studio/per-platform applicability (see Non-Goals and [Material Management](../ideation/material-management.md)).
- Add per-Show or per-platform Scene Profile overrides beyond the Stage 1 Client-wide default.
- Add confirmed-result amendment, reason, and audit workflows.
- Add record detail with revision timeline.

### Stage 3 — Taxonomy and Analytics

- Add shared and studio-scoped taxonomy configuration.
- Add structured element/defect findings.
- Add issue breakdowns, repeat patterns, Client and platform trends, and daily heatmaps.
- Add configurable period reports and PDF export.
- Evaluate an analytical projection only after query volume and latency justify it.

## Architecture Boundaries

- Scene QC is a business capability, not another Task model view.
- Task supplies evidence context but does not own QC outcome persistence.
- Show is the review anchor.
- Scene Profile remains a Client-owned product concept, not a Task or Show field.
- Standard `Audit` records history; audit metadata is not the primary QC data store.
- `ShowIssue` remains an optional escalation target for actionable follow-up, not the storage model for every Minor or Fail result.
- Review commands and report queries are separate capability-owned paths.
- API contracts use UID identifiers, snake_case external fields, and Zod schemas in `@eridu/api-types`.
- Semantic user mutations use optimistic locking.
- Confirmed review and report queries use normalized persisted facts. JSON archive copies are not the source of truth.
- Standard `Audit` envelopes retain history; a capability-owned typed target side table keeps Scene QC target growth out of the generic target junction.
- Cross-period analytics can move to a read model later without changing operational review identity.

## Existing Infrastructure to Reuse

- Show, Client, platform, and TaskTarget relationships.
- The current studio-scoped Scene Review route and role policy.
- Operational-day date-range utilities and URL state patterns.
- Secure Scene Review evidence projection and shared QC evidence viewer.
- `QC_SCREENSHOT` and `SCENE_REFERENCE` R2 upload use cases.
- Standard Audit envelopes.
- Server-backed list pagination and lean detail subresources.

The current heuristic extraction of any image field and provisional Task-content metric matching are not durable Scene QC contracts.

## Stage 1 Acceptance Criteria

- [ ] Designer, Manager, and Admin can create and edit Scene QC outcomes and confirm a completed day; Moderation Manager cannot access Scene QC.
- [ ] Designer, Manager, and Admin can manage the Stage 1 Client-owned Scene Profile (single reference image and scene type).
- [ ] Existing Task Template permissions, rather than Scene QC role access alone, control who can designate a Task image field as Scene QC evidence.
- [ ] Scene QC activity by a Manager does not enter or mutate the separate Manager Review flow.
- [ ] The default queue covers exactly one operational day.
- [ ] Shows come from existing persisted schedule data without CSV upload.
- [ ] One Show appears once in the review queue and can expose multiple eligible evidence assets.
- [ ] The selected Show resolves the Client's active Scene Profile when available.
- [ ] Every Scene Profile records Graphic BG or Real Backdrop.
- [ ] A missing Scene Profile is visible as a warning but does not block review.
- [ ] Every eligible Show remains in the daily completion denominator.
- [ ] Terminally cancelled Shows are excluded; `cancelled_pending_resolution` Shows remain eligible.
- [ ] A Show with no image evidence is blocked, cannot receive a QC outcome, and prevents daily confirmation.
- [ ] A Show incorrectly left active after cancellation remains blocked until its lifecycle state is corrected.
- [ ] Blank, corrupted, or non-viewable image evidence can be recorded as Fail with required feedback.
- [ ] Desktop can compare live evidence and expected scene side by side.
- [ ] Mobile can review the same evidence and expected scene without separating the outcome form from the visual context.
- [ ] An authorized Scene QC operator can save Pass without feedback.
- [ ] Minor and Fail cannot be saved without non-empty feedback.
- [ ] Saving a review updates daily completion and advances to the next unreviewed Show.
- [ ] Daily confirmation is unavailable until every expected Show has an effective outcome.
- [ ] Different browser timezones resolve the same operational date, eligible Show set, and confirmation lineage for one Studio.
- [ ] Confirmation records actor, time, included Shows, and revision.
- [ ] A scope change after confirmation marks the day stale and requires an append-only reconfirmation revision.
- [ ] A confirmed day makes its manager report available.
- [ ] The Stage 1 report contains identity, confirmed scope, outcome totals, Client/platform breakdowns, Show-level detail, and an exception list.
- [ ] A historical report continues to render its confirmation-time Show, Client, platform, and Scene Profile labels after later source edits.
- [ ] The Stage 1 report is available in-app and as CSV.
- [ ] The report module contains an actionable `TODO(scene-qc-reporting)` for trends, taxonomy breakdowns, heatmaps, period comparisons, and PDF export.
- [ ] Scene QC cannot change Task status, approve or reject Tasks, or change Show lifecycle state.
- [ ] Records can be filtered by date range, Client, platform, and result with server pagination.
- [ ] A review remains bound to its pinned operational date when its Show is later rescheduled.
- [ ] Historical evidence remains viewable through a freshly signed URL derived from its pinned object key.
- [ ] Confirmed records cannot be deleted.

## Engineering Handoff Boundary

Implementation planning may define exact entity names, route shapes, transaction boundaries, profile-resolution rules, pagination contracts, and migration sequence.

The implementation must preserve the capability boundaries, review cardinality, confirmation semantics, advisory behavior, auditability, and phased scope defined here.
