# Accepted: Scene Profile save performs an R2 HeadObject probe inside an open Postgres transaction

**Status:** Accepted (low priority) · **Area:** `erify_api` Scene QC — `SceneProfileService.saveProfileForClient`
**Origin:** PR #347 review discussion (Scene QC Child PR 2)

## Context

`saveProfileForClient` is `@Transactional()`. The first awaits inside it are
`resolveActor` (DB) and then `assertSceneReferenceUpload`, which calls
`StorageService.headObject()` — a network round trip to R2 (`HeadObjectCommand`)
— before any Prisma write happens.

`TransactionalAdapterPrisma` is registered in `app.module.ts` with no
`defaultTxOptions`, so Prisma's default interactive-transaction time budget
applies to the whole method, including the R2 call. The S3 client is
constructed with default `maxAttempts` and no request-handler timeout. A slow
or hanging R2 response pins a pool connection for the round trip and can
surface as a 500 (transaction timeout) where a clean 400/404 was intended.

No other `@Transactional()` method in `erify_api` makes an external network
call today — this is a new pattern with no existing precedent to follow or
diverge from.

This is not a data-correctness bug: if the transaction aborts, it rolls back
cleanly and no partial state is persisted.

## Why accepted (not fixed now)

- Bounded blast radius: worst case is an occasional 500 instead of a 400/404
  under R2 slowness, not silent data corruption.
- The fix is small and well-understood (verify the upload — structural checks
  plus the `headObject` probe — before entering the `@Transactional()`
  boundary, then pass the already-verified `{mimeType, fileSize}` into the
  transactional write), so it doesn't need to block Scene QC Child PR 2's
  merge.
- No production traffic on this endpoint yet (Scene QC is still mid-rollout
  behind the integration branch), so there's no observed incident motivating
  an urgent fix.

## Suggested resolution

Move the `assertSceneReferenceUpload` call (structural checks + `headObject`)
out of `saveProfileForClient`'s transactional boundary — resolve and validate
the upload first, then open the `@Transactional()` scope only for the actor
resolution and the Prisma create/replace + audit write.

## Fix trigger

Revisit before Scene QC handles real production write traffic, or sooner if
R2 timeouts are observed in practice.
