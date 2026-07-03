# Accepted: MC roster Google Sheet export has no real source for role/email-verification/ban details

**Status:** Accepted (nulls returned, no fake defaults) · **Area:** `erify_api` google-sheets export
**Origin:** PR #258 (`google-sheets/studios/:studioId/creators`)

## Context

`StudioCreatorService.listActiveRosterWithLinkedUsers` (`apps/erify_api/src/models/studio-creator/studio-creator.service.ts`)
feeds the `mc_users` Google Sheet tab via `SyncMCRoster.js`. The sheet's column
set (`role`, `email_verified`, `ban_reason`, `ban_expires`) mirrors fields that
`eridu_auth`'s auth schema owns, but `erify_api`'s own `User` model only has a
`metadata` JSON blob for anything beyond `isBanned` — and nothing in
`erify_api` currently writes `role`/`ban_reason`/`ban_expires`/`emailVerified`
into that blob.

## The gap

`listActiveRosterWithLinkedUsers` reads those four fields out of
`User.metadata` and returns `null` when the key is absent — which today means
"always `null`" for every real user, since no sync path populates them. Only
`banned` is reliable, because it reads the real `User.isBanned` column.

## Why accepted (not fixed here)

- Making this data real requires a decision `erify_api` doesn't currently
  need to make elsewhere: either a sync job/webhook that mirrors the relevant
  `eridu_auth` fields into `User` (columns or `metadata`), or a live call to
  `eridu_auth` per export. Both are cross-service integration work well
  beyond a read-only sheet export.
- Returning `null` (rather than fabricating a "verified"/"user" default) is
  the correct behavior for as long as the gap exists — that's what this PR
  does, so there is no misleading output to fix urgently.

## When to revisit

- If the `mc_users` sheet, or any other consumer, starts relying on real
  `role`/`email_verified`/`ban_reason`/`ban_expires` values, add a sync path
  from `eridu_auth` into `erify_api`'s `User` record (or query `eridu_auth`
  directly) and remove the "stays null" comment in
  `listActiveRosterWithLinkedUsers`.
