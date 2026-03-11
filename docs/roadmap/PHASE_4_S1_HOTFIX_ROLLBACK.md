# Phase 4 S1 Hotfix / Rollback Runbook

> Scope: creator cutover `S1` only (`mc -> creator` data/contracts foundation)
> Last updated: 2026-03-11

## Objective

Provide a fast, low-risk incident path for production after `S1` merge/deploy:
- Prefer **roll-forward hotfix** first.
- Use **rollback migration** only when roll-forward cannot restore service quickly.

## Trigger Conditions

Use this runbook when any of the following happens after `S1` deploy:
- API startup/runtime failures caused by creator cutover data assumptions.
- Widespread 5xx on creator/MC-related admin or studio flows.
- Data-access errors tied to renamed tables/indexes/constraints.
- Backfill-related data mismatch causing user-facing regressions.

## Immediate Incident Steps

1. Pause additional deploys.
2. Collect failure evidence:
   - API logs
   - failing endpoints
   - DB error messages
3. Confirm migration + backfill status:
   - `db:migrate:deploy` completion
   - `db:creator-uid:backfill` completion
   - `db:studio-creator:backfill` completion
4. Decide path within 15 minutes: **roll-forward hotfix** vs **rollback migration**.

## Path A (Default): Roll-Forward Hotfix

Use this first when service can be recovered by compatibility fixes.

Typical actions:
- Patch API validation/query compatibility for both `mc_*` and `creator_*` identifiers.
- Patch problematic repository/service joins or DTO mappings.
- Add temporary compatibility guards only where needed to restore runtime safety.
- Deploy hotfix immediately.

Why this is preferred:
- Avoids schema churn during incident.
- Lower risk of data divergence.
- Faster recovery in most cases.

## Path B (Fallback): Rollback Migration

Use only if roll-forward cannot recover quickly.

Rules:
- Never edit old migrations.
- Ship a **new forward migration** that restores expected legacy shape.
- Include app hotfix in the same release.

Rollback migration checklist:
1. Rename tables/indexes/constraints back only if required for runtime recovery.
2. Recover UID expectations carefully:
   - `creators.metadata.legacy_mc_uid` is source of truth for legacy UID recovery.
3. Reverse JSON plan-document UID rewrites for schedules/snapshots only if required.
4. Ensure idempotency:
   - running rollback migration twice should not corrupt data.
5. Validate on rehearsal DB before production.

## Data Safety Notes

- `backfill-creator-uids` stores `legacy_mc_uid` in creator metadata for reversible mapping.
- `backfill-studio-creators` is additive for roster rows; do not hard-delete during incident unless explicitly required.
- Prefer marking rows inactive over destructive deletes during emergency fixes.

## Verification Gates (Before Incident Closure)

Run and confirm:
1. `/system/mcs` load + create/update actions
2. `/admin/mcs` load + create/update actions
3. show task assignment flow (generate -> assign -> status update)
4. key schedule publish flow (no 409/500 regressions introduced by incident fix)

## Ownership

- Incident commander: on-call backend owner
- DB migration owner: `erify_api` backend owner
- Smoke-test owner: studio frontend + backend pairing

