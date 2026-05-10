# Ideation: `z.coerce.boolean()` Query Param Sweep

> **Status**: Deferred from PR #59 (compensation-line-items admin CRUD)
> **Origin**: chatgpt-codex-connector P1 review on PR #59, May 2026
> **Related**: [task-template.schema.ts:120](../../packages/api-types/src/task-management/task-template.schema.ts) (existing safer pattern)

## What

Replace `z.coerce.boolean()` on HTTP query-param schemas with the codebase's string-aware boolean parser, so that `?flag=false` parses to `false` instead of `true`.

## Why It Was Considered

`z.coerce.boolean()` calls JavaScript `Boolean(value)`, which returns `true` for any non-empty string — including `"false"`, `"0"`, `"no"`. For query params (which always arrive as strings), this means a client sending `include_deleted=false` receives soft-deleted rows anyway. This was flagged as a P1 issue on the `compensation-line-items` list endpoint and fixed in that PR using the existing safer pattern from [task-template.schema.ts:120-123](../../packages/api-types/src/task-management/task-template.schema.ts):

```ts
.union([z.boolean(), z.enum(['true', 'false'])])
.transform((value) => (typeof value === 'string' ? value === 'true' : value))
```

The same bug exists on ~15 other query-param fields across the codebase.

## Why It Was Deferred

1. The compensation-line-items PR is narrowly scoped to the new admin CRUD; widening it to a cross-cutting refactor would balloon the diff and slow review.
2. No active incident or user report attributed to this — defaults are `false`, and the "easy" client behavior (omit the param) works correctly.
3. The fix is mechanical but touches multiple unrelated domains (shows, schedules, studios, creators, task templates, platforms, clients, show-standards, show-types, memberships, studio-creators), each owned by different feature areas; coordinating the sweep deserves its own focused PR.
4. Some call sites (e.g. `env.schema.ts`) are not HTTP query params and use `z.coerce.boolean()` for env-var parsing where the trade-off is different and may be intentional.

## Decision Gates for Promotion

Promote to a PRD / focused PR when **any** of these are true:

1. A bug report or incident attributes incorrect data exposure or filter behavior to `?flag=false` being parsed as `true`.
2. A new feature relies on user-toggleable boolean filters where `false` is the active (non-default) selection.
3. A frontend search-schema audit finds clients explicitly emitting `?flag=false` to the URL bar (e.g. via Tanstack Router `validateSearch`).
4. A general schema-hygiene sweep is scheduled (alongside other Zod cleanups).

## Affected Call Sites (May 2026)

### `packages/api-types`

- `compensation-line-items/schemas.ts:74` — **fixed in PR #59**
- `task-management/task-template.schema.ts:188`, `:259`
- `schedules/schemas.ts:166` (`include_plan_document`), `:167` (`include_deleted`)
- `shows/schemas.ts:74`
- `studio-creators/schemas.ts:132` (`include_rostered`), `:181` (`is_active`)

### `apps/erify_api/src` (controller-local schemas)

- `models/creator/schemas/creator.schema.ts:152`
- `models/show/schemas/show.schema.ts:396`
- `models/studio/schemas/studio.schema.ts:86`
- `models/schedule/schemas/schedule.schema.ts:245-246`, `:269`
- `models/platform/schemas/platform.schema.ts:81`
- `models/client/schemas/client.schema.ts:66`
- `models/show-standard/schemas/show-standard.schema.ts:79`
- `models/show-type/schemas/show-type.schema.ts:80`
- `models/membership/schemas/studio-membership.schema.ts:239`
- `studios/studio-creator/schemas/studio-creator-roster-list.schema.ts:50`

### Out of Scope

- `apps/erify_api/src/config/env.schema.ts:24` (`CORS_ENABLED`) — env var, not a query param. Different ergonomics; treat separately.

## Implementation Notes (Preserved Context)

- **Pattern to apply** — copy the existing pattern from `task-template.schema.ts:120-123`. Consider extracting it as a shared helper in `packages/api-types/src/common/` (e.g. `stringBooleanSchema`) so future schemas have one canonical import. Audit the helper PR separately to avoid mixing extraction with the call-site sweep.
- **Backward compatibility** — clients currently sending `?include_deleted=false` would silently switch from "soft-deleted included" to "soft-deleted excluded". This is the intended fix, but the change is observable; mention in release notes / changeset.
- **Tests** — add a focused parser test per schema covering: `"true"` → `true`, `"false"` → `false`, `true` → `true`, `false` → `false`, missing → default. The existing controller specs largely pass `false` as a literal boolean and won't catch the bug.
- **Frontend** — verify Tanstack Router `validateSearch` schemas in `erify_studios` and `erify_creators` already use the safer `z.enum(['true', 'false'])` pattern for any boolean URL state (the existing audit in `task-template.schema.ts` suggests they do).
