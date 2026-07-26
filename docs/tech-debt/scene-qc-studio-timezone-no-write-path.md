# Accepted: `Studio.timezone` has no public write path after creation

**Status:** Accepted (low priority) · **Area:** `erify_api` Studio model — canonical
IANA timezone column
**Origin:** Scene QC Child PR 1 implementation planning

## Context

Scene QC Child PR 1 adds a required `Studio.timezone` IANA identifier as the
canonical timezone every server-authoritative operational-day resolution reads
from (see [Scene QC PRD](../prd/scene-qc.md) and the
[implementation plan](../../apps/erify_api/docs/design/SCENE_QC_IMPLEMENTATION_PLAN.md)
§5). The migration backfills every existing Studio from an explicit, reviewed
`studios.name` → IANA-timezone mapping, then enforces `NOT NULL`.

Studio creation gets a single named default constant
(`DEFAULT_STUDIO_TIMEZONE`, `Asia/Bangkok`) applied when a caller omits the
field. No child PR in the Scene QC plan adds a way to **set or correct** a
Studio's timezone after creation — `createStudioInputSchema` and
`updateStudioInputSchema` in `@eridu/api-types` are deliberately left
unchanged so Child PR 1 makes no public route behavior change. Onboarding a
Studio outside `Asia/Bangkok`, or correcting a wrong value, currently requires
a direct database edit.

## Why accepted (not fixed now)

- **The failure is unreachable today.** There is one active Studio, already
  correctly backfilled to `Asia/Bangkok`. No caller has ever needed to set a
  different value.
- **Adding it now is scope creep on a foundation PR.** Child PR 1 ships
  contracts and persistence only, with an explicit exit criterion of "no
  public route behavior changes." Widening the admin Studio contract belongs
  with a PR that actually needs it.
- **This is the second and final open instance of the same class of gap.**
  [`scene-qc-default-operational-date-browser-clock.md`](./scene-qc-default-operational-date-browser-clock.md)
  already tracks the read-side counterpart (no second-timezone-aware default
  date resolution). Both share the same trigger.

## When to revisit

Fix when either becomes true:

- **A second Studio is onboarded outside `Asia/Bangkok`** — add an
  IANA-validated `timezone` field to the admin Studio create/update contract
  (`packages/api-types` `createStudioInputSchema`/`updateStudioInputSchema`,
  `apps/erify_studios/src/features/studios/components/studio-dialogs.tsx`)
  instead of a direct database edit.
- **`studio-config-settings`** promotes Studio-level configuration into a
  general settings surface — timezone likely belongs there rather than as a
  standalone field addition.

The expected fix is small: add `timezone` to the existing admin Studio form
and contract, validated against `Intl`-resolvable IANA identifiers
(`isValidIanaTimeZone` already exists in
`apps/erify_api/src/lib/utils/studio-operational-window.util.ts` from Child PR 1).
