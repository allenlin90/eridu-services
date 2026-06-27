# Feature: Client Mechanics & Account-Manager Review

> **Status**: ✅ Shipped — Phase 4 PR 20.1–20.8 (lean reset 2026-06-07), last sub-PR #224
> **Workstream**: Loop-based moderation — reusable client mechanics
> **Technical design**: [CLIENT_MECHANICS_MANAGEMENT.md](../../apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md)
> **Implementation refs**: [API types](../../packages/api-types/src/client-mechanics/schemas.ts), [BE model](../../apps/erify_api/src/models/client-mechanic/client-mechanic.service.ts), [BE controller](../../apps/erify_api/src/studios/studio-client-mechanic/studio-client-mechanic.controller.ts), [FE catalog route](../../apps/erify_studios/src/routes/studios/$studioId/client-mechanics/index.tsx), [FE coverage routes](../../apps/erify_studios/src/routes/studios/$studioId/client-mechanics/$mechanicId.coverage.tsx), [Loop×Mechanic matrix](../../apps/erify_studios/src/components/task-templates/builder/task-template-builder.tsx), [backfill script](../../apps/erify_api/scripts/backfill-product-promotion-mechanics.ts)

## Problem

Loop-based moderation templates embedded product and promotion cues as raw checkbox fields. When a client ran recurring campaigns across many shows and templates, the same cue was re-authored everywhere with no shared identity: generic labels (`Product machenic`, `Promotion machenic`) collapsed unrelated instructions; identical-looking cues drifted independently; nobody could answer "is the **current** version of this cue actually reaching the shows we care about?" without manually opening tasks.

## Users

| Role | Need |
| --- | --- |
| Account Manager (`ACCOUNT_MANAGER`) | Curate a client's mechanics; verify that the latest mechanic content is reaching the client's target shows; review templates without seeing money. |
| Studio Manager / Admin | Assign mechanics into moderation-template loops; resolve stale coverage by regenerating tasks. |
| Studio Moderator (downstream) | See accurate, current cue cards in generated tasks per loop. |

## What Was Delivered

- **Client mechanic catalog** (`ClientMechanic`, client-global, single truth across studios) with `account_manager` studio role; catalog writes scoped to studio members linked to that client via shows-based linkage (20.1, 20.3).
- **Mechanics management UI** at `/studios/:studioId/client-mechanics` — browse, create, edit, retire (reversible, soft) per client; hard-delete restricted to `ADMIN` only, guarded against deletion while referenced. Client filter uses `AsyncCombobox` (server-side search), not a flat `Select` (20.2, 20.8).
- **Template→client binding**: optional `TaskTemplate.clientId`; existing studio-scoped templates stay valid with a null binding (20.4).
- **Loop × Mechanic matrix** in the task-template builder: mechanics are searchable, scrollable rows (a client's catalog can run into the dozens); loops are the (always few) columns. Checking a cell links a checkbox field into that loop, carrying the mechanic's resolved label/description; the same mechanic checked into multiple loops shares one `mechanic_id` identity (edit-once-propagates). Cards view shows mechanic fields as catalog-locked (label read-only) but freely reorderable; mobile forces Cards (20.5, redesigned 20.8 after the matrix overlapped past ~10 mechanics).
- **Mechanic→shows coverage**: per mechanic, which templates reference it (and whether the latest version still does) and, for each target show whose authoritative moderation task actually carries the mechanic, whether content is **current / stale / dropped**; shows with no qualifying task are omitted from the list rather than shown as "unassigned" (20.6, simplified in #235).
- **Show→mechanics coverage**: per show, which mechanics are **current / stale / missing**, with retired-mechanic surfacing and a read-only **Flag to Manager** hand-off (20.7).
- **One-off backfill** (`scripts/backfill-product-promotion-mechanics.ts`) converting pre-existing ad-hoc "Product/Promotion machenic" fields to the `mechanic_ref` system: 41 of 43 affected templates updated across 11 clients in the verified local run, 435 catalog mechanics created, 2,167 fields converted (20.8).
- **Money never reaches `ACCOUNT_MANAGER`**: allow-list projection strips rate/commission/compensation on every AM read path; a negative test enumerates money fields.

## Key Product Decisions

- **Client-owned, single truth (B2).** A mechanic belongs to a global `Client`; edits propagate cross-studio. Write access requires shows-based studio↔client linkage — see [studio-client-linkage-single-studio-reality.md](../tech-debt/studio-client-linkage-single-studio-reality.md) for the linkage's onboarding-sequencing and ratchet gaps.
- **Staleness without versioning (S1).** A monotonic `contentRevision`, bumped on content edit, is frozen into each template snapshot's `mechanic_ref`. Coverage compares frozen-vs-current revision exactly — no version history.
- **Coverage is observational, never a gate.** Neither coverage surface is wired into task-completion or show-lifecycle code; a show can complete regardless of what coverage reports. There is no "required mechanics for a show" concept — see [studio-config-settings.md § Mechanic Requirement Enforcement](../ideation/studio-config-settings.md#7-mechanic-requirement-enforcement-future) for a tracked future idea, not built here.
- **Backfill dedup, not one-per-field.** Production data showed heavy reuse (one template's 144 ad-hoc fields collapsed to 27 distinct descriptions, repeated verbatim across a client's template variants), so the backfill dedupes by `(client, exact instructionBody)` instead of minting one mechanic per field.
- **Mechanics as matrix rows, not columns.** A client's catalog only grows; loops per template stay few. Mechanics-as-columns (the original 20.5 shape) became illegible past ~10 mechanics — confirmed at 93 columns for one real backfilled client — so 20.8 transposed the matrix.
- **Row actions use the standard dropdown.** The mechanics catalog table now uses the same `DataTableActions` (`MoreHorizontal` dropdown) pattern as every other table in the app, not standalone icon buttons (20.8).

## Acceptance Record

- [x] Create, edit (bumps `contentRevision`), and retire are available to `ACCOUNT_MANAGER` (and ADMIN/MANAGER) for linked clients; retire preserves history and is reversible. Hard-delete is `ADMIN`-only, guarded against deletion while referenced.
- [x] Checking a matrix cell links a checkbox field into that loop carrying resolved label/description; the same mechanic checked down N loops creates N fields sharing one identity; per-loop `(mechanic_id, group)` uniqueness holds; editing the mechanic updates all linked loops' resolved content; Cards view shows mechanic fields as catalog-locked; mobile forces Cards.
- [x] `ACCOUNT_MANAGER` reaches template GET routes read-only; write routes are denied; no money fields appear.
- [x] Mechanic→shows coverage lists only shows whose authoritative moderation task carries the mechanic, resolving current/stale/dropped using frozen vs. current `contentRevision` and template-latest membership.
- [x] Show→mechanics coverage resolves the same status semantics entered from the show side, with retired-mechanic surfacing.
- [x] One-off backfill converts pre-existing ad-hoc mechanic fields to `mechanic_ref`, dry-run by default, refuses non-local databases without `ALLOW_PROD=1`.

## Out of Scope / Deferred

Immutable mechanic version history, campaign sets + items, cross-studio copies, per-template label overrides, and mechanic-requirement enforcement (a future studio-config toggle — see [studio-config-settings.md](../ideation/studio-config-settings.md)). Tracked under [PHASE_4 Out of scope](../roadmap/PHASE_4.md#out-of-scope-post-phase-4).

## Forward References

- Studio↔client linkage gaps: [studio-client-linkage-single-studio-reality.md](../tech-debt/studio-client-linkage-single-studio-reality.md)
- Future mechanic-requirement enforcement: [studio-config-settings.md § 7](../ideation/studio-config-settings.md#7-mechanic-requirement-enforcement-future)
- Row-actions dropdown convention: [table-view-pattern skill](../../.agent/skills/table-view-pattern/SKILL.md)
