# Client Mechanics Management

> **Status**: ✅ Shipped — Phase 4 PR 20.1–20.8 (lean reset 2026-06-07)
> **Scope**: client-owned mechanics catalog, task-template mechanic assignment for loop-based moderation, and account-manager mechanic↔show coverage.
> **Roadmap**: [PHASE_4.md rows 20.1–20.8](../../../docs/roadmap/PHASE_4.md#pr-20--direction-2026-06-07-reset)
> **Feature doc**: [docs/features/client-mechanics.md](../../../docs/features/client-mechanics.md)
> **Supersedes**: the heavyweight 4-entity/versioned/campaign-set plan in this doc's prior revision (derived from [#87](https://github.com/allenlin90/eridu-services/pull/87)); PR [#86](https://github.com/allenlin90/eridu-services/pull/86)'s template-local grid was reference material, not source of truth.

## Problem

Loop-based moderation templates embedded product and promotion cue cards directly as task-template checkbox fields. That made sense when templates were the only authoring surface, but it failed once the same client ran recurring campaigns across many shows and templates.

The concrete failure surfaced on template `ttpl_pWi1mbHEtHU0D-Zc3cHa`: most checkbox labels were generic values such as `Product machenic` and `Promotion machenic`, while the real instruction lived in each field's description/key. Grouping by label collapses unrelated instructions; a positional grid lets identical-looking instructions drift because each cell is independent.

The actual domain object is the **mechanic**: a reusable client instruction, product cue, or promotion cue that content teams manage and template authors assign into workflow loops. Editing a mechanic once propagates to every loop that uses it.

Separately, the people who own a client relationship (account managers) need to **verify** that the right, current mechanics are actually reaching the shows they care about — without seeing cost/compensation data.

## Lean reset — what changed and why

The prior revision specified a four-entity catalog (`ClientMechanic`, `ClientMechanicVersion`, `ClientMechanicCampaignSet`, `ClientMechanicCampaignSetItem`) with immutable content versioning and campaign-scoped sets. A 2026-06-07 design pass kept the **client-owned catalog as the durable model** but **deferred the expensive layers**, because the stated near-term targets were narrower (a reviewer role + applying a mechanic across loops) and client-facing access was real-but-not-imminent.

**Locked decisions:**

| ID | Decision |
| --- | --- |
| Model | Client-owned catalog (dropped PR#86's template-local metadata storage; reused its Loop×Mechanic matrix UX). One mutable `ClientMechanic` per client. |
| B1 | **Mechanic-bearing templates are client-bound.** `TaskTemplate` is studio-scoped; an optional `clientId` ensures one client's cues never leak onto another client's shows. |
| B2 | **Catalog scope: client-global, studio-authorized writes.** `ClientMechanic` is owned by the global `Client` (single truth across studios); writes are authorized only to studio members linked to that client. The shows-based studio↔client linkage gate shipped in 20.3, ahead of 20.5 (live mechanic assignment), since a mechanic assigned into a bound template becomes cross-studio-writable moderator content. Linkage is inferred from `Show` existence, not an explicit relationship — known timing/ratchet gaps tracked in [tech-debt](../../../docs/tech-debt/studio-client-linkage-single-studio-reality.md), accepted while there's only one studio. |
| B3 | **`ACCOUNT_MANAGER` edits the catalog, read-only on operations** (task templates, shows, creator mapping) with money fields redacted. ADMIN/MANAGER retain catalog write. |
| S1 | **Staleness without versioning:** a monotonic `contentRevision` int on `ClientMechanic`, bumped on content edit, is frozen into each template snapshot's `mechanic_ref`. Coverage compares frozen-vs-current revision exactly — no version history needed. |
| S2 | **Coverage is queryable:** a denormalized `TaskTemplateMechanicRef` link table (template/snapshot ↔ mechanic + loop), written on template save, backs both coverage directions — never a JSONB scan. |
| S3 | **Money redaction: allow-list projection**, not a field blacklist, plus a negative golden test enumerating money-bearing fields (Finance Guardrails). |
| S4 | **Lifecycle:** mechanics retire (soft); hard-delete is blocked while referenced. |

**Deferred** (revisit when client-facing access / multi-campaign curation becomes concrete): immutable `ClientMechanicVersion` history, `ClientMechanicCampaignSet` + items (campaign-scoped assignment guard), cross-studio mechanic copies, and per-template label overrides. See [PHASE_4 Out of scope](../../../docs/roadmap/PHASE_4.md#out-of-scope-post-phase-4).

## Ownership Model

### Client (global)

`Client` is a global entity (unique name, related to shows/schedules) — **not** studio-scoped. It owns the mechanic catalog, so the same client's mechanics are a single truth reused by any studio that runs that client's shows (B2).

### Mechanic (`ClientMechanic`)

The stable identity for a reusable moderation instruction (product cue, promotion cue, recurring speaking instruction). One **mutable** row per mechanic. Fields:

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
3. A **Loop × Mechanic matrix** renders mechanics (rows, searchable — a real client's catalog can run into the dozens) by loops (columns, a handful per template); each cell is a checkbox. Mechanics-as-columns was the original shape but broke down past a handful of mechanics (illegible/overlapping columns — confirmed at 93 columns for one real backfilled client); rows scroll and filter naturally, columns don't.
4. Checking a cell links a checkbox field into that loop's `group`, carrying the mechanic's resolved label/description. The **same mechanic checked down multiple loops** creates one field per loop, all sharing one `mechanic_id` identity (edit-once-in-catalog propagates).
5. Cards view stays canonical for structural fields; mechanic fields interleave and reorder there, but their label/description are catalog-owned (read-only in Cards).
6. Saving writes a `TaskTemplateMechanicRef` row per reference (S2) and freezes resolved content + `content_revision` into the template snapshot.

### Field shape

Additive, validated in `@eridu/api-types/task-management`, riding the existing v2 field schema:

```jsonc
{
  "id": "fld_...",
  "key": "mechanic_...",
  "type": "checkbox",
  "label": "Product mechanic", // resolved (denormalized) at save
  "description": "Resolved instruction text shown to moderators",
  "group": "l1",
  "mechanic_ref": {
    "client_id": "client_...",
    "mechanic_id": "cmech_...",
    "content_revision": 7 // frozen for staleness comparison (S1)
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
- Coverage only lists shows whose authoritative moderation task includes the mechanic in its snapshot. Shows with no relevant task (or whose task snapshot does not reference the mechanic) are excluded.
- A listed show carries `is_current: true` when its frozen `content_revision` matches the catalog's current `content_revision` **and** the template's latest version still carries the mechanic; `is_current: false` otherwise (covers both "content changed since" and "mechanic removed from template since" — both point to the same remediation: regenerate the task).
- "Latest finalized task with a loop schema wins" per show (reuses the PR 22.1 selection rule, `FINALIZED_LOOP_TASK_STATUSES`).

## UI Surfaces

### Account Manager role (`ACCOUNT_MANAGER`)

A studio role for client service / account-management users (B3).

- **Writes**: client mechanics (create / edit / retire). The studio↔client linkage authorization (B2) shipped in 20.3 (`ensureStudioClientLinkage`, gating create/update/remove on the studio having an active show for that client).
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

The membership `role` column is a free `String`, so `account_manager` needed no DB enum migration — only the `STUDIO_ROLE` enum in `@eridu/api-types/memberships`, the guard allow-lists, and the roster role picker (ADMIN grants it).

### Mechanics Management

Content/reference management for account managers (and ADMIN/MANAGER) at `/studios/:studioId/client-mechanics`: browse by client, create / edit / retire, search + active/retired filter. Row actions use the standard `DataTableActions` dropdown. No campaign-set UI.

### Task Template Builder

Workflow assembly: client selector, Loop × Mechanic matrix sourced from the bound client's active mechanics, Cards view for structural fields, read-only mechanic detail when a linked field is selected, and warnings when a linked mechanic is retired or its `content_revision` has advanced beyond the template's frozen reference (superseded).

### Coverage & Verification (bidirectional)

- **Mechanic→shows**: for a mechanic, which templates reference it and whether its latest version still carries it; for each target show (date-ranged) whose authoritative task carries the mechanic, an `is_current` up-to-date/needs-update signal.
- **Show→mechanics**: for a show (or set of target shows), which mechanics are current / stale / missing.
- Read-only for `ACCOUNT_MANAGER`. The actual fix for a show flagged `is_current: false` (regenerate the task from the latest snapshot) is an ADMIN/MANAGER action.
- **Observational only, never a gate.** Coverage reports against whatever a template author already assigned into the matrix — there is no concept of "required mechanics for this show" anywhere in the system, and neither coverage view is wired into task-completion, show-lifecycle, or task-orchestration code. A show reaching `COMPLETED` is entirely unaffected by what coverage reports. A future per-studio enforcement toggle + requirements config is tracked as a separate idea, not built here: [`studio-config-settings.md` § Mechanic Requirement Enforcement](../../../docs/ideation/studio-config-settings.md#7-mechanic-requirement-enforcement-future).
- Coverage resolution batches show/task/ref lookups per mechanic or per show rather than per-show queries, to avoid N+1 across a date-ranged show list; it reuses PR 22.1's "latest finalized task with a loop schema wins" selection rule (`FINALIZED_LOOP_TASK_STATUSES`) so the two read models can't independently drift. See `ClientMechanicRepository`'s `// Engineering decision:` comments for the per-method rationale.

## Data Model Direction

Dedicated tables for the catalog and the coverage link; no JSON metadata for core identity.

- `ClientMechanic` (fields above; FK → global `Client`).
- `TaskTemplateMechanicRef` — denormalized link written on template save: `(template_id, snapshot_id?, mechanic_id, group/loop_id)` with indexes for both coverage directions (S2).
- `TaskTemplate` gains an optional `clientId` + relation (B1).

Routes are studio-scoped for membership/RBAC but **nest under the owning `:clientId`** because the global `Client` — not the studio — is the catalog's ownership and authorization boundary. This is an intentional exception to the usual single-segment studio collection style: the `:clientId` segment is load-bearing, scoping every lookup to the owning client. External IDs are UID-based:

```text
GET    /studios/:studioId/clients/:clientId/mechanics
POST   /studios/:studioId/clients/:clientId/mechanics
PATCH  /studios/:studioId/clients/:clientId/mechanics/:mechanicId   # status: 'retired' is the reversible lifecycle action — ADMIN/MANAGER/ACCOUNT_MANAGER
DELETE /studios/:studioId/clients/:clientId/mechanics/:mechanicId   # hard soft-delete; ADMIN only; referenced-mechanic guard via TaskTemplateMechanicRef
```

## What Shipped, By PR

- **20.1** — Client mechanic catalog foundation + `ACCOUNT_MANAGER` role (BE).
- **20.2** — Mechanics management UI (FE).
- **20.3** — `ACCOUNT_MANAGER` read-only ops + money redaction (BE+FE); studio↔client linkage gate.
- **20.4** — Template→client binding (`TaskTemplate.clientId`).
- **20.5** — Mechanic references + Loop×Mechanic matrix (builder).
- **20.6** — Mechanic coverage read model + mechanic→shows view.
- **20.7** — Show→mechanics coverage view + builder drift warnings.
- **20.8** — One-off backfill of pre-catalog ad-hoc product/promo cue fields to `mechanic_ref`; client-filter and Loop×Mechanic matrix UX fixes found during local e2e verification (matrix transposed to rows-of-mechanics after a real client backfilled to 93 mechanics).

**Migration decision (20.8)**: real production data changed the plan from "mint one `ClientMechanic` per existing cue field" to **dedupe by `(client, exact instructionBody)`** — one template's 144 ad-hoc fields collapsed to 27 distinct descriptions, repeated verbatim across that client's BAU/Double/Payday template variants, so per-field minting would have created dozens of duplicate catalog rows per client. `scripts/backfill-product-promotion-mechanics.ts` is the one-off migration; run manually (dry-run by default, `--apply` to write, `ALLOW_PROD=1` required against non-local databases).

## Open Questions (non-blocking)

- Should `TaskTemplate.clientId` be enforced (non-null) for the moderation template kind, or stay optional with mechanics simply unavailable until set? (Current: optional.)
- Should the role label remain `ACCOUNT_MANAGER`, or should product copy call it "Client Service Manager" while the API enum stays stable?
