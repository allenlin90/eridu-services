# Studio Creator Onboarding — Backend Design

> **Status**: Design
> **Phase scope**: Phase 4 Wave 1
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/studio-creator-onboarding.md`](../../../../docs/prd/studio-creator-onboarding.md)
> **Depends on**: Studio creator roster ✅ (PR #30), creator model service ✅

## Purpose

Add a studio-scoped endpoint that creates a brand-new global `Creator` and an active `StudioCreator` roster row in one atomic operation, and fix the roster enforcement gap in show assignment so that only active roster creators are assignable.

## Scope

| Change | Type | Priority |
| --- | --- | --- |
| `POST /studios/:studioId/creators/onboard` | New endpoint | Primary |
| Roster enforcement fix in `bulkAssignCreatorsToShow` | Bug fix | Primary |
| `CREATOR_NOT_IN_ROSTER` error code | New contract | Primary |
| Catalog search enhancement (name deduplication guidance) | Minor | Secondary |

## API Surface

### New Endpoint: Onboard Creator

```
POST /studios/:studioId/creators/onboard
```

**Guard**: `@StudioProtected([ADMIN])`

**Request body** (snake_case wire format):

```json
{
  "creator": {
    "name": "Alice Example",
    "alias_name": "Alice",
    "user_id": null,
    "metadata": {}
  },
  "roster": {
    "default_rate": 500,
    "default_rate_type": "FIXED",
    "default_commission_rate": null,
    "metadata": {}
  }
}
```

**Response**: `201 Created` — returns the canonical `StudioCreatorRosterItem` (same shape as `POST /studios/:studioId/creators` response).

**Error responses**:

| Code | HTTP | Condition |
| --- | --- | --- |
| `CREATOR_ALREADY_EXISTS` | 409 | A creator with the same `user_id` already exists (user-link uniqueness) |
| `CREATOR_ALREADY_IN_ROSTER` | 409 | Newly created creator somehow already in roster (race guard) |
| Zod validation | 422 | Invalid fields or compensation cross-field rule violation |

### Existing Endpoint Changes

No changes to `POST /studios/:studioId/creators` (add existing catalog creator) or `PATCH /studios/:studioId/creators/:creatorId` (update roster entry). The onboard endpoint is additive.

### Assignment Enforcement Fix

No new endpoint — fix is internal to `ShowOrchestrationService.bulkAssignCreatorsToShow`.

**New error code added to assignment failure reasons**:

| Code | Condition |
| --- | --- |
| `CREATOR_NOT_IN_ROSTER` | Creator UID has no `StudioCreator` row at all for this studio |
| `CREATOR_INACTIVE_IN_ROSTER` | Creator has a roster row but `isActive = false` (existing) |

## Schema Design

### API Types (`packages/api-types/src/studio-creators/schemas.ts`)

Add onboard input schema:

```typescript
export const onboardCreatorInputSchema = z.object({
  creator: z.object({
    name: z.string().trim().min(1),
    alias_name: z.string().trim().min(1),
    user_id: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  roster: z.object({
    default_rate: defaultRateInputSchema,
    default_rate_type: creatorCompensationTypeSchema.nullable().optional(),
    default_commission_rate: defaultCommissionRateInputSchema,
    metadata: z.record(z.string(), z.any()).optional(),
  }).superRefine(validateCreateCompensationDefaults),
});
```

Add error code:

```typescript
export const STUDIO_CREATOR_ROSTER_ERROR = {
  CREATOR_NOT_FOUND: 'CREATOR_NOT_FOUND',
  CREATOR_ALREADY_IN_ROSTER: 'CREATOR_ALREADY_IN_ROSTER',
  CREATOR_INACTIVE_IN_ROSTER: 'CREATOR_INACTIVE_IN_ROSTER',
  CREATOR_NOT_IN_ROSTER: 'CREATOR_NOT_IN_ROSTER',         // NEW
  VERSION_CONFLICT: 'VERSION_CONFLICT',
} as const;
```

### Controller DTO (`src/studios/studio-creator/schemas/`)

New file: `studio-creator-onboard.schema.ts`

```typescript
export class OnboardCreatorDto {
  // Transformed from onboardCreatorInputSchema
  declare name: string;
  declare aliasName: string;
  declare userId?: string | null;
  declare creatorMetadata?: Record<string, unknown>;
  declare defaultRate?: number | null;
  declare defaultRateType?: string | null;
  declare defaultCommissionRate?: number | null;
  declare rosterMetadata?: Record<string, unknown>;
}
```

### Service Payload (`src/models/studio-creator/schemas/`)

Add to existing `studio-creator.schema.ts`:

```typescript
export type OnboardCreatorPayload = {
  creator: {
    name: string;
    aliasName: string;
    userId?: string | null;
    metadata?: Record<string, unknown>;
  };
  roster: {
    defaultRate?: number | null;
    defaultRateType?: string | null;
    defaultCommissionRate?: number | null;
    metadata?: Record<string, unknown>;
  };
};
```

## Service Layer

### `StudioCreatorService.onboardCreator`

New method on the existing service. Atomic via `@Transactional()`.

```
@Transactional()
async onboardCreator(studioUid: string, payload: OnboardCreatorPayload): Promise<StudioCreatorRosterRecord>
  1. Validate compensation defaults (reuse existing cross-field validation)
  2. Create global Creator via CreatorService.createCreator()
     - generates creator UID
     - validates user_id uniqueness (throws 409 if duplicate user link)
  3. Create StudioCreator roster entry via this.repository.createRosterEntry()
     - generates studio-creator UID
     - isActive = true
     - sets compensation defaults
  4. Return roster record with creator relation
```

**Why StudioCreatorService owns this**: The orchestration crosses Creator + StudioCreator, but StudioCreator is the primary domain — the roster row is the goal, and the global creator is a prerequisite. This avoids creating a new orchestration service for a two-step flow within the same bounded context.

**Dependency injection**: `StudioCreatorService` already depends on `CreatorService` (used in `addCreatorToRoster` for creator existence validation). No new module wiring needed.

### `ShowOrchestrationService.bulkAssignCreatorsToShow` — Fix

Current bug (lines ~185-232 of `show-orchestration.service.ts`):

```typescript
// Only builds a set of INACTIVE roster entries
const inactiveRosterCreatorIds = new Set(
  studioCreatorRosterEntries
    .filter((entry) => !entry.isActive)
    .map((entry) => entry.creator.uid),
);
// A creator with NO roster entry passes this check
```

Fix approach — add a `rosteredCreatorIds` set and check membership:

```typescript
const rosteredCreatorIds = new Set(
  studioCreatorRosterEntries.map((entry) => entry.creator.uid),
);

const inactiveRosterCreatorIds = new Set(
  studioCreatorRosterEntries
    .filter((entry) => !entry.isActive)
    .map((entry) => entry.creator.uid),
);

// In the assignment loop, before the existing inactive check:
if (!rosteredCreatorIds.has(creator.creatorId)) {
  result.failed.push({
    creatorId: creator.creatorId,
    reason: STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER,
  });
  continue;
}
```

**Behavioral change**: Creators with no roster entry are now rejected instead of silently assigned. This is a breaking change for any workflow that relies on assigning non-rostered creators — which is the intended fix.

## Controller Layer

### New Action on `StudioCreatorController`

```typescript
// POST /studios/:studioId/creators/onboard
@StudioProtected([ADMIN])
@ZodResponse(studioCreatorRosterItemSchema, HttpStatus.CREATED)
async onboardCreator(
  @StudioParam() studioUid: string,
  @Body(new ZodValidationPipe(onboardCreatorInputSchema)) dto: OnboardCreatorDto,
): Promise<StudioCreatorRosterRecord>
```

**Route ordering note**: `/creators/onboard` must be registered before `/creators/:creatorId` to avoid the param route consuming "onboard" as a creatorId. NestJS resolves routes top-down within a controller, so declare the `onboard` method above `updateCreator`.

## Module Wiring

No new modules. `StudioCreatorService` already imports `CreatorService` via `StudioCreatorModule`. The controller already lives in `StudioCreatorController`.

Verify that `ShowOrchestrationModule` imports `StudioCreatorModule` (it does — used for roster lookups in bulk assign).

## Testing Strategy

### Unit Tests

| Test | File |
| --- | --- |
| `onboardCreator` happy path — creates creator + roster entry | `studio-creator.service.spec.ts` |
| `onboardCreator` with duplicate user_id — throws 409 | `studio-creator.service.spec.ts` |
| `onboardCreator` compensation validation — rejects invalid combos | `studio-creator.service.spec.ts` |
| Controller route + guard + response shape | `studio-creator.controller.spec.ts` |
| Onboard DTO schema validation | `studio-creator-onboard.schema.spec.ts` |
| Roster enforcement — rejects `CREATOR_NOT_IN_ROSTER` | `show-orchestration.service.spec.ts` |
| Roster enforcement — existing `CREATOR_INACTIVE_IN_ROSTER` still works | `show-orchestration.service.spec.ts` |

### Schema Tests

| Test | File |
| --- | --- |
| `onboardCreatorInputSchema` accepts valid payloads | `api-types` test suite |
| `onboardCreatorInputSchema` rejects missing name/alias | `api-types` test suite |
| Compensation cross-field validation on roster section | `api-types` test suite |

## File Inventory

| File | Action |
| --- | --- |
| `packages/api-types/src/studio-creators/schemas.ts` | Add `onboardCreatorInputSchema`, `CREATOR_NOT_IN_ROSTER` error |
| `apps/erify_api/src/models/studio-creator/schemas/studio-creator.schema.ts` | Add `OnboardCreatorPayload` type |
| `apps/erify_api/src/studios/studio-creator/schemas/studio-creator-onboard.schema.ts` | New — DTO for onboard endpoint |
| `apps/erify_api/src/studios/studio-creator/schemas/index.ts` | Re-export onboard schema |
| `apps/erify_api/src/studios/studio-creator/studio-creator.controller.ts` | Add `onboardCreator` action |
| `apps/erify_api/src/models/studio-creator/studio-creator.service.ts` | Add `onboardCreator` method |
| `apps/erify_api/src/studios/show-orchestration/show-orchestration.service.ts` | Fix roster enforcement in `bulkAssignCreatorsToShow` |
| `apps/erify_api/src/studios/studio-creator/studio-creator.controller.spec.ts` | Add onboard tests |
| `apps/erify_api/src/models/studio-creator/studio-creator.service.spec.ts` | Add onboard tests |
| `apps/erify_api/src/studios/show-orchestration/show-orchestration.service.spec.ts` | Add `CREATOR_NOT_IN_ROSTER` tests |

## Open Questions

None — the PRD is fully specified. Proceed to implementation.
