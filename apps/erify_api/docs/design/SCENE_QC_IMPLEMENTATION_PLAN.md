# Scene QC Implementation Plan

> **Status**: Ready for roadmap assignment and implementation
> **Product contract**: [Scene Quality Control PRD](../../../../docs/prd/scene-qc.md)
> **Frontend route**: `/studios/:studioId/scene-review`
> **Delivery model**: One integration branch with journey-complete child PRs and one atomic cutover PR to `master`

## 1. Outcome

Replace the Task-anchored, read-only Scene Review implementation from PR #319 with a persisted, Show-level Scene QC capability.

The first release gives Designer, Manager, and Admin users one daily workflow to:

1. manage the minimum Client-owned expected-scene references;
2. review every eligible Show with one or more explicit image evidence records;
3. record `PASS`, `MINOR`, or `FAIL`, with required feedback for Minor and Fail;
4. confirm or reconfirm a complete operational day;
5. inspect historical records; and
6. open or export the confirmed manager report.

Scene QC owns only its profiles, materials, review outcomes, confirmations, and reports. It does not update Tasks, Task Review, Manager Review, or Show lifecycle state.

## 2. Decisions Locked for Stage 1

| Question | Stage 1 decision | Reason |
| --- | --- | --- |
| Review anchor | One effective review per Show | The purpose is to verify the Show's complete scene setup, even when several Tasks or images supply evidence. |
| Actors | Designer, Manager, and Admin have the same Scene QC permissions | These roles may all perform the job. Moderation Manager is excluded. |
| Task Template evidence configuration | Existing Task Template permissions apply | Evidence designation changes a Task Template and must not broaden template administration through Scene QC access. |
| Hard prerequisite | At least one explicit image evidence record | Without an image, there is nothing to review. |
| Unusable image | The operator may record Fail with feedback | A present record that renders blank, corrupt, or non-viewable is evidence of an unusable submission. A transient browser load error must not auto-fail it. |
| Missing Scene Profile | Warning, not blocker | Scene QC can still assess the supplied live evidence. |
| Eligible lifecycle states | All scheduled Shows except terminal `cancelled` | `cancelled_pending_resolution` remains in scope because production may have occurred. Incorrect lifecycle data must be corrected at its source. |
| Daily confirmation | Append-only confirmation revisions | A changed Show scope makes the latest confirmation stale and requires reconfirmation without rewriting history. |
| Confirmed review editing | Immutable through normal controls | Reasoned, audited amendments arrive in Stage 2. |
| Scene Profile resolution | Explicit Show assignment, otherwise Client default | This is deterministic and avoids ambiguous platform-specific profile selection. |
| Stage 1 composition | Ordered expected-reference gallery with optional studio/platform applicability on each material link | This supports reusable materials and side-by-side comparison without building a canvas editor. |
| Operational timezone | Reuse the existing client-resolved operational-window contract | `Studio` has no canonical timezone field today. Stage 1 stores the exact ISO bounds and browser-resolved IANA timezone label on confirmation instead of inventing a Scene-QC-only timezone source. |
| Manager report | In-app plus CSV, available only from a complete current confirmation | The report is advisory and must identify exactly which confirmation it represents. |
| Taxonomy | Deferred | Free-text feedback supplies the first useful signal. Shared and studio-scoped taxonomy remains a later Studio Configuration concern. |
| Cutover | Direct replacement behind an integration branch; no dual public API | The current feature stores no QC outcomes and has no data contract worth migrating. Atomic delivery avoids exposing half of the workflow. |

## 3. Actor and Action Matrix

| Action | Designer | Manager | Admin | Moderation Manager | Upstream Task user |
| --- | --- | --- | --- | --- | --- |
| Open Daily Review, Records, and a confirmed report | Yes | Yes | Yes | No | No |
| Create or edit a draft Show review | Yes | Yes | Yes | No | No |
| Confirm or reconfirm a complete day | Yes | Yes | Yes | No | No |
| Create or update a Client Scene Profile or material | Yes | Yes | Yes | No | No |
| Assign a Scene Profile to a Show | Yes | Yes | Yes | No | No |
| Designate a Task Template image field as Scene QC evidence | Only with existing Task Template permission | Yes | Yes | No | No |
| Supply evidence through the existing Task form | Unchanged | Unchanged | Unchanged | Unchanged | Yes when assigned |
| Amend a confirmed result | Stage 2 | Stage 2 | Stage 2 | No | No |
| Change Task Review, Manager Review, or Show state from Scene QC | No | No | No | No | No |

All public endpoints use the existing studio-membership guard and allow exactly `DESIGNER`, `MANAGER`, and `ADMIN`, except Task Template changes, which retain their current authorization.

Every Client-scoped read or mutation also validates that the Client is linked to the requested Studio, following the existing Studio Client Mechanic and Task Template pattern. Optional studio applicability can reference only a Studio where the actor has the required membership. This keeps Client-owned rows reusable without turning a studio-scoped route into unrestricted global Client administration.

## 4. Capability Boundary

Create a top-level `scene-qc` capability in `erify_api`. Do not place new outcome persistence in `models/task` or extend `StudioTaskController`.

```text
StudioSceneQcQueryController
  -> SceneQcQueryService
       -> SceneQcRepository
       -> Show and Task evidence reads

StudioSceneQcReviewController
  -> SceneQcWorkflowService
       -> SceneQcRepository
       -> SceneProfileRepository
       -> AuditService

StudioSceneProfileController
  -> SceneProfileWorkflowService
       -> SceneProfileRepository
       -> upload validation
       -> AuditService
```

The capability follows the repository/service/controller separation that remains canonical in `erify_api`. Repositories are private providers. Commands and queries are separated by service responsibility only; Stage 1 does not introduce a CQRS bus, generic event system, or speculative interfaces.

Task remains the source of submitted evidence. Show remains the review anchor. Client remains the owner of Scene Profiles and materials. Studio and platform references describe applicability, not ownership.

Place implementation by capability:

```text
apps/erify_api/src/scene-qc/
packages/api-types/src/scene-qc/
apps/erify_studios/src/features/scene-qc/
apps/erify_studios/src/routes/studios/$studioId/scene-review.tsx
apps/erify_studios/src/routes/studios/$studioId/scene-review/profiles.tsx
```

The final cutover removes the old `features/scene-review` Task projection instead of leaving two feature folders with different ownership semantics.

## 5. Persisted Model

Prisma generates the migration. UID fields are the only identifiers exposed through the API.

### 5.1 Scene Material

`SceneMaterial` is the Client-owned reusable identity:

| Field | Contract |
| --- | --- |
| `uid` | External `scene_material_*` UID |
| `clientId` | Required Client owner |
| `name` | Operator-facing name, unique among active materials for the Client |
| `status` | `ACTIVE` or `RETIRED` |
| `version` | Optimistic-lock token for semantic mutations |
| `createdAt`, `updatedAt`, `deletedAt` | Standard lifecycle fields; no public delete action |

`SceneMaterialRevision` is the immutable uploaded image version:

| Field | Contract |
| --- | --- |
| `materialId`, `revision` | Unique monotonically increasing material revision |
| `objectKey`, `fileUrl` | Existing R2 object identity and render URL |
| `mimeType`, `fileSize` | Validated image metadata |
| `createdById`, `createdAt` | Revision provenance |

Replacing a material creates a revision. It never overwrites an earlier object reference. Stage 1 accepts supported image MIME types only, even though the broader `SCENE_REFERENCE` upload use case can support other files.

### 5.2 Scene Profile

`SceneProfile` is the Client-owned reusable identity:

| Field | Contract |
| --- | --- |
| `uid` | External `scene_profile_*` UID |
| `clientId` | Required Client owner |
| `name`, `description` | Operator-facing identity |
| `status` | `ACTIVE` or `RETIRED` |
| `isDefault` | At most one active default per Client |
| `version` | Optimistic-lock token |
| `createdAt`, `updatedAt`, `deletedAt` | Standard lifecycle fields; no public delete action |

`SceneProfileRevision` is an immutable composition revision. Each semantic composition save creates one revision and a set of ordered `SceneProfileRevisionMaterial` rows:

| Field | Contract |
| --- | --- |
| `profileRevisionId` | Owning immutable profile revision |
| `materialRevisionId` | Exact immutable material revision |
| `sortOrder` | Stable expected-reference order |
| `studioId` | Optional applicability filter |
| `platformId` | Optional applicability filter |
| `label` | Optional comparison label specific to this composition |

At read time, a material link applies when its optional studio matches the Show studio and its optional platform is among the Show platforms. An unscoped link applies everywhere within the owning Client. A profile cannot reference another Client's material.

The first release renders the applicable ordered references as a gallery. It does not store canvas coordinates, layers, or derived composite images.

`SceneProfileAssignment` stores an optional explicit Show-to-profile assignment:

| Field | Contract |
| --- | --- |
| `showId` | Unique Show |
| `profileId` | Active profile owned by the Show's Client |
| `version` | Optimistic-lock token |
| `createdAt`, `updatedAt`, `deletedAt` | Standard lifecycle fields |

Resolution is:

1. active explicit Show assignment;
2. otherwise the Client's active default profile;
3. otherwise no profile, producing a warning but not a blocker.

Default changes and assignments use a transaction and a Client-scoped advisory lock so concurrent writes cannot create competing defaults.

### 5.3 Explicit Evidence Binding

Add `evidence_purpose: 'scene_qc'` to the shared Task Template file-field schema. It is valid only when the field accepts images.

`TaskTemplateSceneQcEvidenceRef` denormalizes the binding for immutable snapshots:

| Field | Contract |
| --- | --- |
| `templateId` | Owning Task Template |
| `snapshotId` | Required immutable snapshot used by Tasks |
| `fieldKey` | Exact Task content key |
| `label` | Snapshot-time display label |

The Task Template save/publish path writes these rows from the validated schema, following the existing `TaskTemplateMechanicRef` projection pattern. The snapshot JSON remains immutable.

The Scene QC evidence resolver:

1. finds Tasks targeted to the Show;
2. joins their immutable snapshots to explicit evidence refs;
3. reads only the corresponding Task content values;
4. accepts image records with safe existing storage URLs;
5. returns every eligible image with source Task UID, field key, label, and Task version; and
6. never falls back to recursive URL discovery, filename matching, or provisional metric-label matching.

A bounded, operator-reviewed cutover mapping populates evidence-ref rows for existing active snapshots that must feed Scene QC. Before cutover, a verification command must report zero in-scope active Task snapshots without an intentional binding. There is no permanent heuristic compatibility path.

### 5.4 Show Review

`SceneQcReview` is the single current review head for a Show:

| Field | Contract |
| --- | --- |
| `uid` | External `scene_qc_review_*` UID |
| `showId` | Unique Show anchor |
| `result` | `PASS`, `MINOR`, or `FAIL` |
| `feedback` | Null for Pass; required non-empty text for Minor and Fail |
| `reviewedById` | Current reviewing actor |
| `profileRevisionId` | Nullable exact profile revision shown during review |
| `version` | Optimistic-lock token |
| `confirmedAt` | Null while editable; set when first included in a confirmation |
| `createdAt`, `updatedAt` | Standard timestamps |

`SceneQcReviewEvidence` pins each image included in the decision:

| Field | Contract |
| --- | --- |
| `reviewId`, `sortOrder` | Owning review and stable display order |
| `sourceTaskId` | Source Task |
| `sourceTaskVersion` | Task version at review time |
| `sourceFieldKey`, `sourceLabel` | Explicit evidence binding identity |
| `fileUrl` | Reviewed image record |

On every draft save, the workflow re-resolves the current evidence and profile, validates that at least one image exists, replaces the draft's pinned evidence set transactionally, and increments `version`. After `confirmedAt` is set, the normal update command rejects edits. Stage 2 introduces explicit amendment records rather than weakening this command.

An image record may be marked Fail when it appears blank, corrupt, or non-viewable. The persisted state remains the normal `FAIL` result plus required feedback; Stage 1 does not need a separate unusable-image enum.

### 5.5 Daily Confirmation

`SceneQcDailyConfirmation` is append-only:

| Field | Contract |
| --- | --- |
| `uid` | External `scene_qc_confirmation_*` UID |
| `studioId` | Studio scope |
| `operationalDate` | Local `YYYY-MM-DD` business date |
| `windowStart`, `windowEnd`, `timezone` | Exact resolved scope and browser-resolved IANA timezone label |
| `revision` | Monotonic revision within studio and operational date |
| `confirmedById`, `confirmedAt` | Actor and time |

`SceneQcDailyConfirmationItem` pins:

| Field | Contract |
| --- | --- |
| `confirmationId`, `showId` | Included scope |
| `reviewId`, `reviewVersion` | Effective review included in this confirmation |

The unique revision scope and advisory-lock key use studio plus exact window bounds; `operationalDate` remains the human-readable business key. The confirmation command acquires that lock, re-queries the eligible Show set, verifies one review with image evidence for every Show, rejects incomplete scope, appends the next confirmation revision, writes its items, marks previously unconfirmed included reviews confirmed, and records audit history in one CLS transaction.

The latest confirmation state is computed by comparing its pinned Show set with the current eligible set:

- `UNCONFIRMED`: no confirmation exists;
- `CURRENT`: sets match and every pinned review remains the effective confirmed review;
- `STALE`: a Show was added, reactivated, moved into or out of the day, terminally cancelled, or otherwise changed the current scope.

A stale day uses the same confirmation command after the current scope is complete. It appends a new revision. It never modifies the previous confirmation.

### 5.6 Audit

Extend the typed `AuditTarget` pattern for:

- `SCENE_MATERIAL`;
- `SCENE_PROFILE`;
- `SCENE_PROFILE_ASSIGNMENT`;
- `SCENE_QC_REVIEW`; and
- `SCENE_QC_CONFIRMATION`.

Audit creation, semantic edits, default or assignment changes, review saves, and confirmation. Store business fields in normalized tables, not audit metadata. Use the standard `reason` column only for future reasoned amendment commands.

### 5.7 Producer and Consumer Matrix

| Persisted input | Authorized producer | Edit/version rule | Stage 1 consumers |
| --- | --- | --- | --- |
| Task evidence designation | Existing Task Template builder permissions | New immutable snapshots receive explicit ref rows; reviewed legacy snapshots use the bounded backfill | Evidence resolver, daily blocker counts, review context |
| Task image value | Existing assigned Task form | Existing Task optimistic lock and snapshot contract | Evidence resolver; pinned on review save |
| Material revision | Scene QC profile manager | Upload/replace appends an immutable revision | Profile composition, expected-reference viewer |
| Profile revision and material links | Scene QC profile manager | Composition save appends an immutable revision | Show profile resolver, review context, historical record |
| Profile assignment/default | Scene QC profile manager | Optimistic lock plus Client-scoped transaction | Deterministic Show profile resolver |
| Draft Show review | Daily Review result form | Editable with optimistic lock until first confirmation | Daily summary, queue, Records |
| Daily confirmation and items | Confirm/reconfirm action | Append-only revision under advisory lock | Confirmation status, manager report, CSV |

No Stage 1 read surface depends on an administrator editing raw JSON, a migration-only seed, or an unavailable future configuration UI. The evidence backfill is only a cutover bridge for existing immutable snapshots; all new bindings have the Task Template builder as their normal write path.

## 6. API Contract

All schemas live under a new `@eridu/api-types/scene-qc` export. Requests and responses use snake_case, UID identifiers, Zod validation, and consistent pagination envelopes.

### 6.1 Profiles and Materials

```text
GET    /studios/:studioId/scene-materials
POST   /studios/:studioId/scene-materials
GET    /studios/:studioId/scene-materials/:materialId
PATCH  /studios/:studioId/scene-materials/:materialId
POST   /studios/:studioId/scene-materials/:materialId/revisions

GET    /studios/:studioId/scene-profiles
POST   /studios/:studioId/scene-profiles
GET    /studios/:studioId/scene-profiles/:profileId
PATCH  /studios/:studioId/scene-profiles/:profileId
POST   /studios/:studioId/scene-profiles/:profileId/revisions

PUT    /studios/:studioId/scene-profile-assignments/:showId
DELETE /studios/:studioId/scene-profile-assignments/:showId
```

Assignment deletion soft-removes the override and returns the Show to Client-default resolution; it does not delete a profile or history. All semantic `PATCH`, revision, assignment, and unassignment commands require the current `version`.

Reuse the `SCENE_REFERENCE` presign flow, extended with validated Client/material context. The browser uploads directly to R2, then the material revision command records the validated object key, URL, MIME type, and size. Presign creation alone does not create a material revision or increment its semantic version.

### 6.2 Daily Review

```text
GET    /studios/:studioId/scene-qc/summary
GET    /studios/:studioId/scene-qc/items
GET    /studios/:studioId/scene-qc/items/:showId
POST   /studios/:studioId/scene-qc-reviews
PATCH  /studios/:studioId/scene-qc-reviews/:reviewId
POST   /studios/:studioId/scene-qc-confirmations
```

Every daily query, review command, or confirmation request receives `window_start`, `window_end`, and `operational_date`. Confirmation also receives `timezone`, obtained from `Intl.DateTimeFormat().resolvedOptions().timeZone`. The frontend resolves the local 06:00–05:59 operational window through the existing shared utility; the backend validates ordering and a single-day maximum and stores the exact instants and valid IANA label on confirmation. This follows the current infrastructure. A canonical per-Studio timezone belongs in future Studio Configuration rather than a private Scene QC setting.

`summary` returns lean counts and confirmation state:

```text
operational_date
window_start / window_end / timezone
eligible_count
reviewed_count
pass_count / minor_count / fail_count
blocked_no_evidence_count
remaining_count
confirmation: UNCONFIRMED | CURRENT | STALE
confirmation_id / confirmation_revision / confirmed_by / confirmed_at
```

`items` is server-paginated and supports `client_id`, `platform_id`, `review_state`, and `search`. Filters narrow visible rows but never change summary or confirmation scope. A list row contains Show identity, time, Client, platforms, evidence count, profile availability, result, feedback presence, reviewer, review version, and blocked state. It excludes full evidence and reference arrays.

`items/:showId` returns all current evidence, the resolved profile revision and applicable ordered material revisions, current review, and allowed actions. It does not return audit history.

Review create/update accepts `show_id`, `operational_date`, `window_start`, `window_end`, `result`, `feedback`, and `version` for updates. The server resolves and pins evidence and references; clients cannot submit arbitrary evidence URLs or profile revision IDs.

### 6.3 Records and Report

```text
GET    /studios/:studioId/scene-qc-records
GET    /studios/:studioId/scene-qc-records/:reviewId
GET    /studios/:studioId/scene-qc-confirmations/:confirmationId/report
GET    /studios/:studioId/scene-qc-confirmations/:confirmationId/report.csv
```

Records support `date_from`, `date_to`, `client_id`, `platform_id`, `result`, `page`, and `limit`. Dates filter the Show's operational date. The list is a lean projection. Detail loads pinned evidence, pinned profile/material references, confirmation identity, and available audit history.

No report exists before the first confirmation. A report requested by confirmation UID remains available after later scope changes because it is an immutable historical artifact. The latest stale confirmation is labeled `STALE`, and an older revision after reconfirmation is labeled `SUPERSEDED`; the Daily Review surface does not present either as the current manager report. The report returns exactly:

- identity: studio, operational date, timezone, confirmation status, confirming operator, confirmation time, report generation time, and confirmation revision;
- coverage: total eligible, total reviewed, result counts, and result percentages;
- Client breakdown: Client identity and Pass/Minor/Fail totals;
- platform breakdown: platform identity and Pass/Minor/Fail totals;
- Show detail: scheduled time, Show, Client, platforms, result, reviewer, feedback, evidence count, and Scene Profile name/revision when available; and
- exceptions: every Minor and Fail row with feedback and amendment indicator.

Result percentages use the confirmation's total eligible Shows as the denominator and render to one decimal place. Each Show contributes once to its Client. A multi-platform Show contributes once to each linked platform, so platform breakdown totals are not expected to sum to the eligible-Show total.

The CSV contains one row per Show and repeats report identity columns so an exported row remains attributable. Its columns are:

```text
studio
operational_date
timezone
confirmation_revision
confirmed_by
confirmed_at
show_start_time
show_id
show_name
client_id
client_name
platforms
result
feedback
reviewed_by
reviewed_at
evidence_count
scene_profile
scene_profile_revision
amended
```

Place this actionable marker in the report query module:

```ts
// TODO(scene-qc-reporting): add taxonomy breakdowns, cross-day trends,
// heatmaps, period comparisons, and PDF export after Stage 3 requirements
// define their dimensions and query-volume needs.
```

## 7. Frontend Information Architecture

Keep the existing sidebar entry and route label. Replace the current `analysis` and `qc-inbox` modes.

```text
/studios/:studioId/scene-review
  tab=daily     Daily Review
  tab=records   Records

/studios/:studioId/scene-review/profiles
  Client Scene Profiles and reusable materials
```

The profile manager is a focused subroute reached through **Manage profiles** in the Scene QC page actions. It does not become a third operational tab, keeping Daily Review and Records visually distinct.

### 7.1 URL State

Daily Review:

```text
tab=daily
date=YYYY-MM-DD
client_id?
platform_id?
review_state=all|unreviewed|reviewed|blocked
show_id?
page
limit
```

Records:

```text
tab=records
date_from=YYYY-MM-DD
date_to=YYYY-MM-DD
client_id?
platform_id?
result=PASS|MINOR|FAIL?
review_id?
page
limit
```

Profile manager:

```text
client_id?
profile_id?
material_status?
page
limit
```

Use route search schemas as the only source of filter truth. Changing a scope filter resets pagination and invalid selections. Back/forward navigation restores the selected tab, filters, page, and Show or record.

### 7.2 Daily Review Desktop

The accepted desktop hierarchy is:

1. page title, operational-date navigation, and actions;
2. Daily Review and Records tabs;
3. completion summary with total, reviewed, remaining, blockers, and confirmation state;
4. a compact filter row;
5. a Show queue at left and focused review workspace at right;
6. live evidence and expected references side by side;
7. Pass/Minor/Fail controls immediately below the images; and
8. inline feedback and Save & next.

```text
┌ Operational date ─ Completion ─ Confirmation/report action ┐
├ Daily Review | Records                                     ┤
├ Filters                                                    ┤
├───────────────┬────────────────────────────────────────────┤
│ Show queue    │ Live evidence        Expected reference   │
│ status/counts │ thumbnails           thumbnails            │
│               ├────────────────────────────────────────────┤
│               │ Pass | Minor | Fail                        │
│               │ Feedback when required                     │
│               │                         Save & next         │
└───────────────┴────────────────────────────────────────────┘
```

Queue rows show scheduled time, Show, Client, platforms, evidence count, and one clear state: Unreviewed, Pass, Minor, Fail, or Blocked. The selected row remains visible while the workspace loads.

Evidence thumbnails and labels sit next to the live image. Expected-reference thumbnails sit next to the expected image. Switching either side does not change the current result form. The viewer supports zoom and fit controls through the existing shared evidence viewer where possible.

The result form uses three explicit choices:

- Pass: feedback optional and collapsed;
- Minor: feedback opens inline and is required;
- Fail: feedback opens inline and is required.

An **Image blank or not viewable** action selects Fail, focuses feedback, and explains that the operator must describe the problem. Browser `onError` displays retry/open-original controls but never saves or selects Fail automatically.

Saving invalidates the daily summary and item queries, keeps the selected filter state, and selects the next unreviewed Show. If no unreviewed Show remains, focus moves to confirmation.

### 7.3 Missing and Empty States

| State | UI behavior |
| --- | --- |
| No Shows in the operational day | Empty daily state; no confirmation or report action |
| No evidence record | Blocked panel in place of the form; identify the missing upstream evidence requirement; no Pass/Minor/Fail controls |
| Evidence record fails to render | Preserve result controls; offer retry/open original and the explicit Fail shortcut |
| No Scene Profile | Warning above an empty expected-reference panel; review remains enabled |
| Filter returns no rows | Filtered empty state; completion summary still describes the full day |
| Incomplete day | Confirm action disabled with reviewed/remaining/blocker explanation |
| Current confirmation | Immutable banner with actor, time, revision, and Open current report |
| Stale confirmation | Warning listing added/removed scope counts; current-report action disabled; historical report remains attributable from Records; reconfirm becomes available only after current scope is complete |
| Optimistic conflict | Preserve typed feedback locally, refresh the current review, and require an explicit retry |

### 7.4 Mobile

Mobile starts with the daily Show list. Selecting a Show opens a full-height responsive drawer or focused screen:

1. Show context;
2. Live/Expected segmented toggle;
3. image and adjacent evidence/reference selector;
4. result controls;
5. inline feedback; and
6. sticky Save & next action.

The result form remains immediately after the visual evidence. Mobile does not force a compressed two-column comparison or rely on swipe gestures.

### 7.5 Records

Records use the shared server-driven table pattern:

- Date range is the primary filter.
- Client uses the existing async combobox pattern.
- Platform and result are secondary filters.
- The URL owns filters, sort, page, and selected record.
- Desktop opens record detail in a Sheet; mobile uses a Drawer.

The list remains lean. Evidence, references, and audits load only when a record is selected.

### 7.6 Manager Report

**Open report** on a current confirmation opens a focused report page or Sheet with:

1. confirmation identity and generation time;
2. coverage and result cards;
3. Client and platform breakdown tables;
4. the full Show detail table;
5. a Minor/Fail exceptions section; and
6. **Download CSV**.

The report is read-only. A historical stale or superseded report shows that status prominently when opened from Records. CSV is generated from the complete confirmation item set, never the visible page of any UI table.

### 7.7 Profiles and Materials

The profile manager begins with a required Client selector, then shows:

- the Client's profiles, active/default state, and last update;
- the selected profile's ordered expected-reference gallery;
- reusable Client materials with active/retired state;
- upload/replace material;
- add/remove/reorder material references;
- optional studio and platform applicability per profile-material link;
- set as Client default; and
- assign the selected profile to a Show.

Composition save creates a new immutable profile revision. Material replace creates a new immutable material revision. Existing confirmed reviews continue rendering their pinned revisions.

Stage 1 deliberately omits drag-positioned layers, freeform canvas composition, campaign rules, bulk assignments, and general production-asset management.

### 7.8 Accessibility and Feedback

- All status and result choices have text labels in addition to color.
- Comparison controls and thumbnail selectors are keyboard reachable.
- Focus moves to validation errors, the next Show, or confirmation after successful actions.
- Save, confirmation, upload, and export expose pending states and prevent duplicate submission.
- Destructive-looking actions use accurate language: Retire, Remove assignment, or Remove from profile. There is no public Delete review action.

## 8. Query and Mutation Behavior

### 8.1 Operational Scope

The frontend resolves the selected local date into exact ISO bounds through `operational-day-range.ts`. The backend:

1. validates one operational day;
2. loads non-deleted Shows assigned to the studio whose scheduled start falls within the bounds;
3. excludes only terminal `cancelled`;
4. includes `cancelled_pending_resolution`; and
5. applies no Task status or Manager Review filter.

The summary and confirmation always use the unfiltered eligible set. List filters affect only visible rows.

### 8.2 Review Save Transaction

1. Lock or optimistic-check the review head.
2. Resolve and authorize the Show within the studio.
3. Reject terminally cancelled or out-of-window context against the required daily scope.
4. Resolve explicit image evidence and require at least one record.
5. Resolve the profile and applicable immutable material revisions.
6. Validate the result and feedback contract.
7. Create or update the draft review and replace its pinned evidence.
8. Write Audit.
9. Commit, then invalidate frontend summary, item, context, and records query families.

The workflow never writes Task, TaskTarget, Show, ShowStatus, or Manager Review data.

### 8.3 Confirmation Transaction

1. Acquire an advisory lock for studio and operational date.
2. Recompute eligible Shows without UI filters.
3. Resolve one effective review for each Show.
4. Reject missing reviews, no-evidence blockers, or optimistic conflicts.
5. Append confirmation and item rows.
6. Mark newly included draft reviews confirmed.
7. Write Audit.
8. Commit, then make the report queryable.

### 8.4 Refresh Policy

- Current operational day summary and queue refetch on the existing operational-review interval.
- Historical days do not poll.
- Detail is enabled only with a valid selected Show.
- Mutations invalidate exact Scene QC query-key factories, not unrelated Task or Show caches.
- Profile/material mutations invalidate their lists plus affected unresolved daily contexts.

## 9. Cutover from PR #319

There is no QC outcome migration because the shipped workspace is read-only.

The final integration PR performs one atomic route and contract replacement:

1. deploy the new tables, APIs, evidence bindings, profile feeder, and UI together;
2. retain `/studios/:studioId/scene-review` and its sidebar role visibility;
3. remove `SCENE_REVIEW_MODE`, `analysis`, and `qc-inbox`;
4. remove the Task-anchored `GET /studios/:studioId/scene-review` and `/:taskId` contract;
5. remove `SceneReviewService` from the Task model and the Scene Review methods from `TaskRepository`;
6. remove recursive image URL fallback, filename-based image detection, and provisional content-label metric extraction;
7. retain reusable, capability-neutral evidence viewer UI where it still fits;
8. replace old shared schemas and tests with the new `scene-qc` package export; and
9. run the evidence-binding verification before enabling the route.

Do not ship a hybrid UI where old analysis modes coexist with persisted Show reviews. If deployment ordering requires compatibility, the integration branch may temporarily carry private adapters, but the public cutover commit removes them.

## 10. Delivery Plan

Use [integration PR delivery](../../../../.agents/workflows/integration-pr-delivery.md). Create one integration branch and main PR targeting `master`. Every child PR targets the integration branch. Only the main PR merges to `master`, after all scenarios pass together.

### Child PR 1 — Contracts and Persistence Foundation

Deliver:

- new `@eridu/api-types/scene-qc` schemas, UID prefixes, enums, and pagination contracts;
- Prisma models, indexes, relations, audit targets, and generated migration;
- private repositories and single-model services;
- profile resolution and eligibility unit tests; and
- architecture import-closure checks.

Exit:

- generated Prisma client builds;
- model constraints reject cross-Client composition and ambiguous defaults;
- repositories use UID boundaries and soft-delete filters; and
- no public route behavior changes.

### Child PR 2 — Profiles, Materials, and Explicit Evidence Feeder

Deliver:

- profile/material/revision/assignment APIs;
- `SCENE_REFERENCE` material upload validation;
- profile manager subroute and frontend mutations;
- Task Template `evidence_purpose` validation and builder control;
- immutable snapshot evidence-ref projection;
- operator-reviewed existing-snapshot backfill mapping and verification command; and
- audit and optimistic-lock coverage.

Exit:

- an allowed user can create a Client material, compose and default a profile, and resolve it for a Show;
- an existing/new Task snapshot can explicitly supply multiple Scene QC images;
- no arbitrary image field appears as evidence; and
- every reference read in the later review UI has an implemented write path.

### Child PR 3 — Daily Review Journey

Deliver:

- summary, paginated items, and Show context queries;
- review create/update commands with pinned evidence and profile revisions;
- Daily Review URL state, queue, comparison workspace, inline form, and mobile layout;
- no-evidence blocker, missing-profile warning, and unusable-image Fail shortcut; and
- Save & next with cache invalidation and optimistic conflict handling.

Exit:

- Designer, Manager, and Admin can complete the same Show review journey;
- Minor/Fail feedback is enforced by shared schema and backend;
- no-evidence Shows cannot receive an outcome;
- one Show with multiple images remains one queue row and one outcome; and
- no Scene QC mutation changes Task or Show state.

### Child PR 4 — Confirmation, Records, and Manager Report

Deliver:

- append-only confirmation and staleness/reconfirmation behavior;
- Records query/table/detail;
- exact in-app manager report and full filtered CSV;
- current-day-only refetch policy;
- actionable `TODO(scene-qc-reporting)`; and
- desktop/mobile report and records states.

Exit:

- incomplete or blocked days cannot confirm;
- a current confirmation unlocks exactly one current report revision, while stale and superseded historical reports remain attributable;
- a changed Show scope marks the latest confirmation stale;
- reconfirmation appends a revision; and
- CSV totals match the in-app report under the same confirmation.

### Main Integration PR — Atomic Cutover and Reconciliation

Deliver:

- removal of the PR #319 Task-anchored implementation and heuristic schemas;
- final route wiring, navigation, migrations, and evidence-binding verification;
- combined end-to-end and authorization coverage;
- desktop and mobile screenshot evidence;
- all canonical documentation and skill reconciliation listed below;
- knowledge sync and document lifecycle bookkeeping; and
- final PR description with migration, rollback, and operational verification instructions.

The main PR is not mergeable if any child is absent or if the integration branch exposes only profile administration, only review writes, or only report reads.

## 11. Pattern and Documentation Reconciliation

The current operations-review doctrine describes every review surface as read-only. Scene QC changes that doctrine narrowly: operational review summaries stay read-only, while a review capability may write only its own normalized decisions and confirmations. It still cannot mutate the source Task, Show, actuals, or lifecycle.

Reconcile these files in the main integration PR:

- `.agents/skills/operations-review-surface/SKILL.md`;
- `.agents/skills/erify-authorization/SKILL.md`;
- `apps/erify_studios/docs/SCENE_REVIEW.md`;
- `apps/erify_studios/docs/README.md`;
- `apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md`;
- `apps/erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md`;
- `docs/features/rbac-roles.md`; and
- `docs/workflows/task-and-operations-review.md`.

Keep `docs/roadmap/PHASE_5.md` as historical evidence of PR #319. Add a forward link to the Scene QC PRD and promoted canonical documentation; do not rewrite the historical shipped scope as though it had persisted outcomes.

When Task Template evidence designation ships, update the Task Template feature documentation and relevant skill in the same PR.

## 12. Verification

### 12.1 Required Commands

Run for every changed workspace:

```bash
pnpm --filter @eridu/api-types lint
pnpm --filter @eridu/api-types typecheck
pnpm --filter @eridu/api-types test
pnpm --filter @eridu/api-types build

pnpm --filter erify_api lint
pnpm --filter erify_api typecheck
pnpm --filter erify_api test
pnpm --filter erify_api build

pnpm --filter erify_studios lint
pnpm --filter erify_studios typecheck
pnpm --filter erify_studios test
pnpm --filter erify_studios build

pnpm agents:validate
pnpm architecture:signals
pnpm lint:markdown
```

Also run Prisma format, validate, generate, and the official migration command required by the target environment. Do not hand-write or rewrite a deployed migration.

### 12.2 Backend Scenarios

- each allowed role can read, review, manage Stage 1 profiles, and confirm; excluded roles receive authorization failure;
- a profile cannot reference another Client's material or be assigned to another Client's Show;
- concurrent default-profile writes leave one default;
- material replace and profile composition save create immutable revisions;
- explicit evidence resolution returns every designated image and no undesignated image;
- a Show with zero evidence is counted as blocked and review create fails;
- Pass accepts empty feedback; Minor and Fail reject empty feedback;
- a draft update pins current evidence and profile revisions and increments version;
- a confirmed review rejects normal edits;
- terminal `cancelled` is excluded and `cancelled_pending_resolution` remains included;
- filtered items and the unfiltered summary intentionally use different scopes;
- confirmation rechecks completeness inside its lock and transaction;
- replayed concurrent confirmation creates one next revision;
- added, removed, rescheduled, reactivated, and terminally cancelled Shows produce the expected stale state;
- report totals, Client breakdowns, platform breakdowns, detail, exceptions, and CSV rows reconcile to confirmation items; and
- review and confirmation rollback leave no partial Audit or pinned-child rows.

### 12.3 Frontend Scenarios

- default date is the current operational day and previous/next/date selection preserve correct 06:00–05:59 bounds;
- URL back/forward restores filters, pagination, and selected Show or record;
- queue loading, empty, error, filtered-empty, blocked, and selected states render;
- side-by-side desktop and Live/Expected mobile comparison keep the form adjacent;
- changing evidence or expected reference does not lose draft result text;
- no-evidence state removes result controls;
- missing-profile state preserves result controls;
- image load failure offers retry and explicit Fail but does not auto-submit;
- Minor/Fail focus the inline feedback validation;
- Save & next selects the next unreviewed Show;
- incomplete/current/stale confirmation states expose the correct actions;
- Records uses server pagination and detail lazy loading;
- manager-report CSV exports the full confirmation item set, not a visible UI table page; and
- optimistic conflict preserves typed feedback before refresh.

### 12.4 Rendered Evidence

Capture Playwright evidence at desktop and mobile widths for:

- daily queue plus selected side-by-side review;
- no-evidence blocker;
- missing Scene Profile warning;
- Minor/Fail feedback;
- complete-day confirmation;
- stale-day reconfirmation;
- Records filters and detail; and
- manager report.

## 13. Rollout and Rollback

Before production cutover:

1. apply the generated migration;
2. run the reviewed evidence-ref backfill;
3. run the zero-unintentional-unbound-snapshot verification;
4. smoke-test one profile, one multi-image Show, one blocked Show, confirmation, Records, and report in the target environment; and
5. enable the replaced route only after all checks pass.

Rollback the application by restoring the previous route build while leaving additive Scene QC tables intact. Do not drop tables or rewrite evidence bindings during an emergency rollback. Because the old route is read-only and new data is capability-owned, retained rows are safe for a corrected redeployment.

## 14. Deferred Work and Forwarding

| Deferred item | Forwarding address |
| --- | --- |
| Confirmed-result amendments and reasoned corrections | Scene QC Stage 2 in the product PRD |
| Rich composition rules, campaign dimensions, bulk assignment, and canvas editing | Scene QC Stage 2; promote a focused profile-operations design when needed |
| Shared and studio-scoped QC taxonomy | Scene QC Stage 3 and `docs/ideation/studio-config-settings.md` |
| Taxonomy findings, heatmaps, cross-day trends, period comparisons, and PDF | Scene QC Stage 3 plus `TODO(scene-qc-reporting)` |
| General Material, MaterialType, ShowMaterial, ticket attachment, or production-asset lifecycle | `docs/ideation/material-management.md` |
| Automatic ShowIssue creation from Minor/Fail | Future Show Issue integration decision after ownership and escalation requirements exist |
| Task or Show lifecycle gating | Explicitly outside Scene QC; propose through Task Review or Show lifecycle work, not this capability |
| Notifications | Future notification work after a concrete recipient and delivery rule is defined |

## 15. Definition of Done

Stage 1 is complete only when:

- every model read by Daily Review, Records, or reports has a working authorized write path;
- the PR #319 heuristic implementation and API modes are removed;
- all acceptance scenarios pass on the integrated branch;
- the manager report matches the exact confirmed Show set;
- no Scene QC command writes Task, Manager Review, or Show lifecycle state;
- the pattern reconciliation set is complete;
- documentation and skill indexes validate;
- rendered desktop and mobile evidence is attached to the main PR; and
- the main integration PR is the only merge to `master`.
