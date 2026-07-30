# Feature: Scene Quality Control

> **Status**: ✅ Shipped — Phase 5 item 23
> **Workstream**: Replace the read-only Scene Review workspace with a persisted, Show-level Scene QC workflow
> **Canonical docs**: [apps/erify_studios/docs/SCENE_QC.md](../../apps/erify_studios/docs/SCENE_QC.md), [apps/erify_api/docs/SCENE_QC.md](../../apps/erify_api/docs/SCENE_QC.md)

## Problem

The prior `/studios/:studioId/scene-review` route (PR #319, Phase 5 item 22) provided secure screenshot inspection but persisted no QC outcome. Reviewers could not record a Show-level scene result, compare evidence with the Client's expected-scene reference, explain a Minor or Fail decision, measure completion across an operational day, confirm a completed day, query historical QC records, or generate a manager-facing QC report.

## Users

| Role | Scene QC access |
| --- | --- |
| `DESIGNER` | Manage Client Scene Profiles, review Shows, edit draft results, confirm a completed operational day, and inspect records and reports |
| `MANAGER` | Same Scene QC workflow as Designer |
| `ADMIN` | Same Scene QC workflow as Designer |
| `MODERATION_MANAGER` | No Scene QC route or API access |
| Other studio roles | No Scene QC route or API access |

Designer, Manager, and Admin share identical Scene QC permissions. Daily confirmation attests that the advisory Scene QC dataset is complete; it is not an independent quality approval and does not require segregation between reviewer and confirmer. Designating a Task Template image field as Scene QC evidence rides existing Task Template permissions, not Scene QC access — a Manager performing Scene QC is not performing the separate Manager Review process, and Scene QC never grants Task Review mutations.

## Product Rules

- One QC result belongs to one Show, even when several Tasks or images supply evidence. A Show review can contain multiple evidence assets but never produces competing effective results for the same operational-day scope.
- Allowed outcomes are `PASS`, `MINOR`, and `FAIL`. `MINOR` and `FAIL` require non-empty reviewer feedback; `PASS` requires none. A blank, corrupted, or non-viewable image can be recorded as `FAIL` with feedback.
- A scheduled Show is eligible for Scene QC unless it is in terminal `CANCELLED` state; `CANCELLED_PENDING_RESOLUTION` remains eligible because production may have occurred.
- An eligible Show with no explicitly designated image evidence is blocked, remains incomplete, and cannot receive an outcome. There is no waiver — incorrect Show lifecycle data must be corrected at its source.
- A missing Client Scene Profile is a warning, not a blocker.
- The operational day is complete only when every eligible Show has an effective outcome. An incomplete day cannot be confirmed and produces no manager report.
- Daily confirmation is append-only. A later scope change (Show added, reactivated, rescheduled in/out, or terminally cancelled) marks the latest confirmation stale; reconfirmation appends a new revision and never rewrites a prior one.
- Records are server-backed, paginated, and filterable by date range, Client, platform, and outcome, independent of the daily workflow.
- The manager report is available only for a confirmed day, in-app and as CSV. Report identity and breakdown dimensions are pinned at confirmation time so later Show/Client/Platform/Scene Profile label changes never rewrite a historical report.
- A Client has at most one active Scene Profile (one reference image plus a required `GRAPHIC_BG` or `REAL_BACKDROP` scene type). Replacing it updates the Client's profile in place; it does not retroactively change what an already-confirmed review appears to have been compared against, because each review snapshots the exact expected image and scene type shown at save time.
- Scene QC is advisory: it never changes Task, Manager Review, or Show state. It performs no task selection, due-date edit, status action, or bulk approval.

## Key Product Decisions

Locked for Stage 1 (the accepted implementation plan's decision table, lifted here as the durable rationale record):

| Question | Stage 1 decision | Reason |
| --- | --- | --- |
| Review anchor | One effective review per Show | Verifies the Show's complete scene setup even when several Tasks or images supply evidence. |
| Actors | Designer, Manager, and Admin have the same Scene QC permissions | Confirmation attests completeness of an advisory dataset; it is not an independent approval or the separate Manager Review process. Actor audit remains mandatory. Moderation Manager is excluded. |
| Task Template evidence configuration | Existing Task Template permissions apply | Evidence designation changes a Task Template and must not broaden template administration through Scene QC access. |
| Hard prerequisite | At least one explicit image evidence record | Without an image, there is nothing to review. |
| Unusable image | The operator may record Fail with feedback | A present record that renders blank, corrupt, or non-viewable is evidence of an unusable submission; a transient browser load error must not auto-fail it. |
| Missing Scene Profile | Warning, not blocker | Scene QC can still assess the supplied live evidence. |
| Eligible lifecycle states | All scheduled Shows except terminal `CANCELLED` | `CANCELLED_PENDING_RESOLUTION` remains in scope because production may have occurred; incorrect lifecycle data must be corrected at its source. |
| Daily confirmation | Append-only confirmation revisions | A changed Show scope makes the latest confirmation stale and requires reconfirmation without rewriting history. |
| Confirmed review editing | Immutable through normal controls | Reasoned, audited amendments are Stage 2 scope. |
| Scene Profile resolution | The Client's single active Scene Profile, if any | No per-Show or per-platform override; deterministic Client-level resolution is enough until Stage 2 composition is validated. |
| Stage 1 Scene Profile shape | One mutable reference image + scene type per Client; no revisions, no reusable Material identity, no composition | Matches the source spec's one-benchmark-per-brand model. Richer composition and versioning are deferred (see [material-management](../ideation/material-management.md)). |
| Scene type | Required as `GRAPHIC_BG` or `REAL_BACKDROP` | Preserves the source taxonomy gate without assuming one type across all Clients. |
| Operational timezone | One shared operational-timezone constant (`Asia/Bangkok`), fixed 06:00 start hour | Exactly one Studio exists today and every operator/server caller already agrees on `Asia/Bangkok`. Promote to a real per-Studio column only when a second timezone studio appears (see [studio-config-settings](../ideation/studio-config-settings.md) §6). |
| Manager report | In-app plus CSV, available only from a complete current confirmation | The report is advisory and must identify exactly which confirmation it represents. |
| Taxonomy | Structured findings and self-service configuration deferred | Stage 1 free text supplies required actionable context without prematurely fixing catalog ownership and governance. |
| Cutover | Direct replacement behind an integration branch; no dual public API | The prior Scene Review implementation stored no QC outcomes and had no data contract worth migrating. |

## Delivery Stages

- **Stage 1 — Daily Scene QC** (shipped): persisted Show-level outcomes, Client Scene Profile management, daily completion tracking and confirmation, records, and manager report.
- **Stage 2 — Governance and Advanced Profile Operations** (deferred, see [material-management](../ideation/material-management.md)): reusable versioned Scene Materials, per-Show/per-platform Scene Profile overrides, confirmed-result amendment and reason workflows, record detail revision timeline.
- **Stage 3 — Taxonomy and Analytics** (deferred, see [studio-config-settings](../ideation/studio-config-settings.md)): shared/studio-scoped taxonomy configuration, structured element/defect findings, issue breakdowns and trends, configurable period reports and PDF export.

## Acceptance Record

- [x] Designer, Manager, and Admin can create and edit Scene QC outcomes and confirm a completed day; Moderation Manager cannot access Scene QC.
- [x] Designer, Manager, and Admin can manage the Stage 1 Client-owned Scene Profile (single reference image and scene type).
- [x] Existing Task Template permissions, rather than Scene QC role access alone, control who can designate a Task image field as Scene QC evidence.
- [x] Scene QC activity by a Manager does not enter or mutate the separate Manager Review flow.
- [x] The default queue covers exactly one operational day; Shows come from existing persisted schedule data, with no CSV upload.
- [x] One Show appears once in the review queue and can expose multiple eligible evidence assets.
- [x] The selected Show resolves the Client's active Scene Profile when available; a missing profile is a warning, not a blocker.
- [x] Every eligible Show remains in the daily completion denominator; terminally cancelled Shows are excluded, `cancelled_pending_resolution` Shows remain eligible.
- [x] A Show with no image evidence is blocked, cannot receive a QC outcome, and prevents daily confirmation.
- [x] Blank, corrupted, or non-viewable image evidence can be recorded as Fail with required feedback.
- [x] Desktop compares live evidence and expected scene side by side; mobile keeps the outcome form adjacent to the visual context.
- [x] Pass can be saved without feedback; Minor and Fail cannot be saved without non-empty feedback.
- [x] Daily confirmation is unavailable until every expected Show has an effective outcome; confirmation records actor, time, included Shows, and revision.
- [x] A scope change after confirmation marks the day stale and requires an append-only reconfirmation revision.
- [x] A confirmed day makes its manager report available in-app and as CSV, with identity, confirmed scope, outcome totals, Client/platform breakdowns, Show-level detail, and an exception list.
- [x] A historical report continues to render its confirmation-time Show, Client, platform, and Scene Profile labels after later source edits.
- [x] Scene QC cannot change Task status, approve or reject Tasks, or change Show lifecycle state.
- [x] Records can be filtered by date range, Client, platform, and result with server pagination.
- [x] Confirmed records cannot be deleted.

## Canonical References

- Frontend: [apps/erify_studios/docs/SCENE_QC.md](../../apps/erify_studios/docs/SCENE_QC.md)
- Backend: [apps/erify_api/docs/SCENE_QC.md](../../apps/erify_api/docs/SCENE_QC.md)
- Role model: [rbac-roles.md](./rbac-roles.md), [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md)
- Deferred scope: [material-management](../ideation/material-management.md) (Stage 2 Materials/overrides), [studio-config-settings](../ideation/studio-config-settings.md) (Stage 3 taxonomy, per-Studio timezone)
- Roadmap: [PHASE_5.md item 23](../roadmap/PHASE_5.md#23-scene-qc-replacement)
