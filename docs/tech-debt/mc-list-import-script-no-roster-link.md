# Accepted: `import-mc-list.ts` does not assign imported creators to a studio roster

**Status:** Accepted (one-off script, manual follow-up applied) · **Area:** `erify_api` scripts
**Origin:** PR #228 (`import-mc-list.ts`), production run 2026-06-23

## Context

`apps/erify_api/scripts/import-mc-list.ts` imports creators/users from a CSV
into the `creators`, `users`, and `eridu_auth.user` tables. It has no concept
of a studio: it never creates a `studio_creators` row, so a creator it
creates or updates has no roster link to any studio.

## The gap

The studio dashboard (`/studios/$studioId/creators`) reads `studio_creators`
(`mc_id` → `creators.id`), not the global `creators` table. After the
production run of this script (52 rows: 28 created, 24 updated), only 14 of
the 52 happened to already have a roster link to studio "onnut" from a prior
process — the other 38 were correctly present in `creators` but invisible on
that dashboard until a manual follow-up created the missing `studio_creators`
rows (and backfilled `default_rate`/`default_rate_type` from each creator's
own rate, copying the pattern of the studio this batch belonged to).

## Why accepted (not fixed in the script)

- The script is a one-off CSV import for a single MC roster, not a recurring
  feature. The CSV itself has no studio column, so the script can't infer
  which studio(s) a row belongs to without a new input contract.
- The fix that was needed (which studio, which rate semantics) was a runtime
  decision made interactively after seeing the data, not something safe to
  hardcode in the script.

## When to revisit

If `import-mc-list.ts` (or a similar ad hoc roster-import script) is run
again:

- Add a `--studio-uid=` flag that creates the matching `studio_creators` row
  (skip if one already exists for that `studioId`/`creatorId` pair —
  `@@unique([studioId, creatorId])`) and copies `defaultRate`/`defaultRateType`
  from the creator record, mirroring the manual backfill done here.
- Or, if multiple studios are involved, require a studio column in the CSV
  input instead of a single global flag.
