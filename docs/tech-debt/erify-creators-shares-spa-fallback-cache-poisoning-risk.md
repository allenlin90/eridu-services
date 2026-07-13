# Accepted: erify_creators shares the SPA-fallback CDN-poisoning risk fixed in erify_studios

**Status:** Accepted (unfixed) · **Area:** `erify_creators` production static hosting
**Origin:** PR #287 review (fixed the same issue for `erify_studios`)

## Context

PR #287 replaced `erify_studios`'s blanket `serve -s ./dist` SPA fallback with an
extensionless-route rewrite (`apps/erify_studios/serve.json`) after a real incident:
during a deployment overlap, `serve -s` treated a temporarily missing hashed CSS
asset as an unmatched SPA route and returned `index.html` with a cacheable 200.
Cloudflare cached that HTML response under the `.css` URL, so the app served
Tailwind-less HTML from a `.css` request until the poisoned cache entry was
purged.

`apps/erify_creators/package.json` still runs the same blanket fallback:

```
"start": "npx serve -s ./dist"
```

There is no `apps/erify_creators/serve.json` and no "Static Hosting Policy"
section in `apps/erify_creators/docs/PWA_SHELL_RUNBOOK.md`. If `erify_creators`
is deployed behind a CDN/custom domain the same way `erify_studios` is, a
deployment overlap can poison a hashed asset URL there too, with the same
unstyled-app / MIME-mismatch symptom.

## Why accepted (not fixed in PR #287)

- PR #287 was scoped to remediate the studios incident that had already
  happened; extending it to a sibling app widens the change's blast radius
  right before merge.
- The fix is mechanical and low-risk to apply later: copy `serve.json`,
  point `start` at it, add the doc section, add the `serve.json` path to
  `.railway/erify_creators.json` `watchPatterns`.

## When to revisit

- Before or immediately after `erify_creators` is fronted by a CDN/custom
  domain in production (if not already), or
- If the same symptom (unstyled app, MIME-type errors, HTML returned for a
  static-asset request) is ever observed for `erify_creators`.

## Fix reference

Mirror `apps/erify_studios/serve.json` and the `start` script change in
`apps/erify_studios/package.json` from PR #287; apply the same
`.railway/erify_studios.json` `watchPatterns` addition to
`.railway/erify_creators.json`; add a matching "Static Hosting Policy"
section to `apps/erify_creators/docs/PWA_SHELL_RUNBOOK.md`.
