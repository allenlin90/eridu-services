# Actuals-Aware Conflict Handling — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the date-based all-or-nothing publish skip with a per-record actuals check, so sheet edits to past-but-untouched shows apply instead of silently vanishing, while genuine conflicts (real data already recorded) are held back and routed through a reviewable `Audit`-backed exception queue instead of a resolve API. This is the **backend-only** PR; frontend ships as a separate follow-up PR against this contract.

**Architecture:** A new focused `ScheduleConflictService` (in `models/schedule-conflict/`) owns the stale-conflict `Audit` lifecycle — opening, superseding, auto-resolving, and applying/dismissing conflicts — behind a `showId`-scoped advisory lock. `PublishingService`'s `toUpdate`/`toRemove` loops and `PublishingRelationSyncService`'s per-row sync gain actuals checks and delegate to this service instead of writing directly. `StudioShowManagementService` gains a resolve endpoint that reuses the same service for the planner-facing apply/dismiss flow.

**Tech Stack:** NestJS, Prisma (raw `tx.$executeRaw` for `pg_advisory_xact_lock`), `@nestjs-cls/transactional`, Zod (`@eridu/api-types`), Jest.

**Spec:** [`docs/superpowers/specs/2026-07-08-schedule-publish-actuals-aware-conflict-handling-design.md`](../specs/2026-07-08-schedule-publish-actuals-aware-conflict-handling-design.md) — read it before starting; this plan implements it task-by-task and cites exact section references.

## Global Constraints

- No schema migration — reuses `Audit`/`AuditTarget` exactly as `ShowCancellationGateService` does (spec: Data Model).
- Never expose DB internal IDs — every FK-backed field captured in `held_back` must be resolved to `{uid, name}` at **write time**, not response time (spec line 64).
- `reason` is `z.string().min(1)`, required for both `apply` and `dismiss` on the resolve endpoint (spec line 137).
- No BullMQ/worker — this is synchronous, inside the existing publish transaction (spec: Performance & Async Processing).
- Bump optimistic-lock `version` only on semantic user-visible mutations — none of this work touches `Schedule.version` beyond what `publishDiffUpsert` already does.
- Naming: snake_case in Zod schemas / API payloads, camelCase in service/domain code, per `AGENTS.md`'s three-tier schema architecture.
- Every changed workspace must pass `pnpm --filter erify_api lint`, `typecheck`, `test`, and `build` before this plan is considered done (Task 7).

---

## File Map

| File | Change |
|---|---|
| `packages/api-types/src/shows/schemas.ts` | New `stale_conflict` kind, `held_back` schema, resolve request schema |
| `packages/api-types/src/shows/types.ts` | New exported types |
| `apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.ts` | **New.** Core conflict lifecycle: open/supersede/auto-resolve/apply/dismiss |
| `apps/erify_api/src/models/schedule-conflict/schedule-conflict.module.ts` | **New.** |
| `apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.spec.ts` | **New.** |
| `apps/erify_api/src/models/audit/audit.repository.ts` | `findLatestScheduleConflictForShow`, `findPendingStaleConflictsForStudio` |
| `apps/erify_api/src/models/audit/audit.service.ts` | Thin passthrough wrappers for the two new repository methods |
| `apps/erify_api/src/schedule-planning/publishing.service.ts` | Actuals-gated `toUpdate`/`toRemove`, terminal-status reconcile, drop `isBeforePublishDate` from both, active-task-check refactor |
| `apps/erify_api/src/schedule-planning/publishing.service.spec.ts` | New describe blocks for the above |
| `apps/erify_api/src/schedule-planning/publishing-relation-sync.service.ts` | Actuals-gated creator/platform sync with show-level fallback, returns held-back detail |
| `apps/erify_api/src/schedule-planning/publishing.types.ts` | New held-back-detail return types |
| `apps/erify_api/src/schedule-planning/schedule-planning.module.ts` | Import `ScheduleConflictModule`, `TaskTargetModule` |
| `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts` | `toSchedulePublishImpactRow` stale_conflict branch, `listSchedulePublishImpacts` default-filter fix, new `resolveScheduleConflict` + `applyHeldBackRelations` methods |
| `apps/erify_api/src/studios/studio-show/studio-show-management.service.spec.ts` | **Existing file** (`xMock`-style, not `module.get()`) — new describe blocks for the above |
| `apps/erify_api/src/studios/studio-show/studio-show.controller.ts` | New `POST :id/schedule-publish-impacts/:conflictUid/resolve` route |
| `apps/erify_api/src/studios/studio-show/studio-show.controller.spec.ts` | **Existing file** — new `resolveScheduleConflict` describe block |
| `apps/erify_api/src/studios/studio-show/schemas/studio-show-schedule-conflict.schema.ts` | **New.** `ResolveScheduleConflictDto` |
| `apps/erify_api/src/studios/studio-show/studio-show.module.ts` | Import `ScheduleConflictModule`, `TaskTargetModule` |

---

### Task 1: API types for `stale_conflict`

**Files:**
- Modify: `packages/api-types/src/shows/schemas.ts`
- Modify: `packages/api-types/src/shows/types.ts`

**Interfaces:**
- Produces: `scheduleConflictTypeSchema`, `scheduleConflictResolutionStatusSchema`, `heldBackPayloadSchema`, `resolveScheduleConflictSchema`, and the extended `schedulePublishImpactKindSchema` / `schedulePublishImpactRowSchema` — every later task imports these from `@eridu/api-types/shows`.

**No test-first step here** — `@eridu/api-types`'s `package.json` defines `"test": "echo \"No tests specified\" && exit 0"`; there is no test runner (no vitest/jest) configured for this package at all, and no existing `.spec.ts`/`.test.ts` file anywhere under `packages/api-types/src`. Per `AGENTS.md`'s verification checklist ("if a workspace does not currently define `test`, run the available verification commands and report the missing test script explicitly"), do not introduce a new test runner just for this — that's a much bigger, separate decision than this task. Verify this task with `typecheck` and `build` only; runtime coverage of these schemas comes from the consuming code in `apps/erify_api` (Task 5's `toSchedulePublishImpactRow` tests parse real data through the equivalent shape, and every `@ZodResponse`/`@ZodPaginatedResponse`-decorated route exercises the schema live).

- [ ] **Step 1: Implement the schema additions**

In `packages/api-types/src/shows/schemas.ts`, locate `schedulePublishImpactKindSchema` and `schedulePublishImpactRowSchema` (existing, ~lines 141-165) and replace with:

```typescript
export const schedulePublishImpactKindSchema = z.enum([
  'confirmed_future_updated',
  'confirmed_future_pending_resolution',
  'stale_conflict',
]);

export const scheduleConflictTypeSchema = z.enum(['update_held_back', 'removal_held_back']);

export const scheduleConflictResolutionStatusSchema = z.enum([
  'pending',
  'applied',
  'dismissed',
  'superseded',
  'auto_resolved_no_longer_conflicting',
]);

const heldBackFkRefSchema = z.object({
  uid: z.string(),
  name: z.string(),
});

const heldBackFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  heldBackFkRefSchema,
]);

const heldBackShowFieldsSchema = z.object({
  changed_fields: z.array(z.string()),
  old: z.record(z.string(), heldBackFieldValueSchema),
  new: z.record(z.string(), heldBackFieldValueSchema),
}).nullable();

const heldBackCreatorEntrySchema = z.object({
  creator_uid: z.string(),
  action: z.enum(['update', 'remove']),
  old_note: z.string().nullable(),
  new_note: z.string().nullable(),
});

const heldBackPlatformFieldsSchema = z.object({
  live_stream_link: z.string().nullable(),
  platform_show_id: z.string().nullable(),
});

const heldBackPlatformEntrySchema = z.object({
  platform_uid: z.string(),
  action: z.enum(['update', 'remove']),
  old: heldBackPlatformFieldsSchema,
  new: heldBackPlatformFieldsSchema,
});

const proposedStatusTransitionSchema = z.object({
  from: z.string(),
  to: z.enum(['CANCELLED', 'CANCELLED_PENDING_RESOLUTION']),
}).nullable();

export const heldBackPayloadSchema = z.object({
  show_fields: heldBackShowFieldsSchema,
  show_creators: z.array(heldBackCreatorEntrySchema),
  show_platforms: z.array(heldBackPlatformEntrySchema),
  proposed_status_transition: proposedStatusTransitionSchema,
});

export const resolveScheduleConflictSchema = z.object({
  action: z.enum(['apply', 'dismiss']),
  reason: z.string().min(1),
});

export const schedulePublishImpactRowSchema = z.object({
  audit_id: z.string(),
  impact_kind: schedulePublishImpactKindSchema,
  schedule_id: z.string().nullable(),
  external_id: z.string().nullable(),
  changed_fields: z.array(z.string()),
  relation_changes: z.record(z.string(), z.number().int().nonnegative()).default({}),
  conflict_uid: z.string().nullable(),
  conflict_type: scheduleConflictTypeSchema.nullable(),
  resolution_status: scheduleConflictResolutionStatusSchema.nullable(),
  held_back: heldBackPayloadSchema.nullable(),
  show: z.object({
    id: z.string(),
    name: z.string(),
    external_id: z.string().nullable(),
    start_time: z.iso.datetime(),
    end_time: z.iso.datetime(),
    status_name: z.string().nullable(),
    status_system_key: z.string().nullable(),
    client_id: z.string().nullable(),
    client_name: z.string().nullable(),
  }),
  created_at: z.iso.datetime(),
});
```

In `packages/api-types/src/shows/types.ts`, add alongside the existing `SchedulePublishImpactRow` export:

```typescript
export type ScheduleConflictType = z.infer<typeof scheduleConflictTypeSchema>;
export type ScheduleConflictResolutionStatus = z.infer<typeof scheduleConflictResolutionStatusSchema>;
export type HeldBackPayload = z.infer<typeof heldBackPayloadSchema>;
export type ResolveScheduleConflictInput = z.infer<typeof resolveScheduleConflictSchema>;
```

(Add the corresponding imports for `scheduleConflictTypeSchema`, `scheduleConflictResolutionStatusSchema`, `heldBackPayloadSchema`, `resolveScheduleConflictSchema` from `./schemas` at the top of `types.ts`, matching the existing import block style.)

- [ ] **Step 2: Typecheck and build the package**

Run: `pnpm --filter @eridu/api-types typecheck && pnpm --filter @eridu/api-types build`
Expected: no errors. `build` matters here since `apps/erify_api` and (later) `apps/erify_studios` consume the compiled output, not the source directly — confirm the new exports actually land in `dist/`.

- [ ] **Step 3: Commit**

```bash
git add packages/api-types/src/shows/schemas.ts packages/api-types/src/shows/types.ts
git commit -m "feat(api-types): add stale_conflict schema for schedule-publish impacts"
```

---

### Task 2: `ScheduleConflictService` — open / supersede / auto-resolve

**Files:**
- Create: `apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.ts`
- Create: `apps/erify_api/src/models/schedule-conflict/schedule-conflict.module.ts`
- Create: `apps/erify_api/src/models/schedule-conflict/schedule-conflict.types.ts`
- Test: `apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.spec.ts`
- Modify: `apps/erify_api/src/models/audit/audit.repository.ts` — add `findLatestScheduleConflictForShow`
- Modify: `apps/erify_api/src/models/audit/audit.service.ts` — thin wrapper

**Interfaces:**
- Consumes: `AuditService.create()` (existing, `models/audit/audit.service.ts:35`), `AuditService.findLatestScheduleConflictForShow()` (new, this task), `UtilityService.generateBrandedId(prefix, size?)` (existing, `utility/utility.service.ts:11`), `TransactionHost<TransactionalAdapterPrisma>` for `tx.$executeRaw`.
- Produces (for Tasks 3, 4, 6): `ScheduleConflictService.reconcileShowConflict(params: ReconcileShowConflictParams): Promise<{ recorded: boolean }>` and the `ScheduleConflictHeldBack` type — both imported from `@/models/schedule-conflict/schedule-conflict.service` and `schedule-conflict.types` respectively.

- [ ] **Step 1: Write the failing test for the core reconcile logic**

Create `apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.spec.ts`:

```typescript
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';
import { Module } from '@nestjs/common';

import { ScheduleConflictService } from './schedule-conflict.service';

import { AuditService } from '@/models/audit/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UtilityService } from '@/utility/utility.service';

let mockTx: { $executeRaw: jest.Mock; showType: { findMany: jest.Mock } };
const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => callback(mockTx)),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('scheduleConflictService', () => {
  let service: ScheduleConflictService;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    mockTx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      showType: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          plugins: [new ClsPluginTransactional({ adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }), imports: [MockPrismaModule] })],
        }),
      ],
      providers: [
        ScheduleConflictService,
        { provide: AuditService, useValue: {
          create: jest.fn().mockResolvedValue({ uid: 'aud_new' }),
          findLatestScheduleConflictForShow: jest.fn().mockResolvedValue(null),
        } },
        { provide: UtilityService, useValue: { generateBrandedId: jest.fn().mockReturnValue('conflict_fresh1') } },
      ],
    }).compile();

    service = module.get(ScheduleConflictService);
    auditService = module.get(AuditService);
  });

  const baseParams = {
    showId: BigInt(1),
    scheduleUid: 'schedule_1',
    externalId: 'EXT-1',
    actorId: BigInt(9),
    conflictType: 'update_held_back' as const,
  };

  it('opens a fresh conflict when nothing is pending and something is held back', async () => {
    const heldBack = {
      showFields: { changedFields: ['name'], old: { name: 'A' }, new: { name: 'B' } },
      showCreators: [],
      showPlatforms: [],
      proposedStatusTransition: null,
    };

    const result = await service.reconcileShowConflict({ ...baseParams, heldBack });

    expect(result.recorded).toBe(true);
    expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
      action: 'OVERRIDE',
      metadata: expect.objectContaining({
        event: 'schedule_publish_impact',
        impact_kind: 'stale_conflict',
        lifecycle: 'opened',
        conflict_type: 'update_held_back',
        conflict_uid: 'conflict_fresh1',
      }),
      targets: [{ targetType: 'SHOW', targetId: BigInt(1) }],
    }));
  });

  it('does nothing when nothing is pending and nothing is held back', async () => {
    const result = await service.reconcileShowConflict({ ...baseParams, heldBack: null });

    expect(result.recorded).toBe(false);
    expect(auditService.create).not.toHaveBeenCalled();
  });

  it('auto-resolves a pending conflict as no-longer-conflicting when nothing is held back this run', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue({
      uid: 'aud_old', createdAt: new Date(), metadata: {
        event: 'schedule_publish_impact', impact_kind: 'stale_conflict', lifecycle: 'opened',
        conflict_uid: 'conflict_old1', conflict_type: 'update_held_back',
        held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
      },
    } as any);

    const result = await service.reconcileShowConflict({ ...baseParams, heldBack: null });

    expect(result.recorded).toBe(false);
    expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        lifecycle: 'resolved',
        outcome: 'auto_resolved_no_longer_conflicting',
        resolves_conflict_uid: 'conflict_old1',
      }),
    }));
  });

  it('supersedes a pending conflict and opens a fresh one when the diff changed', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue({
      uid: 'aud_old', createdAt: new Date(), metadata: {
        event: 'schedule_publish_impact', impact_kind: 'stale_conflict', lifecycle: 'opened',
        conflict_uid: 'conflict_old1', conflict_type: 'update_held_back',
        held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
      },
    } as any);

    const newHeldBack = {
      showFields: { changedFields: ['name'], old: { name: 'A' }, new: { name: 'C' } },
      showCreators: [], showPlatforms: [], proposedStatusTransition: null,
    };

    const result = await service.reconcileShowConflict({ ...baseParams, heldBack: newHeldBack });

    expect(result.recorded).toBe(true);
    expect(auditService.create).toHaveBeenCalledTimes(2);
    expect(auditService.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      metadata: expect.objectContaining({ lifecycle: 'resolved', outcome: 'superseded', resolves_conflict_uid: 'conflict_old1' }),
    }));
    expect(auditService.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      metadata: expect.objectContaining({ lifecycle: 'opened', conflict_type: 'update_held_back' }),
    }));
  });

  it('does not open a duplicate when the pending conflict has the identical diff', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue({
      uid: 'aud_old', createdAt: new Date(), metadata: {
        event: 'schedule_publish_impact', impact_kind: 'stale_conflict', lifecycle: 'opened',
        conflict_uid: 'conflict_old1', conflict_type: 'update_held_back',
        held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
      },
    } as any);

    const sameHeldBack = {
      showFields: { changedFields: ['name'], old: { name: 'A' }, new: { name: 'B' } },
      showCreators: [], showPlatforms: [], proposedStatusTransition: null,
    };

    const result = await service.reconcileShowConflict({ ...baseParams, heldBack: sameHeldBack });

    expect(result.recorded).toBe(false);
    expect(auditService.create).not.toHaveBeenCalled();
  });

  it('resolves FK-backed changed fields to uid+name at write time, never a raw id', async () => {
    mockTx.showType.findMany.mockResolvedValue([
      { id: BigInt(1), uid: 'shwtyp_1', name: 'bau' },
      { id: BigInt(2), uid: 'shwtyp_2', name: 'campaign' },
    ]);

    const heldBack = {
      showFields: {
        changedFields: ['show_type_id'],
        old: { show_type_id: BigInt(1) },
        new: { show_type_id: BigInt(2) },
      },
      showCreators: [], showPlatforms: [], proposedStatusTransition: null,
    };

    await service.reconcileShowConflict({ ...baseParams, heldBack: heldBack as any });

    const call = auditService.create.mock.calls[0][0] as any;
    expect(call.metadata.held_back.show_fields.old.show_type_id).toEqual({ uid: 'shwtyp_1', name: 'bau' });
    expect(call.metadata.held_back.show_fields.new.show_type_id).toEqual({ uid: 'shwtyp_2', name: 'campaign' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- schedule-conflict.service.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Add the repository/service query methods**

In `apps/erify_api/src/models/audit/audit.repository.ts`, add after `findSchedulePublishImpactsForStudio` (existing, ~line 206):

```typescript
  /**
   * The most recent schedule-publish-impact Audit row for a show, filtered to
   * `impact_kind: 'stale_conflict'`. Since only one conflict can be
   * unresolved per show at a time (enforced by the showId advisory lock in
   * `ScheduleConflictService`), the newest row alone tells the caller whether
   * a conflict is currently pending: `lifecycle: 'opened'` means pending,
   * `lifecycle: 'resolved'` or no row at all means not pending.
   */
  async findLatestScheduleConflictForShow(showId: bigint): Promise<AuditWithTargets | null> {
    const target = await this.txHost.tx.auditTarget.findFirst({
      where: {
        targetType: 'SHOW',
        showId,
        audit: {
          metadata: {
            path: ['event'],
            equals: 'schedule_publish_impact',
          },
        },
      },
      include: AUDIT_WITH_TARGETS_INCLUDE,
      orderBy: { audit: { createdAt: 'desc' } },
    });

    if (!target) {
      return null;
    }

    const metadata = target.audit.metadata as { impact_kind?: string } | null;
    if (metadata?.impact_kind !== 'stale_conflict') {
      return null;
    }

    return target.audit;
  }
```

In `apps/erify_api/src/models/audit/audit.service.ts`, add after `findSchedulePublishImpactsForStudio`:

```typescript
  async findLatestScheduleConflictForShow(showId: bigint): Promise<AuditWithTargets | null> {
    return this.auditRepository.findLatestScheduleConflictForShow(showId);
  }
```

(Note: `target.audit` requires `AUDIT_WITH_TARGETS_INCLUDE`'s shape — `auditTarget.findFirst` returns the target row with a nested `audit` relation because of the `include`; this matches the existing `findSchedulePublishImpactsForStudio` include usage in the same file.)

- [ ] **Step 4: Create the types file**

Create `apps/erify_api/src/models/schedule-conflict/schedule-conflict.types.ts`:

```typescript
export type HeldBackFieldValue = string | number | boolean | bigint | null | { uid: string; name: string };

export type ScheduleConflictHeldBack = {
  showFields: {
    changedFields: string[];
    old: Record<string, HeldBackFieldValue>;
    new: Record<string, HeldBackFieldValue>;
  } | null;
  showCreators: Array<{
    creatorUid: string;
    action: 'update' | 'remove';
    oldNote: string | null;
    newNote: string | null;
  }>;
  showPlatforms: Array<{
    platformUid: string;
    action: 'update' | 'remove';
    old: { liveStreamLink: string | null; platformShowId: string | null };
    new: { liveStreamLink: string | null; platformShowId: string | null };
  }>;
  proposedStatusTransition: { from: string; to: 'CANCELLED' | 'CANCELLED_PENDING_RESOLUTION' } | null;
};

export type ReconcileShowConflictParams = {
  showId: bigint;
  scheduleUid: string;
  externalId: string | null;
  actorId: bigint;
  conflictType: 'update_held_back' | 'removal_held_back';
  /** `null` means nothing was held back for this show on this publish run. */
  heldBack: ScheduleConflictHeldBack | null;
};

/** The FK-backed fields inside `show_fields` and the Prisma model each resolves against. */
export const FK_FIELD_MODEL_MAP = {
  client_id: 'client',
  studio_id: 'studio',
  studio_room_id: 'studioRoom',
  show_type_id: 'showType',
  show_status_id: 'showStatus',
  show_standard_id: 'showStandard',
} as const;
```

- [ ] **Step 5: Implement `ScheduleConflictService`**

Create `apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import { FK_FIELD_MODEL_MAP } from './schedule-conflict.types';
import type { HeldBackFieldValue, ReconcileShowConflictParams, ScheduleConflictHeldBack } from './schedule-conflict.types';

import { AuditService } from '@/models/audit/audit.service';
import type { AuditWithTargets } from '@/models/audit/schemas/audit.schema';
import { UtilityService } from '@/utility/utility.service';

const CONFLICT_UID_PREFIX = 'conflict';
const SCHEDULE_PUBLISH_IMPACT_EVENT = 'schedule_publish_impact';
const STALE_CONFLICT_IMPACT_KIND = 'stale_conflict';
const SCHEDULE_PUBLISH_SOURCE = 'google_sheets_schedule_publish';

type StaleConflictMetadata = {
  event: typeof SCHEDULE_PUBLISH_IMPACT_EVENT;
  impact_kind: typeof STALE_CONFLICT_IMPACT_KIND;
  conflict_uid: string;
  lifecycle: 'opened' | 'resolved';
  schedule_uid: string;
  external_id: string | null;
  conflict_type: 'update_held_back' | 'removal_held_back';
  held_back: {
    show_fields: { changed_fields: string[]; old: Record<string, unknown>; new: Record<string, unknown> } | null;
    show_creators: unknown[];
    show_platforms: unknown[];
    proposed_status_transition: { from: string; to: string } | null;
  };
  source: typeof SCHEDULE_PUBLISH_SOURCE;
  resolves_conflict_uid?: string;
  outcome?: 'applied' | 'dismissed' | 'superseded' | 'auto_resolved_no_longer_conflicting';
};

@Injectable()
export class ScheduleConflictService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly auditService: AuditService,
    private readonly utilityService: UtilityService,
  ) {}

  /**
   * Opens, supersedes, or auto-resolves a show's stale-conflict Audit trail
   * for the current publish run. Must run inside the publish transaction,
   * after the caller has already acquired the schedule-level advisory lock —
   * this method additionally locks on `showId` so a concurrent resolve
   * request (see `applyConflict`/`dismissConflict`) can't race the same
   * conflict_uid's read-check-then-insert (spec: "the same lock must also
   * guard publish's own reconciliation writes").
   */
  async reconcileShowConflict(params: ReconcileShowConflictParams): Promise<{ recorded: boolean }> {
    await this.lockShow(params.showId);

    const latest = await this.auditService.findLatestScheduleConflictForShow(params.showId);
    const pending = this.asPendingMetadata(latest);

    if (!params.heldBack) {
      if (pending) {
        await this.writeResolved(params.showId, pending, 'auto_resolved_no_longer_conflicting', null);
      }
      return { recorded: false };
    }

    const resolvedHeldBack = await this.resolveHeldBackLabels(params.heldBack);

    if (pending && this.sameHeldBack(pending.held_back, resolvedHeldBack)) {
      return { recorded: false };
    }

    if (pending) {
      await this.writeResolved(params.showId, pending, 'superseded', null);
    }

    await this.writeOpened(params, resolvedHeldBack);
    return { recorded: true };
  }

  /** Called by the resolve endpoint. See Task 6 for `applyConflict`/`dismissConflict`. */

  private async lockShow(showId: bigint): Promise<void> {
    const tx = this.txHost.tx;
    if (typeof tx.$executeRaw === 'function') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${showId})`;
    }
  }

  private asPendingMetadata(audit: AuditWithTargets | null): StaleConflictMetadata | null {
    if (!audit) {
      return null;
    }
    const metadata = audit.metadata as unknown as StaleConflictMetadata;
    return metadata.lifecycle === 'opened' ? metadata : null;
  }

  private async writeOpened(
    params: ReconcileShowConflictParams,
    heldBack: StaleConflictMetadata['held_back'],
  ): Promise<void> {
    const conflictUid = this.utilityService.generateBrandedId(CONFLICT_UID_PREFIX);
    const metadata: StaleConflictMetadata = {
      event: SCHEDULE_PUBLISH_IMPACT_EVENT,
      impact_kind: STALE_CONFLICT_IMPACT_KIND,
      conflict_uid: conflictUid,
      lifecycle: 'opened',
      schedule_uid: params.scheduleUid,
      external_id: params.externalId,
      conflict_type: params.conflictType,
      held_back: heldBack,
      source: SCHEDULE_PUBLISH_SOURCE,
    };

    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: params.actorId,
      reason: null,
      metadata: metadata as unknown as Record<string, unknown>,
      targets: [{ targetType: 'SHOW', targetId: params.showId }],
    });
  }

  private async writeResolved(
    showId: bigint,
    pending: StaleConflictMetadata,
    outcome: 'applied' | 'dismissed' | 'superseded' | 'auto_resolved_no_longer_conflicting',
    resolution: { actorId: bigint; reason: string } | null,
  ): Promise<void> {
    const metadata: StaleConflictMetadata = {
      ...pending,
      lifecycle: 'resolved',
      resolves_conflict_uid: pending.conflict_uid,
      outcome,
    };

    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: resolution?.actorId ?? null,
      reason: resolution?.reason ?? null,
      metadata: metadata as unknown as Record<string, unknown>,
      targets: [{ targetType: 'SHOW', targetId: showId }],
    });
  }

  private sameHeldBack(a: StaleConflictMetadata['held_back'], b: StaleConflictMetadata['held_back']): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Resolves every FK-backed field in `held_back.show_fields` to `{uid, name}`
   * before it's written into `Audit.metadata` — this must happen at write
   * time since the API later serializes the stored JSON directly (spec line 64).
   */
  private async resolveHeldBackLabels(heldBack: ScheduleConflictHeldBack): Promise<StaleConflictMetadata['held_back']> {
    const showFields = heldBack.showFields
      ? {
          changed_fields: heldBack.showFields.changedFields,
          old: await this.resolveFieldRecord(heldBack.showFields.changedFields, heldBack.showFields.old),
          new: await this.resolveFieldRecord(heldBack.showFields.changedFields, heldBack.showFields.new),
        }
      : null;

    return {
      show_fields: showFields,
      show_creators: heldBack.showCreators.map((c) => ({
        creator_uid: c.creatorUid,
        action: c.action,
        old_note: c.oldNote,
        new_note: c.newNote,
      })),
      show_platforms: heldBack.showPlatforms.map((p) => ({
        platform_uid: p.platformUid,
        action: p.action,
        old: { live_stream_link: p.old.liveStreamLink, platform_show_id: p.old.platformShowId },
        new: { live_stream_link: p.new.liveStreamLink, platform_show_id: p.new.platformShowId },
      })),
      proposed_status_transition: heldBack.proposedStatusTransition,
    };
  }

  private async resolveFieldRecord(
    changedFields: string[],
    values: Record<string, HeldBackFieldValue>,
  ): Promise<Record<string, unknown>> {
    const fkFields = changedFields.filter((field): field is keyof typeof FK_FIELD_MODEL_MAP => field in FK_FIELD_MODEL_MAP);
    const labelsByField = new Map<string, Map<bigint, { uid: string; name: string }>>();

    await Promise.all(fkFields.map(async (field) => {
      const model = FK_FIELD_MODEL_MAP[field];
      const id = values[field];
      if (typeof id !== 'bigint') {
        return;
      }
      const delegate = (this.txHost.tx as any)[model];
      const rows: Array<{ id: bigint; uid: string; name: string }> = await delegate.findMany({
        where: { id },
        select: { id: true, uid: true, name: true },
      });
      const map = new Map(rows.map((r) => [r.id, { uid: r.uid, name: r.name }]));
      labelsByField.set(field, map);
    }));

    const resolved: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(values)) {
      if (field in FK_FIELD_MODEL_MAP && typeof value === 'bigint') {
        resolved[field] = labelsByField.get(field)?.get(value) ?? null;
      } else {
        resolved[field] = value;
      }
    }
    return resolved;
  }
}
```

Note: `resolveFieldRecord` does one query per changed FK field per side (old/new share the same batched lookup since both ids are queried together — actually as written each side calls `resolveFieldRecord` separately, issuing two queries for the same field if both old and new are FK-backed. Given held-back conflicts are rare (spec: "narrow, real-world-rare"), this is acceptable; if it ever shows up in profiling, batch old+new ids into one query per field — not needed now, YAGNI).

- [ ] **Step 6: Create the module**

Create `apps/erify_api/src/models/schedule-conflict/schedule-conflict.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { ScheduleConflictService } from './schedule-conflict.service';

import { AuditModule } from '@/models/audit/audit.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, AuditModule, UtilityModule],
  providers: [ScheduleConflictService],
  exports: [ScheduleConflictService],
})
export class ScheduleConflictModule {}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter erify_api test -- schedule-conflict.service.spec.ts`
Expected: PASS (all 6 cases)

- [ ] **Step 8: Lint and typecheck**

Run: `pnpm --filter erify_api lint && pnpm --filter erify_api typecheck`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add apps/erify_api/src/models/schedule-conflict apps/erify_api/src/models/audit/audit.repository.ts apps/erify_api/src/models/audit/audit.service.ts
git commit -m "feat(erify_api): add ScheduleConflictService for open/supersede/auto-resolve"
```

---

### Task 3: `toUpdate` — actuals-gated field + relation hold-back

**Files:**
- Modify: `apps/erify_api/src/schedule-planning/publishing.service.ts`
- Modify: `apps/erify_api/src/schedule-planning/publishing.types.ts`
- Modify: `apps/erify_api/src/schedule-planning/schedule-planning.module.ts` — import `ScheduleConflictModule`
- Test: `apps/erify_api/src/schedule-planning/publishing.service.spec.ts`

**Interfaces:**
- Consumes: `ScheduleConflictService.reconcileShowConflict()` (Task 2), `ScheduleConflictHeldBack` / `HeldBackFieldValue` types (Task 2).
- Produces (for Task 4): the `staleConflictCandidates` collection pattern and the `scheduleConflictService` wiring in `publishing.service.spec.ts` — Task 4 extends the same finalize loop, it does not re-derive it. `PublishingRelationSyncService.syncShowRelations()`'s signature is **not** touched by this task — that's Task 4's job. This task calls it exactly as it exists today (3 args, returns `Map<bigint, ShowRelationSyncChanges>` directly, no destructuring), so relation-level hold-back is not yet gated after this task — only field-level.

All new tests in this task are added as `it(...)` blocks **inside the existing `describe('publish', ...)` block** (starts at `publishing.service.spec.ts:344`), not a new top-level describe — every existing test in that block already relies on its `beforeEach` (lines 349-421) for the default UID-map/relation mocks, and the existing precedent tests for the update path (e.g. `'should update a future confirmed show and write a publish impact audit'`, line 703) show the exact pattern to copy: narrow `mockPlanDocument` to one show via a `singleShowSchedule` override, then `mockTransactionClient.show.findMany.mockReset().mockResolvedValueOnce([existingShow]).mockResolvedValueOnce([existingShow])`.

- [ ] **Step 1: Write the failing regression test — past+no-actuals still syncs fully (bug fix)**

Add inside `describe('publish', ...)`, after the existing `'should preserve overnight shows...'` test (line 701):

```typescript
    it('applies a field diff on a past DRAFT show with no recorded actuals (bug-fix regression)', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const pastShowNoActuals = {
        id: BigInt(110),
        uid: 'show_past_no_actuals',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Name',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: { systemKey: 'DRAFT' },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [mockPlanDocument.shows[0]!] },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([pastShowNoActuals])
        .mockResolvedValueOnce([pastShowNoActuals]);

      const result = await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: BigInt(110) },
        data: expect.objectContaining({ name: 'Test Show 1' }),
      }));
      expect(result.publishSummary.shows_updated).toBe(1);
      expect(result.publishSummary.shows_preserved).toBe(0);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- publishing.service.spec.ts -t "applies a field diff on a past DRAFT show"`
Expected: FAIL — today's code preserves the show untouched (`isExistingPastOrDone` skips it via the date check), so `show.update` is never called and `shows_preserved` is `1`, not `0`.

- [ ] **Step 3: Add `actualStartTime`/`actualEndTime` to the selects and split the helper**

In `publishing.service.ts`, update both `currentScheduleShows` and `matchingShows` selects (existing, ~lines 173-194 and 208-229) to add two fields to each `select` block:

```typescript
        actualStartTime: true,
        actualEndTime: true,
```

(Insert right after `metadata: true,` in both selects.)

Replace `isExistingPastOrDone` (existing, ~lines 677-685) with two named helpers:

```typescript
  private isTerminalStatus(show: ExistingShow, preservedStatusKeys: Set<string>): boolean {
    const statusKey = show.showStatus.systemKey;
    return statusKey !== null && preservedStatusKeys.has(statusKey);
  }

  private hasRecordedActuals(show: ExistingShow): boolean {
    return show.actualStartTime !== null || show.actualEndTime !== null;
  }
```

Update `ExistingShow` in `publishing.types.ts` (existing, ~lines 23-42) to add:

```typescript
  actualStartTime: Date | null;
  actualEndTime: Date | null;
```

(Insert after `metadata: unknown;`.)

`isIncomingPastOrDone` (creatableShows' skip, out of scope per spec) and `isBeforePublishDate` itself stay unchanged — only the `toUpdate`/`toRemove` call sites change in the next steps.

- [ ] **Step 4: Rewrite the `toUpdate` loop's terminal-status guard and field-diff tracking (no gating yet)**

Replace the `toUpdate` loop's opening guard and field-diff application (existing, lines 372-461) — keep everything from `const updateData` computation as-is, but change the guard from `isExistingPastOrDone` to `isTerminalStatus` and start tracking old/new field values (still writing unconditionally at this step — the actuals gate lands in Step 7):

```typescript
    for (const pair of toUpdate) {
      const { incoming, existing } = pair;

      if (this.isTerminalStatus(existing, UPDATE_PRESERVED_STATUS_KEYS)) {
        publishSummary.shows_preserved += 1;
        continue;
      }

      incomingByShowId.set(existing.id, incoming);

      const updateData: Record<string, unknown> = {};
      const changedFields: string[] = [];
      const oldFieldValues: Record<string, HeldBackFieldValue> = {};
      const newFieldValues: Record<string, HeldBackFieldValue> = {};

      const trackChange = (field: string, oldValue: HeldBackFieldValue, newValue: HeldBackFieldValue, updateKey: string, updateValue: unknown) => {
        updateData[updateKey] = updateValue;
        changedFields.push(field);
        oldFieldValues[field] = oldValue;
        newFieldValues[field] = newValue;
      };

      if (existing.name !== incoming.source.name) {
        trackChange('name', existing.name, incoming.source.name, 'name', incoming.source.name);
      }

      const incomingStart = new Date(incoming.source.startTime);
      if (existing.startTime.getTime() !== incomingStart.getTime()) {
        trackChange('start_time', existing.startTime.toISOString(), incomingStart.toISOString(), 'startTime', incomingStart);
      }

      const incomingEnd = new Date(incoming.source.endTime);
      if (existing.endTime.getTime() !== incomingEnd.getTime()) {
        trackChange('end_time', existing.endTime.toISOString(), incomingEnd.toISOString(), 'endTime', incomingEnd);
      }

      if (existing.clientId !== incoming.clientId) {
        trackChange('client_id', existing.clientId, incoming.clientId, 'clientId', incoming.clientId);
      }

      if (existing.scheduleId !== schedule.id) {
        updateData.scheduleId = schedule.id;
        changedFields.push('schedule_id');
      }

      if (existing.studioId !== incoming.studioId) {
        trackChange('studio_id', existing.studioId, incoming.studioId, 'studioId', incoming.studioId);
      }

      if (existing.studioRoomId !== incoming.studioRoomId) {
        trackChange('studio_room_id', existing.studioRoomId, incoming.studioRoomId, 'studioRoomId', incoming.studioRoomId);
      }

      if (existing.showTypeId !== incoming.showTypeId) {
        trackChange('show_type_id', existing.showTypeId, incoming.showTypeId, 'showTypeId', incoming.showTypeId);
      }

      if (existing.showStatusId !== incoming.showStatusId) {
        trackChange('show_status_id', existing.showStatusId, incoming.showStatusId, 'showStatusId', incoming.showStatusId);
      }

      if (existing.showStandardId !== incoming.showStandardId) {
        trackChange('show_standard_id', existing.showStandardId, incoming.showStandardId, 'showStandardId', incoming.showStandardId);
      }

      const incomingMetadata = incoming.source.metadata || {};
      if (JSON.stringify(existing.metadata || {}) !== JSON.stringify(incomingMetadata)) {
        updateData.metadata = incomingMetadata;
        changedFields.push('metadata');
        oldFieldValues.metadata = JSON.stringify(existing.metadata || {});
        newFieldValues.metadata = JSON.stringify(incomingMetadata);
      }

      const wasDeleted = existing.deletedAt !== null;
      const wasCancelled = existing.showStatus.systemKey === 'CANCELLED'
        || existing.showStatus.systemKey === 'CANCELLED_PENDING_RESOLUTION';

      if (wasDeleted) {
        updateData.deletedAt = null;
        changedFields.push('deleted_at');
      }

      const timeChanged = updateData.startTime !== undefined || updateData.endTime !== undefined;

      if (Object.keys(updateData).length > 0) {
        await tx.show.update({
          where: { id: existing.id },
          data: updateData,
        });
        publishSummary.shows_updated += 1;
      }

      if (this.isConfirmedFuture(existing, publishStartedAt)) {
        confirmedFutureUpdates.set(existing.id, { existing, incoming, changedFields });
      }

      if (wasDeleted || wasCancelled) {
        publishSummary.shows_restored += 1;
      }

      if (wasCancelled) {
        await this.resumeSoftDeletedTasksAndTargets(existing.id);
      }

      if (timeChanged) {
        const count = await this.taskService.reconcileTaskDueDates(
          existing.id,
          { startTime: existing.startTime, endTime: existing.endTime },
          { startTime: incomingStart, endTime: incomingEnd },
        );
        publishSummary.tasks_reconciled = (publishSummary.tasks_reconciled || 0) + count;
      }
    }
```

Note: at this point every show still writes unconditionally once it clears the terminal-status guard — `oldFieldValues`/`newFieldValues` are tracked but nothing reads them yet, and `changedFields`/`timeChanged` behave exactly as before. This step is intentionally not yet a green/red TDD step on its own; Step 5 confirms it hasn't broken the bug-fix regression test, and Step 6 introduces the next red test that this step's code does *not* yet satisfy.

Add `HeldBackFieldValue` to the imports at the top of `publishing.service.ts` (used by `oldFieldValues`/`newFieldValues`'s type annotations — add those two `Record<string, HeldBackFieldValue>` declarations right after `const changedFields: string[] = [];` inside the loop, populated by the existing `if (existing.X !== incoming.X)` blocks the same way `changedFields.push(...)` already is — one assignment per branch, e.g. `oldFieldValues.name = existing.name; newFieldValues.name = incoming.source.name;` alongside each existing `changedFields.push('name')` call, for every field: `name`, `start_time`, `end_time`, `client_id`, `studio_id`, `studio_room_id`, `show_type_id`, `show_status_id`, `show_standard_id`, `metadata` — `schedule_id` and `deleted_at` are excluded, they're bookkeeping fields never shown to a planner):

```typescript
import type { HeldBackFieldValue } from '@/models/schedule-conflict/schedule-conflict.types';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- publishing.service.spec.ts -t "applies a field diff on a past DRAFT show"`
Expected: PASS

- [ ] **Step 6: Write the failing test — actuals-populated show should hold back the field diff instead of writing it**

Add inside `describe('publish', ...)`, after the test from Step 1:

```typescript
    it('holds back a field diff on a past DRAFT show with recorded actuals instead of writing it', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const pastShowWithActuals = {
        id: BigInt(111),
        uid: 'show_past_with_actuals',
        externalId: 'show_temp_1',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Name',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: new Date('2024-01-01T10:05:00Z'),
        actualEndTime: new Date('2024-01-01T12:00:00Z'),
        showStatus: { systemKey: 'DRAFT' },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [mockPlanDocument.shows[0]!] },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([pastShowWithActuals])
        .mockResolvedValueOnce([pastShowWithActuals]);

      await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.show.update).not.toHaveBeenCalledWith(expect.objectContaining({
        where: { id: BigInt(111) },
      }));
      expect(scheduleConflictService.reconcileShowConflict).toHaveBeenCalledWith(expect.objectContaining({
        showId: BigInt(111),
        conflictType: 'update_held_back',
        heldBack: expect.objectContaining({
          showFields: expect.objectContaining({ changedFields: expect.arrayContaining(['name']) }),
        }),
      }));
    });
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- publishing.service.spec.ts -t "holds back a field diff on a past DRAFT show"`
Expected: FAIL — two failures: `show.update` **was** called (Step 4's code writes unconditionally), and `scheduleConflictService` doesn't exist yet in the spec file's scope (`ReferenceError`), since nothing injects `ScheduleConflictService` until this step's implementation lands. Confirm the failure is for these reasons, not a typo.

- [ ] **Step 8: Gate the write on actuals, wire `ScheduleConflictService`, and add the finalize pass**

In `publishing.service.ts`, add the candidate-collection map right before the `toUpdate` loop (existing, ~line 372):

```typescript
    const staleConflictCandidates = new Map<bigint, {
      externalId: string | null;
      heldBackFields: { changedFields: string[]; old: Record<string, HeldBackFieldValue>; new: Record<string, HeldBackFieldValue> } | null;
    }>();
    const terminalShowIds = new Set<bigint>();

    for (const pair of toUpdate) {
```

Add `terminalShowIds.add(existing.id);` inside the terminal-status branch, right after `publishSummary.shows_preserved += 1;`.

Replace the write section from Step 4 (`if (Object.keys(updateData).length > 0) { ... }` through the end of the loop body) with:

```typescript
      const heldBackFields = changedFields.length > 0
        ? { changedFields: [...changedFields], old: oldFieldValues, new: newFieldValues }
        : null;

      if (this.hasRecordedActuals(existing) && changedFields.length > 0) {
        // Hold back — do not write. Recorded via staleConflictCandidates below,
        // once every show in toUpdate has been visited.
        staleConflictCandidates.set(existing.id, {
          externalId: incoming.source.externalId,
          heldBackFields,
        });
        continue;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.show.update({
          where: { id: existing.id },
          data: updateData,
        });
        publishSummary.shows_updated += 1;
      }

      if (this.isConfirmedFuture(existing, publishStartedAt)) {
        confirmedFutureUpdates.set(existing.id, { existing, incoming, changedFields });
      }

      if (wasDeleted || wasCancelled) {
        publishSummary.shows_restored += 1;
      }

      if (wasCancelled) {
        await this.resumeSoftDeletedTasksAndTargets(existing.id);
      }

      if (timeChanged) {
        const count = await this.taskService.reconcileTaskDueDates(
          existing.id,
          { startTime: existing.startTime, endTime: existing.endTime },
          { startTime: incomingStart, endTime: incomingEnd },
        );
        publishSummary.tasks_reconciled = (publishSummary.tasks_reconciled || 0) + count;
      }
    }
```

A held-back show still reaches `incomingByShowId.set(existing.id, incoming)` (unchanged, above the guard) so relation sync still runs for it — matching spec line 90 ("relation sync always runs; gated per-row inside it"). It does **not** get `isConfirmedFuture`/task-reconcile/restore bookkeeping, since those only make sense for a write that actually happened.

Immediately after the existing `syncShowRelations` call (existing, ~line 553-557 — **do not change this call's signature or return handling in this task**, it stays exactly as it is today: `const relationChangesByShowId = await this.relationSyncService.syncShowRelations(incomingByShowId, uidMaps, publishSummary);`), add the finalize pass:

```typescript
    for (const [showId, candidate] of staleConflictCandidates.entries()) {
      const heldBack: ScheduleConflictHeldBack | null = candidate.heldBackFields
        ? {
            showFields: candidate.heldBackFields,
            showCreators: [],
            showPlatforms: [],
            proposedStatusTransition: null,
          }
        : null;

      const { recorded } = await this.scheduleConflictService.reconcileShowConflict({
        showId,
        scheduleUid: schedule.uid,
        externalId: candidate.externalId,
        actorId: userId,
        conflictType: 'update_held_back',
        heldBack,
      });
      if (recorded) {
        publishSummary.publish_impacts_recorded += 1;
      }
    }

    for (const showId of terminalShowIds) {
      await this.scheduleConflictService.reconcileShowConflict({
        showId,
        scheduleUid: schedule.uid,
        externalId: null,
        actorId: userId,
        conflictType: 'update_held_back',
        heldBack: null,
      });
    }
```

`showCreators`/`showPlatforms` are hardcoded to `[]` here — Task 4 replaces this block to merge in the real relation-level hold-back once `syncShowRelations` returns it. That's the only thing Task 4 changes about this finalize pass.

Inject `ScheduleConflictService` into `PublishingService`'s constructor (existing, ~lines 49-58):

```typescript
    private readonly scheduleConflictService: ScheduleConflictService,
```

Add the imports:

```typescript
import { ScheduleConflictService } from '@/models/schedule-conflict/schedule-conflict.service';
import type { ScheduleConflictHeldBack } from '@/models/schedule-conflict/schedule-conflict.types';
```

Add `ScheduleConflictModule` to `apps/erify_api/src/schedule-planning/schedule-planning.module.ts`'s `imports` array.

In `publishing.service.spec.ts`: add `let scheduleConflictService: jest.Mocked<ScheduleConflictService>;` next to the other `let ...: jest.Mocked<...>;` declarations (~line 67), add to the outer `beforeEach`'s provider list (~line 309, next to the `AuditService` provider):

```typescript
        {
          provide: ScheduleConflictService,
          useValue: {
            reconcileShowConflict: jest.fn().mockResolvedValue({ recorded: false }),
          },
        },
```

and assign it right after `auditService = module.get(AuditService);` (~line 320):

```typescript
    scheduleConflictService = module.get(ScheduleConflictService);
```

- [ ] **Step 9: Run both tests to verify they pass**

Run: `pnpm --filter erify_api test -- publishing.service.spec.ts`
Expected: PASS — including every pre-existing test in the file (this task edits shared loop structure, so the full file is the real regression gate, not just the two new tests).

- [ ] **Step 10: Lint and typecheck**

Run: `pnpm --filter erify_api lint && pnpm --filter erify_api typecheck`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add apps/erify_api/src/schedule-planning apps/erify_api/src/models/schedule-conflict
git commit -m "feat(erify_api): actuals-gate toUpdate field diffs, fix past-DRAFT sync bug"
```

---

### Task 4: Relation sync actuals gating + `toRemove` hold-back + active-task-check refactor

**Files:**
- Modify: `apps/erify_api/src/schedule-planning/publishing-relation-sync.service.ts`
- Modify: `apps/erify_api/src/schedule-planning/publishing.service.ts`
- Modify: `apps/erify_api/src/schedule-planning/publishing.types.ts`
- Modify: `apps/erify_api/src/schedule-planning/schedule-planning.module.ts` — import `TaskTargetModule`
- Test: `apps/erify_api/src/schedule-planning/publishing.service.spec.ts`

**Interfaces:**
- Consumes: `TaskTargetService.countActiveByShowId(showId: bigint): Promise<number>` (existing, `models/task-target/task-target.service.ts:39`), `ScheduleConflictService.reconcileShowConflict()` (Task 2).
- Produces: `PublishingRelationSyncService.syncShowRelations()`'s final signature — `(incomingByShowId, uidMaps, summary, showActualsById: Map<bigint, boolean>) => Promise<{ relationChangesByShowId: Map<bigint, ShowRelationSyncChanges>; heldBackRelationsByShowId: Map<bigint, { showCreators: ScheduleConflictHeldBack['showCreators']; showPlatforms: ScheduleConflictHeldBack['showPlatforms'] }> }>` — this is the real signature Task 3's stub anticipated.

- [ ] **Step 1: Write the failing test — show-level actuals fallback gates a creator with no actuals of its own**

Add inside `describe('publish', ...)` in `publishing.service.spec.ts`. Use `mockPlanDocument.shows[1]` (`externalId: 'show_temp_2'`, `name: 'Test Show 2'`, `creators: []`) as the incoming side and give the existing-show fixture the **identical** name/start/end so there is no field-level diff — this test isolates the relation-level gate from Task 3's field-level one:

```typescript
    it('holds back a creator removal when the row has no actuals but the parent Show does', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const showWithActuals = {
        id: BigInt(112),
        uid: 'show_past_relation',
        externalId: 'show_temp_2',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Test Show 2',
        startTime: new Date('2024-01-02T10:00:00Z'),
        endTime: new Date('2024-01-02T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: new Date('2024-01-02T10:05:00Z'),
        actualEndTime: new Date('2024-01-02T12:00:00Z'),
        showStatus: { systemKey: 'DRAFT' },
      };
      const singleShowSchedule = {
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [mockPlanDocument.shows[1]!] },
      };

      getScheduleByIdMock.mockResolvedValue(singleShowSchedule);
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([showWithActuals])
        .mockResolvedValueOnce([showWithActuals]);
      mockTransactionClient.showCreator.findMany.mockReset().mockResolvedValueOnce([
        { id: BigInt(200), showId: BigInt(112), creatorId: BigInt(1), note: 'Backup host', metadata: {}, deletedAt: null, actualStartTime: null, actualEndTime: null },
      ]);

      await service.publish(scheduleUid, version, userId);

      expect(mockTransactionClient.showCreator.updateMany).not.toHaveBeenCalled();
      expect(scheduleConflictService.reconcileShowConflict).toHaveBeenCalledWith(expect.objectContaining({
        showId: BigInt(112),
        conflictType: 'update_held_back',
        heldBack: expect.objectContaining({
          showCreators: expect.arrayContaining([
            expect.objectContaining({ action: 'remove' }),
          ]),
        }),
      }));
    });
```

(The outer `beforeEach`'s default `mockTransactionClient.creator.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'creator_test123' }])`, line 408, already covers the `creatorId: BigInt(1)` used above — this task's new lookup query inside `syncShowRelations`, Step 5 below, reuses the same mock since it's a persistent `mockResolvedValue`, not a one-shot. No extra mock needed for this test.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- publishing.service.spec.ts -t "holds back a creator removal"`
Expected: FAIL — today's (post-Task-3) `syncCreatorsForShow` still soft-deletes the stale creator unconditionally (`showCreator.updateMany` **is** called), and `scheduleConflictService.reconcileShowConflict` is never called for this show at all — Task 3's finalize pass only calls it for shows with a field-level diff, and this fixture has none.

- [ ] **Step 3: Add `actualStartTime`/`actualEndTime` to the relation-sync selects**

In `publishing-relation-sync.service.ts`, add to both `existingShowCreators` and `existingShowPlatforms` selects (existing, ~lines 36-59):

```typescript
        actualStartTime: true,
        actualEndTime: true,
```

- [ ] **Step 4: Rewrite `syncShowRelations` to accept show-level actuals and return held-back detail**

Replace the full method (existing, lines 23-99):

```typescript
  async syncShowRelations(
    incomingByShowId: Map<bigint, DiffIncomingShow>,
    uidMaps: PublishingUidMaps,
    summary: PublishScheduleSummary,
    showActualsById: Map<bigint, boolean>,
  ): Promise<{
      relationChangesByShowId: Map<bigint, ShowRelationSyncChanges>;
      heldBackRelationsByShowId: Map<bigint, HeldBackRelations>;
    }> {
    const tx = this.txHost.tx;
    const showIds = Array.from(incomingByShowId.keys());
    const relationChangesByShowId = new Map<bigint, ShowRelationSyncChanges>();
    const heldBackRelationsByShowId = new Map<bigint, HeldBackRelations>();

    if (showIds.length === 0) {
      return { relationChangesByShowId, heldBackRelationsByShowId };
    }

    const existingShowCreators = await tx.showCreator.findMany({
      where: { showId: { in: showIds } },
      select: {
        id: true, showId: true, creatorId: true, note: true, metadata: true, deletedAt: true,
        actualStartTime: true, actualEndTime: true,
      },
    });

    const existingShowPlatforms = await tx.showPlatform.findMany({
      where: { showId: { in: showIds } },
      select: {
        id: true, showId: true, platformId: true, liveStreamLink: true, platformShowId: true,
        metadata: true, deletedAt: true, actualStartTime: true, actualEndTime: true,
      },
    });

    // Resolved from the *existing* rows, not `uidMaps` (which is built only from
    // creators/platforms referenced in the incoming plan) — a held-back removal's
    // creator/platform may not appear in the incoming payload at all, so its uid
    // would never be resolvable from `uidMaps`.
    const existingCreatorIds = Array.from(new Set(existingShowCreators.map((row) => row.creatorId)));
    const existingPlatformIds = Array.from(new Set(existingShowPlatforms.map((row) => row.platformId)));
    const [creatorUidRows, platformUidRows] = await Promise.all([
      existingCreatorIds.length > 0
        ? tx.creator.findMany({ where: { id: { in: existingCreatorIds } }, select: { id: true, uid: true } })
        : Promise.resolve([]),
      existingPlatformIds.length > 0
        ? tx.platform.findMany({ where: { id: { in: existingPlatformIds } }, select: { id: true, uid: true } })
        : Promise.resolve([]),
    ]);
    const creatorUidById = new Map(creatorUidRows.map((row) => [row.id, row.uid]));
    const platformUidById = new Map(platformUidRows.map((row) => [row.id, row.uid]));

    const showCreatorByShowId = new Map<bigint, typeof existingShowCreators>();
    existingShowCreators.forEach((row) => {
      const list = showCreatorByShowId.get(row.showId) || [];
      list.push(row);
      showCreatorByShowId.set(row.showId, list);
    });

    const showPlatformByShowId = new Map<bigint, typeof existingShowPlatforms>();
    existingShowPlatforms.forEach((row) => {
      const list = showPlatformByShowId.get(row.showId) || [];
      list.push(row);
      showPlatformByShowId.set(row.showId, list);
    });

    for (const [showId, incoming] of incomingByShowId.entries()) {
      const showChanges = this.createEmptyChanges();
      relationChangesByShowId.set(showId, showChanges);
      const heldBack: HeldBackRelations = { showCreators: [], showPlatforms: [] };
      heldBackRelationsByShowId.set(showId, heldBack);
      const showActualsPopulated = showActualsById.get(showId) ?? false;

      await this.syncCreatorsForShow({
        showId,
        incoming,
        uidMaps,
        summary,
        changes: showChanges,
        heldBack,
        showActualsPopulated,
        existingCreators: showCreatorByShowId.get(showId) || [],
        creatorUidById,
      });

      await this.syncPlatformsForShow({
        showId,
        incoming,
        uidMaps,
        summary,
        changes: showChanges,
        heldBack,
        showActualsPopulated,
        existingPlatforms: showPlatformByShowId.get(showId) || [],
        platformUidById,
      });
    }

    return { relationChangesByShowId, heldBackRelationsByShowId };
  }
```

- [ ] **Step 5: Gate `syncCreatorsForShow`'s active-row branch on show-or-row actuals**

Replace `syncCreatorsForShow` (existing, lines 101-190):

```typescript
  private async syncCreatorsForShow(params: {
    showId: bigint;
    incoming: DiffIncomingShow;
    uidMaps: PublishingUidMaps;
    summary: PublishScheduleSummary;
    changes: ShowRelationSyncChanges;
    heldBack: HeldBackRelations;
    showActualsPopulated: boolean;
    creatorUidById: Map<bigint, string>;
    existingCreators: Array<{
      id: bigint; creatorId: bigint; note: string | null;
      deletedAt: Date | null; actualStartTime: Date | null; actualEndTime: Date | null;
    }>;
  }): Promise<void> {
    const tx = this.txHost.tx;
    const incomingCreatorById = new Map<bigint, { note: string | undefined }>();

    (params.incoming.source.creators || []).forEach((creator) => {
      const creatorInternalId = params.uidMaps.creators.get(creator.creatorId);
      if (!creatorInternalId) {
        return;
      }
      incomingCreatorById.set(creatorInternalId, { note: creator.note });
    });

    const existingCreatorById = new Map(
      params.existingCreators.map((creator) => [creator.creatorId, creator]),
    );

    for (const [creatorId, incomingCreator] of incomingCreatorById.entries()) {
      const existing = existingCreatorById.get(creatorId);

      if (!existing || existing.deletedAt) {
        // Additions and restores of a soft-deleted row always apply — nothing active to conflict with.
        if (!existing) {
          await tx.showCreator.create({
            data: {
              uid: this.showCreatorService.generateShowCreatorUid(),
              showId: params.showId, creatorId, note: incomingCreator.note, metadata: {},
            },
          });
        } else {
          await tx.showCreator.update({
            where: { id: existing.id },
            data: { deletedAt: null, note: incomingCreator.note, metadata: {} },
          });
        }
        params.summary.creator_links_added += 1;
        params.changes.creator_links_added += 1;
        continue;
      }

      if ((existing.note || null) === (incomingCreator.note || null)) {
        continue;
      }

      const rowActualsPopulated = existing.actualStartTime !== null || existing.actualEndTime !== null;
      if (params.showActualsPopulated || rowActualsPopulated) {
        params.heldBack.showCreators.push({
          creatorUid: params.creatorUidById.get(creatorId) ?? '',
          action: 'update',
          oldNote: existing.note,
          newNote: incomingCreator.note ?? null,
        });
        continue;
      }

      await tx.showCreator.update({
        where: { id: existing.id },
        data: { note: incomingCreator.note },
      });
      params.summary.creator_links_updated += 1;
      params.changes.creator_links_updated += 1;
    }

    const staleCreators = params.existingCreators
      .filter((creator) => creator.deletedAt === null && !incomingCreatorById.has(creator.creatorId));

    const staleToRemove: bigint[] = [];
    for (const creator of staleCreators) {
      const rowActualsPopulated = creator.actualStartTime !== null || creator.actualEndTime !== null;
      if (params.showActualsPopulated || rowActualsPopulated) {
        params.heldBack.showCreators.push({
          creatorUid: params.creatorUidById.get(creator.creatorId) ?? '',
          action: 'remove',
          oldNote: creator.note,
          newNote: null,
        });
        continue;
      }
      staleToRemove.push(creator.id);
    }

    if (staleToRemove.length > 0) {
      await tx.showCreator.updateMany({
        where: { id: { in: staleToRemove }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      params.summary.creator_links_removed += staleToRemove.length;
      params.changes.creator_links_removed += staleToRemove.length;
    }
  }
```

- [ ] **Step 6: Mirror the same gating in `syncPlatformsForShow`**

Apply the identical pattern to `syncPlatformsForShow` (existing, lines 192-295) — add `heldBack`, `showActualsPopulated`, `platformUidById` params, add `actualStartTime`/`actualEndTime` to the existing-platform type, gate the "has changed" branch and the stale-removal branch the same way as creators, pushing into `params.heldBack.showPlatforms` with `{ platformUid, action, old: {liveStreamLink, platformShowId}, new: {...} }` instead of writing. (Write this out in full when implementing — same shape as Step 5, substituting platform fields; don't skip writing the actual code, mirror it field-for-field.)

- [ ] **Step 7: Add `HeldBackRelations` type**

In `publishing.types.ts`, add:

```typescript
export type HeldBackRelations = {
  showCreators: Array<{
    creatorUid: string;
    action: 'update' | 'remove';
    oldNote: string | null;
    newNote: string | null;
  }>;
  showPlatforms: Array<{
    platformUid: string;
    action: 'update' | 'remove';
    old: { liveStreamLink: string | null; platformShowId: string | null };
    new: { liveStreamLink: string | null; platformShowId: string | null };
  }>;
};
```

- [ ] **Step 8: Build `showActualsById`, switch the call site to the new signature, and merge real relation hold-backs into the finalize pass**

In `publishing.service.ts`, right before the `syncShowRelations` call site (Task 3 left it as `const relationChangesByShowId = await this.relationSyncService.syncShowRelations(incomingByShowId, uidMaps, publishSummary);`), build the actuals map from the already-loaded `currentScheduleShows`/`matchingShows` (both now carry `actualStartTime`/`actualEndTime` from Step 3 of this task):

```typescript
    const showActualsById = new Map<bigint, boolean>();
    [...currentScheduleShows, ...matchingShows].forEach((show) => {
      showActualsById.set(show.id, show.actualStartTime !== null || show.actualEndTime !== null);
    });
```

Replace Task 3's call site with the new 4-arg, destructured form:

```typescript
    const { relationChangesByShowId, heldBackRelationsByShowId } = await this.relationSyncService.syncShowRelations(
      incomingByShowId,
      uidMaps,
      publishSummary,
      showActualsById,
    );
```

Then update Task 3's finalize-pass loop (the one iterating `staleConflictCandidates`) to merge in the real relation hold-backs instead of the hardcoded `[]` placeholders it shipped with:

```typescript
    for (const [showId, candidate] of staleConflictCandidates.entries()) {
      const heldBackRelations = heldBackRelationsByShowId.get(showId);
      const hasRelationHoldBack = (heldBackRelations?.showCreators.length ?? 0) > 0
        || (heldBackRelations?.showPlatforms.length ?? 0) > 0;
      const heldBack: ScheduleConflictHeldBack | null = (candidate.heldBackFields || hasRelationHoldBack)
        ? {
            showFields: candidate.heldBackFields,
            showCreators: heldBackRelations?.showCreators ?? [],
            showPlatforms: heldBackRelations?.showPlatforms ?? [],
            proposedStatusTransition: null,
          }
        : null;

      const { recorded } = await this.scheduleConflictService.reconcileShowConflict({
        showId,
        scheduleUid: schedule.uid,
        externalId: candidate.externalId,
        actorId: userId,
        conflictType: 'update_held_back',
        heldBack,
      });
      if (recorded) {
        publishSummary.publish_impacts_recorded += 1;
      }
    }
```

This still only iterates `staleConflictCandidates` — populated in the `toUpdate` loop only for shows with a field-level diff (Task 3). A show with **only** a relation-level hold-back and no field diff (exactly Step 1's test fixture) is never added to `staleConflictCandidates`, so this loop alone would miss it. Add a second pass right after it, over every show relation sync actually touched:

```typescript
    for (const [showId, heldBackRelations] of heldBackRelationsByShowId.entries()) {
      if (staleConflictCandidates.has(showId)) {
        continue; // already handled above
      }
      const hasRelationHoldBack = heldBackRelations.showCreators.length > 0 || heldBackRelations.showPlatforms.length > 0;
      if (!hasRelationHoldBack) {
        continue;
      }
      const incoming = incomingByShowId.get(showId);
      const { recorded } = await this.scheduleConflictService.reconcileShowConflict({
        showId,
        scheduleUid: schedule.uid,
        externalId: incoming?.source.externalId ?? null,
        actorId: userId,
        conflictType: 'update_held_back',
        heldBack: {
          showFields: null,
          showCreators: heldBackRelations.showCreators,
          showPlatforms: heldBackRelations.showPlatforms,
          proposedStatusTransition: null,
        },
      });
      if (recorded) {
        publishSummary.publish_impacts_recorded += 1;
      }
    }
```

- [ ] **Step 9: `toRemove` — actuals-gated cancel hold-back + active-task-check refactor**

Replace the `toRemove` loop (existing, lines 489-551):

```typescript
    for (const removed of toRemove) {
      if (this.isTerminalStatus(removed, PRESERVED_STATUS_KEYS)) {
        publishSummary.shows_preserved += 1;
        await this.scheduleConflictService.reconcileShowConflict({
          showId: removed.id, scheduleUid: schedule.uid, externalId: removed.externalId,
          actorId: userId, conflictType: 'removal_held_back', heldBack: null,
        });
        continue;
      }

      if (this.isConfirmedFuture(removed, publishStartedAt)) {
        if (removed.showStatusId !== statusIds.cancelledPendingResolution) {
          await tx.show.update({
            where: { id: removed.id },
            data: { showStatusId: statusIds.cancelledPendingResolution },
          });
        }

        publishSummary.shows_pending_resolution += 1;
        publishSummary.confirmed_shows_pending_resolution += 1;
        await this.recordSchedulePublishImpact({
          schedule, showId: removed.id, actorId: userId, externalId: removed.externalId,
          impactKind: 'confirmed_future_pending_resolution',
          changedFields: ['show_status_id'], relationChanges: this.createEmptyRelationChanges(),
        });
        publishSummary.publish_impacts_recorded += 1;
        continue;
      }

      if (this.hasRecordedActuals(removed)) {
        const activeTaskCount = await this.taskTargetService.countActiveByShowId(removed.id);
        const proposedStatusTransition = {
          from: removed.showStatus.systemKey ?? 'DRAFT',
          to: (activeTaskCount > 0 ? 'CANCELLED_PENDING_RESOLUTION' : 'CANCELLED') as 'CANCELLED' | 'CANCELLED_PENDING_RESOLUTION',
        };

        const { recorded } = await this.scheduleConflictService.reconcileShowConflict({
          showId: removed.id, scheduleUid: schedule.uid, externalId: removed.externalId,
          actorId: userId, conflictType: 'removal_held_back',
          heldBack: {
            showFields: null, showCreators: [], showPlatforms: [],
            proposedStatusTransition,
          },
        });
        if (recorded) {
          publishSummary.publish_impacts_recorded += 1;
        }
        continue;
      }

      const activeTaskCount = await this.taskTargetService.countActiveByShowId(removed.id);
      const targetStatusId = activeTaskCount > 0
        ? statusIds.cancelledPendingResolution
        : statusIds.cancelled;

      if (removed.showStatusId !== targetStatusId) {
        await tx.show.update({
          where: { id: removed.id },
          data: { showStatusId: targetStatusId },
        });
      }

      if (activeTaskCount > 0) {
        publishSummary.shows_pending_resolution += 1;
      } else {
        publishSummary.shows_cancelled += 1;
      }
    }
```

Inject `TaskTargetService` into `PublishingService`'s constructor and add the import:

```typescript
import { TaskTargetService } from '@/models/task-target/task-target.service';
```

```typescript
    private readonly taskTargetService: TaskTargetService,
```

Add `TaskTargetModule` to `schedule-planning.module.ts`'s `imports` array.

- [ ] **Step 10: Update `publishing.service.spec.ts`'s providers and add the active-task-check regression test**

`mockTransactionClient.taskTarget.findFirst` is no longer called by the remove path (replaced by `taskTargetService.countActiveByShowId`) — leave the mock object field in place (harmless, unused) but any existing assertion against it for a *removal* scenario must move to `taskTargetService.countActiveByShowId`. `mockTransactionClient.auditTarget` is **not** needed here — `ScheduleConflictService` is mocked at the DI level in this spec file (Task 3, Step 8), so its internal `tx.auditTarget` usage is never exercised through `publishing.service.spec.ts`'s transaction mock.

Add to the `TestingModule` providers (next to the `ScheduleConflictService` provider added in Task 3):

```typescript
        {
          provide: TaskTargetService,
          useValue: {
            countActiveByShowId: jest.fn().mockResolvedValue(0),
          },
        },
```

Add `let taskTargetService: jest.Mocked<TaskTargetService>;` to the variable declarations and `taskTargetService = module.get(TaskTargetService);` in `beforeEach`, matching the pattern used for `scheduleConflictService`.

Add the regression test explicitly called out in the spec's Testing Plan — a show with only `COMPLETED`/`CLOSED` tasks is no longer treated as active work on removal — inside `describe('publish', ...)`:

```typescript
    it('does not treat a show with only COMPLETED/CLOSED tasks as having active work on removal', async () => {
      const removedDraftShow = {
        id: BigInt(113),
        uid: 'show_removed_draft',
        externalId: 'show_missing_draft',
        clientId: BigInt(1),
        scheduleId: mockSchedule.id,
        studioId: null,
        studioRoomId: BigInt(1),
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Removed Draft Show',
        startTime: new Date('2024-06-01T10:00:00Z'),
        endTime: new Date('2024-06-01T12:00:00Z'),
        metadata: {},
        deletedAt: null,
        actualStartTime: null,
        actualEndTime: null,
        showStatus: { systemKey: 'DRAFT' },
      };

      getScheduleByIdMock.mockResolvedValue({
        ...mockSchedule,
        planDocument: { ...mockPlanDocument, shows: [] },
      });
      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([removedDraftShow]);
      taskTargetService.countActiveByShowId.mockResolvedValueOnce(0);

      const result = await service.publish(scheduleUid, version, userId);

      expect(taskTargetService.countActiveByShowId).toHaveBeenCalledWith(BigInt(113));
      expect(mockTransactionClient.show.update).toHaveBeenCalledWith({
        where: { id: BigInt(113) },
        data: { showStatusId: BigInt(9001) },
      });
      expect(result.publishSummary.shows_cancelled).toBe(1);
      expect(result.publishSummary.shows_pending_resolution).toBe(0);
    });
```

(`BigInt(9001)` is the mocked `CANCELLED` status id already established by the outer `beforeEach`'s `showStatus.upsert` mock implementation, line ~397-404 — `CANCELLED_PENDING_RESOLUTION` mocks to `BigInt(9002)`. `incomingShows.length === 0` here means `matchingShows` is never queried, so only one `mockResolvedValueOnce` is needed on `show.findMany` — same pattern as the existing `'should move a missing future confirmed show to pending resolution...'` test at line 791-793.)

- [ ] **Step 11: Run the full spec file**

Run: `pnpm --filter erify_api test -- publishing.service.spec.ts`
Expected: PASS — all tests, including every pre-existing test (this task touches shared loop structure, so a full regression pass here is the real gate).

- [ ] **Step 12: Lint, typecheck, build**

Run: `pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api build`
Expected: no errors. `build` matters here — this task changes several call signatures across two files.

- [ ] **Step 13: Commit**

```bash
git add apps/erify_api/src/schedule-planning
git commit -m "feat(erify_api): actuals-gate relation sync and toRemove, fix active-task-check mismatch"
```

---

### Task 5: Re-publish reconciliation edge cases + query surface

**Files:**
- Modify: `apps/erify_api/src/models/audit/audit.repository.ts` — `findPendingStaleConflictsForStudio`
- Modify: `apps/erify_api/src/models/audit/audit.service.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts` — `listSchedulePublishImpacts`, `toSchedulePublishImpactRow`
- Test: `apps/erify_api/src/studios/studio-show/studio-show-management.service.spec.ts` (create the describe blocks if the file doesn't already test these two methods — check first)
- Test: `apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.spec.ts` — add re-publish edge-case coverage (superseded/no-duplicate already covered in Task 2; this task adds nothing new to that file, listed here only as a cross-check)

**Interfaces:**
- Consumes: nothing new beyond Task 2/4.
- Produces: `AuditService.findPendingStaleConflictsForStudio(studioUid: string, opts: {take: number; skip: number}): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }>` — used by `listSchedulePublishImpacts`.

**`studio-show-management.service.spec.ts` already exists** (it does not need creating) and uses a different convention than `publishing.service.spec.ts`: providers are plain `xMock` objects declared once at `describe` scope (e.g. `auditServiceMock`, `showRepositoryMock`, `taskServiceMock` — see lines 42-119) and referenced directly in tests, not obtained via `module.get()`. Its `mockPrismaForCls` (line 29-31) currently does `$transaction: jest.fn(async (callback) => await callback({}))` — an **empty object** as the transaction client, since no existing method in this service needs `tx` directly. Task 6 (`applyHeldBackRelations`) is the first method here that does, so this task must also upgrade that mock — see Task 6 Step 6's note.

- [ ] **Step 1: Write the failing test — default query surfaces pending stale_conflict rows regardless of date**

Add `findPendingStaleConflictsForStudio: jest.fn()` to `auditServiceMock` (line 114-119), then add the test:

```typescript
  it('returns unresolved stale_conflict rows for a past-dated show by default, alongside upcoming confirmed_future_* rows', async () => {
    const confirmedFutureFixture = {
      audit: {
        uid: 'aud_confirmed', createdAt: new Date('2026-05-01T00:00:00.000Z'), reason: null,
        metadata: {
          event: 'schedule_publish_impact', impact_kind: 'confirmed_future_updated',
          schedule_uid: 'schedule_1', external_id: 'EXT-1', changed_fields: ['name'], relation_changes: {},
        },
      },
      targetId: BigInt(1),
      show: {
        uid: 'show_1', externalId: 'EXT-1', name: 'Upcoming Show',
        startTime: new Date('2026-06-01T10:00:00.000Z'), endTime: new Date('2026-06-01T12:00:00.000Z'),
        client: { uid: 'client_1', name: 'Client' }, showStatus: { name: 'Confirmed', systemKey: 'CONFIRMED' },
      },
    };
    const staleConflictFixture = {
      audit: {
        uid: 'aud_stale', createdAt: new Date('2026-01-01T00:00:00.000Z'), reason: null,
        metadata: {
          event: 'schedule_publish_impact', impact_kind: 'stale_conflict', lifecycle: 'opened',
          conflict_uid: 'conflict_1', conflict_type: 'update_held_back', schedule_uid: 'schedule_1', external_id: 'EXT-2',
          held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
        },
      },
      targetId: BigInt(2),
      show: {
        uid: 'show_2', externalId: 'EXT-2', name: 'Past Show',
        startTime: new Date('2026-01-01T10:00:00.000Z'), endTime: new Date('2026-01-01T12:00:00.000Z'),
        client: { uid: 'client_1', name: 'Client' }, showStatus: { name: 'Draft', systemKey: 'DRAFT' },
      },
    };

    auditServiceMock.findSchedulePublishImpactsForStudio.mockResolvedValue({ items: [confirmedFutureFixture], total: 1 });
    auditServiceMock.findPendingStaleConflictsForStudio.mockResolvedValue({ items: [staleConflictFixture], total: 1 });

    const result = await service.listSchedulePublishImpacts('studio_1', {});

    expect(result.items).toHaveLength(2);
    expect(result.items.some((r) => r.impact_kind === 'stale_conflict')).toBe(true);
    expect(auditServiceMock.findPendingStaleConflictsForStudio).toHaveBeenCalledWith('studio_1', expect.objectContaining({ skip: 0, take: 25 }));
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- studio-show-management.service.spec.ts -t "stale_conflict rows for a past-dated show"`
Expected: FAIL — `findPendingStaleConflictsForStudio` doesn't exist; `listSchedulePublishImpacts` only calls `findSchedulePublishImpactsForStudio`.

- [ ] **Step 3: Add the bulk pending-conflicts query**

In `audit.repository.ts`, add after `findLatestScheduleConflictForShow` (Task 2):

```typescript
  /**
   * All shows in a studio with a currently-pending `stale_conflict` — no date
   * filter, since past-dated shows are the entire point of this kind (spec:
   * "the default (no explicit filters) view returns unresolved stale_conflict
   * rows regardless of the show's date"). Uses Prisma's `distinct` + `orderBy`
   * to get one row per show (the newest), then filters to `lifecycle: 'opened'`
   * in application code — Prisma can't express "opened with no later resolved
   * row for the same conflict_uid" as a plain relational `where`.
   */
  async findPendingStaleConflictsForStudio(
    studioUid: string,
    opts: { take: number; skip: number },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    const latestPerShow = await this.txHost.tx.auditTarget.findMany({
      where: {
        targetType: 'SHOW',
        show: { studio: { uid: studioUid }, deletedAt: null },
        audit: {
          metadata: {
            path: ['impact_kind'],
            equals: 'stale_conflict',
          },
        },
      },
      distinct: ['showId'],
      include: SCHEDULE_PUBLISH_IMPACT_INCLUDE,
      orderBy: { audit: { createdAt: 'desc' } },
    });

    const pending = latestPerShow.filter((target) => {
      const metadata = target.audit.metadata as { lifecycle?: string } | null;
      return metadata?.lifecycle === 'opened';
    });

    return {
      items: pending.slice(opts.skip, opts.skip + opts.take),
      total: pending.length,
    };
  }
```

Add the passthrough in `audit.service.ts`:

```typescript
  async findPendingStaleConflictsForStudio(
    studioUid: string,
    opts: { take: number; skip: number },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    return this.auditRepository.findPendingStaleConflictsForStudio(studioUid, opts);
  }
```

- [ ] **Step 4: Update `listSchedulePublishImpacts` to branch stale_conflict away from the date filter**

Replace `listSchedulePublishImpacts` in `studio-show-management.service.ts` (existing, lines 328-348):

```typescript
  async listSchedulePublishImpacts(
    studioUid: string,
    query: SchedulePublishImpactQuery,
  ): Promise<{ items: SchedulePublishImpactRow[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [confirmedFuture, staleConflicts] = await Promise.all([
      this.auditService.findSchedulePublishImpactsForStudio(studioUid, {
        startDateFrom: query.start_date_from ? new Date(query.start_date_from) : new Date(),
        startDateTo: query.start_date_to ? new Date(query.start_date_to) : undefined,
        skip,
        take: limit,
      }),
      this.auditService.findPendingStaleConflictsForStudio(studioUid, { skip, take: limit }),
    ]);

    return {
      items: [
        ...confirmedFuture.items.map((item) => this.toSchedulePublishImpactRow(item)),
        ...staleConflicts.items.map((item) => this.toSchedulePublishImpactRow(item)),
      ],
      total: confirmedFuture.total + staleConflicts.total,
    };
  }
```

*(Note: this pages the two kinds independently rather than merging into one true cross-kind page — acceptable given the spec's own framing of `stale_conflict` volume as narrow/rare; a combined page-accurate total would need a real merge-sort across two paginated sources, which is more complexity than this queue's actual scale justifies. Flag this as a known simplification in the PR description, not a silent gap.)*

- [ ] **Step 5: Update `toSchedulePublishImpactRow` for the `stale_conflict` branch**

Replace `toSchedulePublishImpactRow` (existing, lines 433-469):

```typescript
  private toSchedulePublishImpactRow(
    target: SchedulePublishImpactAuditTarget,
  ): SchedulePublishImpactRow {
    if (!target.show) {
      throw HttpError.notFound('Show', String(target.targetId));
    }

    const metadata = this.asRecord(target.audit.metadata);
    const isStaleConflict = metadata.impact_kind === 'stale_conflict';

    const changedFields = isStaleConflict
      ? this.staleConflictChangedFields(metadata)
      : (Array.isArray(metadata.changed_fields)
          ? metadata.changed_fields.filter((field): field is string => typeof field === 'string')
          : []);

    const relationChanges = isStaleConflict ? {} : this.numberRecord(metadata.relation_changes);

    const impactKind = isStaleConflict
      ? 'stale_conflict' as const
      : metadata.impact_kind === 'confirmed_future_pending_resolution'
        ? 'confirmed_future_pending_resolution' as const
        : 'confirmed_future_updated' as const;

    return {
      audit_id: target.audit.uid,
      impact_kind: impactKind,
      schedule_id: typeof metadata.schedule_uid === 'string' ? metadata.schedule_uid : null,
      external_id: typeof metadata.external_id === 'string' ? metadata.external_id : null,
      changed_fields: changedFields,
      relation_changes: relationChanges,
      conflict_uid: isStaleConflict && typeof metadata.conflict_uid === 'string' ? metadata.conflict_uid : null,
      conflict_type: isStaleConflict ? (metadata.conflict_type as 'update_held_back' | 'removal_held_back' | undefined) ?? null : null,
      resolution_status: isStaleConflict ? 'pending' : null,
      held_back: isStaleConflict ? (metadata.held_back as SchedulePublishImpactRow['held_back']) ?? null : null,
      show: {
        id: target.show.uid,
        name: target.show.name,
        external_id: target.show.externalId,
        start_time: target.show.startTime.toISOString(),
        end_time: target.show.endTime.toISOString(),
        status_name: target.show.showStatus.name,
        status_system_key: target.show.showStatus.systemKey,
        client_id: target.show.client.uid,
        client_name: target.show.client.name,
      },
      created_at: target.audit.createdAt.toISOString(),
    };
  }

  private staleConflictChangedFields(metadata: Record<string, unknown>): string[] {
    const heldBack = metadata.held_back as { show_fields?: { changed_fields?: unknown } } | undefined;
    const fields = heldBack?.show_fields?.changed_fields;
    return Array.isArray(fields) ? fields.filter((f): f is string => typeof f === 'string') : [];
  }
```

(`findPendingStaleConflictsForStudio`'s rows are always `resolution_status: 'pending'` by construction — that's the entire filter it applies — so hardcoding `'pending'` here is correct; a resolved stale_conflict row is never returned by this query path. `held_back` and `conflict_uid`/`conflict_type` come straight off the stored metadata since it's the same immutable snapshot the write side already resolved to UID+label at write time — Task 2, Step 5.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter erify_api test -- studio-show-management.service.spec.ts`
Expected: PASS

- [ ] **Step 7: Add the FK-serialization regression test**

```typescript
  it('round-trips an FK-backed held_back field as uid+name, never a raw bigint', async () => {
    const staleConflictFixtureWithFkField = {
      audit: {
        uid: 'aud_stale_fk', createdAt: new Date('2026-01-01T00:00:00.000Z'), reason: null,
        metadata: {
          event: 'schedule_publish_impact', impact_kind: 'stale_conflict', lifecycle: 'opened',
          conflict_uid: 'conflict_fk1', conflict_type: 'update_held_back', schedule_uid: 'schedule_1', external_id: 'EXT-3',
          held_back: {
            show_fields: {
              changed_fields: ['show_type_id'],
              old: { show_type_id: { uid: 'shwtyp_1', name: 'bau' } },
              new: { show_type_id: { uid: 'shwtyp_2', name: 'campaign' } },
            },
            show_creators: [], show_platforms: [], proposed_status_transition: null,
          },
        },
      },
      targetId: BigInt(3),
      show: {
        uid: 'show_3', externalId: 'EXT-3', name: 'Show', startTime: new Date('2026-01-01T10:00:00.000Z'), endTime: new Date('2026-01-01T12:00:00.000Z'),
        client: { uid: 'client_1', name: 'Client' }, showStatus: { name: 'Draft', systemKey: 'DRAFT' },
      },
    };

    const row = (service as any).toSchedulePublishImpactRow(staleConflictFixtureWithFkField);
    expect(row.held_back.show_fields.old.show_type_id).toEqual({ uid: 'shwtyp_1', name: 'bau' });
    expect(typeof row.held_back.show_fields.old.show_type_id).not.toBe('bigint');
    expect(typeof row.held_back.show_fields.old.show_type_id).not.toBe('number');
  });
```

Run: `pnpm --filter erify_api test -- studio-show-management.service.spec.ts`
Expected: PASS

- [ ] **Step 8: Lint, typecheck, build**

Run: `pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api build`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add apps/erify_api/src/models/audit apps/erify_api/src/studios/studio-show
git commit -m "feat(erify_api): surface stale_conflict rows in schedule-publish-impacts list"
```

---

### Task 6: Resolve endpoint — apply / dismiss

**Files:**
- Modify: `apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.ts` — `applyConflict`, `dismissConflict`
- Modify: `apps/erify_api/src/models/schedule-conflict/schedule-conflict.types.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts` — `resolveScheduleConflict`
- Create: `apps/erify_api/src/studios/studio-show/schemas/studio-show-schedule-conflict.schema.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show.controller.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show.module.ts` — import `ScheduleConflictModule`, `TaskTargetModule`
- Test: `apps/erify_api/src/models/schedule-conflict/schedule-conflict.service.spec.ts`
- Test: `apps/erify_api/src/studios/studio-show/studio-show.controller.spec.ts` (create if it doesn't already exist — check first; if controller tests live elsewhere for this file, follow that location)

**Interfaces:**
- Consumes: `TaskTargetService.countActiveByShowId` (existing), `ShowStatusService` (existing, for CANCELLED/CANCELLED_PENDING_RESOLUTION id lookup — reuse `PublishingService`'s pattern or `ShowRepository`), `TaskService.reconcileTaskDueDates` (existing).
- Produces: `POST studios/:studioId/shows/:id/schedule-publish-impacts/:conflictUid/resolve` returning the updated `SchedulePublishImpactRow`.

- [ ] **Step 1: Write the failing service tests — dismiss, apply happy path, drift, eligibility, double-resolve**

Add to `schedule-conflict.service.spec.ts`:

```typescript
describe('dismissConflict / applyConflict', () => {
  const pendingAudit = (overrides: Partial<any> = {}) => ({
    uid: 'aud_old', createdAt: new Date(), metadata: {
      event: 'schedule_publish_impact', impact_kind: 'stale_conflict', lifecycle: 'opened',
      conflict_uid: 'conflict_1', conflict_type: 'update_held_back', schedule_uid: 'schedule_1', external_id: 'EXT-1',
      held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
      source: 'google_sheets_schedule_publish',
      ...overrides,
    },
  });

  it('dismiss always writes resolved/dismissed without touching show data', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

    const result = await service.dismissConflict({ showId: BigInt(1), conflictUid: 'conflict_1', actorId: BigInt(9), reason: 'no longer needed' });

    expect(result.outcome).toBe('dismissed');
    expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
      actorId: BigInt(9), reason: 'no longer needed',
      metadata: expect.objectContaining({ lifecycle: 'resolved', outcome: 'dismissed', resolves_conflict_uid: 'conflict_1' }),
    }));
  });

  it('dismiss throws CONFLICT_ALREADY_RESOLVED for an unknown or already-resolved conflict_uid', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue(null);
    await expect(service.dismissConflict({ showId: BigInt(1), conflictUid: 'conflict_1', actorId: BigInt(9), reason: 'x' }))
      .rejects.toThrow('CONFLICT_ALREADY_RESOLVED');
  });

  it('apply writes the snapshot new values and resolved/applied when current DB state matches the snapshot old values', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

    const result = await service.applyConflict({
      showId: BigInt(1), conflictUid: 'conflict_1', actorId: BigInt(9), reason: 'planner override',
      currentShowStatus: 'DRAFT', currentFieldValues: { name: 'A' },
    });

    expect(result.outcome).toBe('applied');
    expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ lifecycle: 'resolved', outcome: 'applied' }),
    }));
  });

  it('apply rejects with CONFLICT_STATE_CHANGED when current DB state has drifted from the snapshot', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

    await expect(service.applyConflict({
      showId: BigInt(1), conflictUid: 'conflict_1', actorId: BigInt(9), reason: 'x',
      currentShowStatus: 'DRAFT', currentFieldValues: { name: 'SOMETHING ELSE' },
    })).rejects.toThrow('CONFLICT_STATE_CHANGED');
  });

  it('apply rejects with SHOW_NO_LONGER_ELIGIBLE and auto-resolves when the show has left scope', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit() as any);

    await expect(service.applyConflict({
      showId: BigInt(1), conflictUid: 'conflict_1', actorId: BigInt(9), reason: 'x',
      currentShowStatus: 'COMPLETED', currentFieldValues: { name: 'A' },
    })).rejects.toThrow('SHOW_NO_LONGER_ELIGIBLE');

    expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ outcome: 'auto_resolved_no_longer_conflicting' }),
      actorId: null, reason: null,
    }));
  });

  it('apply throws CONFLICT_ALREADY_RESOLVED when the conflict_uid no longer matches the pending one (double-resolve)', async () => {
    auditService.findLatestScheduleConflictForShow.mockResolvedValue(pendingAudit({ conflict_uid: 'conflict_DIFFERENT' }) as any);

    await expect(service.applyConflict({
      showId: BigInt(1), conflictUid: 'conflict_1', actorId: BigInt(9), reason: 'x',
      currentShowStatus: 'DRAFT', currentFieldValues: { name: 'A' },
    })).rejects.toThrow('CONFLICT_ALREADY_RESOLVED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- schedule-conflict.service.spec.ts -t "dismissConflict"`
Expected: FAIL — methods don't exist.

- [ ] **Step 3: Extend the types**

Add to `schedule-conflict.types.ts`:

```typescript
export type DismissConflictParams = {
  showId: bigint;
  conflictUid: string;
  actorId: bigint;
  reason: string;
};

export type ApplyConflictParams = DismissConflictParams & {
  /** Current live show status system key, for the terminal-status eligibility recheck. */
  currentShowStatus: string;
  /** Current DB values for every field in the snapshot's `show_fields.changed_fields`, keyed the same way. Empty object for a `removal_held_back` conflict with no field diff. */
  currentFieldValues: Record<string, unknown>;
};

export type ResolveConflictResult = {
  outcome: 'applied' | 'dismissed';
};

const UPDATE_TERMINAL_STATUS_KEYS = new Set(['LIVE', 'COMPLETED']);
const REMOVAL_TERMINAL_STATUS_KEYS = new Set(['LIVE', 'COMPLETED', 'CANCELLED', 'CANCELLED_PENDING_RESOLUTION']);

export function isNoLongerEligible(conflictType: 'update_held_back' | 'removal_held_back', currentShowStatus: string): boolean {
  const terminalSet = conflictType === 'removal_held_back' ? REMOVAL_TERMINAL_STATUS_KEYS : UPDATE_TERMINAL_STATUS_KEYS;
  return terminalSet.has(currentShowStatus);
}
```

- [ ] **Step 4: Implement `dismissConflict` and `applyConflict` on `ScheduleConflictService`**

Add to `schedule-conflict.service.ts`, after `reconcileShowConflict`:

```typescript
  async dismissConflict(params: DismissConflictParams): Promise<ResolveConflictResult> {
    await this.lockShow(params.showId);
    const pending = await this.requirePendingConflict(params.showId, params.conflictUid);

    await this.writeResolved(params.showId, pending, 'dismissed', { actorId: params.actorId, reason: params.reason });
    return { outcome: 'dismissed' };
  }

  async applyConflict(params: ApplyConflictParams): Promise<ResolveConflictResult> {
    await this.lockShow(params.showId);
    const pending = await this.requirePendingConflict(params.showId, params.conflictUid);

    if (isNoLongerEligible(pending.conflict_type, params.currentShowStatus)) {
      await this.writeResolved(params.showId, pending, 'auto_resolved_no_longer_conflicting', null);
      throw HttpError.conflict('SHOW_NO_LONGER_ELIGIBLE');
    }

    const snapshotOld = pending.held_back.show_fields?.old ?? {};
    const drifted = Object.entries(snapshotOld).some(([field, value]) => {
      return JSON.stringify(params.currentFieldValues[field] ?? null) !== JSON.stringify(this.unwrapForCompare(value));
    });
    if (drifted) {
      throw HttpError.conflict('CONFLICT_STATE_CHANGED');
    }

    await this.writeResolved(params.showId, pending, 'applied', { actorId: params.actorId, reason: params.reason });
    return { outcome: 'applied' };
  }

  /** FK-backed snapshot values are stored as `{uid, name}` — compare by uid, not the whole object, since the caller's `currentFieldValues` supplies a raw comparable value (uid string) for FK fields, per Task 6's controller wiring. */
  private unwrapForCompare(value: unknown): unknown {
    if (value && typeof value === 'object' && 'uid' in (value as Record<string, unknown>)) {
      return (value as { uid: string }).uid;
    }
    return value;
  }

  private async requirePendingConflict(showId: bigint, conflictUid: string): Promise<StaleConflictMetadata> {
    const latest = await this.auditService.findLatestScheduleConflictForShow(showId);
    const pending = this.asPendingMetadata(latest);
    if (!pending || pending.conflict_uid !== conflictUid) {
      throw HttpError.conflict('CONFLICT_ALREADY_RESOLVED');
    }
    return pending;
  }
```

Add the import: `import { HttpError } from '@/lib/errors/http-error.util';` and `import { isNoLongerEligible } from './schedule-conflict.types';` plus `DismissConflictParams`, `ApplyConflictParams`, `ResolveConflictResult` to the existing type import line.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter erify_api test -- schedule-conflict.service.spec.ts`
Expected: PASS (all cases, including Task 2's original 6)

- [ ] **Step 6: Upgrade the mock transaction client, then write the failing tests**

`studio-show-management.service.spec.ts`'s `mockPrismaForCls` (file top, lines 29-31) currently does `$transaction: jest.fn(async (callback) => await callback({}))` — an empty object, since no method here has needed real `tx` access before now. `applyHeldBackRelations` (Step 7) is the first one that does. Replace it with a file-scope `mockTx` object mirroring `publishing.service.spec.ts`'s pattern, reset in the outer `beforeEach`:

```typescript
let mockTx: {
  creator: { findFirst: jest.Mock };
  showCreator: { findFirst: jest.Mock; update: jest.Mock };
  platform: { findFirst: jest.Mock };
  showPlatform: { findFirst: jest.Mock; update: jest.Mock };
};

const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => await callback(mockTx)),
};
```

In the outer `beforeEach` (before `Test.createTestingModule`, line ~121), (re)assign it fresh each test:

```typescript
    mockTx = {
      creator: { findFirst: jest.fn() },
      showCreator: { findFirst: jest.fn(), update: jest.fn() },
      platform: { findFirst: jest.fn() },
      showPlatform: { findFirst: jest.fn(), update: jest.fn() },
    };
```

Also add a `scheduleConflictServiceMock` next to the other `xMock` declarations (~line 114) and its provider entry (~line 152), and a module-scope `const actorExtId = 'ext_actor1';` used by the new tests:

```typescript
  const scheduleConflictServiceMock = {
    applyConflict: jest.fn(),
    dismissConflict: jest.fn(),
  };
  const actorExtId = 'ext_actor1';
```

```typescript
        { provide: ScheduleConflictService, useValue: scheduleConflictServiceMock },
        { provide: TaskTargetService, useValue: { countActiveByShowId: jest.fn().mockResolvedValue(0) } },
```

Add `findLatestScheduleConflictForShow: jest.fn()` to `auditServiceMock` (line 114-119) alongside `findPendingStaleConflictsForStudio` (added in Task 5, Step 1).

`userServiceMock.getUserByExtId` (existing) must resolve a user for these tests — add `userServiceMock.getUserByExtId.mockResolvedValue({ id: BigInt(9), uid: 'user_1', name: 'Actor' });` to the outer `beforeEach`'s default setup if it isn't already defaulted there (check first; if individual tests already set this per-test, follow that instead).

Now add the tests, using this file's real `xMock` naming (not `module.get()` — that convention belongs to `publishing.service.spec.ts`, not this file):

```typescript
  it('calls reconcileTaskDueDates with the snapshot old/new times when applying a start_time/end_time diff', async () => {
    scheduleConflictServiceMock.applyConflict.mockResolvedValue({ outcome: 'applied' });
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(1), uid: 'show_1', showStatus: { systemKey: 'DRAFT' },
    } as any);
    auditServiceMock.findLatestScheduleConflictForShow.mockResolvedValue({
      metadata: {
        conflict_type: 'update_held_back',
        held_back: { show_fields: { changed_fields: ['start_time'], old: { start_time: '2026-01-01T10:00:00.000Z' }, new: { start_time: '2026-01-01T10:30:00.000Z' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
      },
    } as any);

    await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'backfill' }, actorExtId);

    expect(taskServiceMock.reconcileTaskDueDates).toHaveBeenCalledWith(
      BigInt(1),
      { startTime: new Date('2026-01-01T10:00:00.000Z'), endTime: expect.any(Date) },
      { startTime: new Date('2026-01-01T10:30:00.000Z'), endTime: expect.any(Date) },
    );
  });

  it('applies a held-back creator removal by resolving creator_uid to the underlying row and soft-deleting it', async () => {
    scheduleConflictServiceMock.applyConflict.mockResolvedValue({ outcome: 'applied' });
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(1), uid: 'show_1', showStatus: { systemKey: 'DRAFT' },
    } as any);
    auditServiceMock.findLatestScheduleConflictForShow.mockResolvedValue({
      metadata: {
        conflict_type: 'update_held_back',
        held_back: {
          show_fields: null,
          show_creators: [{ creator_uid: 'creator_jane', action: 'remove', old_note: 'Backup host', new_note: null }],
          show_platforms: [],
          proposed_status_transition: null,
        },
      },
    } as any);
    mockTx.creator.findFirst.mockResolvedValue({ id: BigInt(5) });
    mockTx.showCreator.findFirst.mockResolvedValue({ id: BigInt(50) });

    await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'confirmed removal' }, actorExtId);

    expect(mockTx.creator.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { uid: 'creator_jane' } }));
    expect(mockTx.showCreator.update).toHaveBeenCalledWith({
      where: { id: BigInt(50) },
      data: { deletedAt: expect.any(Date) },
    });
  });
```

- [ ] **Step 7: Implement `StudioShowManagementService.resolveScheduleConflict`**

Add to `studio-show-management.service.ts`, after `resolveShowCancellation`:

```typescript
  @Transactional()
  async resolveScheduleConflict(
    studioUid: string,
    showUid: string,
    conflictUid: string,
    dto: ResolveScheduleConflictInput,
    actorExtId: string,
  ): Promise<SchedulePublishImpactRow> {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    if (dto.action === 'dismiss') {
      await this.scheduleConflictService.dismissConflict({
        showId: show.id, conflictUid, actorId: actor.id, reason: dto.reason,
      });
    } else {
      const latest = await this.auditService.findLatestScheduleConflictForShow(show.id);
      const metadata = this.asRecord(latest?.metadata);
      const heldBack = metadata.held_back as HeldBackPayload | undefined;
      const changedFields = heldBack?.show_fields?.changed_fields ?? [];
      const conflictType = metadata.conflict_type as 'update_held_back' | 'removal_held_back' | undefined;

      const currentFieldValues = await this.buildCurrentFieldValues(show, changedFields);

      await this.scheduleConflictService.applyConflict({
        showId: show.id, conflictUid, actorId: actor.id, reason: dto.reason,
        currentShowStatus: show.showStatus?.systemKey ?? '',
        currentFieldValues,
      });

      if (conflictType === 'update_held_back' && (changedFields.includes('start_time') || changedFields.includes('end_time'))) {
        const showFields = heldBack?.show_fields as { old: Record<string, string>; new: Record<string, string> } | undefined;
        if (showFields) {
          const oldStart = showFields.old.start_time ? new Date(showFields.old.start_time) : show.startTime;
          const oldEnd = showFields.old.end_time ? new Date(showFields.old.end_time) : show.endTime;
          const newStart = showFields.new.start_time ? new Date(showFields.new.start_time) : oldStart;
          const newEnd = showFields.new.end_time ? new Date(showFields.new.end_time) : oldEnd;
          await this.taskService.reconcileTaskDueDates(show.id, { startTime: oldStart, endTime: oldEnd }, { startTime: newStart, endTime: newEnd });
        }
      }

      if (conflictType === 'removal_held_back') {
        const activeTaskCount = await this.taskTargetService.countActiveByShowId(show.id);
        const targetStatus = await this.showStatusService.getShowStatusBySystemKey(
          activeTaskCount > 0 ? 'CANCELLED_PENDING_RESOLUTION' : 'CANCELLED',
        );
        if (targetStatus) {
          await this.showRepository.update(show.id, { showStatusId: targetStatus.id });
        }
      } else {
        if (heldBack?.show_fields) {
          await this.showRepository.update(show.id, this.toShowUpdateData(heldBack.show_fields as any));
        }
        await this.applyHeldBackRelations(show.id, heldBack);
      }
    }

    const updated = await this.auditService.findLatestScheduleConflictForShow(show.id);
    // The just-written `resolved` row is now latest; re-fetch the row for the response
    // via the same projection the list endpoint uses, scoped to this one target.
    const target = await this.auditService.findForTargets([{ targetType: 'SHOW', targetId: show.id }], { take: 1 });
    return this.toSchedulePublishImpactRow({
      ...target[0],
      show: { ...show, showStatus: show.showStatus, client: show.client } as any,
    } as any);
  }

  private async buildCurrentFieldValues(
    show: ShowWithPayload<typeof studioShowDetailInclude>,
    changedFields: string[],
  ): Promise<Record<string, unknown>> {
    const values: Record<string, unknown> = {};
    for (const field of changedFields) {
      switch (field) {
        case 'name': values.name = show.name; break;
        case 'start_time': values.start_time = show.startTime.toISOString(); break;
        case 'end_time': values.end_time = show.endTime.toISOString(); break;
        case 'client_id': values.client_id = show.client?.uid ?? null; break;
        case 'studio_id': values.studio_id = show.studio?.uid ?? null; break;
        case 'studio_room_id': values.studio_room_id = show.studioRoom?.uid ?? null; break;
        case 'show_type_id': values.show_type_id = show.showType?.uid ?? null; break;
        case 'show_status_id': values.show_status_id = show.showStatus?.uid ?? null; break;
        case 'show_standard_id': values.show_standard_id = show.showStandard?.uid ?? null; break;
        case 'metadata': values.metadata = JSON.stringify(show.metadata ?? {}); break;
        default: break;
      }
    }
    return values;
  }

  private toShowUpdateData(showFields: { new: Record<string, unknown> }): ShowUpdateData {
    // Only plain scalar fields are ever applied here — FK fields inside a real
    // held_back diff are display-only for this MVP; a planner backfilling a
    // creator/platform, not a client/studio/room, is the documented common
    // case (spec line 13). If FK-field apply is needed later, resolve
    // `{uid,name}` back to an internal id here before writing.
    const data: ShowUpdateData = {};
    if (typeof showFields.new.name === 'string') data.name = showFields.new.name;
    if (typeof showFields.new.start_time === 'string') data.startTime = new Date(showFields.new.start_time);
    if (typeof showFields.new.end_time === 'string') data.endTime = new Date(showFields.new.end_time);
    return data;
  }

  /**
   * Applies a held-back creator/platform diff by resolving each entry's uid
   * back to the underlying row and writing the same action relation-sync
   * would have written directly, had it not been held back — `update` writes
   * the new note/link fields, `remove` soft-deletes. `restore` (nothing to
   * conflict with) never reaches here since additions/restores always apply
   * at publish time and are never held back in the first place.
   */
  private async applyHeldBackRelations(showId: bigint, heldBack: HeldBackPayload | undefined): Promise<void> {
    const tx = this.txHost.tx;

    for (const entry of heldBack?.show_creators ?? []) {
      const creator = await tx.creator.findFirst({ where: { uid: entry.creator_uid }, select: { id: true } });
      if (!creator) {
        continue;
      }
      const row = await tx.showCreator.findFirst({ where: { showId, creatorId: creator.id }, select: { id: true } });
      if (!row) {
        continue;
      }
      if (entry.action === 'remove') {
        await tx.showCreator.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
      } else {
        await tx.showCreator.update({ where: { id: row.id }, data: { note: entry.new_note } });
      }
    }

    for (const entry of heldBack?.show_platforms ?? []) {
      const platform = await tx.platform.findFirst({ where: { uid: entry.platform_uid }, select: { id: true } });
      if (!platform) {
        continue;
      }
      const row = await tx.showPlatform.findFirst({ where: { showId, platformId: platform.id }, select: { id: true } });
      if (!row) {
        continue;
      }
      if (entry.action === 'remove') {
        await tx.showPlatform.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
      } else {
        await tx.showPlatform.update({
          where: { id: row.id },
          data: { liveStreamLink: entry.new.live_stream_link, platformShowId: entry.new.platform_show_id },
        });
      }
    }
  }
```

*(Note: `toShowUpdateData` intentionally does not resolve FK-backed `new` values back to internal ids for a direct write — that's a real gap worth flagging explicitly in the PR description as a documented limitation, not silently dropped: applying a held-back `client_id`/`studio_id`/etc. **field** change today updates the audit trail's resolved state but does not write the FK column. Held-back **creator/platform** changes, by contrast, are fully applied via `applyHeldBackRelations` above — that gap only covers the six FK-backed `show_fields` entries, not relations. Add the field-only gap to the PR description's "Known limitations" section per Task 7.)*

Inject `ScheduleConflictService`, `TaskTargetService`, and `TransactionHost<TransactionalAdapterPrisma>` into `StudioShowManagementService`'s constructor:

```typescript
    private readonly scheduleConflictService: ScheduleConflictService,
    private readonly taskTargetService: TaskTargetService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
```

Add the imports:

```typescript
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { HeldBackPayload, ResolveScheduleConflictInput } from '@eridu/api-types/shows';

import { ScheduleConflictService } from '@/models/schedule-conflict/schedule-conflict.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
```

Add `ScheduleConflictModule`, `TaskTargetModule`, and `PrismaModule` (for `TransactionHost`'s underlying adapter — check whether `StudioShowModule` already gets this transitively via another imported module before adding it directly; `SchedulePlanningModule` and `ScheduleConflictModule` both already import `PrismaModule`, so it's likely already satisfied — verify with `pnpm --filter erify_api build` in Task 7 rather than assuming) to `studio-show.module.ts`'s `imports` array.

- [ ] **Step 8: Create the resolve DTO schema**

Create `apps/erify_api/src/studios/studio-show/schemas/studio-show-schedule-conflict.schema.ts`:

```typescript
import { createZodDto } from 'nestjs-zod';

import { resolveScheduleConflictSchema } from '@eridu/api-types/shows';

export class ResolveScheduleConflictDto extends createZodDto(resolveScheduleConflictSchema) {}
```

- [ ] **Step 9: Add the controller route**

In `studio-show.controller.ts`, add after `resolveCancellation` (existing, ~line 456), following the exact same guard/pipe pattern:

```typescript
  @Post(':id/schedule-publish-impacts/:conflictUid/resolve')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ZodResponse(schedulePublishImpactRowSchema)
  async resolveScheduleConflict(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Param('conflictUid') conflictUid: string,
    @Body() body: ResolveScheduleConflictDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studioShowManagementService.resolveScheduleConflict(studioId, id, conflictUid, body, user.ext_id);
  }
```

Add `ResolveScheduleConflictDto` to the controller's imports from `./schemas/studio-show-schedule-conflict.schema`.

- [ ] **Step 10: Run all new and existing tests**

Run: `pnpm --filter erify_api test`
Expected: PASS — full suite, no regressions.

- [ ] **Step 11: Write the controller-level test**

`studio-show.controller.spec.ts` already exists and uses the same `xMock`-plus-`module.get()`-for-the-controller-only pattern as `studio-show-management.service.spec.ts` (`studioShowManagementServiceMock`, see line 43-55; `controller = module.get<StudioShowController>(StudioShowController)`, line 91). This codebase does **not** unit-test Zod DTO validation at the controller-spec level anywhere — `resolveCancellation`'s own test (line 573-589) only asserts the controller passes its arguments through correctly; enum/required-field validation is enforced by the route's `ZodValidationPipe` at the HTTP layer, not re-verified here with `class-validator`'s `validate()` (that API isn't used anywhere in this file — don't introduce it). Mirror `resolveCancellation`'s test exactly:

```typescript
  describe('resolveScheduleConflict', () => {
    it('passes the actor ext_id through to the service', async () => {
      const user = { ext_id: 'ext_5' } as any;
      const body = { action: 'dismiss', reason: 'no longer relevant' } as any;
      studioShowManagementServiceMock.resolveScheduleConflict.mockResolvedValue({ audit_id: 'aud_1' });

      await controller.resolveScheduleConflict('std_123', 'show_123', 'conflict_1', body, user);

      expect(studioShowManagementServiceMock.resolveScheduleConflict).toHaveBeenCalledWith(
        'std_123',
        'show_123',
        'conflict_1',
        body,
        'ext_5',
      );
    });
  });
```

Add `resolveScheduleConflict: jest.fn()` to `studioShowManagementServiceMock` (line 43-55).

`SchedulePublishImpactQueryDto`/`ResolveScheduleConflictDto`'s Zod enum/`.min(1)` validation is already covered at the schema level by Task 1's `@eridu/api-types` test — no separate controller-level validation test is needed here, consistent with how this codebase tests every other Zod DTO.

(Check whether this controller's spec file uses `class-validator`'s `validate()` directly against the Zod-backed DTO, or asserts through an integration-style e2e request instead — `nestjs-zod`'s `createZodDto` classes validate via a Zod pipe at the framework level, not `class-validator` decorators, so the exact assertion mechanism must match how this codebase's other Zod DTOs are tested; search for an existing `ResolveShowCancellationDto` test as the precedent to copy instead of introducing a new pattern.)

- [ ] **Step 12: Lint, typecheck, build**

Run: `pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api build`
Expected: no errors

- [ ] **Step 13: Commit**

```bash
git add apps/erify_api/src/models/schedule-conflict apps/erify_api/src/studios/studio-show
git commit -m "feat(erify_api): add schedule-publish-impacts resolve endpoint (apply/dismiss)"
```

---

### Task 7: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `pnpm --filter erify_api test`
Expected: PASS, 0 failures

- [ ] **Step 2: Run the full verification checklist per `AGENTS.md`**

Run:
```bash
pnpm --filter erify_api lint
pnpm --filter erify_api typecheck
pnpm --filter erify_api test
pnpm --filter erify_api build
pnpm --filter @eridu/api-types lint
pnpm --filter @eridu/api-types typecheck
pnpm --filter @eridu/api-types test
pnpm --filter @eridu/api-types build
```
Expected: all green.

- [ ] **Step 3: Cross-check every Testing Plan bullet in the spec is covered**

Re-read [the spec's Testing Plan section](../specs/2026-07-08-schedule-publish-actuals-aware-conflict-handling-design.md#testing-plan) line by line against the tests written across Tasks 1-6. List any bullet with no corresponding test and add it before proceeding — do not defer silently.

- [ ] **Step 4: Note known limitations in the PR description**

Two things are intentionally out of scope for this PR and must be called out explicitly, not discovered later:
1. `resolveScheduleConflict`'s apply path does not write FK-backed field changes (`client_id`/`studio_id`/`studio_room_id`/`show_type_id`/`show_status_id`/`show_standard_id`) back to the `Show` row — only plain scalar fields (`name`, `start_time`, `end_time`). The audit trail resolves correctly either way; only the live write is scoped down.
2. `listSchedulePublishImpacts` pages `confirmed_future_*` and `stale_conflict` as two independently-paginated sources concatenated per page, not a single cross-kind merge-sorted page — acceptable given the spec's own "narrow, real-world-rare" framing for `stale_conflict` volume.

- [ ] **Step 5: Run `/pr-ready`** (or the `pr-review.md` workflow manually) before opening the PR, per `AGENTS.md`'s merge-readiness gate.

- [ ] **Step 6: Commit any final fixups, then hand off per `superpowers:finishing-a-development-branch`.**
