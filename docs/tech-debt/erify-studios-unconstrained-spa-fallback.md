# Accepted: erify_studios runs an unconstrained SPA fallback (CDN cache-poisoning risk)

**Status:** Accepted (reverted fix) · **Area:** `erify_studios` production static hosting
**Origin:** PR #286/#287 incident, PR #289 hotfix, PR #290 revert

## Context

`apps/erify_studios/package.json` runs `npx serve -s ./dist` — a blanket SPA fallback
that rewrites any unmatched path, including a temporarily-missing hashed asset during a
deployment overlap, to `index.html` with a cacheable `200`. This is what let Cloudflare
cache an HTML response under a hashed `.css` URL during a real deploy overlap, making
the app appear completely unstyled until the poisoned URL was purged (the #286/#287
incident).

PR #287 replaced the blanket fallback with a constrained `serve.json` rewrite (asset-
shaped misses return 404, only extensionless client routes fall back to `index.html`).
That rewrite had a bug: `/:path([^.]+)` requires one or more non-dot characters, so it
never matches the bare root path `/` — with `cleanUrls: false`, `serve` fell through to
its own directory-listing page at `/`, a full outage. PR #289 fixed that specific bug
(added an explicit `/` → `/index.html` rule) and was verified end-to-end (HTTP matrix,
full test/build suite).

PR #290 reverted **both** #287 and #289 back to the original `serve -s ./dist`. The
revert wasn't because the corrected #289 fix was wrong — later investigation confirmed
production was healthy and the fix worked; a rapid sequence of unrelated redeploys
during the incident window caused confusing hash churn, and the browser being used to
validate it had a stale HTTP-disk-cache copy of an older build masking the fix (see
`pwa-best-practices` skill § Static Hosting / SPA Fallback, § Verification gotcha). The
revert was a "stop compounding an already-confusing debugging session" call, not a
rejection of the fix's design.

## Why accepted (not fixed immediately)

- The corrected fix (`serve.json` with both the `/` rule and the extensionless-route
  rule) is proven correct and already implemented for `erify_creators`
  (`apps/erify_creators/serve.json`, PR #288) — same pattern, verified via the same HTTP
  matrix plus a fresh-browser/incognito check.
- Re-applying it to `erify_studios` should happen deliberately (its own PR, validated
  outside of an active incident, with the CDN-purge step and incognito-verification
  step from the skill followed explicitly) rather than as another hotfix layered on an
  already-confusing session.

## When to revisit

- Before or when the next CDN cache-poisoning incident happens for `erify_studios`
  (same symptom: app appears unstyled after a deploy, MIME-type error on a `.css`/`.js`
  URL), or
- Proactively, as a standalone, carefully-validated PR — copy
  `apps/erify_creators/serve.json` and its `package.json`/`.railway/*.json` wiring, and
  follow the `pwa-best-practices` skill's verification steps (curl first, then
  incognito/hard-reload — never just a plain reload in an already-open browser).
