# Workflow: Task Template Migration

End-to-end flow for resetting alpha-era task templates in a target studio, rebuilding them from production-equivalent source data, and validating that reporting works against the rebuilt templates.

## Actors

| Actor | Role | Key Capability |
| --- | --- | --- |
| Studio Admin | `ADMIN` | Owns shared fields, template reset approval, and final validation |
| Backend Engineer | Internal operator | Runs the reset/import scripts and verifies data safety |
| Studio Manager | `MANAGER` | Validates migrated templates and reporting output |

## Flow Overview

```
1. Export the real moderator worksheet CSV
       ↓
2. Run local dry-run rebuild from CSV
       ↓
3. Run local apply rebuild from CSV
       ↓
4. Generate validation tasks and verify reporting locally
       ↓
5. Run production dry-run rebuild from the same CSV shape
       ↓
6. Run production apply rebuild after dry-run review
       ↓
7. Validate production reporting against fresh submitted tasks
```

## Step-by-Step

### 1. Prepare source data

Export the authoritative worksheet CSV that describes the real moderation workflow. This export becomes the input for shared-field alignment, template rebuild, and validation.

Shared fields are prepared first and remain studio configuration. They are **not** deleted as part of reset.

Source quirk handling:
- `Loop0` rows in the real worksheet are treated as setup-only rows.
- Only `Server URL` and `stream key` may use `Loop0`; the importer normalizes them into loop 1 so the rebuilt moderation template stays compatible with the current grouped task UI.
- Any other `Loop0` event is rejected as invalid source data.

### 2. Rebuild locally first

Use the internal rebuild CLI in `erify_api` against a local database first:

```bash
pnpm --filter erify_api db:task-template:rebuild-moderator-csv -- --studio-id=<std_uid> --csv-path="/absolute/path/to/Moderator working sheet - show_mechanics.csv"
pnpm --filter erify_api db:task-template:rebuild-moderator-csv -- --studio-id=<std_uid> --csv-path="/absolute/path/to/Moderator working sheet - show_mechanics.csv" --confirm
```

Behavior:
- Dry-run is the default behavior.
- The rebuild command creates or updates canonical shared fields first.
- If templates already exist in the studio, the rebuild command hard-resets all studio task templates, snapshots, and bound tasks before recreation.
- Reset remains **studio-scoped** and aborts if saved task report definitions still reference target templates.
- The rebuild is source-driven and forward-only; old alpha tasks are not preserved after reset.

### 3. Canonical shared-field shape

For moderation templates, repeated metrics are standardized by loop position, not by a single unsuffixed key. The rebuild creates shared fields like:
- `gmv_l1`, `gmv_l2`, ..., `gmv_lN`
- `ctr_l1`, `ctr_l2`, ..., `ctr_lN`
- `views_l1`, `product_clicks_l1`, `cto_l1`, `ads_cost_l1`, `show_gpm_l1`, `observations_l1`, and the matching keys for each loop index

`N` is the highest loop observed in the import source. This keeps reporting compatible with the current engine, where each loop position needs its own stable shared column across templates.

Rare `Data collection` labels that are not part of the canonical set stay template-scoped custom fields in this pass.

### 4. Rebuild templates

This is forward-only:
- Old alpha tasks are not preserved once their templates are reset.
- New tasks generated from rebuilt templates become the new reporting source of truth.

### 5. Generate validation tasks

Template creation alone is not enough. Reporting discovers sources from submitted tasks, not just template records.

Generate a small validation dataset in the target studio:
- create tasks from the rebuilt templates
- submit representative content
- move those tasks into a submitted status such as `REVIEW`

### 6. Validate reporting locally, then in production

Run the reporting flow end to end:
- source discovery shows the rebuilt templates and canonical shared fields
- preflight succeeds for the validation scope
- report run merges shared columns correctly across rebuilt templates

If the rebuilt templates still produce template-scoped duplicates where a canonical shared column should exist, the rebuild is incomplete.

Repeat the same dry-run → apply → validation flow in production after the local rehearsal passes.

## Key Business Rules

- Reset is a migration aid for alpha data only, not a general user-facing delete workflow.
- Hard-reset is allowed only for the target studio involved in migration.
- Shared fields remain intact; only task templates, snapshots, and bound tasks are reset.
- No retroactive preservation is promised for pre-migration alpha task history tied to reset templates.

## Related Docs

| Layer | Document |
| --- | --- |
| Phase tracker | [docs/roadmap/PHASE_4.md](../roadmap/PHASE_4.md) |
| Reporting feature | [docs/features/task-submission-reporting.md](../features/task-submission-reporting.md) |
| Backend design | [TASK_SUBMISSION_REPORTING_DESIGN.md](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md) |
| Moderation workflow | [MODERATION_WORKFLOW.md](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md) |
