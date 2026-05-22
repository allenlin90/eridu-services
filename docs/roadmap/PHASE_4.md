# Phase 4: P&L Visibility & Creator Operations

> **Last updated**: 2026-05-21 · **Status**: 🚧 Active · **Remaining**: 23 PRs · **Next**: 12.0.1 `Audit` / `AuditTarget` foundation

**Quick links**

- **Cost contract** (read first): [`economics-cost-model.md`](../domain/economics-cost-model.md) — locked semantics
- **PR 12 PRD**: [`task-fact-binding.md`](../prd/task-fact-binding.md) — high-level requirements and sub-PR breakdown
- **PR 12 design**: [`TASK_INPUT_FACT_BINDING_DESIGN.md`](../../apps/erify_api/docs/design/TASK_INPUT_FACT_BINDING_DESIGN.md) — all 12.x sub-PRs inherit these decisions
- **Finance guardrails**: [`FINANCE_GUARDRAILS.md`](../engineering/FINANCE_GUARDRAILS.md)
- **Journey traces**: [creator-operations](../workflows/creator-operations.md) · [shift-operations](../workflows/shift-operations.md)
- **Auth + endpoint matrix**: [`AUTHORIZATION_GUIDE.md`](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md)
- **Deferred**: [PHASE_5.md](./PHASE_5.md) (PR 7 strict-mode creator availability moved here)

## Goal

Build the L-side (cost) of P&L on existing studio entities and finish studio operational autonomy so studios stop depending on `/system/*` routes. Phase 4 produces **read-only reference figures** — no money moves, no payment processing, no bank reconciliation, no dispute workflow.

## Shipped

- ✅ **Wave 1 — Studio autonomy** (1.1-1.5): sidebar redesign, creator/member roster, creator onboarding, show management.
- ✅ **Cost model locked**: [`economics-cost-model.md`](../domain/economics-cost-model.md).
- ✅ **2.2 Foundation — Tasks 1-6** ([#59](https://github.com/allenlin90/eridu-services/pull/59), [#60](https://github.com/allenlin90/eridu-services/pull/60), [#62](https://github.com/allenlin90/eridu-services/pull/62)-[#65](https://github.com/allenlin90/eridu-services/pull/65)): compensation line-item APIs, actuals + snapshot readiness, creator-mapping compensation UX, shift workflow UI.
- ✅ **Money library + shift cost + show-operations + compensation review + roster wire types** ([#69](https://github.com/allenlin90/eridu-services/pull/69), [#71](https://github.com/allenlin90/eridu-services/pull/71)-[#75](https://github.com/allenlin90/eridu-services/pull/75), [#77](https://github.com/allenlin90/eridu-services/pull/77)-[#85](https://github.com/allenlin90/eridu-services/pull/85)): rows 1-11.6 in the table below.
- ✅ **Creator-mapping operations through 11.6.5** ([#83](https://github.com/allenlin90/eridu-services/pull/83)-[#85](https://github.com/allenlin90/eridu-services/pull/85), [#89](https://github.com/allenlin90/eridu-services/pull/89)): cross-user reads, show context, client filter, current-view export. 11.x closed.
- ✅ **Client mechanics design reset** ([#87](https://github.com/allenlin90/eridu-services/pull/87)) — implementation tracked as 14.x.
- ✅ **PR 12 design locked** ([#90](https://github.com/allenlin90/eridu-services/pull/90)): [`TASK_INPUT_FACT_BINDING_DESIGN.md`](../../apps/erify_api/docs/design/TASK_INPUT_FACT_BINDING_DESIGN.md). Implementation split into 12.0.1-12.4 below.

## Remaining PRs

Each row is one user-facing change. Rows are ordered top-to-bottom as execution order; rows with `—` in **Depends on** can ship in parallel. **No row depends on a row below.**

| #      | PR (brief)                                                                                                                                                                                                                                                                | Depends on           | Status                       | Link                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| 12     | [Critical task-input semantics for actuals and performance](#pr-12--meta-row) — meta-row. Design locked in [#90](https://github.com/allenlin90/eridu-services/pull/90); ships as 12.0.1-12.4. Flips ✅ when all sub-PRs merge.                                              | PR 4                 | 🔲 Design locked, split below | [#90](https://github.com/allenlin90/eridu-services/pull/90) (design only) |
| 12.0.1 | [`Audit` / `AuditTarget` foundation](../prd/task-fact-binding.md#section-a-foundation-prs-1201--1205) — new Prisma models, migration, repo/service/Zod, legacy `metadata.audit.snapshot_overrides[]` sidecar reader. No consumers yet.                                                              | —                    | 🔲 Planned                    | —                                                                         |
| 12.0.2 | [Phase 4 actuals schema additions](../prd/task-fact-binding.md#section-a-foundation-prs-1201--1205) — single Prisma migration materializing design doc §2.A: nullable actuals columns + indexes on `Show` / `ShowCreator` / `ShowPlatform`; empty `ShowPlatformViolation` table; `Show.performanceMetrics`. No consumers wired. | —                    | 🔲 Planned                    | —                                                                         |
| 12.0.3 | [Fact-key binding picker on task-template fields](../prd/task-fact-binding.md#section-a-foundation-prs-1201--1205) — **Producer-facing**: builder adds a `system_fact_key` dropdown per field; validator enforces field-type ↔ fact-key compatibility against real backing columns from 12.0.2. No runtime effect until 12.0.4. | PR 12.0.2            | 🔲 Planned                    | —                                                                         |
| 12.0.4 | [Per-target field hydration in operator task forms](../prd/task-fact-binding.md#section-a-foundation-prs-1201--1205) — **Operator-facing**: bound fields expand to one input per assigned `ShowCreator` / `ShowPlatform`. Stale targets render dimmed.                          | PR 12.0.3            | 🔲 Planned                    | —                                                                         |
| 12.0.5 | [Extraction pipeline foundation + wire-label rename](../prd/task-fact-binding.md#section-a-foundation-prs-1201--1205) — **Operator + reviewer-facing**: smoke-test extractor for `show_actual_start_time` → `Show.actualStartTime`; atomic `OPERATOR_RECORD` → `OPERATOR_INPUT` rename across PR 4/10/11 self-views. | PR 12.0.1, PR 12.0.4 | 🔲 Planned                    | —                                                                         |
| 12.1.1 | [Show actuals extractor](../prd/task-fact-binding.md#section-b-extractors-prs-1211--1232) — wire extractor for `show_actual_*_time` against PR 4's `Show` columns.                                                                                                         | PR 12.0.5            | 🔲 Planned                    | —                                                                         |
| 12.1.2 | [ShowPlatform actuals extractor](../prd/task-fact-binding.md#section-b-extractors-prs-1211--1232) — extractor for `show_platform_actual_*_time` against `ShowPlatform` columns from 12.0.2.                                                                                                       | PR 12.1.1            | 🔲 Planned                    | —                                                                         |
| 12.2   | [Creator actuals + attendance extractor](../prd/task-fact-binding.md#section-b-extractors-prs-1211--1232) — extractor for the four creator fact keys against `ShowCreator` columns from 12.0.2.                                                                                             | PR 12.0.4, PR 12.0.5 | 🔲 Planned                    | —                                                                         |
| 12.3.1 | [Platform GMV/views extractor](../prd/task-fact-binding.md#section-b-extractors-prs-1211--1232) — extractor for `platform_gmv` / `platform_view_count` against `ShowPlatform.gmv` / `viewerCount` (columns from 12.0.2).                                                                              | PR 12.0.4, PR 12.0.5 | 🔲 Planned                    | —                                                                         |
| 12.3.2 | [`ShowPlatformViolation` extractor](../prd/task-fact-binding.md#section-b-extractors-prs-1211--1232) — replace-all scoped to `(sourceTaskId, sourceFieldId)`. Table already exists from 12.0.2.                                                                                                   | PR 12.3.1            | 🔲 Planned                    | —                                                                         |
| 12.4   | [Actuals & performance review sign-off](../prd/task-fact-binding.md#section-c-review-surface-pr-124) — date-range summary, abnormality highlights, bulk sign-off, `binding_stale` queue. First cut after 12.1.1; panels light up as later extractors land.                                | PR 12.1.1            | 🔲 Planned (incremental)      | —                                                                         |
| 13     | [Economics review surface](#pr-13--economics-review-surface) (`/studios/:id/finance/economics`) — cost-reference read model. GMV/views (12.3.1) aren't cost inputs in Phase 4; doesn't block. Revenue / contribution margin / commission deferred to Phase 5.              | PR 12.1.2, PR 12.2   | 🔲 Planned                    | —                                                                         |
| 14.1   | [Client mechanic catalog foundation](#pr-141--client-mechanic-catalog-foundation) — API + DB + `ACCOUNT_MANAGER` role.                                                                                                                                                     | [#87](https://github.com/allenlin90/eridu-services/pull/87) | 🔲 Planned                    | —                                                                         |
| 14.2   | [Mechanics management UI](#pr-142--mechanics-management-ui) — client-scoped mechanics + campaign-set management routes.                                                                                                                                                    | PR 14.1              | 🔲 Planned                    | —                                                                         |
| 14.3   | [Task-template mechanic references](#pr-143--task-template-mechanic-references) — moderation fields can reference specific mechanic versions while carrying resolved snapshot content.                                                                                     | PR 14.1              | 🔲 Planned                    | —                                                                         |
| 14.4   | [Task-template mechanic assignment matrix](#pr-144--task-template-mechanic-assignment-matrix) — loop × campaign-mechanic assignment surface.                                                                                                                               | PR 14.3              | 🔲 Planned                    | —                                                                         |
| 14.5   | [Mechanic usage rollup + drift warnings](#pr-145--mechanic-usage-rollup--drift-warnings) — show where mechanic versions are used; warn on retired/superseded references.                                                                                                   | PR 14.4              | 🔲 Planned                    | —                                                                         |
| 15     | [Responsive Dialog → Drawer rollout in `erify_studios`](#pr-15--responsive-dialog--drawer-rollout-in-erify_studios) — migrate remaining `DateTimePicker` and Dialog consumers to PR 4's pattern.                                                                            | PR 4                 | 🔲 Planned                    | —                                                                         |
| 16     | [Studio-shifts export loading-state race fix](#pr-16--studio-shifts-export-loading-state-race-fix) — apply PR 4's active-controller guard to `studio-shifts-table.tsx`.                                                                                                    | —                    | 🔲 Planned                    | —                                                                         |
| 17     | [Entity edit dialogs → dedicated routes](#pr-17--entity-edit-dialogs--dedicated-routes) — audit + first conversion (creator detail); each follow-up entity ships as its own PR (17a, 17b, …).                                                                              | PR 5                 | 🔲 Planned (audit)            | —                                                                         |
| 18     | [Creator-rate wire-type migration](#pr-18--creator-rate-wire-type-migration) — `defaultRateInputSchema` / `defaultCommissionRateInputSchema` → `z.string()` end-to-end.                                                                                                    | —                    | 🔲 Planned                    | —                                                                         |
| 19     | [System creator rate wire-type migration](#pr-19--system-creator-rate-wire-type-migration) — `/admin/creators/*` input schemas → `z.string()`.                                                                                                                             | —                    | 🔲 Planned                    | —                                                                         |
| 20     | [Show inline creator-rate wire-type migration](#pr-20--show-inline-creator-rate-wire-type-migration) — `updateShowInputSchema.creators[]` → `z.string()` (mirror PR 18).                                                                                                   | PR 18                | 🔲 Planned                    | —                                                                         |

### How to use this list

- **Pick up**: write a 1-3 sentence brief in the section below; flip status to `🚧 In progress`.
- **Wrap up (before merge)**: in the PR's own commits, flip status to `✅`, replace the brief with the PR link in the table, and update any other docs the PR's outcome affects. Land docs atomically with the code; prefer squash-merge.
- **Re-cluster**: if you find a new boundary or dependency, re-check the "no row depends on a row below" invariant.

### PR 12 · meta-row

All sub-PRs under PR 12 (12.0.1 through 12.4) have been moved to a dedicated, high-level Product Requirements Document (PRD) to ensure the roadmap remains lightweight and clean.

For the comprehensive functional briefs, dependencies, section-by-section deliverables, and verification plans for the fact binding pipeline, see:
👉 **[PR 12 PRD: task-fact-binding.md](../prd/task-fact-binding.md)**

All technical implementation details, schema changes, and architectural designs are locked in:
👉 **[PR 12 Design: TASK_INPUT_FACT_BINDING_DESIGN.md](../../apps/erify_api/docs/design/TASK_INPUT_FACT_BINDING_DESIGN.md)**

*Note: In alignment with PRD §2.C and database join table conventions, polymorphic targets on `AuditTarget` use `onDelete: Cascade` to cleanly purge useless junction rows when target records are deleted, while the parent `Audit` timeline envelope remains permanently preserved.*

### PR 13 · Economics review surface

**Brief** — Add `/studios/:id/finance/economics` as a cost-reference read model consuming typed show, creator, and shift facts from the 12.x extractors. Platform GMV/views (PR 12.3.1) are not cost inputs in Phase 4 so this row does not depend on 12.3.1 / 12.3.2. Revenue, contribution margin, and commission resolution stay deferred to Phase 5 (see [`pnl-revenue-workflow.md`](../prd/future/pnl-revenue-workflow.md)).

### PR 14.1 · Client mechanic catalog foundation

**Brief** — Backend + shared-contract foundation for client-owned mechanics. Entities: `ClientMechanic`, `ClientMechanicVersion`, `ClientMechanicCampaignSet`, `ClientMechanicCampaignSetItem`. New `ACCOUNT_MANAGER` studio role: mechanics management writable, planning context (shows, creator mapping) read-only, operational mutations stay admin/manager-owned, cost/compensation/finance data not accessible. UID external IDs, official Prisma migration, repository/service/controller layering, optimistic locking on mutable records, tests for client scoping, version immutability, active/retired lifecycle, set membership, role access, and money-field redaction.

### PR 14.2 · Mechanics management UI

**Brief** — Dedicated `erify_studios` surface for content teams to manage mechanics outside task templates: browse by client, manage versions, build campaign sets (mid-month / payday / doubles), retire without deleting history. Content/reference management surface — not a task-template editor.

### PR 14.3 · Task-template mechanic references

**Brief** — Extend the task-template schema so moderation fields can reference a specific mechanic version while still carrying the resolved label/description in runtime task snapshots. Template schema stays the authoring layer; generated tasks read immutable snapshots, not live catalog rows. Any `@eridu/api-types/task-management` change updates the task-template feature doc in the same PR.

### PR 14.4 · Task-template mechanic assignment matrix

**Brief** — Loop × campaign-mechanic assignment surface in the task-template builder. Pick a client/campaign set, see only that set's approved mechanic versions, assign them into loops. Cards view stays canonical for non-mechanic fields, shared fields, validation, options, conditional rules, and loop structure.

### PR 14.5 · Mechanic usage rollup + drift warnings

**Brief** — Usage and trace views before content teams edit or retire mechanic versions. Minimum rollup: mechanic version → templates and loops; campaign set → templates; template → mechanic references by loop. Warn in the builder when a linked mechanic version is retired or superseded so authors can explicitly upgrade future snapshots.

### PR 15 · Responsive Dialog → Drawer rollout in `erify_studios`

**Brief** — Surfaced during PR 4. Migrate the remaining 13 `DateTimePicker` consumers in `erify_studios` to `ResponsiveDateTimePicker` and convert mobile-reachable Dialog modals (`system-task-details-dialog`, `task-due-date-dialog`, `shift-compensation-dialog`, `schedule-dialogs`, `bulk-task-generation-dialog`, `json-form` modals, `edit-member-dialog`) to the house pattern: any mobile-reachable Dialog switches to a vaul `Drawer` below `md` via `useIsMobile()`, sharing one body component. Recipe in `.agent/skills/frontend-ui-components/references/ui-component-details.md`. Plain confirmation modals stay as `Dialog`. Verify each surface at iPhone SE (375×667). `erify_creators` rollout tracked separately.

### PR 16 · Studio-shifts export loading-state race fix

**Brief** — Surfaced during PR 4 review. PR 4 fixed the active-controller guard on `/show-operations` export so an aborted earlier export can no longer clear `isExporting` mid-flight. The same buggy pattern exists in `apps/erify_studios/src/features/studio-shifts/components/studio-shifts-table.tsx`: `setIsExporting(false)` runs unconditionally in `finally`. Move it inside the existing `exportAbortRef.current === controller` guard (one-line scope change, mirrors PR 4). No new tests needed beyond existing shifts export coverage.

### PR 17 · Entity edit dialogs → dedicated routes

**Brief** — Surfaced during PR 5 retrospective. Per-entity edits in `erify_studios` currently open Dialogs from row actions (creator roster, member roster, show, studio shift, per-show creator compensation, shift compensation, creator compensation review). Dialogs lose URL state — you can't share a link to "Alice's roster row" or hit back/forward through edits — and constrain rich detail surfaces. `task-templates/$templateId.tsx` is the existing precedent for dedicated entity routes.

Goal: convert each single-entity detail/edit dialog into a `/studios/:studioId/<entity>/:entityId` route. Confirmation modals, bulk dialogs, and inline create-from-list dialogs stay as `Dialog`. Each conversion gets its own scoped PR (one route per PR); **this row covers the audit + the first conversion** (recommend creator detail as pilot since the compensation review dialog already wants tabs).

| #   | Today                                                               | Target route                                                                       | Notes                                                                                          |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 17a | `edit-studio-creator-dialog` + `creator-compensation-review-dialog` | `/studios/:studioId/creators/:creatorId`                                           | Pilot. Detail page hosts defaults edit, compensation review (tab), and per-show drill-in.      |
| 17b | `edit-member-dialog`                                                | `/studios/:studioId/members/:memberId`                                             | Wait for PR 8 so the route uses the string wire type.                                          |
| 17c | `show-update-dialog`                                                | `/studios/:studioId/shows/:showId` (detail route alongside the existing list page) | Show-creator compensation becomes a section; `show-actuals-dialog` folds in alongside PR 12.1. |
| 17d | `studio-shift-form-dialog` + `shift-compensation-dialog`            | `/studios/:studioId/shifts/:shiftId`                                               | Compensation becomes a tab/section.                                                            |

**Out of scope** — Confirmation/destructive dialogs (`delete-*`, `remove-*`), inline add-to-list dialogs (`add-studio-creator`, `add-member`, `add-creator`), bulk dialogs (`bulk-task-generation`, `bulk-creator-assignment`), and task-scoped sub-forms (`system-task-details`, `task-due-date`, `compensation-line-item-form`).

**Audit deliverable** for this row: a short doc at `apps/erify_studios/docs/ENTITY_DETAIL_ROUTES.md` listing target route per entity, share-link contract (which query params survive), and migration order. Then 17a opens with the pilot conversion. Each follow-up PR maintains studio scoping, optimistic-concurrency `version` round-trip, and reuses existing payload-builder helpers.

### PR 18 · Creator-rate wire-type migration

**Brief** — Surfaced during PR 5 review. `defaultRateInputSchema` / `defaultCommissionRateInputSchema` in `packages/api-types/src/studio-creators/schemas.ts` are `z.coerce.number()`, so any decimal string from the FE is coerced through a JS number before the controller re-stringifies it. Last creator-side money path on a JS number, inconsistent with the `Big`/string contract from PR 1 + Finance Guardrail #2. Migrate both helpers to `z.string()` end-to-end across all three consumers (`createStudioCreatorRosterInputSchema`, `updateStudioCreatorRosterInputSchema`, `updateStudioShowCreatorInputSchema`), keep `superRefine` invariants, parse decimals at the persistence boundary, and update the FE forms / payload builders to send strings directly. No DB migration needed.

### PR 19 · System creator rate wire-type migration

**Brief** — Surfaced during PR 8 audit (2026-05-18). `createCreatorInputSchema` / `updateCreatorInputSchema` in `packages/api-types/src/creators/schemas.ts` coerce `default_rate` / `default_commission_rate` through `z.coerce.number()` even though the response is already `z.string().nullable()`. Migrate input schemas to `z.string()` end-to-end on `/admin/creators/*`. Independent of PR 18 (different surfaces); ships in any order.

### PR 20 · Show inline creator-rate wire-type migration

**Brief** — Surfaced during PR 8 audit. `updateShowInputSchema.creators[]` in `packages/api-types/src/shows/schemas.ts` uses `z.coerce.number()` for `agreed_rate` / `commission_rate`, duplicating the helpers PR 18 migrates. After PR 18 lands, either inline the new `z.string()` shape or extract a shared helper from `studio-creators/schemas.ts` and consume it from both places. Mirror the BE/FE updates done in PR 18.

## Out of scope (post-Phase-4)

Each item has an extension sketch in cost-model §4:

- Revenue (P-side), commission resolution, contribution margin → [`pnl-revenue-workflow.md`](../prd/future/pnl-revenue-workflow.md)
- Settlement, freeze, grace tolerance, payment processing, bank-statement reconciliation
- Recipient acknowledgement, dispute, recipient-initiated adjustments
- Notifications when manager edits actuals
- Standing / schedule-scoped / global / recurring / HR line items
- Hardware / creator-app actuals automation beyond task submission and manager entry
- Additional typed platform performance metrics beyond GMV/views
- Advanced compensation rule engine
- Studio schedule management — deferred 2026-04-22; Google Sheets remains the scheduling path. Materials at [`studio-schedule-management.md`](../prd/future/studio-schedule-management.md) and the two `STUDIO_SCHEDULE_MANAGEMENT_DESIGN.md` design docs.

## Definition of Done

Phase 4 closes when every row in the PR table is `✅`. The cost-model contract remains the locked semantic source; this phase doc tracks status only.

## Verification gates per PR

```
pnpm --filter erify_api    lint && pnpm --filter erify_api    typecheck && pnpm --filter erify_api    test && pnpm --filter erify_api    build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```

App-local design docs land alongside the implementation PR only when a PR introduces a novel pattern.

## Phase 5 Deferrals

| Workstream                                                             | Reference                                           | Track |
| ---------------------------------------------------------------------- | --------------------------------------------------- | ----- |
| Studio reference data (clients, platforms, types, standards, statuses) | [PRD](../prd/studio-reference-data.md)              | C     |
| Studio creator profile editing                                         | [PRD](../prd/studio-creator-profile.md)             | C     |
| Studio snapshot/audit trail visibility                                 | —                                                   | C     |
| Advanced compensation rule engine                                      | —                                                   | A     |
| Creator HR & operations (HRMS, fixed costs)                            | —                                                   | A     |
| Ticketing, material management, inventory                              | —                                                   | B     |
| Payment processing and bank-statement reconciliation                   | —                                                   | A     |
| Recipient acknowledgement / dispute on read-only reference figures     | —                                                   | A     |
| Recipient-initiated adjustment requests                                | —                                                   | A     |
| Notifications when manager edits actuals                               | —                                                   | B     |
| Hardware / creator-app actuals sources beyond task submissions         | [PRD](../prd/future/member-actuals-attestation.md)  | A     |
| Additional platform performance metrics beyond GMV/views               | —                                                   | A     |
| P&L revenue workflow, commission resolution, contribution margin       | [Future PRD](../prd/future/pnl-revenue-workflow.md) | A     |
