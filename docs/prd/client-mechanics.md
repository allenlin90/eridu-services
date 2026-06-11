# PRD: Client Mechanics & Account-Manager Review

> **Status**: Active
> **Phase**: 4 — PR 20 (lean reset 2026-06-07)
> **Workstream**: Loop-based moderation — reusable client mechanics
> **Depends on**: Task Templates (loop-based moderation), Client entity, Studio membership/RBAC
> **Roadmap**: [PHASE_4.md rows 20.1–20.7](../roadmap/PHASE_4.md#pr-20--direction-2026-06-07-reset)
> **Technical design**: [CLIENT_MECHANICS_MANAGEMENT_DESIGN.md](../../apps/erify_studios/docs/design/CLIENT_MECHANICS_MANAGEMENT_DESIGN.md)

## Problem

Loop-based moderation templates embed product and promotion cues as raw checkbox fields. When a client runs recurring campaigns across many shows and templates, the same cue is re-authored everywhere with no shared identity:

- Generic labels (`Product machenic`, `Promotion machenic`) collapse unrelated instructions; the real instruction lives in each field's description.
- Identical-looking cues drift independently — editing one does not update the others.
- Nobody can answer "is the **current** version of this cue actually reaching the shows we care about?" without manually opening tasks.

The domain object is the **mechanic**: a reusable, client-owned moderation instruction with stable identity, assigned into workflow loops. Editing it once should update every loop that uses it, and an account manager should be able to verify coverage across target shows — without seeing any cost or compensation data.

## Users

| Role | Need |
| --- | --- |
| Account Manager (`ACCOUNT_MANAGER`) | Curate a client's mechanics; verify that the latest mechanic content is reaching the client's target shows; review templates without seeing money. |
| Studio Manager / Admin | Assign mechanics into moderation-template loops; resolve stale coverage by regenerating tasks. |
| Studio Moderator (downstream) | See accurate, current cue cards in generated tasks per loop. |

## Goals

- Give mechanics first-class, client-owned identity independent of template field labels.
- Let authors apply the same mechanic across multiple loops with edit-once-propagates semantics.
- Provide a dedicated mechanics-management surface separate from the template builder.
- Add an account-manager role that curates mechanics and reads non-financial context, with money redacted.
- Provide bidirectional coverage so account managers can verify mechanic↔show currency.

## Non-Goals (this cut)

- Immutable mechanic version history, campaign sets / campaign-scoped assignment, cross-client sharing, per-template label overrides (all deferred — see [PHASE_4 Out of scope](../roadmap/PHASE_4.md#out-of-scope-post-phase-4)).
- Any `ACCOUNT_MANAGER` mutation of operational records (shows, shifts, tasks, templates, members, creators).
- Rewriting historical task snapshots when a mechanic changes.

## Product Rules

1. **Client-owned, single truth (B2).** A mechanic belongs to a global `Client`; its catalog is shared by every studio that runs that client's shows. Edits propagate cross-studio. Write access is limited to studio members linked to that client. *(The studio↔client write-linkage gate is **deferred to PR 20.3** and must land before PR 20.5; PR 20.1 ships catalog writes scoped by client existence only.)*
2. **Client-bound templates (B1).** A template that uses mechanics is bound to one client; a mechanic can only be assigned into a template bound to its client.
3. **Assign-once per loop.** A mechanic appears at most once per loop; the same mechanic across different loops is intended reuse, not duplication.
4. **Edit-once-propagates.** Editing a mechanic's label/description updates every loop's resolved field for future renders and bumps a monotonic `contentRevision`. It does not alter already-frozen task snapshots.
5. **Snapshots freeze content + revision.** Generated tasks read the frozen snapshot, preserving historical moderation traceability.
6. **Soft retire (S4).** Mechanics retire without losing history; hard-delete is blocked while referenced.
7. **Money never reaches `ACCOUNT_MANAGER` (B3, S3).** All AM reads pass an allow-list projection that strips rate/commission/compensation; a negative test enumerates money fields.

## User Stories & Acceptance Criteria

### Manage mechanics
- *As an account manager, I can browse a client's mechanics, create/edit/retire them, and search/filter by active/retired.*
  - **AC**: create, edit (bumps `contentRevision`), and retire are available to `ACCOUNT_MANAGER` (and ADMIN/MANAGER) for clients they're linked to; retire preserves history; hard-delete is rejected while referenced.

### Assign mechanics across loops
- *As a manager, I bind a moderation template to a client and assign the client's mechanics into loops via a Loop×Mechanic matrix, reusing one mechanic across multiple loops.*
  - **AC**: checking a matrix cell links a checkbox field into that loop carrying resolved label/description; the same mechanic checked down N loops creates N fields sharing one identity; per-loop `(mechanic_id, group)` uniqueness holds; editing the mechanic updates all linked loops' resolved content; Cards view shows mechanic fields as catalog-locked (label read-only) but freely reorderable; mobile forces Cards.

### Review templates (reviewer)
- *As an account manager, I can open task templates read-only to review the assigned mechanics, with no edit/delete and no money fields.*
  - **AC**: `ACCOUNT_MANAGER` reaches template GET routes; write routes are denied; no money fields appear.

### Verify coverage (mechanic→shows)
- *As an account manager, I pick a mechanic and see which templates reference it (and whether the latest version still does) and, per target show, whether the current mechanic content is reaching it.*
  - **AC**: per-show status resolves to **current / stale / dropped / unassigned** using frozen vs. current `contentRevision` and template-latest membership; "latest finalized task with a loop schema wins"; a planned show with no task reads unassigned; problem rows offer read-only **Flag to manager**.

### Verify coverage (show→mechanics)
- *As an account manager, I pick a show (or set of target shows) and see which mechanics are current/stale/missing on it.*
  - **AC**: same status semantics, entered from the show side; read-only with flag-to-manager hand-off.

## Out of Scope / Deferred

Immutable versioning, campaign sets + items, cross-studio copies, per-template label overrides. Tracked under [PHASE_4 Out of scope](../roadmap/PHASE_4.md#out-of-scope-post-phase-4); revisit when client-facing access / multi-campaign curation becomes concrete.

## Lifecycle

Promote to `docs/features/client-mechanics.md` when 20.1–20.7 ship (check off ACs, link app-local docs), per the [PRD lifecycle](./README.md#lifecycle).
