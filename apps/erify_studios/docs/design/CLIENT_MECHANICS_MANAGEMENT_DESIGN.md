# Client Mechanics Management — Design

> **Status**: Planned — lean reset (2026-06-07)
> **Scope**: client-owned mechanics catalog, task-template mechanic assignment for loop-based moderation, and account-manager mechanic↔show coverage.
> **Roadmap**: [PHASE_4.md rows 20.1–20.7](../../../../docs/roadmap/PHASE_4.md#pr-20--direction-2026-06-07-reset)
> **Product spec**: [docs/prd/client-mechanics.md](../../../../docs/prd/client-mechanics.md)
> **Supersedes**: the heavyweight 4-entity/versioned/campaign-set plan in this doc's prior revision (derived from [#87](https://github.com/allenlin90/eridu-services/pull/87)); PR [#86](https://github.com/allenlin90/eridu-services/pull/86)'s template-local grid is reference material, not source of truth.

## Problem

Loop-based moderation templates currently embed product and promotion cue cards directly as task-template checkbox fields. That made sense when templates were the only authoring surface, but it fails once the same client runs recurring campaigns across many shows and templates.

The concrete failure surfaced on template `ttpl_pWi1mbHEtHU0D-Zc3cHa`: most checkbox labels are generic values such as `Product machenic` and `Promotion machenic`, while the real instruction lives in each field's description/key. Grouping by label collapses unrelated instructions; a positional grid lets identical-looking instructions drift because each cell is independent.

The actual domain object is the **mechanic**: a reusable client instruction, product cue, or promotion cue that content teams manage and template authors assign into workflow loops. Editing a mechanic once should propagate to every loop that uses it.

Separately, the people who own a client relationship (account managers) need to **verify** that the right, current mechanics are actually reaching the shows they care about — without seeing cost/compensation data.

## Lean reset — what changed and why

The prior revision specified a four-entity catalog (`ClientMechanic`, `ClientMechanicVersion`, `ClientMechanicCampaignSet`, `ClientMechanicCampaignSetItem`) with immutable content versioning and campaign-scoped sets. A 2026-06-07 design pass kept the **client-owned catalog as the durable model** but **deferred the expensive layers**, because the stated near-term targets are narrower (a reviewer role + applying a mechanic across loops) and client-facing access is real-but-not-imminent.

**Locked decisions:**

| ID | Decision |
| --- | --- |
| Model | Keep the client-owned catalog (drop PR#86's template-local metadata storage; reuse its Loop×Mechanic matrix UX). Ship **one mutable `ClientMechanic` per client**. |
| B1 | **Mechanic-bearing templates are client-bound.** `TaskTemplate` is studio-scoped today; add an optional `clientId` so one client's cues never leak onto another client's shows. |
| B2 | **Catalog scope: client-global, studio-authorized writes.** `ClientMechanic` is owned by the global `Client` (single truth across studios); writes are authorized only to studio members linked to that client. Cross-studio propagation is intended. **Deferral:** the shows-based studio↔client linkage gate is *not* in 20.1 (which scopes writes by client-existence only); it lands in **20.3** and **must precede 20.5** (live mechanic assignment), since a mechanic assigned into a bound template becomes cross-studio-writable moderator content. |
| B3 | **`ACCOUNT_MANAGER` edits the catalog, read-only on operations** (task templates, shows, creator mapping) with money fields redacted. ADMIN/MANAGER retain catalog write. |
| S1 | **Staleness without versioning:** a monotonic `contentRevision` int on `ClientMechanic`, bumped on content edit, is frozen into each template snapshot's `mechanic_ref`. Coverage compares frozen-vs-current revision exactly — no version history needed. |
| S2 | **Coverage is queryable:** a denormalized `TaskTemplateMechanicRef` link table (template/snapshot ↔ mechanic + loop), written on template save, backs both coverage directions — never a JSONB scan. |
| S3 | **Money redaction: allow-list projection**, not a field blacklist, plus a negative golden test enumerating money-bearing fields (Finance Guardrails). |
| S4 | **Lifecycle:** mechanics retire (soft); hard-delete is blocked while referenced. |

**Deferred** (added when client-facing access / multi-campaign curation becomes concrete): immutable `ClientMechanicVersion` history, `ClientMechanicCampaignSet` + items (campaign-scoped assignment guard), cross-studio mechanic copies, and per-template label overrides. See [PHASE_4 Out of scope](../../../../docs/roadmap/PHASE_4.md#out-of-scope-post-phase-4).

## Goals

- Make mechanic identity independent from task-template field labels (identity is a UID, not the rendered label).
- Scope mechanics to clients; a mechanic-bearing template binds to one client.
- Let template authors apply the same mechanic across multiple loops, with edit-once-propagates semantics.
- Add a studio role for account/service users who manage client mechanics while only reading non-financial operational context.
- Let account managers verify, per target show, whether the latest mechanic content is actually reaching the show.
- Keep the task-template builder focused on workflow structure; mechanic management lives in its own surface.

## Non-Goals (this cut)

- No immutable mechanic version history (a monotonic `contentRevision` covers staleness detection).
- No campaign sets / campaign-scoped assignment guard.
- No cross-client mechanic sharing and no per-template label overrides.
- No automatic rewrite of historical task-template snapshots or submitted task content.
- No mutation rights for `ACCOUNT_MANAGER` over operational records.

## Ownership Model

### Client (global)

`Client` is a global entity (unique name, related to shows/schedules) — **not** studio-scoped. It owns the mechanic catalog, so the same client's mechanics are a single truth reused by any studio that runs that client's shows (B2).

### Mechanic (`ClientMechanic`)

The stable identity for a reusable moderation instruction (product cue, promotion cue, recurring speaking instruction). One **mutable** row per mechanic. Recommended fields:

- `uid`
- `client_id` (FK → global `Client`)
- `title`
- `instruction_label` — the rendered field label (may be generic)
- `instruction_body` — the resolved instruction shown to moderators
- `status` — `active` | `retired`
- `version` — optimistic-lock integer (row concurrency, **not** content history)
- `content_revision` — monotonic integer, bumped whenever `instruction_label`/`instruction_body` change (S1)
- `metadata`
- `created_at`, `updated_at` (actor history is not denormalized on the row; trace via the `Audit` model if a future flow needs it)

Identity comes from the UID; the label may be generic. Editing content bumps `content_revision` and propagates to every linked loop's resolved field; it does **not** mutate already-frozen template snapshots.

## Task Template Integration

Task templates do not own mechanics — they **assign** mechanics into loops. Loops remain `metadata.loops[]` plus `items[].group`; no separate loop entity.

Builder flow:

1. The template is bound to a client (`TaskTemplate.clientId`, B1); the builder shows a client selector that establishes/reads this binding.
2. The builder loads that client's **active** mechanics.
3. A **Loop × Mechanic matrix** renders loops (rows) by mechanics (columns); each cell is a checkbox.
4. Checking a cell links a checkbox field into that loop's `group`, carrying the mechanic's resolved label/description. The **same mechanic checked down multiple loops** creates one field per loop, all sharing one `mechanic_id` identity (edit-once-in-catalog propagates).
5. Cards view stays canonical for structural fields; mechanic fields interleave and reorder there, but their label/description are catalog-owned (read-only in Cards).
6. Saving writes a `TaskTemplateMechanicRef` row per reference (S2) and freezes resolved content + `content_revision` into the template snapshot.

### Field shape

Additive, validated in `@eridu/api-types/task-management`; the exact key is finalized there before implementation. It must be additive and rides the existing v2 field schema:

```jsonc
{
  "id": "fld_...",
  "key": "mechanic_...",
  "type": "checkbox",
  "label": "Product mechanic",                 // resolved (denormalized) at save
  "description": "Resolved instruction text shown to moderators",
  "group": "l1",
  "mechanic_ref": {
    "client_id": "client_...",
    "mechanic_id": "cmech_...",
    "content_revision": 7                       // frozen for staleness comparison (S1)
  }
}
```

### Validation rules

- **Per-loop `(mechanic_id, group)` uniqueness** — a mechanic is assign-once per loop; re-assigning is a no-op. Mirrors the existing v2 per-loop `(key, group)` uniqueness. Genuine "duplicates" live as distinct catalog entries or manual fields, never as two references to the same mechanic in one loop.
- A mechanic-bearing field requires the template's `clientId` to be set and to match `mechanic_ref.client_id`.

## Snapshot & Coverage Rules

- `ClientMechanic` rows are mutable; editing content bumps `content_revision`.
- Task-template saves reference a mechanic by `mechanic_id` and freeze resolved label/description + `content_revision` into the snapshot.
- Generated tasks read the task-template snapshot, not the live catalog.
- A show's task is **stale** for a mechanic when its frozen `content_revision` is behind the catalog's current `content_revision`. **Dropped** when the template's latest version no longer carries the mechanic. **Unassigned** when no relevant task carries it. Otherwise **current**.
- "Latest finalized task with a loop schema wins" per show (reuse the PR 22.1 selection); a planned show with no task reads as unassigned.

## UI Surfaces

### Account Manager role (`ACCOUNT_MANAGER`)

A studio role for client service / account-management users (B3).

- **Writes**: client mechanics (create / edit / retire). The studio↔client linkage authorization (B2) is **deferred to 20.3**; 20.1 scopes writes by client existence only.
- **Reads (money-redacted)**: task templates, shows / show context, creator mapping. Reads use an **allow-list projection** that strips rate / commission / compensation fields (S3).
- **No access**: members, shifts, compensation, economics; no operational mutations (shows, shifts, creator assignments, tasks, task templates, members, creators).

| Surface | Access |
| --- | --- |
| Mechanics Management | View + Manage |
| Mechanic↔show coverage | View |
| Shows / show context | Read-only, no money fields |
| Creator Mapping | Read-only, no compensation fields |
| Task Templates | Read-only (review, no editing) |
| Members / shifts / compensation / economics | No access |

The membership `role` column is a free `String`, so adding `account_manager` needs **no DB enum migration** — only the `STUDIO_ROLE` enum in `@eridu/api-types/memberships`, the guard allow-lists, and the roster role picker (ADMIN grants it).

### Mechanics Management

Content/reference management for account managers (and ADMIN/MANAGER): browse by client, create / edit / retire, search + active/retired filter. No campaign-set UI in this cut.

### Task Template Builder

Workflow assembly: client selector, Loop × Mechanic matrix sourced from the bound client's active mechanics, Cards view for structural fields, read-only mechanic detail when a linked field is selected, and warnings when a linked mechanic is retired or its `content_revision` has advanced beyond the template's frozen reference (superseded).

### Coverage & Verification (bidirectional)

- **Mechanic→shows**: for a mechanic, which templates reference it and whether its latest version still carries it; for each target show (date-ranged), current / stale / dropped / unassigned status.
- **Show→mechanics**: for a show (or set of target shows), which mechanics are current / stale / missing.
- Read-only for `ACCOUNT_MANAGER`; problem rows offer a **Flag to manager** hand-off. The actual fix (regenerate the task from the latest snapshot) stays an ADMIN/MANAGER action.

## Data Model Direction

Dedicated tables for the catalog and the coverage link; no JSON metadata for core identity.

- `ClientMechanic` (fields above; FK → global `Client`).
- `TaskTemplateMechanicRef` — denormalized link written on template save: `(template_id, snapshot_id?, mechanic_id, group/loop_id)` with indexes for both coverage directions (S2).
- `TaskTemplate` gains an optional `clientId` + relation (B1).

Routes are studio-scoped for membership/RBAC but **nest under the owning `:clientId`** because the global `Client` — not the studio — is the catalog's ownership and (eventually, B2) authorization boundary. This is an intentional exception to the usual single-segment studio collection style: the `:clientId` segment is load-bearing, scoping every lookup to the owning client. External IDs are UID-based:

```text
GET    /studios/:studioId/clients/:clientId/mechanics
POST   /studios/:studioId/clients/:clientId/mechanics
PATCH  /studios/:studioId/clients/:clientId/mechanics/:mechanicId   # status: 'retired' is the reversible lifecycle action — ADMIN/MANAGER/ACCOUNT_MANAGER
DELETE /studios/:studioId/clients/:clientId/mechanics/:mechanicId   # hard soft-delete; ADMIN only (20.2); referenced-mechanic guard deferred to 20.5
```

Coverage endpoints (read-only) are finalized with backend implementation (20.6/20.7).

## PR Breakdown

Tracked as [PHASE_4 rows 20.1–20.7](../../../../docs/roadmap/PHASE_4.md):

- **20.1** — Client mechanic catalog foundation + `ACCOUNT_MANAGER` role (BE).
- **20.2** — Mechanics management UI (FE).
- **20.3** — `ACCOUNT_MANAGER` read-only ops + money redaction (BE+FE).
- **20.4** — Template→client binding (`TaskTemplate.clientId`).
- **20.5** — Mechanic references + Loop×Mechanic matrix (builder).
- **20.6** — Mechanic coverage read model + mechanic→shows view.
- **20.7** — Show→mechanics coverage view + builder drift warnings.

## Open Questions

- Should `TaskTemplate.clientId` be enforced (non-null) for the moderation template kind, or stay optional with mechanics simply unavailable until set? (Current plan: optional.)
- Should the role label remain `ACCOUNT_MANAGER`, or should product copy call it "Client Service Manager" while the API enum stays stable?
- Migration of existing moderation templates: mint one `ClientMechanic` per existing cue field (conservative, no lossy label-merge) once the template's `clientId` is set — confirm the backfill trigger and who runs it.

## Verification Gates

Each implementation PR runs affected workspace checks:

```bash
pnpm --filter erify_api    lint && pnpm --filter erify_api    typecheck && pnpm --filter erify_api    test && pnpm --filter erify_api    build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```

Design-only changes run at minimum `git diff --check`.
