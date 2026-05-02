# Prod → Local Data Sync: Design

**Status:** Design accepted. Implementation planning next.
**Author triggered by:** task-template-redesign verification need (`docs/ideation/task-template-redesign.md`); generalized so other features can reuse.

## Purpose

Provide a one-command way to replace the local Postgres databases with current prod data so that:

- The task-template-redesign migration plan (`normalize-task-template-schemas.ts`, schema-engine routing, v1→v2 conversion) can be exercised against real `TaskTemplate.currentSchema`, `TaskTemplateSnapshot.schema`, and `Task.content` shapes before deploy.
- Future features that hinge on real-data shape (analytics, migrations, reporting projections, large JSON envelopes) have the same affordance without each one inventing its own sync.
- Agents have a written workflow they can follow safely instead of improvising `pg_dump` invocations.
- Day-to-day DX improves: this acts as a "real-data seed" — local development runs against actual prod shapes (edge-case JSON envelopes, real cardinalities, real referential weirdness) instead of curated synthetic seed data, so bugs that only surface under real conditions show up locally.

## Non-Goals

- **Not a backup tool.** Restoring prod from this is out of scope.
- **Not a CI artifact.** This must never run in CI; it touches prod credentials.
- **Not incremental.** Each run is a full overwrite. No diff/patch/streaming.
- **Not multi-environment.** "Prod → local" only. No prod ↔ staging, no local → prod.
- **Not sanitized.** No PII scrubbing in v1. Documented as a governance upgrade.
- **Not Prisma-aware.** The script does not regenerate the Prisma client, run migrations, or run seeds. Those are user/workflow concerns.

## Hard Invariants

1. **Read-only on prod.** The script never writes to a `PROD_*` URL. The only tool ever pointed at a prod URL is `pg_dump`. `psql` is invoked exclusively against `localhost` URLs.
2. **Local-only writes.** The script refuses to run if `DATABASE_URL` / `ERIDU_AUTH_DATABASE_URL` does not point to `localhost`.
3. **Distinct hosts.** The script refuses to run if any `PROD_*` URL host equals any local URL host.

These three together mean the worst-case fat-finger outcome is "sync fails." There is no code path that writes to prod.

## Architecture

Three artifacts, each with one focused job.

| Artifact    | Path                                    | Purpose                                                                                                                                       |
| ----------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Sync script | `scripts/sync-prod-to-local.sh`         | Mechanical work: read prod URLs from env, `pg_dump                                                                                            | psql` per DB, print `prisma migrate status` after. |
| Skill       | `.agent/skills/prod-data-sync/SKILL.md` | Agent-facing: when to use, when not to, how to invoke, how to add an excluded table, the read-only invariant, the governance-upgrade roadmap. |
| Workflow    | `.agent/workflows/prod-data-sync.md`    | Step-by-step operational recipe: pre-flight checks, sync, migrate, run feature-specific data jobs, verify, revert.                            |

Plus minor edits:

- `apps/erify_api/.env.example` — adds `PROD_DATABASE_URL=` and `PROD_ERIDU_AUTH_DATABASE_URL=` placeholders with comments noting (a) "for prod-data-sync only, never commit real values" and (b) "should be a SELECT-only role".
- `.gitignore` — verify `.env` is already ignored (it is).

## Sync Flow

```text
1. Pre-flight (abort on any failure)
   - PROD_DATABASE_URL and PROD_ERIDU_AUTH_DATABASE_URL must be set.
   - DATABASE_URL and ERIDU_AUTH_DATABASE_URL hosts must be one of: localhost, 127.0.0.1, ::1.
   - PROD_* URL hosts must not equal local URL hosts.
   - Print banner: "WARNING: Syncing PROD -> LOCAL. Will DESTROY local data in
     <db1>, <db2>. Prod connection is read-only via pg_dump. Press Ctrl-C
     within 5s to abort." Then sleep 5.

2. Per database (erify_api, then eridu_auth)
   pg_dump "$PROD_URL" \
     --clean --if-exists --no-owner --no-privileges \
     [--exclude-table-data='<table>' ...] \
     | psql "$LOCAL_URL"
   - Nonzero exit on either side: abort, print which DB failed, exit nonzero.

3. Post-sync
   - cd apps/erify_api && pnpm prisma migrate status
   - cd apps/eridu_auth && pnpm prisma migrate status (if applicable)
   - Print: "Done. Run `pnpm prisma migrate deploy` in each app to apply
     pending local migrations."
```

### Why these flags

- `--clean --if-exists` makes restore idempotent. Re-running after a partial failure works.
- `--no-owner --no-privileges` strips prod role/grant references that don't exist locally.
- `--exclude-table-data` (not `--exclude-table`) drops *rows* but keeps *schema*, so app code that queries an excluded table still finds the table (just empty).
- No `--snapshot`, no replication-slot setup, no anything that requires a writable session on prod.

### Why no Prisma `migrate deploy` automatically

The user may want to inspect prod state *before* applying their feature branch's pending migrations. That is exactly the task-template-redesign use case: sync prod (still v1) → run `--stamp-v1` normalization → apply v2 migrations → run `--current-to-v2` → verify. Auto-deploying migrations would skip the inspection step.

## Failure Modes

| Failure                              | Behavior                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Missing `PROD_*` env var             | Pre-flight abort with explicit message pointing at `.env.example`. Exit 1.                                         |
| Local URL not localhost              | Pre-flight abort: "Refusing to write to non-local target." Exit 1.                                                 |
| Prod URL host equals local URL host  | Pre-flight abort: "PROD and LOCAL share host." Exit 1.                                                             |
| `pg_dump` fails (auth/network/perms) | Stderr passthrough, exit nonzero. Local DB unchanged because nothing was piped through.                            |
| `psql` restore fails mid-stream      | Stderr passthrough, exit nonzero. Local DB partial; re-running the script is idempotent (`--clean --if-exists`).   |
| One DB succeeds, the other fails     | First DB already restored. Script exits with which DB failed. Re-run picks up the failed one. No two-phase commit. |
| `prisma migrate status` shows drift  | Informational, not an error. Workflow doc explains the three drift cases.                                          |

No retries, no partial-progress checkpointing, no logs beyond stderr/stdout. If something blips, re-run.

No `--dry-run` flag. The 5-second pre-flight banner that prints both URLs serves the same purpose with less code.

## Verification (Smoke Test)

After a sync, the existing tech stack must run against the synced DB and basic flows must work. No bespoke test harness. If the API boots, frontends load, and a known studio renders, the sync is verified.

For feature-specific consumers (e.g., task-template-redesign), the workflow doc instructs the consumer to run their feature's data job (e.g., `normalize-task-template-schemas.ts --dry-run`) and confirm row counts make sense. That verification belongs to the consumer, not to the sync script.

## Skill Contents (`.agent/skills/prod-data-sync/SKILL.md`)

The skill must teach an agent:

1. **When to use:** the consumer needs to verify behavior or migrations against real prod-shaped data, AND lives in an environment where wiping local DB is acceptable.
2. **When NOT to use:** in CI; on a non-local target; when in-progress local DB state must be preserved (commit/stash/back up first); when the feature can be verified against seed data.
3. **How to invoke:** `bash scripts/sync-prod-to-local.sh`.
4. **How to extend the exclude list:** edit the script's `EXCLUDED_TABLES` array; document why each table is excluded as a comment.
5. **Read-only invariant:** any future change must preserve the rule that `psql` is never pointed at a `PROD_*` URL. If you want incremental sync, implement it locally (diff after dump) — never via prod-side temp tables, replication slots, or `pg_export_snapshot()` write transactions.
6. **Governance upgrade roadmap** (when to revisit):
   - 2nd dev joins → move credentials from `.env` to a secret manager.
   - Prod role is admin → switch to `SELECT`-only role.
   - Non-prod-trusted devs / external contributors → add PII sanitization (column-level scrubbing).
   - Sync becomes painfully slow → grow the exclude list (large blob/audit tables).

## Workflow Contents (`.agent/workflows/prod-data-sync.md`)

The workflow must walk the operator through:

1. **Pre-flight (manual).** Confirm: on a feature branch; local Postgres is up; can lose local DB state; `PROD_*` env vars are set in `.env`.
2. **Sync.** Run `bash scripts/sync-prod-to-local.sh`. Observe banner, allow 5s, observe per-DB pg_dump/psql output, observe `prisma migrate status`.
3. **Migrate (optional, feature-dependent).** If your feature has pending migrations, run `pnpm prisma migrate deploy` in the relevant app(s). If you specifically want to inspect pre-migration prod data first (e.g., task-template-redesign Phase 0), do that first.
4. **Run feature-specific data jobs.** E.g., `pnpm tsx apps/erify_api/scripts/normalize-task-template-schemas.ts --dry-run --stamp-v1`.
5. **Verify (smoke test).** Boot the apps, exercise the relevant flows, confirm behavior matches expectations.
6. **Revert (when done).** Drop the local DB and re-run seed (`pnpm db:seed` in the relevant app), or re-run the sync if you want to stay on prod-like data.

## Governance & Future Upgrades

This v1 design is calibrated for a solo-dev environment with full prod access. The following triggers should reopen the design:

| Trigger                                         | Upgrade                                                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Second developer joins                          | Move `PROD_*` credentials out of `.env` into a secret manager (1Password CLI, etc.). Skill text should already point here. |
| Prod credential is admin role                   | Provision and switch to a `SELECT`-only Postgres role.                                                                     |
| Non-trusted developers or external contributors | Add column-level PII sanitization (likely a per-table `UPDATE ... SET email = ...` pass after restore).                    |
| Sync becomes slow / disk-heavy                  | Grow the `EXCLUDED_TABLES` list. Consider `--exclude-table-data` for `material_assets`-style blob tables.                  |
| Need for repeatable agent verification          | Wrap the manual smoke test in a scripted form (currently out of scope).                                                    |

## What's Not Built

- TypeScript implementation. Bash + `pg_dump` + `psql` is sufficient. Revisit only when the script grows logic that bash makes painful.
- `--dry-run` flag (covered by pre-flight banner).
- Per-feature exclusion presets (e.g., "task-template profile"). Out of scope until the script has more than one consumer asking for different excludes.
- Sanitization. Deferred per governance section.
- Backup of local DB before overwrite. Solo dev tradeoff; the workflow tells the user to commit/stash first.
- Incremental sync. Forbidden by the read-only invariant; would require prod-side write transactions.

## Open Questions

None blocking. All deferred items are captured in Governance & Future Upgrades.
