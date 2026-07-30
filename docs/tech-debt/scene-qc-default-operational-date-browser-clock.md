# Accepted: Scene QC's first-load operational date still comes from the browser clock

**Status:** Accepted (low priority) · **Area:** `erify_studios` Scene QC Daily Review — initial date resolution
**Origin:** PR #339 review discussion (Scene QC implementation plan)

## Context

PR #339 made Scene QC's operational day server-authoritative. Scene QC write
contracts no longer accept `window_start`/`window_end`/`timezone` from the
client; the backend resolves the exact 06:00–05:59 window for a date-only
`operational_date` from a shared operational-timezone constant (`Asia/Bangkok`).

One path was left unresolved: **which date the Daily Review requests on first
load, before any date is present in the URL.** The plan specifies that date
*selection* uses the server-returned window, but not where the initial value
originates. Child PR 3 shipped a Scene-QC-specific helper rather than reaching
for the generic browser-local `lib/operational-day-range.ts` (deliberately —
see that file's own header comment), but the shipped helper is still
browser-clock-**instant**-based, just correctly timezone-parameterized:

```ts
// apps/erify_studios/src/features/scene-qc/lib/scene-qc-operational-date.ts
export function getCurrentOperationalDate(now: Date = new Date()): string {
  const parts = getZonedParts(now, SCENE_QC_OPERATIONAL_TIMEZONE); // Intl.DateTimeFormat, IANA-correct
  // ... rolls back one calendar day if local time is before 06:00
}
```

Because `now` defaults to the browser's `new Date()`, a reviewer whose **system
clock** is skewed (not just in a different timezone — the Intl conversion
already corrects for timezone) still lands on the wrong default day near the
06:00 boundary. The consequences are bounded (a wrong default date, not a wrong
window or a corrupted confirmation), because the server still owns the
boundary for whatever date it is handed.

This is the same client-clock-dependence described in
[studio-config-settings §6](../ideation/studio-config-settings.md), narrowed to
the one place it survives inside Scene QC.

## Why accepted (not fixed now)

- **The failure is narrower than device timezone.** `getCurrentOperationalDate()`
  already converts the instant via `Intl.DateTimeFormat` parameterized on
  `SCENE_QC_OPERATIONAL_TIMEZONE`, so a device set to a different timezone still
  resolves the correct `Asia/Bangkok` calendar date. The residual risk is a
  skewed **system clock** (a wrong `now`), which is rare and self-evident to the
  operator (the whole OS/browser disagrees with reality), not silent.
- **Blast radius is a default, not a durable record.** The value is a URL search
  param the operator can change, and it never reaches a confirmation as scope —
  the server re-resolves bounds from the shared operational-timezone constant
  regardless. No signed
  artifact can be wrong because of it.
- **The clean fix belongs with the broader migration.** PR #339 §11 deliberately
  scopes server-authoritative resolution to durable confirmations and leaves
  existing read-only surfaces on their current bounds contract until separately
  migrated. Fixing only Scene QC's default now would add a second resolution
  path to the surface the general migration is meant to unify.

## When to revisit

Fix when either becomes true:

- **A headless caller needs a default day** — a scheduled export, job, or
  notification has to answer "what is the current operational day" with no
  browser (and no trustworthy local clock) in the loop.
- **Clock-skew-driven wrong defaults are reported in practice** — evidence that
  the residual risk above is more than theoretical.

The expected fix is small: have `GET /studios/:studioId/scene-qc/summary` return
the Studio's current operational date when the request omits one, and have the
route seed its search default from that response instead of
`getCurrentOperationalDate()`. Do this as part of the wider operational-window
migration rather than as a Scene-QC-only special case.
