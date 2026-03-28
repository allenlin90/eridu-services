---
name: Studio Creator Roster Patterns (PR #30)
description: Creator roster CRUD feature patterns, known issues, and review notes for feat/studios/creator-roster
type: project
---

## Shipped Patterns (PR #30, 2026-03-28)

### updateWithVersionCheck: 3-Query Pattern (CLEAN for now)
`StudioCreatorRepository.updateWithVersionCheck` does three sequential queries:
1. `findByStudioUidAndCreatorUid` — resolve row and get internal id
2. `updateMany` with version filter — atomic update
3. `findFirst` after update — re-read with includes for return

This is intentional: Prisma `updateMany` does not support `include`, so re-read is necessary.
The extra read-before-write is also acceptable for this low-traffic write path.
Flag only as a suggestion (not a warning) in future reviews of this service.

### CREATOR_INACTIVE_IN_ROSTER: RESOLVED (fix commit in PR #30)
`show-orchestration.service.ts` now uses `STUDIO_CREATOR_ROSTER_ERROR.CREATOR_INACTIVE_IN_ROSTER` imported
from `@eridu/api-types/studio-creators`. The constant is properly exported and used in both the service and spec.
The `STUDIO_CREATOR_ROSTER_ERROR` enum in api-types includes all four error codes:
`CREATOR_NOT_FOUND`, `CREATOR_ALREADY_IN_ROSTER`, `CREATOR_INACTIVE_IN_ROSTER`, `VERSION_CONFLICT`.

### studioCreatorCatalogItemSchema: Loose rosterState Type (WARNING)
`apps/erify_api/src/studios/studio-creator/schemas/studio-creator-catalog.schema.ts` defines:
`rosterState: z.string()` in the internal (camelCase) Zod schema.
The downstream API schema uses `z.enum([...STUDIO_CREATOR_ROSTER_STATE...])` which is correct.
The internal schema looseness means invalid rosterState values would pass through validation
until reaching the api-types enum check at the final `.pipe()`. Low risk in practice but should use
`z.nativeEnum(STUDIO_CREATOR_ROSTER_STATE)` or the same enum schema for consistency.

### schemas/index.ts Missing (WARNING)
`apps/erify_api/src/models/studio-creator/schemas/` has only `studio-creator.schema.ts` — no `index.ts`.
CLAUDE.md file structure standard requires `schemas/index.ts` for re-export. Minor structural gap.

### Compensation Validation: Schema + Service Duplication (SUGGESTION)
Cross-field compensation validation exists in two places:
- `@eridu/api-types/studio-creators/schemas.ts` via `superRefine` (API boundary enforcement)
- `apps/erify_api/src/models/studio-creator/studio-creator.service.ts` `validateCompensationDefaults` (service-layer enforcement)

The duplication is intentional and is an established pattern in this project (API schema catches
wire-level issues; service logic handles derived state like "resolved next type" on PATCH).
Do NOT flag as blocking — the service validation is needed for the PATCH case where partial updates
require merging with existing state before validating the resulting combination.

### metadata Preservation on Reactivation (INTENTIONAL)
In `addCreatorToRoster`, when reactivating an inactive creator:
`metadata: payload.metadata ?? (existing?.metadata as Record<string, unknown> | undefined) ?? {}`
The cast to `Record<string, unknown>` is used because Prisma returns `JsonValue` for `metadata`,
and the service does not import `Prisma.*` types. This cast is acceptable here.
The `as` cast is safe because the schema always writes `{}` as minimum.

### is_active Filter: Always-True Default (INTENTIONAL)
`use-studio-creator-roster.ts` sets `isActive = isActiveValue !== 'false'`.
This means `undefined` (no filter) maps to `true` (active-only), which matches the
backend default behavior of `isActive ?? true` in `listRoster`. The default is consistent.
Clients must explicitly send `is_active=false` to see inactive creators.

### Frontend Error Handling: Structural `as` Cast
Both `add-studio-creator-dialog.tsx` and `edit-studio-creator-dialog.tsx` use:
`const err = error as { response?: { ... } }`
This is an established pattern in this codebase for Axios error shapes.
The alternative would be `instanceof AxiosError` check or a typed error helper.
Flag as suggestion, not blocking.

### 409 Conflict Handler: Duplicate invalidateQueries (SUGGESTION)
`edit-studio-creator-dialog.tsx` 409 handler manually calls three `invalidateQueries` directly
instead of calling the shared `invalidateStudioCreatorDependencies` helper from `studio-creator-roster.ts`.
The three calls are identical to what the helper does. Should extract to call `invalidateStudioCreatorDependencies`
or accept the inline form. Not blocking — behavior is correct. Flag as suggestion.

### Commit Convention
PR #30 uses multiple commits: feat + two fix commits. Each follows `type(scope): subject` correctly.
The initial `feat(studios): ship creator roster management` covers all three workspaces in one commit.
Fix commits address review feedback: `fix(studio-creator-roster): address PR review findings` and
`fix(studio-creator-roster): preserve defaults on add`.
