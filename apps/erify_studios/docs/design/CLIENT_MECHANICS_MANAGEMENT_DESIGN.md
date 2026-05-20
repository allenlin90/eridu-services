# Client Mechanics Management — Design

> **Status**: Planned design reset
> **Date**: 2026-05-20
> **Scope**: client-owned mechanics management, campaign-scoped mechanic sets, and task-template mechanic assignment for loop-based moderation.
> **Phase**: 4 direction change. Supersedes the narrower task-template grid-only plan from PR #86; that branch is reference material, not source of truth.

## Problem

Loop-based moderation templates currently embed product and promotion cue cards directly as task-template checkbox fields. That made sense when templates were the only authoring surface, but it fails once the same client runs recurring campaigns across many shows, templates, or studios.

The concrete failure surfaced on template `ttpl_pWi1mbHEtHU0D-Zc3cHa`: most checkbox labels are generic values such as `Product machenic` and `Promotion machenic`, while the real instruction lives in each field's description/key. A grid that groups by label collapses unrelated instructions. A positional grid also lets identical-looking instructions drift because each cell is still independent.

The actual domain object is the **mechanic**: a reusable client instruction, product cue, or promotion cue that content teams manage and template authors assign into workflow loops.

## Pain Points

- Mechanics are content assets, but they are edited inside task-template structure.
- Content teams need to manage mechanics without also editing template validation, shared fields, or loop structure.
- Template authors need to prevent wrong-campaign assignments, especially when a client has similar mechanics for monthly events such as mid-month, payday, or doubles.
- Multiple studios may work with the same client, so studio-local mechanic copies would create drift.
- Historical tasks must stay traceable. Changing mechanic wording later must not rewrite past task snapshots.
- Producers need usage visibility before editing, retiring, or replacing a mechanic.

## Goals

- Make mechanic identity independent from task-template field labels.
- Scope mechanics to clients, with campaign sets limiting which mechanics are available for a given moderation workflow.
- Version mechanic content for audit, analysis, and traceability.
- Let task templates reference approved mechanic versions while still freezing resolved instructions into immutable template snapshots.
- Provide separate management UIs for mechanics and task templates.
- Keep task template builder focused on workflow structure, loop layout, shared fields, validation, and assignment.

## Non-Goals

- No cross-client mechanic sharing in the first implementation.
- No automatic rewrite of historical task-template snapshots or submitted task content.
- No advanced approval workflow beyond active/retired/versioned lifecycle unless a later PR adds it.
- No analytics on per-show mechanic performance in the first pass. The first rollup is usage: templates, loops, snapshots.

## Ownership Model

### Client

The client owns the mechanic catalog. A client-level catalog can be reused by more than one studio if the same client works across studios.

### Mechanic

A mechanic is the stable identity for a reusable moderation instruction. Examples:

- A product cue for a specific SKU or talking point.
- A promotion cue such as price comparison, voucher callout, or bundle explanation.
- A recurring speaking instruction that content teams want to manage centrally.

Mechanic identity is not the label rendered in a task field. Labels may be generic; identity must come from a UID.

### Mechanic Version

A mechanic version is an immutable content snapshot. It stores the resolved instruction text and metadata at a point in time.

Recommended fields:

- `uid`
- `mechanic_uid`
- `version`
- `title`
- `instruction_label`
- `instruction_body`
- `description`
- `metadata`
- `created_by`
- `created_at`

Only the latest active version is normally offered for new campaign sets, but older versions remain available for traceability.

### Campaign Mechanic Set

A campaign set groups the approved mechanic versions for a client campaign or recurring event type, for example:

- `Mid-month`
- `Payday`
- `Double`
- `Fashion Week May 2026`

Task templates choose from a campaign set, not the full client catalog. This is the primary guard against assigning mechanics from the wrong campaign.

### Campaign Mechanic Set Item

A set item links one campaign set to one mechanic version and may carry ordering/grouping metadata for the management UI.

## Task Template Integration

Task templates do not own mechanics. They assign mechanics into loops.

The builder flow should be:

1. Template author selects a client and campaign mechanic set.
2. The builder loads active mechanics from that set.
3. The assignment grid renders loops by mechanic.
4. Assigning a mechanic to a loop creates or updates a task-template field linked to that mechanic version.
5. Saving the template stores both the mechanic reference and the resolved instruction content in the template schema.
6. Template snapshot creation freezes that resolved content for future generated tasks.

The task-template schema should keep enough denormalized content for runtime safety:

```jsonc
{
  "id": "fld_...",
  "key": "mechanic_...",
  "type": "checkbox",
  "label": "Product mechanic",
  "description": "Resolved instruction text shown to moderators",
  "group": "l1",
  "mechanic_ref": {
    "client_id": "client_...",
    "campaign_set_id": "mset_...",
    "mechanic_id": "mech_...",
    "mechanic_version_id": "mver_..."
  }
}
```

The exact schema key should be finalized in `@eridu/api-types/task-management` before implementation. It must be additive and validated by the shared schema package.

## Snapshot Rules

- Mechanic versions are immutable.
- Task-template saves reference a specific mechanic version.
- Task-template snapshots freeze the resolved field label/description plus the mechanic reference.
- Generated tasks read the task-template snapshot, not the live mechanic catalog.
- Editing a mechanic creates a new mechanic version. It does not mutate old template snapshots.
- Updating a template to a newer mechanic version is an explicit template edit that bumps template version and creates a new task-template snapshot.

This preserves historical moderation traceability while allowing content teams to improve mechanics for future tasks.

## UI Surfaces

### Mechanics Management

Purpose: content/reference management.

Expected capabilities:

- Browse mechanics by client.
- Filter by campaign set, active/retired state, and search text.
- Create mechanics and new mechanic versions.
- Create and manage campaign sets.
- Add/remove mechanic versions from campaign sets.
- Retire mechanics or campaign-set entries without deleting history.
- View usage: templates, loops, snapshots, and later tasks/shows.

### Task Template Builder

Purpose: workflow assembly.

Expected capabilities:

- Select client and campaign set for a moderation template.
- Assign campaign-set mechanics into loops through a matrix.
- Keep Cards view for structural task-template fields, validation, shared fields, and non-mechanic fields.
- Show read-only mechanic source/version details when a linked field is selected.
- Warn when a linked mechanic version is retired or superseded.

### Usage And Audit

Purpose: trace and change safety.

Expected capabilities:

- For a mechanic version: show templates and loops that reference it.
- For a campaign set: show which templates consume it.
- For a template: show mechanic references by loop.
- Later: show generated task/show usage.

## Data Model Direction

Use dedicated tables rather than JSON metadata for the core mechanic catalog.

Proposed entities:

- `ClientMechanic`
- `ClientMechanicVersion`
- `ClientMechanicCampaignSet`
- `ClientMechanicCampaignSetItem`

The task-template schema stores references to mechanic versions because task template fields are already the layer that snapshots into generated tasks. Do not add a separate loop entity; loops remain `metadata.loops[]` plus `items[].group`.

Mechanic catalog routes should follow the existing shallow studio-scoped route style while respecting client ownership. A likely first shape:

```text
GET  /studios/:studioId/clients/:clientId/mechanics
POST /studios/:studioId/clients/:clientId/mechanics
GET  /studios/:studioId/clients/:clientId/mechanic-campaign-sets
POST /studios/:studioId/clients/:clientId/mechanic-campaign-sets
```

Detailed endpoint naming should be finalized with backend implementation, but the external IDs must be UID-based and never expose internal DB IDs.

## PR Breakdown

### PR 11.7 — Design Reset And Roadmap

Document the direction change, retire the task-template grid-only plan as source of truth, and add this design. No product code.

### PR 11.8 — Client Mechanic Catalog Foundation

Add shared API schemas, Prisma models, repositories, services, controllers, and tests for client mechanics, mechanic versions, campaign sets, and set items.

### PR 11.9 — Mechanics Management UI

Add the client-scoped mechanics management route and campaign-set management UI. This can ship before task-template integration so content teams can start curating mechanics.

### PR 11.10 — Task Template Mechanic References

Extend task-template schema support for mechanic references, update validation, payload transformation, and backend schema validation. Add migration/backfill only if needed for existing templates.

### PR 11.11 — Template Assignment Matrix

Build the moderation assignment matrix in the task-template builder using campaign-set mechanics. Cards remains the structural editor.

### PR 11.12 — Usage Rollup And Drift Warnings

Add usage views and warnings for retired or superseded mechanic versions used by templates.

## Open Questions

- Should campaign sets be linked to existing show/campaign concepts if a normalized campaign model appears later, or remain a mechanics-domain resource for now?
- Which studio roles can manage mechanics: admin only, manager, or a new content-team permission?
- Should a template be allowed to reference mechanics from more than one campaign set?
- What imported source format replaces the current CSV generator once mechanics are first-class?

## Verification Gates

Each implementation PR should run affected workspace checks:

```bash
pnpm --filter erify_api lint
pnpm --filter erify_api typecheck
pnpm --filter erify_api test
pnpm --filter erify_api build
pnpm --filter erify_studios lint
pnpm --filter erify_studios typecheck
pnpm --filter erify_studios test
pnpm --filter erify_studios build
```

Design-only PRs should at minimum run `git diff --check`.
