# Accepted: Scene QC's first-load operational date still comes from the browser clock

**Status:** Accepted (low priority) · **Area:** `erify_studios` Scene QC Daily Review — initial date resolution
**Origin:** PR #339 review discussion (Scene QC implementation plan)

## Context

PR #339 made Scene QC's operational day server-authoritative. `Studio.timezone`
becomes a required canonical IANA column, Scene QC write contracts no longer
accept `window_start`/`window_end`/`timezone` from the client, and the backend
resolves the exact 06:00–05:59 window for a date-only `operational_date`.

One path was left unresolved: **which date the Daily Review requests on first
load, before any date is present in the URL.** The plan specifies that date
*selection* uses the server-returned window, but not where the initial value
originates. The existing helper is browser-clock based:

```ts
// apps/erify_studios/src/lib/operational-day-range.ts
export function getCurrentOperationalDate(now = new Date()): string {
  const date = new Date(now);
  if (date.getHours() < OPERATIONAL_DAY_START_HOUR) {  // local hours
    date.setDate(date.getDate() - 1);
  }
  return toOperationalDateInputValue(date);
}
```

If Child PR 3 reaches for it, a reviewer whose device is in a different timezone
than the Studio lands on the wrong default day near the 06:00 boundary — even
though every subsequent resolution in the flow is correct. The consequences are
bounded (a wrong default date, not a wrong window or a corrupted confirmation),
because the server still owns the boundary for whatever date it is handed.

This is the same client-clock-dependence described in
[studio-config-settings §6](../ideation/studio-config-settings.md), narrowed to
the one place it survives inside Scene QC.

## Why accepted (not fixed now)

- **The failure is unreachable today.** All users are in a single timezone
  (`Asia/Bangkok`), matching the only active Studio. The wrong-default-day
  scenario requires an operator whose device timezone differs from the Studio's,
  which does not exist yet.
- **Blast radius is a default, not a durable record.** The value is a URL search
  param the operator can change, and it never reaches a confirmation as scope —
  the server re-resolves bounds from `Studio.timezone` regardless. No signed
  artifact can be wrong because of it.
- **The clean fix belongs with the broader migration.** PR #339 §11 deliberately
  scopes server-authoritative resolution to durable confirmations and leaves
  existing read-only surfaces on their current bounds contract until separately
  migrated. Fixing only Scene QC's default now would add a second resolution
  path to the surface the general migration is meant to unify.

## When to revisit

Fix when either becomes true:

- **A second timezone appears** — a studio is onboarded outside `Asia/Bangkok`,
  or an operator (travelling manager, cross-border VA) reviews from a different
  device timezone. This is also promotion gate 2 of
  [studio-config-settings](../ideation/studio-config-settings.md).
- **A headless caller needs a default day** — a scheduled export, job, or
  notification has to answer "what is the current operational day" with no
  browser in the loop.

The expected fix is small: have `GET /studios/:studioId/scene-qc/summary` return
the Studio's current operational date when the request omits one, and have the
route seed its search default from that response instead of
`getCurrentOperationalDate()`. Do this as part of the wider operational-window
migration rather than as a Scene-QC-only special case.
