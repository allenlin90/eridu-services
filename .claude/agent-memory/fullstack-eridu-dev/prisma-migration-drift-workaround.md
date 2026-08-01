---
name: prisma-migration-drift-workaround
description: Generate a Prisma migration via `migrate diff` + disposable shadow DB when the local dev database has untracked drift blocking `prisma migrate dev`.
metadata:
  type: feedback
---

`prisma migrate dev --name <x>` (with or without `--create-only`) refuses to run
when the local dev Postgres has schema drift versus the migration history —
even a single stray manually-created table (e.g. someone's ad-hoc
`show_platforms_perf_backup_20260607` backup table) triggers "We need to reset
the public schema" and blocks migration generation entirely, without touching
any Prisma-tracked object.

**Do not run `prisma migrate reset`** to clear this — it drops all local data
and is a destructive action outside the scope of a feature PR.

**Fix**: `apps/erify_api/prisma.config.ts` already supports this via
`SHADOW_DATABASE_URL` (documented inline in that file). Steps:

1. Create a disposable Postgres database in the same container:
   `docker exec <db-container> psql -U admin -d postgres -c "CREATE DATABASE erify_api_shadow;"`
2. Generate the SQL diff against migration history (not the live drifted DB):
   ```
   SHADOW_DATABASE_URL="postgres://admin:secret@localhost:5432/erify_api_shadow" \
     npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema ./prisma/schema.prisma --script
   ```
3. Hand-create `prisma/migrations/<timestamp>_<purpose_name>/migration.sql` with that
   output. **Strip the leading `Loaded Prisma config...` log line and any spurious
   `DROP INDEX` statements for indexes that are invisible to Prisma** (e.g.
   `scene_profiles_active_client_key`, a partial unique index created by hand in
   an earlier migration — see the schema.prisma comment above `SceneProfile` for
   the same warning).
4. Apply to the real local dev DB with `npx prisma migrate deploy` (this command
   does NOT do drift detection like `migrate dev`, so the stray table doesn't
   block it).
5. `npx prisma generate` to regenerate the client.
6. Drop the disposable shadow DB.

This keeps migration generation officially-tooling-derived (satisfies the
"Prisma must generate the migration" rule) while sidestepping unrelated local
drift. Confirmed working on this repo's Prisma 7.4.2 setup.
