# Show State Gate v2 (Role-Tiered Cancellation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Manager/Admin cancel a show in one step, or a Duty Manager flag it for a Manager to sign off later — both via reason + (when applicable) outcome, with no assignee, no Task entity, and no way to bypass the safeguard via the regular show-edit form.

**Architecture:** A new `ShowCancellationGateService` (in `show-orchestration`) owns the two transitions (`cancelShowWithResolution` atomic-or-pending, `resolveShowCancellation` sign-off) plus a derived-snapshot read (`getCancellationStatus`) sourced entirely from `Audit` rows — no new table, no `Task`/`TaskTarget` usage, no `Show.metadata` writes. `StudioShowManagementService` delegates to it and gains a bypass guard on `updateShow`. `publishing.service.ts`'s existing schedule-removal auto-cancel path is unified onto the same active-task helper and starts writing an `Audit` row (it currently writes none).

**Tech Stack:** NestJS + Prisma (erify_api), Zod schemas in `@eridu/api-types`, React + TanStack Query + `@eridu/ui` (erify_studios).

## Global Constraints

- No Prisma migration, no `TaskType.STATE_GATE` enum value — `CANCELLED_PENDING_RESOLUTION` is already a seeded `ShowStatus` row (verified against the dev DB).
- No `Show.metadata` writes for gate content. `Audit` is the only persistence for reason/category/who/when — confirmed `AuditMetadata` already supports arbitrary catchall keys (`old_value`/`new_value` are typed fields; anything else falls through `.catchall(jsonValueSchema)`).
- `Show` has no `version` column — the sign-off write must be a conditional `updateMany` (`WHERE show_status_id = <pending>`), not a plain read-then-write.
- Manager tier = `STUDIO_ROLE.ADMIN` or `STUDIO_ROLE.MANAGER` (existing `STUDIO_SHOW_WRITE_ACCESS_ROLES`). Duty Manager tier = `StudioShiftService.findActiveDutyManager(studioUid, now)?.user.uid` matches the actor's resolved `User`, checked only when Manager tier doesn't apply.
- Manager tier is always atomic (one call, no pending interval). Duty Manager tier always defers (no `outcome` field, sign-off is a separate, Manager-tier-only call).
- The active-task guard (blocks `CANCELLED` while real production tasks remain open) must exclude `TaskStatus.COMPLETED`/`CLOSED` — confirmed the existing inline check in `publishing.service.ts` does **not** do this today (it only filters `deletedAt: null`), so the new shared helper is a behavior fix, not a pure refactor; `publishing.service.ts` is updated to use it.
- Eligible-to-cancel statuses for the Manager/Duty-Manager-initiated path: reject `DRAFT`, `CANCELLED_PENDING_RESOLUTION`, `CANCELLED`, `COMPLETED` (only `CONFIRMED`/`LIVE` may be cancelled).
- LIVE safeguard: outcome `CANCELLED` is rejected when the captured `from_status` is `LIVE` (only `RESTORE_PREVIOUS`/`COMPLETED` allowed in that case).
- `GateNotificationService.notifyGateOpened`/`notifyGateResolved` are no-op (structured log only) but take a required `actor` argument — no real channel is wired in this plan.

---

### Task 1: `ShowStatusService.getShowStatusBySystemKey`

**Files:**
- Modify: `apps/erify_api/src/models/show-status/show-status.service.ts`
- Test: `apps/erify_api/src/models/show-status/show-status.service.spec.ts` (create — none exists yet)

**Interfaces:**
- Produces: `ShowStatusService.getShowStatusBySystemKey(systemKey: string): Promise<ShowStatus | null>` — used by Task 8/9 to resolve `CANCELLED_PENDING_RESOLUTION`/`CANCELLED`/`COMPLETED` rows by their system key.

- [ ] **Step 1: Write the failing test**

```typescript
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { ShowStatusService } from './show-status.service';
import { ShowStatusRepository } from './show-status.repository';
import { UtilityService } from '@/utility/utility.service';

describe('showStatusService', () => {
  let service: ShowStatusService;
  const showStatusRepositoryMock = {
    findOne: jest.fn(),
  };
  const utilityServiceMock = { generateBrandedId: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowStatusService,
        { provide: ShowStatusRepository, useValue: showStatusRepositoryMock },
        { provide: UtilityService, useValue: utilityServiceMock },
      ],
    }).compile();
    service = module.get(ShowStatusService);
  });

  describe('getShowStatusBySystemKey', () => {
    it('delegates to repository.findOne with the system key', async () => {
      const expected = { id: 6n, systemKey: 'CANCELLED_PENDING_RESOLUTION' };
      showStatusRepositoryMock.findOne.mockResolvedValue(expected);

      const result = await service.getShowStatusBySystemKey('CANCELLED_PENDING_RESOLUTION');

      expect(showStatusRepositoryMock.findOne).toHaveBeenCalledWith({
        systemKey: 'CANCELLED_PENDING_RESOLUTION',
      });
      expect(result).toEqual(expected);
    });

    it('returns null when not found', async () => {
      showStatusRepositoryMock.findOne.mockResolvedValue(null);

      const result = await service.getShowStatusBySystemKey('NOT_A_REAL_KEY');

      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- show-status.service.spec.ts`
Expected: FAIL — `service.getShowStatusBySystemKey is not a function`

- [ ] **Step 3: Add the method**

In `show-status.service.ts`, add alongside the existing methods (after `getShowStatusById`):

```typescript
  async getShowStatusBySystemKey(systemKey: string): Promise<ShowStatus | null> {
    return this.showStatusRepository.findOne({ systemKey });
  }
```

Add `import type { ShowStatus } from '@prisma/client';` to the top of the file if not already present.

This is a single-unique-field lookup via the inherited `BaseRepository.findOne` — no new repository method needed (`findOne` already exists on `ShowStatusRepository` via `BaseRepository`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- show-status.service.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/erify_api/src/models/show-status/show-status.service.ts apps/erify_api/src/models/show-status/show-status.service.spec.ts
git commit -m "feat(erify_api): add ShowStatus lookup by systemKey"
```

---

### Task 2: `TaskTargetRepository.countActiveByShowId` (shared active-task guard primitive)

**Files:**
- Modify: `apps/erify_api/src/models/task-target/task-target.repository.ts`
- Modify: `apps/erify_api/src/models/task-target/task-target.service.ts`
- Test: `apps/erify_api/src/models/task-target/task-target.service.spec.ts` (create — none exists yet for this method; if a spec file already exists, add to it)

**Interfaces:**
- Produces: `TaskTargetService.countActiveByShowId(showId: bigint): Promise<number>` — counts non-deleted `TaskTarget`s whose `Task` is non-deleted **and** not `COMPLETED`/`CLOSED`. Used by Task 9 (manual cancellation) and Task 13 (`publishing.service.ts`).

- [ ] **Step 1: Write the failing test**

```typescript
// In task-target.service.spec.ts (create if it doesn't exist; mirror the
// existing mock-and-Test.createTestingModule pattern used by sibling specs)
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { TaskTargetService } from './task-target.service';
import { TaskTargetRepository } from './task-target.repository';
import { UtilityService } from '@/utility/utility.service';

describe('taskTargetService', () => {
  let service: TaskTargetService;
  const taskTargetRepositoryMock = {
    countActiveByShowId: jest.fn(),
  };
  const utilityServiceMock = { generateBrandedId: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskTargetService,
        { provide: TaskTargetRepository, useValue: taskTargetRepositoryMock },
        { provide: UtilityService, useValue: utilityServiceMock },
      ],
    }).compile();
    service = module.get(TaskTargetService);
  });

  describe('countActiveByShowId', () => {
    it('delegates to the repository', async () => {
      taskTargetRepositoryMock.countActiveByShowId.mockResolvedValue(3);

      const result = await service.countActiveByShowId(42n);

      expect(taskTargetRepositoryMock.countActiveByShowId).toHaveBeenCalledWith(42n);
      expect(result).toBe(3);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- task-target.service.spec.ts`
Expected: FAIL — `taskTargetRepositoryMock.countActiveByShowId is not a function` is fine to ignore at the mock level; the real failure is `service.countActiveByShowId is not a function`.

- [ ] **Step 3: Add the repository method**

In `task-target.repository.ts`, add after `findByShowIds`:

```typescript
  // Engineering decision: "active" excludes terminal task statuses (COMPLETED,
  // CLOSED) in addition to the soft-delete filters findByShowIds already
  // applies — a completed task must not block a cancellation outcome that
  // requires "no active tasks." This is the canonical filter for that policy;
  // every caller (manual cancellation, schedule-publish removal) uses this
  // method instead of re-deriving the status list.
  async countActiveByShowId(showId: bigint): Promise<number> {
    return this.delegate.count({
      where: {
        showId,
        deletedAt: null,
        task: {
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CLOSED'] },
        },
      },
    });
  }
```

- [ ] **Step 4: Add the service wrapper**

In `task-target.service.ts`, add after `findByShowIds`:

```typescript
  async countActiveByShowId(
    ...args: Parameters<TaskTargetRepository['countActiveByShowId']>
  ): ReturnType<TaskTargetRepository['countActiveByShowId']> {
    return this.taskTargetRepository.countActiveByShowId(...args);
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- task-target.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Add a repository-level regression test pinning the COMPLETED/CLOSED exclusion**

No `task-target.repository.spec.ts` exists yet on this branch. Create `apps/erify_api/src/models/task-target/task-target.repository.spec.ts` (mirrors the `txHost`-mocking pattern used by `platform.repository.spec.ts`):

```typescript
import type { TransactionHost } from '@nestjs-cls/transactional';

import { TaskTargetRepository } from './task-target.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createTaskTargetDelegateMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
}

describe('taskTargetRepository', () => {
  let repository: TaskTargetRepository;
  const txDelegate = createTaskTargetDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {} as unknown as PrismaService;
    const txHost = { tx: { taskTarget: txDelegate } } as unknown as TransactionHost<any>;
    repository = new TaskTargetRepository(prisma, txHost);
  });

  describe('countActiveByShowId', () => {
    it('excludes COMPLETED and CLOSED tasks from the count', async () => {
      txDelegate.count.mockResolvedValue(2);

      const result = await repository.countActiveByShowId(7n);

      expect(txDelegate.count).toHaveBeenCalledWith({
        where: {
          showId: 7n,
          deletedAt: null,
          task: { deletedAt: null, status: { notIn: ['COMPLETED', 'CLOSED'] } },
        },
      });
      expect(result).toBe(2);
    });
  });
});
```

- [ ] **Step 7: Run the full task-target test suite**

Run: `pnpm --filter erify_api test -- task-target`
Expected: PASS (all task-target.*.spec.ts files)

- [ ] **Step 8: Commit**

```bash
git add apps/erify_api/src/models/task-target/
git commit -m "feat(erify_api): add canonical active-task count excluding terminal statuses"
```

---

### Task 3: `ShowRepository.updateStatusIfPending` (guarded sign-off write)

**Files:**
- Modify: `apps/erify_api/src/models/show/show.repository.ts`
- Test: `apps/erify_api/src/models/show/show.repository.spec.ts` (check if it exists; create if not, following the `platform.repository.spec.ts` `txHost`-mock pattern from Task 2)

**Interfaces:**
- Produces: `ShowRepository.updateStatusIfPending(showId: bigint, pendingShowStatusId: bigint, data: Prisma.ShowUpdateInput): Promise<boolean>` — returns `true` if exactly one row matched and was updated (the show was still pending at write time), `false` if zero rows matched (someone else already resolved it). Used by Task 9's sign-off method.

- [ ] **Step 1: Write the failing test**

`show.repository.spec.ts` already exists. It defines `txShowDelegate = { findMany: jest.fn(), count: jest.fn() }` (no `updateMany`). Add `updateMany: jest.fn()` to that object:

```typescript
  const txShowDelegate = {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  };
```

Then add this `describe` block inside the existing top-level `describe('showRepository', ...)`, alongside the other method blocks:

```typescript
  describe('updateStatusIfPending', () => {
    it('returns true when exactly one row matched the pending status', async () => {
      txShowDelegate.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.updateStatusIfPending(10n, 6n, { showStatusId: 5n });

      expect(txShowDelegate.updateMany).toHaveBeenCalledWith({
        where: { id: 10n, showStatusId: 6n },
        data: { showStatusId: 5n },
      });
      expect(result).toBe(true);
    });

    it('returns false when the show was already resolved by another caller', async () => {
      txShowDelegate.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.updateStatusIfPending(10n, 6n, { showStatusId: 5n });

      expect(result).toBe(false);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- show.repository.spec.ts`
Expected: FAIL — `repository.updateStatusIfPending is not a function`

- [ ] **Step 3: Add the method**

In `show.repository.ts`, add after the `findByUid` method:

```typescript
  // Engineering decision: Show has no `version` column for optimistic locking
  // (unlike Task/TaskTemplate/StudioCreator). Resolving a pending-resolution
  // show must not be a plain read-then-write — two Managers racing to resolve
  // the same show could otherwise both succeed and write conflicting outcomes.
  // This conditional updateMany is the guard: the WHERE clause re-checks the
  // expected pending status atomically with the write, so only the first
  // caller's update actually matches a row.
  async updateStatusIfPending(
    showId: bigint,
    pendingShowStatusId: bigint,
    data: Prisma.ShowUpdateInput,
  ): Promise<boolean> {
    const result = await this.delegate.updateMany({
      where: { id: showId, showStatusId: pendingShowStatusId },
      data,
    });
    return result.count > 0;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- show.repository.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/erify_api/src/models/show/show.repository.ts apps/erify_api/src/models/show/show.repository.spec.ts
git commit -m "feat(erify_api): add guarded conditional status update for show sign-off"
```

---

### Task 4: `@eridu/api-types` — gate config and request/response schemas

**Files:**
- Modify: `packages/api-types/src/shows/schemas.ts`
- Modify: `packages/api-types/src/shows/types.ts`

**Interfaces:**
- Produces (consumed by erify_api Task 6+ and erify_studios Task 14+):
  - `CANCELLATION_GATE_CONFIG: { show_cancellation: {...}; schedule_publish_removal: {...} }` (object, not a schema)
  - `type GateKind = 'show_cancellation' | 'schedule_publish_removal'`
  - `cancelShowWithResolutionSchema` → `z.object({ reason_category: string, reason_note: string, outcome: z.enum(['CANCELLED','COMPLETED']).optional() })`
  - `resolveShowCancellationSchema` → `z.object({ outcome: z.enum(['CANCELLED','COMPLETED','RESTORE_PREVIOUS']), resolution_notes: string })`
  - `amendCancellationNoteSchema` → `z.object({ reason_note: string })`
  - `cancellationStatusResponseSchema` → the `GET .../cancellation-status` response shape
  - Types: `CancelShowWithResolutionInput`, `ResolveShowCancellationInput`, `AmendCancellationNoteInput`, `CancellationStatusResponse`, `CancellationHistoryEntry`

> **No test step here.** Confirmed `@eridu/api-types`'s `package.json` has `"test": "echo \"No tests specified\" && exit 0"` — there is no test runner installed and zero existing `*.test.ts`/`*.spec.ts` files in this package (this is documented, accepted project convention, not an oversight — see the PR #230 notes). Schema correctness is verified by `typecheck`/`build` here, and behaviorally by the erify_api service tests (Task 6+) and erify_studios component tests (Task 15+) that actually exercise these schemas through `safeParse`/DTO validation.

- [ ] **Step 1: Add the config and schemas**

Append to `packages/api-types/src/shows/schemas.ts` (after the existing `studioShowDetailSchema` block):

```typescript
/**
 * Show State Gate v2 — cancellation gate config (code, not data). Two gate
 * kinds today: manual cancellation and schedule-publish-triggered removal.
 * No ownership/assignee concept — see docs/superpowers/specs/2026-06-26-show-state-gate-v2-design.md.
 */
export const CANCELLATION_GATE_CONFIG = {
  show_cancellation: {
    allowedOutcomes: ['CANCELLED', 'COMPLETED'] as const,
    outcomesRequiringNoActiveTasks: ['CANCELLED'] as const,
    reasonOptions: [
      'CREATOR_UNAVAILABLE',
      'ROOM_UNAVAILABLE',
      'EQUIPMENT_FAILURE',
      'UTILITY_OUTAGE',
      'PLATFORM_ISSUE',
      'CLIENT_REQUEST',
      'OTHER',
    ] as const,
  },
  schedule_publish_removal: {
    allowedOutcomes: ['CANCELLED', 'RESTORE_PREVIOUS'] as const,
    outcomesRequiringNoActiveTasks: ['CANCELLED'] as const,
    reasonOptions: ['REMOVED_FROM_REPUBLISHED_SCHEDULE'] as const,
  },
} as const;

export type GateKind = keyof typeof CANCELLATION_GATE_CONFIG;
export type GateOutcome =
  (typeof CANCELLATION_GATE_CONFIG)[GateKind]['allowedOutcomes'][number];

const gateActorSchema = z.object({
  uid: z.string().startsWith(UID_PREFIXES.USER),
  name: z.string(),
});

export const cancellationHistoryEntrySchema = z.object({
  event: z.enum(['opened', 'note_updated', 'resolved']),
  actor: gateActorSchema.nullable(),
  at: z.iso.datetime(),
  note: z.string().nullable(),
  outcome: z.string().nullable(),
});

export const cancelShowWithResolutionSchema = z.object({
  reason_category: z.string().min(1),
  reason_note: z.string().min(1),
  outcome: z.enum(['CANCELLED', 'COMPLETED']).optional(),
});

export const resolveShowCancellationSchema = z.object({
  outcome: z.enum(['CANCELLED', 'COMPLETED', 'RESTORE_PREVIOUS']),
  resolution_notes: z.string().min(1),
});

export const amendCancellationNoteSchema = z.object({
  reason_note: z.string().min(1),
});

export const cancellationStatusResponseSchema = z.object({
  is_pending: z.boolean(),
  gate_kind: z.enum(['show_cancellation', 'schedule_publish_removal']).nullable(),
  from_status: z.string().nullable(),
  reason_category: z.string().nullable(),
  reason_note: z.string().nullable(),
  opened_by: gateActorSchema.nullable(),
  opened_at: z.iso.datetime().nullable(),
  allowed_outcomes: z.array(z.string()),
  history: z.array(cancellationHistoryEntrySchema),
});
```

`UID_PREFIXES` is already imported at the top of the file — no new import needed there.

- [ ] **Step 2: Add the inferred types**

Append to `packages/api-types/src/shows/types.ts`:

```typescript
export type CancelShowWithResolutionInput = z.infer<typeof cancelShowWithResolutionSchema>;
export type ResolveShowCancellationInput = z.infer<typeof resolveShowCancellationSchema>;
export type AmendCancellationNoteInput = z.infer<typeof amendCancellationNoteSchema>;
export type CancellationHistoryEntry = z.infer<typeof cancellationHistoryEntrySchema>;
export type CancellationStatusResponse = z.infer<typeof cancellationStatusResponseSchema>;
```

And add the five new schema names to the existing `import type { ... } from './schemas.js';` block at the top of `types.ts`:

```typescript
  amendCancellationNoteSchema,
  cancellationHistoryEntrySchema,
  cancellationStatusResponseSchema,
  cancelShowWithResolutionSchema,
  resolveShowCancellationSchema,
```

- [ ] **Step 3: Run package verification**

```bash
pnpm --filter @eridu/api-types lint
pnpm --filter @eridu/api-types typecheck
pnpm --filter @eridu/api-types build
```
Expected: all pass (no errors) — this is the actual correctness check for this task, since the package has no test runner.

- [ ] **Step 4: Commit**

```bash
git add packages/api-types/src/shows/
git commit -m "feat(api-types): add show cancellation gate v2 schemas"
```

---

### Task 5: `GateNotificationService` (notification seam, no-op)

**Files:**
- Create: `apps/erify_api/src/show-orchestration/gate-notification.service.ts`
- Test: `apps/erify_api/src/show-orchestration/gate-notification.service.spec.ts`

**Interfaces:**
- Produces: `GateNotificationService.notifyGateOpened(show: Show, gateKind: GateKind, reason: { category: string; note: string }, actor: { uid: string; name: string }): void` and `.notifyGateResolved(show: Show, gateKind: GateKind, outcome: string, actor: { uid: string; name: string }): void`. Consumed by Task 6's `ShowCancellationGateService`.

- [ ] **Step 1: Write the failing test**

```typescript
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Show } from '@prisma/client';

import { GateNotificationService } from './gate-notification.service';

describe('gateNotificationService', () => {
  let service: GateNotificationService;
  const show = { id: 1n, uid: 'show_abc' } as Show;
  const actor = { uid: 'user_abc', name: 'Jane Duty' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GateNotificationService],
    }).compile();
    service = module.get(GateNotificationService);
  });

  it('notifyGateOpened does not throw and returns nothing', () => {
    expect(() =>
      service.notifyGateOpened(show, 'show_cancellation', { category: 'EQUIPMENT_FAILURE', note: 'Camera failed' }, actor),
    ).not.toThrow();
  });

  it('notifyGateResolved does not throw and returns nothing', () => {
    expect(() =>
      service.notifyGateResolved(show, 'show_cancellation', 'CANCELLED', actor),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- gate-notification.service.spec.ts`
Expected: FAIL — cannot find module `./gate-notification.service`

- [ ] **Step 3: Create the service**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import type { Show } from '@prisma/client';

import type { GateKind } from '@eridu/api-types/shows';

/**
 * Notification seam for the show cancellation gate — no real channel exists
 * yet (no EventEmitter2/domain-event pattern anywhere in erify_api). Both
 * methods are structured-log-only placeholders so future notification work
 * (stakeholder/client/creator alerts) has one narrow point to plug into
 * instead of threading new logic through ShowCancellationGateService.
 */
@Injectable()
export class GateNotificationService {
  private readonly logger = new Logger(GateNotificationService.name);

  notifyGateOpened(
    show: Show,
    gateKind: GateKind,
    reason: { category: string; note: string },
    actor: { uid: string; name: string },
  ): void {
    this.logger.debug(
      `Gate opened for show ${show.uid} (${gateKind}) by ${actor.name} — ${reason.category}: ${reason.note}`,
    );
  }

  notifyGateResolved(
    show: Show,
    gateKind: GateKind,
    outcome: string,
    actor: { uid: string; name: string },
  ): void {
    this.logger.debug(
      `Gate resolved for show ${show.uid} (${gateKind}) by ${actor.name} — outcome: ${outcome}`,
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- gate-notification.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/erify_api/src/show-orchestration/gate-notification.service.ts apps/erify_api/src/show-orchestration/gate-notification.service.spec.ts
git commit -m "feat(erify_api): add no-op gate notification seam"
```

---

### Task 6: `ShowCancellationGateService` — tier resolution and status read

**Files:**
- Create: `apps/erify_api/src/show-orchestration/show-cancellation-gate.service.ts`
- Test: `apps/erify_api/src/show-orchestration/show-cancellation-gate.service.spec.ts`

**Interfaces:**
- Consumes: `StudioShiftService.findActiveDutyManager(studioId: string, timestamp: Date)` (returns `StudioShiftWithRelations | null`, `.user.id` is `bigint`); `AuditService.findForTargets(filters, opts?)` (returns `AuditWithTargets[]`, ordered `createdAt: desc`); `CANCELLATION_GATE_CONFIG`/`GateKind` from `@eridu/api-types/shows`.
- Produces (consumed by Task 7 in the same file, and Task 9's `StudioShowManagementService`):
  - `resolveActorTier(studioUid: string, studioRole: string | undefined, actor: { id: bigint }): Promise<'manager' | 'duty_manager' | null>`
  - `getCancellationStatus(show: { id: bigint; showStatus: { systemKey: string | null } }): Promise<CancellationStatusResult>` where `CancellationStatusResult` is defined in this file (mirrors `CancellationStatusResponse` from api-types but with `Date` instead of ISO strings — the controller/DTO layer converts).

This task encodes the Audit metadata shape every other task in this plan depends on:
```typescript
type GateAuditMetadata = {
  field: 'show_status';
  event: 'opened' | 'note_updated' | 'resolved';
  gate_kind: GateKind;
  old_value: string | null;
  new_value: string | null;
  reason_category?: string;
  actor_uid: string;
  actor_name: string;
};
```
`actor_uid`/`actor_name` are stored redundantly in the JSON metadata (alongside the relational `actorId` FK) specifically so reads never need a second lookup against `User` — `Audit`'s `findForTargets` doesn't include the actor relation (confirmed: `AUDIT_WITH_TARGETS_INCLUDE = { targets: true }` only), and there's no existing `UserService` method to resolve an internal bigint id back to a UID. Writing the uid/name at audit-creation time (when the actor is already in hand) avoids needing one.

- [ ] **Step 1: Write the failing tests**

```typescript
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { ShowCancellationGateService } from './show-cancellation-gate.service';

import { AuditService } from '@/models/audit/audit.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

describe('showCancellationGateService', () => {
  let service: ShowCancellationGateService;
  const studioShiftServiceMock = { findActiveDutyManager: jest.fn() };
  const auditServiceMock = { findForTargets: jest.fn(), create: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowCancellationGateService,
        { provide: StudioShiftService, useValue: studioShiftServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();
    service = module.get(ShowCancellationGateService);
  });

  describe('resolveActorTier', () => {
    it('returns manager for ADMIN role without checking duty-manager shift', async () => {
      const tier = await service.resolveActorTier('studio_1', 'admin', { id: 5n });
      expect(tier).toBe('manager');
      expect(studioShiftServiceMock.findActiveDutyManager).not.toHaveBeenCalled();
    });

    it('returns manager for MANAGER role', async () => {
      const tier = await service.resolveActorTier('studio_1', 'manager', { id: 5n });
      expect(tier).toBe('manager');
    });

    it('returns duty_manager when the actor is the active duty manager and holds no manager role', async () => {
      studioShiftServiceMock.findActiveDutyManager.mockResolvedValue({ user: { id: 5n } });
      const tier = await service.resolveActorTier('studio_1', 'member', { id: 5n });
      expect(tier).toBe('duty_manager');
    });

    it('returns null when the actor is neither a manager nor the active duty manager', async () => {
      studioShiftServiceMock.findActiveDutyManager.mockResolvedValue(null);
      const tier = await service.resolveActorTier('studio_1', 'member', { id: 5n });
      expect(tier).toBeNull();
    });

    it('returns null when a different user is the active duty manager', async () => {
      studioShiftServiceMock.findActiveDutyManager.mockResolvedValue({ user: { id: 99n } });
      const tier = await service.resolveActorTier('studio_1', 'member', { id: 5n });
      expect(tier).toBeNull();
    });
  });

  describe('getCancellationStatus', () => {
    it('returns not-pending when the show status is not CANCELLED_PENDING_RESOLUTION', async () => {
      const result = await service.getCancellationStatus({ id: 1n, showStatus: { systemKey: 'CONFIRMED' } });
      expect(result.isPending).toBe(false);
      expect(auditServiceMock.findForTargets).not.toHaveBeenCalled();
    });

    it('derives the snapshot from the most recent opened audit row', async () => {
      auditServiceMock.findForTargets.mockResolvedValue([
        {
          action: 'OVERRIDE',
          reason: 'Camera failed mid-show',
          actorId: 5n,
          createdAt: new Date('2026-06-25T16:14:30.201Z'),
          metadata: {
            field: 'show_status',
            event: 'opened',
            gate_kind: 'show_cancellation',
            old_value: 'CONFIRMED',
            new_value: 'CANCELLED_PENDING_RESOLUTION',
            reason_category: 'EQUIPMENT_FAILURE',
            actor_uid: 'user_abc123',
            actor_name: 'Jane Duty',
          },
        },
      ]);

      const result = await service.getCancellationStatus({
        id: 1n,
        showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
      });

      expect(result).toEqual({
        isPending: true,
        gateKind: 'show_cancellation',
        fromStatus: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed mid-show',
        openedBy: { uid: 'user_abc123', name: 'Jane Duty' },
        openedAt: new Date('2026-06-25T16:14:30.201Z'),
        allowedOutcomes: ['CANCELLED', 'COMPLETED'],
        history: [
          {
            event: 'opened',
            actor: { uid: 'user_abc123', name: 'Jane Duty' },
            at: new Date('2026-06-25T16:14:30.201Z'),
            note: 'Camera failed mid-show',
            outcome: null,
          },
        ],
      });
    });

    it('uses the latest note_updated row for reasonNote but the original opened row for category/fromStatus/openedBy', async () => {
      auditServiceMock.findForTargets.mockResolvedValue([
        {
          action: 'OVERRIDE',
          reason: 'Actually two cameras failed',
          actorId: 6n,
          createdAt: new Date('2026-06-25T17:00:00.000Z'),
          metadata: {
            field: 'show_status',
            event: 'note_updated',
            gate_kind: 'show_cancellation',
            old_value: null,
            new_value: null,
            actor_uid: 'user_def456',
            actor_name: 'Bob Duty',
          },
        },
        {
          action: 'OVERRIDE',
          reason: 'Camera failed mid-show',
          actorId: 5n,
          createdAt: new Date('2026-06-25T16:14:30.201Z'),
          metadata: {
            field: 'show_status',
            event: 'opened',
            gate_kind: 'show_cancellation',
            old_value: 'CONFIRMED',
            new_value: 'CANCELLED_PENDING_RESOLUTION',
            reason_category: 'EQUIPMENT_FAILURE',
            actor_uid: 'user_abc123',
            actor_name: 'Jane Duty',
          },
        },
      ]);

      const result = await service.getCancellationStatus({
        id: 1n,
        showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
      });

      expect(result.reasonNote).toBe('Actually two cameras failed');
      expect(result.reasonCategory).toBe('EQUIPMENT_FAILURE');
      expect(result.fromStatus).toBe('CONFIRMED');
      expect(result.openedBy).toEqual({ uid: 'user_abc123', name: 'Jane Duty' });
      expect(result.history).toHaveLength(2);
      expect(result.history[0].event).toBe('opened');
      expect(result.history[1].event).toBe('note_updated');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- show-cancellation-gate.service.spec.ts`
Expected: FAIL — cannot find module `./show-cancellation-gate.service`

- [ ] **Step 3: Create the service (tier resolution + status read only — write methods come in Task 7)**

```typescript
import { Injectable } from '@nestjs/common';
import type { AuditWithTargets } from '@/models/audit/schemas/audit.schema';

import { CANCELLATION_GATE_CONFIG, type GateKind } from '@eridu/api-types/shows';

import { AuditService } from '@/models/audit/audit.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

export type ActorTier = 'manager' | 'duty_manager';

export type GateAuditMetadata = {
  field: 'show_status';
  event: 'opened' | 'note_updated' | 'resolved';
  gate_kind: GateKind;
  old_value: string | null;
  new_value: string | null;
  reason_category?: string;
  actor_uid: string;
  actor_name: string;
};

export type CancellationHistoryEntryResult = {
  event: 'opened' | 'note_updated' | 'resolved';
  actor: { uid: string; name: string } | null;
  at: Date;
  note: string | null;
  outcome: string | null;
};

export type CancellationStatusResult = {
  isPending: boolean;
  gateKind: GateKind | null;
  fromStatus: string | null;
  reasonCategory: string | null;
  reasonNote: string | null;
  openedBy: { uid: string; name: string } | null;
  openedAt: Date | null;
  allowedOutcomes: string[];
  history: CancellationHistoryEntryResult[];
};

const NOT_PENDING_RESULT: CancellationStatusResult = {
  isPending: false,
  gateKind: null,
  fromStatus: null,
  reasonCategory: null,
  reasonNote: null,
  openedBy: null,
  openedAt: null,
  allowedOutcomes: [],
  history: [],
};

// Audit.metadata is Prisma's untyped Json column (Prisma.JsonValue), not
// GateAuditMetadata directly — narrow via a plain function instead of a type
// predicate, since JsonValue and GateAuditMetadata don't structurally
// overlap enough for TS to narrow safely with `is`.
function getGateMetadata(audit: AuditWithTargets): GateAuditMetadata | null {
  const metadata = audit.metadata as unknown as Partial<GateAuditMetadata> | null;
  if (metadata?.field !== 'show_status') {
    return null;
  }
  return metadata as GateAuditMetadata;
}

/**
 * Owns the show cancellation gate: who may act (Manager tier is always
 * static-role; Duty Manager tier is the time-windowed shift flag, checked
 * only when Manager tier doesn't apply) and what the "live" pending snapshot
 * is. No Task/TaskTarget usage anywhere — Show.status is the gate state,
 * Audit is the only persistence. See
 * docs/superpowers/specs/2026-06-26-show-state-gate-v2-design.md.
 */
@Injectable()
export class ShowCancellationGateService {
  constructor(
    private readonly studioShiftService: StudioShiftService,
    private readonly auditService: AuditService,
  ) {}

  async resolveActorTier(
    studioUid: string,
    studioRole: string | undefined,
    actor: { id: bigint },
  ): Promise<ActorTier | null> {
    if (studioRole === 'admin' || studioRole === 'manager') {
      return 'manager';
    }

    const dutyManagerShift = await this.studioShiftService.findActiveDutyManager(studioUid, new Date());
    if (dutyManagerShift && dutyManagerShift.user.id === actor.id) {
      return 'duty_manager';
    }

    return null;
  }

  async getCancellationStatus(
    show: { id: bigint; showStatus: { systemKey: string | null } | null },
  ): Promise<CancellationStatusResult> {
    if (show.showStatus?.systemKey !== 'CANCELLED_PENDING_RESOLUTION') {
      return NOT_PENDING_RESULT;
    }

    const audits = await this.auditService.findForTargets([{ targetType: 'SHOW', targetId: show.id }]);
    const gateEntries = audits
      .map((audit) => ({ audit, meta: getGateMetadata(audit) }))
      .filter((entry): entry is { audit: AuditWithTargets; meta: GateAuditMetadata } => entry.meta !== null);

    // findForTargets orders createdAt desc; at most one unresolved "opened"
    // cycle can exist while Show.status is pending (re-opening is blocked
    // elsewhere), so the topmost "opened" row is the current cycle's origin.
    const opened = gateEntries.find((e) => e.meta.event === 'opened');
    const latestNote = gateEntries.find((e) => e.meta.event === 'opened' || e.meta.event === 'note_updated');

    if (!opened || !latestNote) {
      return { ...NOT_PENDING_RESULT, isPending: true };
    }

    const gateKind = opened.meta.gate_kind;
    const config = CANCELLATION_GATE_CONFIG[gateKind];

    return {
      isPending: true,
      gateKind,
      fromStatus: opened.meta.old_value,
      reasonCategory: opened.meta.reason_category ?? null,
      reasonNote: latestNote.audit.reason,
      openedBy: { uid: opened.meta.actor_uid, name: opened.meta.actor_name },
      openedAt: opened.audit.createdAt,
      allowedOutcomes: [...config.allowedOutcomes],
      history: gateEntries
        .slice()
        .reverse() // chronological (oldest first) for display
        .map((e) => ({
          event: e.meta.event,
          actor: { uid: e.meta.actor_uid, name: e.meta.actor_name },
          at: e.audit.createdAt,
          note: e.audit.reason,
          outcome: e.meta.event === 'resolved' ? e.meta.new_value : null,
        })),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- show-cancellation-gate.service.spec.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/erify_api/src/show-orchestration/show-cancellation-gate.service.ts apps/erify_api/src/show-orchestration/show-cancellation-gate.service.spec.ts
git commit -m "feat(erify_api): add gate tier resolution and Audit-derived status read"
```

---

### Task 7: `ShowCancellationGateService` — write-side transitions

**Files:**
- Modify: `apps/erify_api/src/show-orchestration/show-cancellation-gate.service.ts` (same file as Task 6 — extends the constructor and adds methods)
- Modify: `apps/erify_api/src/show-orchestration/show-cancellation-gate.service.spec.ts`

**Interfaces:**
- Consumes: `ShowRepository.updateStatusIfPending` (Task 3), `ShowStatusService.getShowStatusBySystemKey` (Task 1), `TaskTargetService.countActiveByShowId` (Task 2), `AuditService.create`, `GateNotificationService.notifyGateOpened`/`notifyGateResolved` (Task 5), `HttpError` from `@/lib/errors/http-error.util`.
- Produces (consumed by Task 9's `StudioShowManagementService`):
  - `openPending(params): Promise<void>` — Duty Manager tier, no outcome.
  - `resolveAtomic(params): Promise<void>` — Manager tier, single-call cancel+resolve.
  - `amendPendingNote(params): Promise<void>` — Duty Manager tier, while pending.
  - `resolvePending(params): Promise<void>` — sign-off, Manager tier only, guarded write.

All four throw `HttpError` (via `@/lib/errors/http-error.util`) on validation/guard failure — `OUTCOME_NOT_ALLOWED:<outcome>`, `LIVE_CANCELLATION_REQUIRES_OVERRIDE`, `ACTIVE_TASKS_REMAIN:<showId>` (with `{ activeTaskCount }` details, via `badRequestWithDetails`), `REASON_CATEGORY_NOT_ALLOWED:<category>`, or `SHOW_STATUS_CHANGED`/`SHOW_ALREADY_RESOLVED` (conflict, when the guarded write matched zero rows).

- [ ] **Step 1: Write the failing tests**

Add to `show-cancellation-gate.service.spec.ts` (extend the existing mock setup — add the new mocked dependencies to the `Test.createTestingModule` providers list alongside `studioShiftServiceMock`/`auditServiceMock`):

```typescript
// Add these mocks alongside the existing ones in the same describe block's setup:
const showRepositoryMock = { updateStatusIfPending: jest.fn() };
const showStatusServiceMock = { getShowStatusBySystemKey: jest.fn() };
const taskTargetServiceMock = { countActiveByShowId: jest.fn() };
const gateNotificationServiceMock = { notifyGateOpened: jest.fn(), notifyGateResolved: jest.fn() };

// Update the providers array in beforeEach to also include:
// { provide: ShowRepository, useValue: showRepositoryMock },
// { provide: ShowStatusService, useValue: showStatusServiceMock },
// { provide: TaskTargetService, useValue: taskTargetServiceMock },
// { provide: GateNotificationService, useValue: gateNotificationServiceMock },

const actor = { id: 5n, uid: 'user_abc123', name: 'Jane Duty' };
const show = { id: 1n, uid: 'show_xyz' } as Show;
const statusByKey: Record<string, { id: bigint }> = {
  CONFIRMED: { id: 2n },
  CANCELLED_PENDING_RESOLUTION: { id: 6n },
  CANCELLED: { id: 5n },
  COMPLETED: { id: 4n },
};

beforeEach(() => {
  showStatusServiceMock.getShowStatusBySystemKey.mockImplementation(
    async (key: string) => statusByKey[key] ?? null,
  );
});

describe('openPending', () => {
  it('rejects a reason category not in the gate config', async () => {
    await expect(
      service.openPending({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        reasonCategory: 'NOT_A_REAL_CATEGORY',
        reasonNote: 'note',
        actor,
      }),
    ).rejects.toThrow(/REASON_CATEGORY_NOT_ALLOWED/);
    expect(showRepositoryMock.updateStatusIfPending).not.toHaveBeenCalled();
  });

  it('writes an opened audit row and moves the show to pending', async () => {
    showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

    await service.openPending({
      show,
      gateKind: 'show_cancellation',
      fromStatusSystemKey: 'CONFIRMED',
      reasonCategory: 'EQUIPMENT_FAILURE',
      reasonNote: 'Camera failed mid-show',
      actor,
    });

    expect(showRepositoryMock.updateStatusIfPending).toHaveBeenCalledWith(
      1n,
      2n,
      { showStatus: { connect: { id: 6n } } },
    );
    expect(auditServiceMock.create).toHaveBeenCalledWith({
      action: 'OVERRIDE',
      actorId: 5n,
      reason: 'Camera failed mid-show',
      metadata: {
        field: 'show_status',
        event: 'opened',
        gate_kind: 'show_cancellation',
        old_value: 'CONFIRMED',
        new_value: 'CANCELLED_PENDING_RESOLUTION',
        reason_category: 'EQUIPMENT_FAILURE',
        actor_uid: 'user_abc123',
        actor_name: 'Jane Duty',
      },
      targets: [{ targetType: 'SHOW', targetId: 1n }],
    });
    expect(gateNotificationServiceMock.notifyGateOpened).toHaveBeenCalledWith(
      show,
      'show_cancellation',
      { category: 'EQUIPMENT_FAILURE', note: 'Camera failed mid-show' },
      actor,
    );
  });

  it('throws SHOW_STATUS_CHANGED when the guarded write matches no rows', async () => {
    showRepositoryMock.updateStatusIfPending.mockResolvedValue(false);

    await expect(
      service.openPending({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'note',
        actor,
      }),
    ).rejects.toThrow(/SHOW_STATUS_CHANGED/);
    expect(auditServiceMock.create).not.toHaveBeenCalled();
  });
});

describe('resolveAtomic', () => {
  it('rejects CANCELLED when from_status is LIVE', async () => {
    await expect(
      service.resolveAtomic({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'LIVE',
        outcome: 'CANCELLED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'note',
        actor,
      }),
    ).rejects.toThrow(/LIVE_CANCELLATION_REQUIRES_OVERRIDE/);
  });

  it('rejects CANCELLED when active tasks remain, with the count in details', async () => {
    taskTargetServiceMock.countActiveByShowId.mockResolvedValue(3);

    await expect(
      service.resolveAtomic({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'CANCELLED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'note',
        actor,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'ACTIVE_TASKS_REMAIN:1',
        details: { activeTaskCount: 3 },
      }),
    });
  });

  it('does not check active tasks for COMPLETED (not in outcomesRequiringNoActiveTasks)', async () => {
    showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

    await service.resolveAtomic({
      show,
      gateKind: 'show_cancellation',
      fromStatusSystemKey: 'CONFIRMED',
      outcome: 'COMPLETED',
      reasonCategory: 'EQUIPMENT_FAILURE',
      reasonNote: 'Ran most of the show',
      actor,
    });

    expect(taskTargetServiceMock.countActiveByShowId).not.toHaveBeenCalled();
  });

  it('moves the show directly to the outcome and writes one resolved audit row', async () => {
    taskTargetServiceMock.countActiveByShowId.mockResolvedValue(0);
    showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

    await service.resolveAtomic({
      show,
      gateKind: 'show_cancellation',
      fromStatusSystemKey: 'CONFIRMED',
      outcome: 'CANCELLED',
      reasonCategory: 'EQUIPMENT_FAILURE',
      reasonNote: 'Camera failed mid-show',
      actor,
    });

    expect(showRepositoryMock.updateStatusIfPending).toHaveBeenCalledWith(
      1n,
      2n,
      { showStatus: { connect: { id: 5n } } },
    );
    expect(auditServiceMock.create).toHaveBeenCalledTimes(1);
    expect(auditServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ event: 'resolved', old_value: 'CONFIRMED', new_value: 'CANCELLED' }),
      }),
    );
    expect(gateNotificationServiceMock.notifyGateResolved).toHaveBeenCalledWith(show, 'show_cancellation', 'CANCELLED', actor);
  });
});

describe('amendPendingNote', () => {
  it('writes a note_updated audit row without old/new values', async () => {
    await service.amendPendingNote({
      showId: 1n,
      gateKind: 'show_cancellation',
      reasonNote: 'Actually two cameras failed',
      actor,
    });

    expect(auditServiceMock.create).toHaveBeenCalledWith({
      action: 'OVERRIDE',
      actorId: 5n,
      reason: 'Actually two cameras failed',
      metadata: {
        field: 'show_status',
        event: 'note_updated',
        gate_kind: 'show_cancellation',
        old_value: null,
        new_value: null,
        actor_uid: 'user_abc123',
        actor_name: 'Jane Duty',
      },
      targets: [{ targetType: 'SHOW', targetId: 1n }],
    });
  });
});

describe('resolvePending', () => {
  it('rejects an outcome not allowed for the gate kind', async () => {
    await expect(
      service.resolvePending({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'RESTORE_PREVIOUS',
        resolutionNotes: 'note',
        actor,
      }),
    ).rejects.toThrow(/OUTCOME_NOT_ALLOWED/);
  });

  it('resolves RESTORE_PREVIOUS by reverting to the captured from_status', async () => {
    showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

    await service.resolvePending({
      show,
      gateKind: 'schedule_publish_removal',
      fromStatusSystemKey: 'CONFIRMED',
      outcome: 'RESTORE_PREVIOUS',
      resolutionNotes: 'Schedule sync error, resuming.',
      actor,
    });

    expect(showRepositoryMock.updateStatusIfPending).toHaveBeenCalledWith(
      1n,
      6n,
      { showStatus: { connect: { id: 2n } } },
    );
    expect(auditServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ event: 'resolved', old_value: 'CANCELLED_PENDING_RESOLUTION', new_value: 'CONFIRMED' }),
      }),
    );
  });

  it('throws SHOW_ALREADY_RESOLVED when the guarded write matches no rows', async () => {
    showRepositoryMock.updateStatusIfPending.mockResolvedValue(false);

    await expect(
      service.resolvePending({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'CANCELLED',
        resolutionNotes: 'note',
        actor,
      }),
    ).rejects.toThrow(/SHOW_ALREADY_RESOLVED/);
  });
});
```

(Add `import type { Show } from '@prisma/client';`, `import { ShowRepository } from '@/models/show/show.repository';`, `import { ShowStatusService } from '@/models/show-status/show-status.service';`, `import { TaskTargetService } from '@/models/task-target/task-target.service';`, and `import { GateNotificationService } from './gate-notification.service';` to the spec file's imports.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- show-cancellation-gate.service.spec.ts`
Expected: FAIL — `service.openPending is not a function` (etc.)

- [ ] **Step 3: Extend the constructor and add the methods**

In `show-cancellation-gate.service.ts`, change the constructor and add imports:

```typescript
import { Injectable } from '@nestjs/common';
import type { Show } from '@prisma/client';

import { CANCELLATION_GATE_CONFIG, type GateKind, type GateOutcome } from '@eridu/api-types/shows';

import { GateNotificationService } from './gate-notification.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { AuditService } from '@/models/audit/audit.service';
import type { AuditWithTargets } from '@/models/audit/schemas/audit.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
```

```typescript
  constructor(
    private readonly studioShiftService: StudioShiftService,
    private readonly auditService: AuditService,
    private readonly showRepository: ShowRepository,
    private readonly showStatusService: ShowStatusService,
    private readonly taskTargetService: TaskTargetService,
    private readonly gateNotificationService: GateNotificationService,
  ) {}
```

Add these methods after `getCancellationStatus`:

```typescript
  async openPending(params: {
    show: Show;
    gateKind: GateKind;
    fromStatusSystemKey: string;
    reasonCategory: string;
    reasonNote: string;
    actor: { id: bigint; uid: string; name: string };
  }): Promise<void> {
    const { show, gateKind, fromStatusSystemKey, reasonCategory, reasonNote, actor } = params;
    this.assertReasonCategoryAllowed(gateKind, reasonCategory);

    const [fromStatus, pendingStatus] = await Promise.all([
      this.requireShowStatusBySystemKey(fromStatusSystemKey),
      this.requireShowStatusBySystemKey('CANCELLED_PENDING_RESOLUTION'),
    ]);

    const updated = await this.showRepository.updateStatusIfPending(show.id, fromStatus.id, {
      showStatus: { connect: { id: pendingStatus.id } },
    });
    if (!updated) {
      throw HttpError.conflict('SHOW_STATUS_CHANGED');
    }

    await this.writeGateAudit({
      showId: show.id,
      gateKind,
      event: 'opened',
      oldValue: fromStatusSystemKey,
      newValue: 'CANCELLED_PENDING_RESOLUTION',
      reasonCategory,
      note: reasonNote,
      actor,
    });
    this.gateNotificationService.notifyGateOpened(show, gateKind, { category: reasonCategory, note: reasonNote }, actor);
  }

  async resolveAtomic(params: {
    show: Show;
    gateKind: GateKind;
    fromStatusSystemKey: string;
    outcome: GateOutcome;
    reasonCategory: string;
    reasonNote: string;
    actor: { id: bigint; uid: string; name: string };
  }): Promise<void> {
    const { show, gateKind, fromStatusSystemKey, outcome, reasonCategory, reasonNote, actor } = params;
    this.assertOutcomeAllowed(gateKind, outcome, fromStatusSystemKey);
    await this.assertActiveTaskGuard(gateKind, outcome, show.id);

    const [fromStatus, targetStatus] = await Promise.all([
      this.requireShowStatusBySystemKey(fromStatusSystemKey),
      this.requireShowStatusBySystemKey(outcome),
    ]);

    const updated = await this.showRepository.updateStatusIfPending(show.id, fromStatus.id, {
      showStatus: { connect: { id: targetStatus.id } },
    });
    if (!updated) {
      throw HttpError.conflict('SHOW_STATUS_CHANGED');
    }

    await this.writeGateAudit({
      showId: show.id,
      gateKind,
      event: 'resolved',
      oldValue: fromStatusSystemKey,
      newValue: outcome,
      reasonCategory,
      note: reasonNote,
      actor,
    });
    this.gateNotificationService.notifyGateResolved(show, gateKind, outcome, actor);
  }

  async amendPendingNote(params: {
    showId: bigint;
    gateKind: GateKind;
    reasonNote: string;
    actor: { id: bigint; uid: string; name: string };
  }): Promise<void> {
    await this.writeGateAudit({
      showId: params.showId,
      gateKind: params.gateKind,
      event: 'note_updated',
      oldValue: null,
      newValue: null,
      note: params.reasonNote,
      actor: params.actor,
    });
  }

  async resolvePending(params: {
    show: Show;
    gateKind: GateKind;
    fromStatusSystemKey: string;
    outcome: string;
    resolutionNotes: string;
    actor: { id: bigint; uid: string; name: string };
  }): Promise<void> {
    const { show, gateKind, fromStatusSystemKey, outcome, resolutionNotes, actor } = params;
    this.assertOutcomeAllowed(gateKind, outcome, fromStatusSystemKey);
    await this.assertActiveTaskGuard(gateKind, outcome, show.id);

    const targetSystemKey = outcome === 'RESTORE_PREVIOUS' ? fromStatusSystemKey : outcome;
    const [pendingStatus, targetStatus] = await Promise.all([
      this.requireShowStatusBySystemKey('CANCELLED_PENDING_RESOLUTION'),
      this.requireShowStatusBySystemKey(targetSystemKey),
    ]);

    const updated = await this.showRepository.updateStatusIfPending(show.id, pendingStatus.id, {
      showStatus: { connect: { id: targetStatus.id } },
    });
    if (!updated) {
      throw HttpError.conflict('SHOW_ALREADY_RESOLVED');
    }

    await this.writeGateAudit({
      showId: show.id,
      gateKind,
      event: 'resolved',
      oldValue: 'CANCELLED_PENDING_RESOLUTION',
      newValue: targetSystemKey,
      note: resolutionNotes,
      actor,
    });
    this.gateNotificationService.notifyGateResolved(show, gateKind, outcome, actor);
  }

  private assertReasonCategoryAllowed(gateKind: GateKind, reasonCategory: string): void {
    const config = CANCELLATION_GATE_CONFIG[gateKind];
    if (!(config.reasonOptions as readonly string[]).includes(reasonCategory)) {
      throw HttpError.badRequest(`REASON_CATEGORY_NOT_ALLOWED:${reasonCategory}`);
    }
  }

  private assertOutcomeAllowed(gateKind: GateKind, outcome: string, fromStatusSystemKey: string): void {
    const config = CANCELLATION_GATE_CONFIG[gateKind];
    if (!(config.allowedOutcomes as readonly string[]).includes(outcome)) {
      throw HttpError.badRequest(`OUTCOME_NOT_ALLOWED:${outcome}`);
    }
    if (outcome === 'CANCELLED' && fromStatusSystemKey === 'LIVE') {
      throw HttpError.badRequest('LIVE_CANCELLATION_REQUIRES_OVERRIDE');
    }
  }

  private async assertActiveTaskGuard(gateKind: GateKind, outcome: string, showId: bigint): Promise<void> {
    const config = CANCELLATION_GATE_CONFIG[gateKind];
    if (!(config.outcomesRequiringNoActiveTasks as readonly string[]).includes(outcome)) {
      return;
    }
    const activeTaskCount = await this.taskTargetService.countActiveByShowId(showId);
    if (activeTaskCount > 0) {
      throw HttpError.badRequestWithDetails(`ACTIVE_TASKS_REMAIN:${showId}`, { activeTaskCount });
    }
  }

  private async requireShowStatusBySystemKey(systemKey: string): Promise<{ id: bigint }> {
    const status = await this.showStatusService.getShowStatusBySystemKey(systemKey);
    if (!status) {
      throw HttpError.notFound('ShowStatus', systemKey);
    }
    return status;
  }

  private async writeGateAudit(params: {
    showId: bigint;
    gateKind: GateKind;
    event: GateAuditMetadata['event'];
    oldValue: string | null;
    newValue: string | null;
    reasonCategory?: string;
    note: string;
    actor: { id: bigint; uid: string; name: string };
  }): Promise<void> {
    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: params.actor.id,
      reason: params.note,
      metadata: {
        field: 'show_status',
        event: params.event,
        gate_kind: params.gateKind,
        old_value: params.oldValue,
        new_value: params.newValue,
        ...(params.reasonCategory !== undefined && { reason_category: params.reasonCategory }),
        actor_uid: params.actor.uid,
        actor_name: params.actor.name,
      },
      targets: [{ targetType: 'SHOW', targetId: params.showId }],
    });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- show-cancellation-gate.service.spec.ts`
Expected: PASS (all tests from Task 6 + Task 7)

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter erify_api typecheck`
Expected: PASS — this surfaces any remaining `GateAuditMetadata`/`Show` type mismatches before wiring this service into the controller layer.

- [ ] **Step 6: Commit**

```bash
git add apps/erify_api/src/show-orchestration/show-cancellation-gate.service.ts apps/erify_api/src/show-orchestration/show-cancellation-gate.service.spec.ts
git commit -m "feat(erify_api): add show cancellation gate open/resolve/amend transitions"
```

---

### Task 8: Wire `ShowCancellationGateService` into `ShowOrchestrationModule`

**Files:**
- Modify: `apps/erify_api/src/show-orchestration/show-orchestration.module.ts`

**Interfaces:**
- Produces: `ShowCancellationGateService` and `GateNotificationService` become injectable anywhere that imports `ShowOrchestrationModule` (Task 9's `StudioShowManagementService` lives in `studio-show.module.ts`, which already imports `ShowOrchestrationModule` per the existing controller constructor — verify this in Step 1).

- [ ] **Step 1: Confirm the existing import relationship**

```bash
grep -n "ShowOrchestrationModule" apps/erify_api/src/studios/studio-show/studio-show.module.ts
```
Expected: a match — `StudioShowModule` already imports `ShowOrchestrationModule` (it's already a constructor dependency of `StudioShowController` via `ShowOrchestrationService`). If this grep finds nothing, add `ShowOrchestrationModule` to `StudioShowModule`'s `imports` array as part of this step.

- [ ] **Step 2: Add the new providers and required module imports**

In `show-orchestration.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { CreatorCompensationService } from './creator-compensation.service';
import { GateNotificationService } from './gate-notification.service';
import { ShowCancellationGateService } from './show-cancellation-gate.service';
import { ShowCreatorAssignmentService } from './show-creator-assignment.service';
import { ShowOrchestrationService } from './show-orchestration.service';
import { ShowPlatformAssignmentService } from './show-platform-assignment.service';
import { ShowRunReviewService } from './show-run-review.service';

import { AuditModule } from '@/models/audit/audit.module';
import { CompensationLineItemModule } from '@/models/compensation-line-item/compensation-line-item.module';
import { CreatorModule } from '@/models/creator/creator.module';
import { PlatformModule } from '@/models/platform/platform.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { StudioModule } from '@/models/studio/studio.module';
import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';
import { TaskModule } from '@/models/task/task.module';
import { TaskTargetModule } from '@/models/task-target/task-target.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    CompensationLineItemModule,
    ShowModule,
    ShowCreatorModule,
    ShowPlatformModule,
    ShowStatusModule,
    CreatorModule,
    PlatformModule,
    StudioModule,
    StudioCreatorModelModule,
    StudioShiftModule,
    TaskModule,
    TaskTargetModule,
  ],
  providers: [
    ShowOrchestrationService,
    ShowRunReviewService,
    CreatorCompensationService,
    ShowPlatformAssignmentService,
    ShowCreatorAssignmentService,
    ShowCancellationGateService,
    GateNotificationService,
  ],
  exports: [ShowOrchestrationService, ShowRunReviewService, CreatorCompensationService, ShowCancellationGateService],
})
export class ShowOrchestrationModule {}
```

(Only `AuditModule`, `ShowStatusModule`, and `StudioShiftModule` are newly added imports — `ShowModule` already provides `ShowRepository`, and `TaskTargetModule` already provides `TaskTargetService`, both already imported above for the pre-existing providers.)

- [ ] **Step 3: Verify the module compiles and the app boots**

```bash
pnpm --filter erify_api typecheck
pnpm --filter erify_api test
```
Expected: typecheck passes; full test suite still green (this task has no new test of its own — it's pure DI wiring, verified by the app's existing bootstrap/module tests not breaking, plus Task 9's controller test exercising the real module graph).

- [ ] **Step 4: Commit**

```bash
git add apps/erify_api/src/show-orchestration/show-orchestration.module.ts
git commit -m "feat(erify_api): wire ShowCancellationGateService into ShowOrchestrationModule"
```

---

### Task 9: `StudioShowManagementService` — cancel/resolve/amend + the bypass fix

**Files:**
- Modify: `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show-management.service.spec.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show.module.ts` (add `UserModule` import — `StudioShowManagementService` now resolves the actor via `UserService.getUserByExtId`)

**Interfaces:**
- Consumes: `ShowCancellationGateService.{resolveActorTier, openPending, resolveAtomic, amendPendingNote, resolvePending, getCancellationStatus}` (Tasks 6–7), `UserService.getUserByExtId` (existing).
- Produces (consumed by Task 10's controller):
  - `cancelShowWithResolution(studioUid, showUid, dto: CancelShowWithResolutionInput, studioRole: string | undefined, actorExtId: string): Promise<ShowWithPayload<...>>`
  - `resolveShowCancellation(studioUid, showUid, dto: ResolveShowCancellationInput, studioRole: string | undefined, actorExtId: string): Promise<ShowWithPayload<...>>`
  - `amendCancellationNote(studioUid, showUid, dto: AmendCancellationNoteInput, studioRole: string | undefined, actorExtId: string): Promise<CancellationStatusResult>`
  - `getCancellationStatus(studioUid, showUid): Promise<CancellationStatusResult>`
  - `updateShow` gains the bypass guard (existing signature unchanged).

- [ ] **Step 1: Write the failing tests**

Add to the mock declarations at the top of `studio-show-management.service.spec.ts` (alongside the existing `showOrchestrationServiceMock`):

```typescript
  const userServiceMock = {
    getUserByExtId: jest.fn(),
  };
  const showCancellationGateServiceMock = {
    resolveActorTier: jest.fn(),
    openPending: jest.fn(),
    resolveAtomic: jest.fn(),
    amendPendingNote: jest.fn(),
    resolvePending: jest.fn(),
    getCancellationStatus: jest.fn(),
  };
```

Add both to the `providers` array in the `Test.createTestingModule` call:

```typescript
        { provide: UserService, useValue: userServiceMock },
        { provide: ShowCancellationGateService, useValue: showCancellationGateServiceMock },
```

Add to the imports at the top of the file:

```typescript
import { UserService } from '@/models/user/user.service';
import { ShowCancellationGateService } from '@/show-orchestration/show-cancellation-gate.service';
```

Add this near the other `it('rejects update ...')` blocks (flat, matching the file's existing style — no nested `describe` is used elsewhere in this file for `updateShow`):

```typescript
  it('rejects updateShow when changing show_status_id while a cancellation gate is pending', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      startTime: new Date('2026-01-01T00:00:00.000Z'),
      endTime: new Date('2026-01-01T01:00:00.000Z'),
      showStatus: { uid: 'shst_pending', name: 'cancelled_pending_resolution', systemKey: 'CANCELLED_PENDING_RESOLUTION' },
    });

    await expect(
      service.updateShow('std_123', 'show_123', { showStatusId: 'shst_cancelled' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'SHOW_STATUS_LOCKED_BY_PENDING_CANCELLATION' }),
    });
    expect(showRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('allows updateShow to change show_status_id when no gate is pending', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      startTime: new Date('2026-01-01T00:00:00.000Z'),
      endTime: new Date('2026-01-01T01:00:00.000Z'),
      showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
    });
    showRepositoryMock.update.mockResolvedValue({ uid: 'show_123' });
    showServiceMock.getShowById.mockResolvedValue({ uid: 'show_123' });

    await service.updateShow('std_123', 'show_123', { showStatusId: 'shst_cancelled' });

    expect(showRepositoryMock.update).toHaveBeenCalled();
  });
```

Now add a new nested `describe` block (new methods, so a nested block is reasonable even though `updateShow`'s existing tests stay flat) anywhere inside the top-level `describe('studioShowManagementService', ...)`:

```typescript
  describe('cancelShowWithResolution', () => {
    const pendingEligibleShow = {
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
    };
    const actorUser = { id: BigInt(5), uid: 'user_abc123', extId: 'ext_5', name: 'Jane Duty' };

    beforeEach(() => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue(pendingEligibleShow);
      userServiceMock.getUserByExtId.mockResolvedValue(actorUser);
      showServiceMock.getShowById.mockResolvedValue({ uid: 'show_123' });
    });

    it('rejects when the show status is not eligible for cancellation', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        ...pendingEligibleShow,
        showStatus: { uid: 'shst_draft', name: 'draft', systemKey: 'DRAFT' },
      });

      await expect(
        service.cancelShowWithResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
        }, 'manager', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'SHOW_CANCELLATION_NOT_ALLOWED' }),
      });
    });

    it('rejects when the actor resolves to no tier', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue(null);

      await expect(
        service.cancelShowWithResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
        }, 'member', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'CANCELLATION_NOT_AUTHORIZED' }),
      });
    });

    it('Manager tier requires outcome', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('manager');

      await expect(
        service.cancelShowWithResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
        }, 'manager', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'OUTCOME_REQUIRED' }),
      });
      expect(showCancellationGateServiceMock.resolveAtomic).not.toHaveBeenCalled();
    });

    it('Manager tier with outcome calls resolveAtomic', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('manager');

      await service.cancelShowWithResolution('std_123', 'show_123', {
        reason_category: 'EQUIPMENT_FAILURE',
        reason_note: 'Camera failed mid-show',
        outcome: 'CANCELLED',
      }, 'manager', 'ext_5');

      expect(showCancellationGateServiceMock.resolveAtomic).toHaveBeenCalledWith({
        show: pendingEligibleShow,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'CANCELLED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed mid-show',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Duty' },
      });
      expect(showCancellationGateServiceMock.openPending).not.toHaveBeenCalled();
    });

    it('Duty Manager tier rejects an outcome field', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('duty_manager');

      await expect(
        service.cancelShowWithResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
          outcome: 'CANCELLED',
        }, 'member', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'OUTCOME_NOT_ALLOWED_FOR_DUTY_MANAGER' }),
      });
      expect(showCancellationGateServiceMock.openPending).not.toHaveBeenCalled();
    });

    it('Duty Manager tier without outcome calls openPending', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('duty_manager');

      await service.cancelShowWithResolution('std_123', 'show_123', {
        reason_category: 'EQUIPMENT_FAILURE',
        reason_note: 'Camera failed mid-show',
      }, 'member', 'ext_5');

      expect(showCancellationGateServiceMock.openPending).toHaveBeenCalledWith({
        show: pendingEligibleShow,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed mid-show',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Duty' },
      });
    });
  });

  describe('resolveShowCancellation', () => {
    const pendingShow = {
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      showStatus: { uid: 'shst_pending', name: 'cancelled_pending_resolution', systemKey: 'CANCELLED_PENDING_RESOLUTION' },
    };
    const actorUser = { id: BigInt(5), uid: 'user_abc123', extId: 'ext_5', name: 'Jane Manager' };

    beforeEach(() => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue(pendingShow);
      userServiceMock.getUserByExtId.mockResolvedValue(actorUser);
      showServiceMock.getShowById.mockResolvedValue({ uid: 'show_123' });
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('manager');
      showCancellationGateServiceMock.getCancellationStatus.mockResolvedValue({
        isPending: true,
        gateKind: 'show_cancellation',
        fromStatus: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed',
        openedBy: { uid: 'user_other', name: 'Duty Bob' },
        openedAt: new Date(),
        allowedOutcomes: ['CANCELLED', 'COMPLETED'],
        history: [],
      });
    });

    it('rejects when the show is not currently pending', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        ...pendingShow,
        showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
      });

      await expect(
        service.resolveShowCancellation('std_123', 'show_123', {
          outcome: 'CANCELLED',
          resolution_notes: 'note',
        }, 'manager', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'SHOW_CANCELLATION_NOT_PENDING' }),
      });
    });

    it('rejects sign-off from a Duty Manager tier', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('duty_manager');

      await expect(
        service.resolveShowCancellation('std_123', 'show_123', {
          outcome: 'CANCELLED',
          resolution_notes: 'note',
        }, 'member', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'SIGN_OFF_REQUIRES_MANAGER' }),
      });
    });

    it('calls resolvePending with the derived from_status and gate kind', async () => {
      await service.resolveShowCancellation('std_123', 'show_123', {
        outcome: 'CANCELLED',
        resolution_notes: 'Confirmed no production happened',
      }, 'manager', 'ext_5');

      expect(showCancellationGateServiceMock.resolvePending).toHaveBeenCalledWith({
        show: pendingShow,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'CANCELLED',
        resolutionNotes: 'Confirmed no production happened',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Manager' },
      });
    });
  });

  describe('amendCancellationNote', () => {
    const pendingShow = {
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      showStatus: { uid: 'shst_pending', name: 'cancelled_pending_resolution', systemKey: 'CANCELLED_PENDING_RESOLUTION' },
    };
    const actorUser = { id: BigInt(7), uid: 'user_def456', extId: 'ext_7', name: 'Bob Duty' };

    beforeEach(() => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue(pendingShow);
      userServiceMock.getUserByExtId.mockResolvedValue(actorUser);
      showCancellationGateServiceMock.getCancellationStatus.mockResolvedValue({
        isPending: true,
        gateKind: 'show_cancellation',
        fromStatus: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed',
        openedBy: { uid: 'user_other', name: 'Duty Bob' },
        openedAt: new Date(),
        allowedOutcomes: ['CANCELLED', 'COMPLETED'],
        history: [],
      });
    });

    it('rejects amendment from a Manager tier (Duty Manager only)', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('manager');

      await expect(
        service.amendCancellationNote('std_123', 'show_123', { reason_note: 'Updated' }, 'admin', 'ext_7'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'NOTE_AMEND_REQUIRES_DUTY_MANAGER' }),
      });
    });

    it('calls amendPendingNote for a Duty Manager tier', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('duty_manager');

      await service.amendCancellationNote('std_123', 'show_123', { reason_note: 'Actually two cameras failed' }, 'member', 'ext_7');

      expect(showCancellationGateServiceMock.amendPendingNote).toHaveBeenCalledWith({
        showId: BigInt(100),
        gateKind: 'show_cancellation',
        reasonNote: 'Actually two cameras failed',
        actor: { id: BigInt(7), uid: 'user_def456', name: 'Bob Duty' },
      });
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- studio-show-management.service.spec.ts`
Expected: FAIL — `service.cancelShowWithResolution is not a function` (and the `updateShow` bypass tests fail since the guard doesn't exist yet)

- [ ] **Step 3: Implement the bypass guard in `updateShow`**

In `studio-show-management.service.ts`, modify `updateShow`:

```typescript
  @Transactional()
  async updateShow(studioUid: string, showUid: string, dto: UpdateStudioShowDto) {
    const existingShow = await this.findStudioShowOrThrow(studioUid, showUid);
    if (dto.showStatusId !== undefined && existingShow.showStatus?.systemKey === 'CANCELLED_PENDING_RESOLUTION') {
      throw HttpError.badRequest('SHOW_STATUS_LOCKED_BY_PENDING_CANCELLATION');
    }
    await this.ensureStudioRoomBelongsToStudio(studioUid, dto.studioRoomId);
    // ... rest of the method is unchanged
```

- [ ] **Step 4: Add the three new methods**

In `studio-show-management.service.ts`, add the new constructor dependencies and methods. Update the constructor:

```typescript
  constructor(
    private readonly studioService: StudioService,
    private readonly studioRoomService: StudioRoomService,
    private readonly scheduleService: ScheduleService,
    private readonly showService: ShowService,
    private readonly showRepository: ShowRepository,
    private readonly platformRepository: PlatformRepository,
    private readonly showPlatformRepository: ShowPlatformRepository,
    private readonly showPlatformService: ShowPlatformService,
    private readonly showOrchestrationService: ShowOrchestrationService,
    private readonly userService: UserService,
    private readonly showCancellationGateService: ShowCancellationGateService,
  ) {}
```

Add the new methods after `getShowDetail`:

```typescript
  private static readonly CANCELLATION_INELIGIBLE_STATUSES = [
    'DRAFT',
    'CANCELLED_PENDING_RESOLUTION',
    'CANCELLED',
    'COMPLETED',
  ];

  @Transactional()
  async cancelShowWithResolution(
    studioUid: string,
    showUid: string,
    dto: CancelShowWithResolutionInput,
    studioRole: string | undefined,
    actorExtId: string,
  ) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const currentStatus = show.showStatus?.systemKey ?? null;
    if (currentStatus === null || StudioShowManagementService.CANCELLATION_INELIGIBLE_STATUSES.includes(currentStatus)) {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_ALLOWED');
    }

    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    const tier = await this.showCancellationGateService.resolveActorTier(studioUid, studioRole, { id: actor.id });
    if (!tier) {
      throw HttpError.forbidden('CANCELLATION_NOT_AUTHORIZED');
    }

    const actorRef = { id: actor.id, uid: actor.uid, name: actor.name };

    if (tier === 'manager') {
      if (!dto.outcome) {
        throw HttpError.badRequest('OUTCOME_REQUIRED');
      }
      await this.showCancellationGateService.resolveAtomic({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: currentStatus,
        outcome: dto.outcome,
        reasonCategory: dto.reason_category,
        reasonNote: dto.reason_note,
        actor: actorRef,
      });
    } else {
      if (dto.outcome) {
        throw HttpError.badRequest('OUTCOME_NOT_ALLOWED_FOR_DUTY_MANAGER');
      }
      await this.showCancellationGateService.openPending({
        show,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: currentStatus,
        reasonCategory: dto.reason_category,
        reasonNote: dto.reason_note,
        actor: actorRef,
      });
    }

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  @Transactional()
  async resolveShowCancellation(
    studioUid: string,
    showUid: string,
    dto: ResolveShowCancellationInput,
    studioRole: string | undefined,
    actorExtId: string,
  ) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    if (show.showStatus?.systemKey !== 'CANCELLED_PENDING_RESOLUTION') {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_PENDING');
    }

    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    const tier = await this.showCancellationGateService.resolveActorTier(studioUid, studioRole, { id: actor.id });
    if (tier !== 'manager') {
      throw HttpError.forbidden('SIGN_OFF_REQUIRES_MANAGER');
    }

    const status = await this.showCancellationGateService.getCancellationStatus(show);
    if (!status.isPending || !status.gateKind || !status.fromStatus) {
      throw HttpError.notFound('ShowCancellationGate', showUid);
    }

    await this.showCancellationGateService.resolvePending({
      show,
      gateKind: status.gateKind,
      fromStatusSystemKey: status.fromStatus,
      outcome: dto.outcome,
      resolutionNotes: dto.resolution_notes,
      actor: { id: actor.id, uid: actor.uid, name: actor.name },
    });

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  @Transactional()
  async amendCancellationNote(
    studioUid: string,
    showUid: string,
    dto: AmendCancellationNoteInput,
    studioRole: string | undefined,
    actorExtId: string,
  ) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    if (show.showStatus?.systemKey !== 'CANCELLED_PENDING_RESOLUTION') {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_PENDING');
    }

    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    const tier = await this.showCancellationGateService.resolveActorTier(studioUid, studioRole, { id: actor.id });
    if (tier !== 'duty_manager') {
      throw HttpError.forbidden('NOTE_AMEND_REQUIRES_DUTY_MANAGER');
    }

    const status = await this.showCancellationGateService.getCancellationStatus(show);
    if (!status.gateKind) {
      throw HttpError.notFound('ShowCancellationGate', showUid);
    }

    await this.showCancellationGateService.amendPendingNote({
      showId: show.id,
      gateKind: status.gateKind,
      reasonNote: dto.reason_note,
      actor: { id: actor.id, uid: actor.uid, name: actor.name },
    });

    return this.showCancellationGateService.getCancellationStatus(show);
  }

  async getCancellationStatus(studioUid: string, showUid: string) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    return this.showCancellationGateService.getCancellationStatus(show);
  }
```

Add these imports to the top of the file:

```typescript
import type {
  AmendCancellationNoteInput,
  CancelShowWithResolutionInput,
  ResolveShowCancellationInput,
} from '@eridu/api-types/shows';

import { UserService } from '@/models/user/user.service';
import { ShowCancellationGateService } from '@/show-orchestration/show-cancellation-gate.service';
```

- [ ] **Step 5: Add `UserModule` to `StudioShowModule`**

In `studio-show.module.ts`, add the import:

```typescript
import { UserModule } from '@/models/user/user.module';
```

And add `UserModule` to the `imports` array.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- studio-show-management.service.spec.ts`
Expected: PASS (all existing tests plus the new ones)

- [ ] **Step 7: Run typecheck and the full erify_api test suite**

```bash
pnpm --filter erify_api typecheck
pnpm --filter erify_api test
```
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add apps/erify_api/src/studios/studio-show/
git commit -m "feat(erify_api): wire cancel/resolve/amend into StudioShowManagementService, close status bypass"
```

---

### Task 10: Controller endpoints

**Files:**
- Create: `apps/erify_api/src/studios/studio-show/schemas/studio-show-cancellation.schema.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show.controller.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show.controller.spec.ts`

**Interfaces:**
- Produces: four new routes on `StudioShowController`:
  - `POST /studios/:studioId/shows/:id/cancel-with-resolution` (any studio member; service enforces the tier)
  - `POST /studios/:studioId/shows/:id/resolve-cancellation` (any studio member; service enforces Manager tier)
  - `PATCH /studios/:studioId/shows/:id/cancellation-note` (any studio member; service enforces Duty Manager tier)
  - `GET /studios/:studioId/shows/:id/cancellation-status` (any studio member; read-only)

- [ ] **Step 1: Create the DTO file**

```typescript
import { createZodDto } from 'nestjs-zod';

import {
  amendCancellationNoteSchema,
  cancellationStatusResponseSchema,
  cancelShowWithResolutionSchema,
  resolveShowCancellationSchema,
} from '@eridu/api-types/shows';

export class CancelShowWithResolutionDto extends createZodDto(cancelShowWithResolutionSchema) {}
export class ResolveShowCancellationDto extends createZodDto(resolveShowCancellationSchema) {}
export class AmendCancellationNoteDto extends createZodDto(amendCancellationNoteSchema) {}
export const cancellationStatusResponseDto = cancellationStatusResponseSchema;
```

- [ ] **Step 2: Write the failing controller tests**

Add to `studio-show.controller.spec.ts`. First extend `studioShowManagementServiceMock`:

```typescript
  const studioShowManagementServiceMock = {
    getShowDetail: jest.fn(),
    createShow: jest.fn(),
    updateShow: jest.fn(),
    deleteShow: jest.fn(),
    cancelShowWithResolution: jest.fn(),
    resolveShowCancellation: jest.fn(),
    amendCancellationNote: jest.fn(),
    getCancellationStatus: jest.fn(),
  };
```

Then add these tests anywhere inside the existing `describe('studioShowController', ...)` block:

```typescript
  describe('cancelWithResolution', () => {
    it('passes studioMembership.role and the actor ext_id through to the service', async () => {
      const request = { studioMembership: { role: STUDIO_ROLE.MANAGER } } as any;
      const user = { ext_id: 'ext_5' } as any;
      const body = { reason_category: 'EQUIPMENT_FAILURE', reason_note: 'note', outcome: 'CANCELLED' } as any;
      studioShowManagementServiceMock.cancelShowWithResolution.mockResolvedValue({ uid: 'show_123' });

      await controller.cancelWithResolution('std_123', 'show_123', body, user, request);

      expect(studioShowManagementServiceMock.cancelShowWithResolution).toHaveBeenCalledWith(
        'std_123',
        'show_123',
        body,
        STUDIO_ROLE.MANAGER,
        'ext_5',
      );
    });

    it('is open to any studio member at the decorator level (service enforces the actual tier)', () => {
      const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioShowController.prototype.cancelWithResolution);
      expect(roles).toEqual([]);
    });
  });

  describe('resolveCancellation', () => {
    it('passes studioMembership.role and the actor ext_id through to the service', async () => {
      const request = { studioMembership: { role: STUDIO_ROLE.MANAGER } } as any;
      const user = { ext_id: 'ext_5' } as any;
      const body = { outcome: 'CANCELLED', resolution_notes: 'note' } as any;
      studioShowManagementServiceMock.resolveShowCancellation.mockResolvedValue({ uid: 'show_123' });

      await controller.resolveCancellation('std_123', 'show_123', body, user, request);

      expect(studioShowManagementServiceMock.resolveShowCancellation).toHaveBeenCalledWith(
        'std_123',
        'show_123',
        body,
        STUDIO_ROLE.MANAGER,
        'ext_5',
      );
    });
  });

  describe('amendCancellationNote', () => {
    it('passes studioMembership.role and the actor ext_id through to the service', async () => {
      const request = { studioMembership: { role: STUDIO_ROLE.MEMBER } } as any;
      const user = { ext_id: 'ext_7' } as any;
      const body = { reason_note: 'Updated' } as any;
      studioShowManagementServiceMock.amendCancellationNote.mockResolvedValue({ isPending: true });

      await controller.amendCancellationNote('std_123', 'show_123', body, user, request);

      expect(studioShowManagementServiceMock.amendCancellationNote).toHaveBeenCalledWith(
        'std_123',
        'show_123',
        body,
        STUDIO_ROLE.MEMBER,
        'ext_7',
      );
    });
  });

  describe('cancellationStatus', () => {
    it('delegates to the service and maps the result to snake_case API shape', async () => {
      studioShowManagementServiceMock.getCancellationStatus.mockResolvedValue({
        isPending: false,
        gateKind: null,
        fromStatus: null,
        reasonCategory: null,
        reasonNote: null,
        openedBy: null,
        openedAt: null,
        allowedOutcomes: [],
        history: [],
      });

      const result = await controller.cancellationStatus('std_123', 'show_123');

      expect(studioShowManagementServiceMock.getCancellationStatus).toHaveBeenCalledWith('std_123', 'show_123');
      expect(result).toEqual({
        is_pending: false,
        gate_kind: null,
        from_status: null,
        reason_category: null,
        reason_note: null,
        opened_by: null,
        opened_at: null,
        allowed_outcomes: [],
        history: [],
      });
    });

    it('converts Date fields to ISO strings for a pending result with history', async () => {
      const openedAt = new Date('2026-06-25T16:14:30.201Z');
      studioShowManagementServiceMock.getCancellationStatus.mockResolvedValue({
        isPending: true,
        gateKind: 'show_cancellation',
        fromStatus: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed',
        openedBy: { uid: 'user_abc123', name: 'Jane Duty' },
        openedAt,
        allowedOutcomes: ['CANCELLED', 'COMPLETED'],
        history: [{ event: 'opened', actor: { uid: 'user_abc123', name: 'Jane Duty' }, at: openedAt, note: 'Camera failed', outcome: null }],
      });

      const result = await controller.cancellationStatus('std_123', 'show_123');

      expect(result.opened_at).toBe('2026-06-25T16:14:30.201Z');
      expect(result.history[0].at).toBe('2026-06-25T16:14:30.201Z');
    });
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- studio-show.controller.spec.ts`
Expected: FAIL — `controller.cancelWithResolution is not a function`

- [ ] **Step 4: Add the endpoints to the controller**

In `studio-show.controller.ts`, add to the imports:

```typescript
import {
  AmendCancellationNoteDto,
  CancelShowWithResolutionDto,
  cancellationStatusResponseDto,
  ResolveShowCancellationDto,
} from './schemas/studio-show-cancellation.schema';

import type { CancellationStatusResult } from '@/show-orchestration/show-cancellation-gate.service';
```

`@ZodResponse` applies `ZodSerializerDto(schema)` (from `nestjs-zod`), which calls `.parse()` on the return value — `cancellationStatusResponseSchema`'s `z.iso.datetime()` fields reject a `Date` instance (it expects a string), and the schema's keys are `snake_case` while `ShowCancellationGateService.getCancellationStatus` returns `camelCase`. This is the same problem `show.schema.ts`'s `transformShowToApi` already solves by hand for `Show` (`obj.startTime.toISOString()`) — not via Zod coercion. Add this mapper function below the imports, above the `@StudioProtected()` class decorator:

```typescript
function toCancellationStatusApiResponse(status: CancellationStatusResult) {
  return {
    is_pending: status.isPending,
    gate_kind: status.gateKind,
    from_status: status.fromStatus,
    reason_category: status.reasonCategory,
    reason_note: status.reasonNote,
    opened_by: status.openedBy,
    opened_at: status.openedAt?.toISOString() ?? null,
    allowed_outcomes: status.allowedOutcomes,
    history: status.history.map((entry) => ({
      event: entry.event,
      actor: entry.actor,
      at: entry.at.toISOString(),
      note: entry.note,
      outcome: entry.outcome,
    })),
  };
}
```

`cancelShowWithResolution`/`resolveShowCancellation` don't need this mapper — both return `ShowWithPayload<...>` via `showService.getShowById`, which already goes through the existing snake_case transform.

Add the four endpoints after the existing `tasks()` method:

```typescript
  @Post(':id/cancel-with-resolution')
  @StudioProtected() // any studio member — the service enforces Manager/Duty-Manager tier
  @ZodResponse(studioShowDetailDto)
  async cancelWithResolution(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Body() body: CancelShowWithResolutionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.studioShowManagementService.cancelShowWithResolution(
      studioId,
      id,
      body,
      request?.studioMembership?.role,
      user.ext_id,
    );
  }

  @Post(':id/resolve-cancellation')
  @StudioProtected() // any studio member — the service enforces Manager tier
  @ZodResponse(studioShowDetailDto)
  async resolveCancellation(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Body() body: ResolveShowCancellationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.studioShowManagementService.resolveShowCancellation(
      studioId,
      id,
      body,
      request?.studioMembership?.role,
      user.ext_id,
    );
  }

  @Patch(':id/cancellation-note')
  @StudioProtected() // any studio member — the service enforces Duty Manager tier
  @ZodResponse(cancellationStatusResponseDto)
  async amendCancellationNote(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Body() body: AmendCancellationNoteDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ) {
    const status = await this.studioShowManagementService.amendCancellationNote(
      studioId,
      id,
      body,
      request?.studioMembership?.role,
      user.ext_id,
    );
    return toCancellationStatusApiResponse(status);
  }

  @Get(':id/cancellation-status')
  @StudioProtected()
  @ZodResponse(cancellationStatusResponseDto)
  async cancellationStatus(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    const status = await this.studioShowManagementService.getCancellationStatus(studioId, id);
    return toCancellationStatusApiResponse(status);
  }
```

(This replaces the earlier draft of `amendCancellationNote` from Step 4 above — use this version instead.)

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- studio-show.controller.spec.ts`
Expected: PASS

- [ ] **Step 6: Run typecheck and the full erify_api verification suite**

```bash
pnpm --filter erify_api lint
pnpm --filter erify_api typecheck
pnpm --filter erify_api test
pnpm --filter erify_api build
```
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/erify_api/src/studios/studio-show/
git commit -m "feat(erify_api): add cancel/resolve/amend/status endpoints"
```

---

### Task 11: Retrofit nullable actor for system-generated gates

**Why this task exists:** every gate write so far (Tasks 6–9) assumed a human actor. `schedule_publish_removal` (Task 12) opens a gate with no human present — `AuditService.create`'s own docstring already documents this ("`actorId` is null for engine writes"). Rather than thread a separate "system" code path through `openPending`, this task makes `actor` nullable end-to-end: `null` means "system, no human actor," and every layer already built handles it explicitly.

**Files:**
- Modify: `apps/erify_api/src/show-orchestration/gate-notification.service.ts` + `.spec.ts`
- Modify: `apps/erify_api/src/show-orchestration/show-cancellation-gate.service.ts` + `.spec.ts`

**Interfaces:**
- Changes: `GateNotificationService.notifyGateOpened`'s `actor` param becomes `{ uid: string; name: string } | null`. `ShowCancellationGateService.openPending`'s `actor` param becomes `{ id: bigint; uid: string; name: string } | null`. `GateAuditMetadata.actor_uid`/`actor_name` become optional. `CancellationStatusResult.openedBy` and `CancellationHistoryEntryResult.actor` already allow `null` (Task 6) — no change needed there, but the mapping logic in `getCancellationStatus` must not assume the fields exist.

- [ ] **Step 1: Write the failing tests**

Add to `gate-notification.service.spec.ts`:

```typescript
  it('notifyGateOpened accepts a null actor for system-generated gates', () => {
    expect(() =>
      service.notifyGateOpened(show, 'schedule_publish_removal', { category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE', note: 'note' }, null),
    ).not.toThrow();
  });
```

Add to `show-cancellation-gate.service.spec.ts`, inside the `describe('openPending', ...)` block:

```typescript
  it('writes a system-actor audit row (actorId null, no actor_uid/actor_name) when actor is null', async () => {
    showRepositoryMock.updateStatusIfPending.mockResolvedValue(true);

    await service.openPending({
      show,
      gateKind: 'schedule_publish_removal',
      fromStatusSystemKey: 'CONFIRMED',
      reasonCategory: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
      reasonNote: 'Removed from republished schedule; 2 active task(s) still attached',
      actor: null,
    });

    expect(auditServiceMock.create).toHaveBeenCalledWith({
      action: 'OVERRIDE',
      actorId: null,
      reason: 'Removed from republished schedule; 2 active task(s) still attached',
      metadata: {
        field: 'show_status',
        event: 'opened',
        gate_kind: 'schedule_publish_removal',
        old_value: 'CONFIRMED',
        new_value: 'CANCELLED_PENDING_RESOLUTION',
        reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
      },
      targets: [{ targetType: 'SHOW', targetId: 1n }],
    });
    expect(gateNotificationServiceMock.notifyGateOpened).toHaveBeenCalledWith(
      show,
      'schedule_publish_removal',
      { category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE', note: 'Removed from republished schedule; 2 active task(s) still attached' },
      null,
    );
  });
```

Add to `show-cancellation-gate.service.spec.ts`'s `getCancellationStatus` describe block:

```typescript
  it('returns openedBy: null and history actor: null for a system-opened (no actor_uid) audit row', async () => {
    auditServiceMock.findForTargets.mockResolvedValue([
      {
        action: 'OVERRIDE',
        reason: 'Removed from republished schedule; 2 active task(s) still attached',
        actorId: null,
        createdAt: new Date('2026-06-25T16:14:30.201Z'),
        metadata: {
          field: 'show_status',
          event: 'opened',
          gate_kind: 'schedule_publish_removal',
          old_value: 'CONFIRMED',
          new_value: 'CANCELLED_PENDING_RESOLUTION',
          reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
        },
      },
    ]);

    const result = await service.getCancellationStatus({
      id: 1n,
      showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
    });

    expect(result.openedBy).toBeNull();
    expect(result.history[0].actor).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- gate-notification.service.spec.ts show-cancellation-gate.service.spec.ts`
Expected: FAIL (type error on `actor: null`, and `actor_uid`/`actor_name` being `undefined` would currently produce `{uid: undefined, name: undefined}` instead of `null`)

- [ ] **Step 3: Update `GateNotificationService`**

In `gate-notification.service.ts`, change both method signatures' `actor` parameter to `{ uid: string; name: string } | null`, and adjust the log line to handle `null`:

```typescript
  notifyGateOpened(
    show: Show,
    gateKind: GateKind,
    reason: { category: string; note: string },
    actor: { uid: string; name: string } | null,
  ): void {
    this.logger.debug(
      `Gate opened for show ${show.uid} (${gateKind}) by ${actor?.name ?? 'system'} — ${reason.category}: ${reason.note}`,
    );
  }

  notifyGateResolved(
    show: Show,
    gateKind: GateKind,
    outcome: string,
    actor: { uid: string; name: string } | null,
  ): void {
    this.logger.debug(
      `Gate resolved for show ${show.uid} (${gateKind}) by ${actor?.name ?? 'system'} — outcome: ${outcome}`,
    );
  }
```

- [ ] **Step 4: Update `GateAuditMetadata` and `writeGateAudit`**

In `show-cancellation-gate.service.ts`, change the type:

```typescript
export type GateAuditMetadata = {
  field: 'show_status';
  event: 'opened' | 'note_updated' | 'resolved';
  gate_kind: GateKind;
  old_value: string | null;
  new_value: string | null;
  reason_category?: string;
  actor_uid?: string;
  actor_name?: string;
};
```

Change `writeGateAudit`'s `actor` param and body:

```typescript
  private async writeGateAudit(params: {
    showId: bigint;
    gateKind: GateKind;
    event: GateAuditMetadata['event'];
    oldValue: string | null;
    newValue: string | null;
    reasonCategory?: string;
    note: string;
    actor: { id: bigint; uid: string; name: string } | null;
  }): Promise<void> {
    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: params.actor?.id ?? null,
      reason: params.note,
      metadata: {
        field: 'show_status',
        event: params.event,
        gate_kind: params.gateKind,
        old_value: params.oldValue,
        new_value: params.newValue,
        ...(params.reasonCategory !== undefined && { reason_category: params.reasonCategory }),
        ...(params.actor !== null && { actor_uid: params.actor.uid, actor_name: params.actor.name }),
      },
      targets: [{ targetType: 'SHOW', targetId: params.showId }],
    });
  }
```

Change `openPending`'s `actor` param type to `{ id: bigint; uid: string; name: string } | null` (the body is unchanged — it already just forwards `actor` to `writeGateAudit` and `notifyGateOpened`).

- [ ] **Step 5: Update `getCancellationStatus`'s actor mapping**

In the same file, change the `openedBy` and `history` mapping to handle missing `actor_uid`:

```typescript
    return {
      isPending: true,
      gateKind,
      fromStatus: opened.meta.old_value,
      reasonCategory: opened.meta.reason_category ?? null,
      reasonNote: latestNote.audit.reason,
      openedBy: opened.meta.actor_uid ? { uid: opened.meta.actor_uid, name: opened.meta.actor_name! } : null,
      openedAt: opened.audit.createdAt,
      allowedOutcomes: [...config.allowedOutcomes],
      history: gateEntries
        .slice()
        .reverse()
        .map((e) => ({
          event: e.meta.event,
          actor: e.meta.actor_uid ? { uid: e.meta.actor_uid, name: e.meta.actor_name! } : null,
          at: e.audit.createdAt,
          note: e.audit.reason,
          outcome: e.meta.event === 'resolved' ? e.meta.new_value : null,
        })),
    };
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- gate-notification.service.spec.ts show-cancellation-gate.service.spec.ts`
Expected: PASS (all tests from Tasks 5–7 plus the new ones)

- [ ] **Step 7: Run typecheck**

Run: `pnpm --filter erify_api typecheck`
Expected: PASS — this surfaces any caller of `openPending`/`notifyGateOpened` in Task 9 that still assumes a non-null actor (Task 9's calls always pass a real `actorRef`, so they remain valid — `{id,uid,name}` is assignable to `{id,uid,name} | null`).

- [ ] **Step 8: Commit**

```bash
git add apps/erify_api/src/show-orchestration/gate-notification.service.ts apps/erify_api/src/show-orchestration/gate-notification.service.spec.ts apps/erify_api/src/show-orchestration/show-cancellation-gate.service.ts apps/erify_api/src/show-orchestration/show-cancellation-gate.service.spec.ts
git commit -m "feat(erify_api): allow a null actor for system-generated gate opens"
```

---

### Task 12: Unify `publishing.service.ts`'s remove-flow onto the shared gate primitive

**Files:**
- Modify: `apps/erify_api/src/schedule-planning/publishing.service.ts`
- Modify: `apps/erify_api/src/schedule-planning/schedule-planning.module.ts`
- Modify: `apps/erify_api/src/schedule-planning/publishing.service.spec.ts`

**Interfaces:**
- Consumes: `TaskTargetService.countActiveByShowId` (Task 2), `ShowCancellationGateService.openPending` (Tasks 7/11).
- Behavior change: the active-task check now excludes `COMPLETED`/`CLOSED` tasks (previously it counted *any* non-deleted task, confirmed via reading the current code — this was the imprecision flagged in the v2 design review). A real `Audit` row is now written when a show is auto-cancelled into pending resolution (previously none was — confirmed by `grep`, no `auditService`/`AuditService` reference anywhere in this file today).

- [ ] **Step 1: Write the failing tests**

Add to `publishing.service.spec.ts`. First add the two new mocks near the existing `let ... jest.Mocked<...>` declarations:

```typescript
import { ShowCancellationGateService } from '@/show-orchestration/show-cancellation-gate.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
```

```typescript
  let taskTargetService: jest.Mocked<TaskTargetService>;
  let showCancellationGateService: jest.Mocked<ShowCancellationGateService>;
```

In the `Test.createTestingModule` provider setup (wherever `ShowPlatformService` is mocked, follow the exact same `{ provide: X, useValue: { ... } }` pattern already used in this file for the other mocked services), add:

```typescript
        {
          provide: TaskTargetService,
          useValue: { countActiveByShowId: jest.fn() },
        },
        {
          provide: ShowCancellationGateService,
          useValue: { openPending: jest.fn() },
        },
```

And resolve them the same way the existing services are resolved after `module.compile()`:

```typescript
    taskTargetService = module.get(TaskTargetService);
    showCancellationGateService = module.get(ShowCancellationGateService);
```

In the `describe('publish', ...)` block's `beforeEach`, replace the line `mockTransactionClient.taskTarget.findFirst.mockResolvedValue(null);` with:

```typescript
      taskTargetService.countActiveByShowId.mockResolvedValue(0);
```

(`mockTransactionClient.taskTarget.findFirst` is no longer called by the production code after this task's Step 3 — the mock object can keep the `findFirst` key in its type declaration since other tests may not touch it, but no test should rely on it being called anymore for the remove-flow.)

Add two new tests inside `describe('publish', ...)`, using the exact `ExistingShow`-shaped object convention the existing "should restore and adopt..." test already established:

```typescript
    it('cancels a removed show directly when it has no active tasks', async () => {
      const removedShow = {
        id: BigInt(99),
        uid: 'show_old',
        externalId: 'show_temp_OLD',
        clientId: BigInt(1),
        scheduleId: BigInt(1),
        studioId: BigInt(1),
        studioRoomId: null,
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Show',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T09:00:00Z'),
        metadata: {},
        deletedAt: null,
        showStatus: { systemKey: 'CONFIRMED' },
      };

      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([removedShow]) // current schedule shows
        .mockResolvedValueOnce([]) // matching shows by external identity
        .mockResolvedValueOnce([
          { id: BigInt(1), clientId: BigInt(1), externalId: 'show_temp_1' },
          { id: BigInt(2), clientId: BigInt(1), externalId: 'show_temp_2' },
        ]);
      taskTargetService.countActiveByShowId.mockResolvedValue(0);

      const result = await service.publish(scheduleUid, version, userId);

      expect(taskTargetService.countActiveByShowId).toHaveBeenCalledWith(BigInt(99));
      expect(mockTransactionClient.show.update).toHaveBeenCalledWith({
        where: { id: BigInt(99) },
        data: { showStatusId: BigInt(9001) },
      });
      expect(showCancellationGateService.openPending).not.toHaveBeenCalled();
      expect(result.publishSummary.shows_cancelled).toBe(1);
      expect(result.publishSummary.shows_pending_resolution).toBe(0);
    });

    it('opens a pending-resolution gate (no human actor) when a removed show has active tasks', async () => {
      const removedShow = {
        id: BigInt(99),
        uid: 'show_old',
        externalId: 'show_temp_OLD',
        clientId: BigInt(1),
        scheduleId: BigInt(1),
        studioId: BigInt(1),
        studioRoomId: null,
        showTypeId: BigInt(1),
        showStatusId: BigInt(1),
        showStandardId: BigInt(1),
        name: 'Old Show',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T09:00:00Z'),
        metadata: {},
        deletedAt: null,
        showStatus: { systemKey: 'CONFIRMED' },
      };

      mockTransactionClient.show.findMany
        .mockReset()
        .mockResolvedValueOnce([removedShow])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: BigInt(1), clientId: BigInt(1), externalId: 'show_temp_1' },
          { id: BigInt(2), clientId: BigInt(1), externalId: 'show_temp_2' },
        ]);
      taskTargetService.countActiveByShowId.mockResolvedValue(2);

      const result = await service.publish(scheduleUid, version, userId);

      expect(showCancellationGateService.openPending).toHaveBeenCalledWith({
        show: { id: BigInt(99), uid: 'show_old' },
        gateKind: 'schedule_publish_removal',
        fromStatusSystemKey: 'CONFIRMED',
        reasonCategory: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
        reasonNote: 'Removed from republished schedule; 2 active task(s) still attached',
        actor: null,
      });
      expect(mockTransactionClient.show.update).not.toHaveBeenCalledWith({
        where: { id: BigInt(99) },
        data: { showStatusId: BigInt(9001) },
      });
      expect(result.publishSummary.shows_pending_resolution).toBe(1);
      expect(result.publishSummary.shows_cancelled).toBe(0);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_api test -- publishing.service.spec.ts`
Expected: FAIL — `taskTargetService`/`showCancellationGateService` mocks aren't called by the current production code yet (the `countActiveByShowId`/`openPending` expectations fail; the existing default-path tests may also fail since `mockTransactionClient.taskTarget.findFirst.mockResolvedValue(null)` was removed from the default `beforeEach` and nothing yet calls `countActiveByShowId` to replace it — this is expected at this stage).

- [ ] **Step 3: Update the constructor and the remove-flow loop**

In `publishing.service.ts`, add to the constructor:

```typescript
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly scheduleService: ScheduleService,
    private readonly showService: ShowService,
    private readonly relationSyncService: PublishingRelationSyncService,
    private readonly validationService: ValidationService,
    private readonly utilityService: UtilityService,
    private readonly taskTargetService: TaskTargetService,
    private readonly showCancellationGateService: ShowCancellationGateService,
  ) {}
```

Add the imports:

```typescript
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { ShowCancellationGateService } from '@/show-orchestration/show-cancellation-gate.service';
```

Replace the remove-flow loop (the `for (const removed of toRemove) { ... }` block):

```typescript
    for (const removed of toRemove) {
      const activeTaskCount = await this.taskTargetService.countActiveByShowId(removed.id);

      if (activeTaskCount > 0) {
        if (removed.showStatusId !== statusIds.cancelledPendingResolution) {
          await this.showCancellationGateService.openPending({
            show: { id: removed.id, uid: removed.uid } as Show,
            gateKind: 'schedule_publish_removal',
            fromStatusSystemKey: removed.showStatus.systemKey ?? 'CONFIRMED',
            reasonCategory: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
            reasonNote: `Removed from republished schedule; ${activeTaskCount} active task(s) still attached`,
            actor: null,
          });
        }
        publishSummary.shows_pending_resolution += 1;
      } else {
        if (removed.showStatusId !== statusIds.cancelled) {
          await tx.show.update({
            where: { id: removed.id },
            data: { showStatusId: statusIds.cancelled },
          });
        }
        publishSummary.shows_cancelled += 1;
      }
    }
```

`{ id: removed.id, uid: removed.uid } as Show` — `ShowCancellationGateService`'s write methods only read `.id`/`.uid` off the `Show` they're given (confirmed in Task 7), so this minimal cast is safe; `publishing.service.ts` doesn't have the full Prisma `Show` row in scope here, only the lighter `ExistingShow` projection. Add `import type { Show } from '@prisma/client';` to the top of the file if not already present.

- [ ] **Step 4: Add `ShowOrchestrationModule` and `TaskTargetModule` to `SchedulePlanningModule`**

In `schedule-planning.module.ts`:

```typescript
import { TaskTargetModule } from '@/models/task-target/task-target.module';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
```

Add both to the `imports` array (alongside the existing `ShowModule`, etc.).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter erify_api test -- publishing.service.spec.ts`
Expected: PASS (all existing tests plus the two new ones)

- [ ] **Step 6: Run full verification**

```bash
pnpm --filter erify_api lint
pnpm --filter erify_api typecheck
pnpm --filter erify_api test
pnpm --filter erify_api build
```
Expected: all pass. This is the last erify_api task in this plan — a clean `build` here means the whole backend half is done.

- [ ] **Step 7: Commit**

```bash
git add apps/erify_api/src/schedule-planning/
git commit -m "feat(erify_api): unify schedule-publish removal onto the shared cancellation gate"
```

---

### Task 13: erify_studios API layer

**Files:**
- Create: `apps/erify_studios/src/features/studio-shows/api/cancel-studio-show.ts`
- Test: `apps/erify_studios/src/features/studio-shows/api/__tests__/cancel-studio-show.test.ts`

**Interfaces:**
- Produces (consumed by Task 14/15's components):
  - `getGateErrorCode(error: unknown): string | null` / `getGateActiveTaskCount(error: unknown): number | null` — parse a `PREFIX:detail` backend error message (e.g. `ACTIVE_TASKS_REMAIN:42`) and the `details.activeTaskCount` field.
  - `useCancelShowWithResolution(studioId)`, `useResolveShowCancellation(studioId)`, `useAmendCancellationNote(studioId)` — mutation hooks.
  - `useCancellationStatus(studioId, showId)` — query hook, `cancellationStatusKeys.detail(studioId, showId)`.

- [ ] **Step 1: Write the failing tests**

```typescript
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelShowWithResolution,
  getGateActiveTaskCount,
  getGateErrorCode,
  getCancellationStatus,
  resolveShowCancellation,
  amendCancellationNote,
} from '../cancel-studio-show';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    patch: vi.fn(),
    get: vi.fn(),
  },
}));

function axiosErrorWith(data: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe('studio show cancellation gate API', () => {
  const mockedPost = vi.mocked(apiClient.post);
  const mockedPatch = vi.mocked(apiClient.patch);
  const mockedGet = vi.mocked(apiClient.get);

  beforeEach(() => {
    mockedPost.mockReset();
    mockedPatch.mockReset();
    mockedGet.mockReset();
  });

  it('cancelShowWithResolution posts to the cancel-with-resolution endpoint', async () => {
    const payload = { reason_category: 'EQUIPMENT_FAILURE', reason_note: 'Camera failed', outcome: 'CANCELLED' as const };
    mockedPost.mockResolvedValue({ data: { id: 'show_1' } });

    await cancelShowWithResolution('studio_1', 'show_1', payload);

    expect(mockedPost).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/cancel-with-resolution',
      payload,
    );
  });

  it('resolveShowCancellation posts to the resolve-cancellation endpoint', async () => {
    const payload = { outcome: 'CANCELLED' as const, resolution_notes: 'Confirmed' };
    mockedPost.mockResolvedValue({ data: { id: 'show_1' } });

    await resolveShowCancellation('studio_1', 'show_1', payload);

    expect(mockedPost).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/resolve-cancellation',
      payload,
    );
  });

  it('amendCancellationNote patches the cancellation-note endpoint', async () => {
    const payload = { reason_note: 'Updated note' };
    mockedPatch.mockResolvedValue({ data: { is_pending: true } });

    await amendCancellationNote('studio_1', 'show_1', payload);

    expect(mockedPatch).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/cancellation-note',
      payload,
    );
  });

  it('getCancellationStatus gets the cancellation-status endpoint', async () => {
    mockedGet.mockResolvedValue({ data: { is_pending: false } });

    const result = await getCancellationStatus('studio_1', 'show_1');

    expect(mockedGet).toHaveBeenCalledWith('/studios/studio_1/shows/show_1/cancellation-status', { signal: undefined });
    expect(result).toEqual({ is_pending: false });
  });

  it('extracts prefixed gate error codes and active task counts', () => {
    const error = axiosErrorWith({
      message: 'ACTIVE_TASKS_REMAIN:task_gate1',
      details: { activeTaskCount: 3 },
    });

    expect(getGateErrorCode(error)).toBe('ACTIVE_TASKS_REMAIN');
    expect(getGateActiveTaskCount(error)).toBe(3);
  });

  it('returns null for a non-axios or unprefixed error', () => {
    expect(getGateErrorCode(new Error('plain error'))).toBeNull();
    expect(getGateActiveTaskCount(new Error('plain error'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- cancel-studio-show.test.ts`
Expected: FAIL — cannot find module `../cancel-studio-show`

- [ ] **Step 3: Create the API file**

```typescript
import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import type {
  AmendCancellationNoteInput,
  CancellationStatusResponse,
  CancelShowWithResolutionInput,
  ResolveShowCancellationInput,
} from '@eridu/api-types/shows';
import type { StudioShowDetail } from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';
import { studioShowsKeys } from './get-studio-shows';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { invalidateStudioTaskQueries } from '@/features/studio-shows/lib/invalidate-studio-task-queries';
import { apiClient } from '@/lib/api/client';

export const cancellationStatusKeys = {
  all: ['studio-show', 'cancellation-status'] as const,
  detail: (studioId: string, showId: string) => [...cancellationStatusKeys.all, studioId, showId] as const,
};

const CANCELLATION_ERROR_MESSAGES: Record<string, string> = {
  SHOW_CANCELLATION_NOT_ALLOWED: 'This show cannot be cancelled from its current status.',
  CANCELLATION_NOT_AUTHORIZED: 'You are not authorized to cancel this show. Only Managers/Admins or the current Duty Manager can.',
  OUTCOME_REQUIRED: 'Choose an outcome before submitting.',
  OUTCOME_NOT_ALLOWED_FOR_DUTY_MANAGER: 'Only a Manager can choose the final outcome.',
  SHOW_CANCELLATION_NOT_PENDING: 'This show is not currently pending resolution.',
  SIGN_OFF_REQUIRES_MANAGER: 'Only a Manager/Admin can sign off a pending resolution.',
  NOTE_AMEND_REQUIRES_DUTY_MANAGER: 'Only the current Duty Manager can update this note.',
  LIVE_CANCELLATION_REQUIRES_OVERRIDE: 'This show was live when interrupted. Resume it or mark it completed instead of cancelling outright.',
};

type GateErrorDetails = { activeTaskCount?: unknown };
type GateErrorBody = { message?: unknown; details?: GateErrorDetails };

export function getGateErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  const message = (error.response?.data as GateErrorBody | undefined)?.message;
  if (typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }
  return message.split(':')[0] ?? null;
}

export function getGateActiveTaskCount(error: unknown): number | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  const activeTaskCount = (error.response?.data as GateErrorBody | undefined)?.details?.activeTaskCount;
  return typeof activeTaskCount === 'number' ? activeTaskCount : null;
}

function gateMutationErrorMessage(error: unknown, fallback: string): string {
  const code = getGateErrorCode(error);
  if (code && CANCELLATION_ERROR_MESSAGES[code]) {
    return CANCELLATION_ERROR_MESSAGES[code];
  }
  return getMutationErrorMessage(error, fallback, CANCELLATION_ERROR_MESSAGES);
}

export async function cancelShowWithResolution(
  studioId: string,
  showId: string,
  data: CancelShowWithResolutionInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}/cancel-with-resolution`,
    data,
  );
  return response.data;
}

export async function resolveShowCancellation(
  studioId: string,
  showId: string,
  data: ResolveShowCancellationInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}/resolve-cancellation`,
    data,
  );
  return response.data;
}

export async function amendCancellationNote(
  studioId: string,
  showId: string,
  data: AmendCancellationNoteInput,
): Promise<CancellationStatusResponse> {
  const response = await apiClient.patch<CancellationStatusResponse>(
    `/studios/${studioId}/shows/${showId}/cancellation-note`,
    data,
  );
  return response.data;
}

export async function getCancellationStatus(
  studioId: string,
  showId: string,
  options?: { signal?: AbortSignal },
): Promise<CancellationStatusResponse> {
  const response = await apiClient.get<CancellationStatusResponse>(
    `/studios/${studioId}/shows/${showId}/cancellation-status`,
    { signal: options?.signal },
  );
  return response.data;
}

async function invalidateAfterGateTransition(queryClient: QueryClient, studioId: string, showId: string) {
  await invalidateStudioTaskQueries({ queryClient, studioId, showIds: [showId] });
  queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });
  queryClient.invalidateQueries({ queryKey: cancellationStatusKeys.detail(studioId, showId) });
}

export function useCancelShowWithResolution(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: CancelShowWithResolutionInput }) =>
      cancelShowWithResolution(studioId, showId, data),
    onSuccess: async (show) => {
      queryClient.setQueryData(studioShowKeys.detail(studioId, show.id), show);
      await invalidateAfterGateTransition(queryClient, studioId, show.id);
      toast.success('Cancellation submitted');
    },
    onError: (error) => {
      toast.error(gateMutationErrorMessage(error, 'Failed to cancel show'));
    },
  });
}

export function useResolveShowCancellation(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: ResolveShowCancellationInput }) =>
      resolveShowCancellation(studioId, showId, data),
    onSuccess: async (show) => {
      queryClient.setQueryData(studioShowKeys.detail(studioId, show.id), show);
      await invalidateAfterGateTransition(queryClient, studioId, show.id);
      toast.success('Cancellation resolved');
    },
    onError: (error) => {
      toast.error(gateMutationErrorMessage(error, 'Failed to resolve cancellation'));
    },
  });
}

export function useAmendCancellationNote(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: AmendCancellationNoteInput }) =>
      amendCancellationNote(studioId, showId, data),
    onSuccess: async (_status, { showId }) => {
      queryClient.invalidateQueries({ queryKey: cancellationStatusKeys.detail(studioId, showId) });
      toast.success('Note updated');
    },
    onError: (error) => {
      toast.error(gateMutationErrorMessage(error, 'Failed to update note'));
    },
  });
}

export function useCancellationStatus(studioId: string, showId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: cancellationStatusKeys.detail(studioId, showId),
    queryFn: ({ signal }) => getCancellationStatus(studioId, showId, { signal }),
    enabled: options?.enabled ?? true,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_studios test -- cancel-studio-show.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/erify_studios/src/features/studio-shows/api/cancel-studio-show.ts apps/erify_studios/src/features/studio-shows/api/__tests__/cancel-studio-show.test.ts
git commit -m "feat(erify_studios): add cancellation gate API layer"
```

---

### Task 14: Tier-resolution hook and the cancellation dialog

**Files:**
- Create: `apps/erify_studios/src/features/studio-shows/hooks/use-cancellation-tier.ts`
- Test: `apps/erify_studios/src/features/studio-shows/hooks/__tests__/use-cancellation-tier.test.ts`
- Create: `apps/erify_studios/src/features/studio-shows/components/cancel-show-dialog.tsx`
- Test: `apps/erify_studios/src/features/studio-shows/components/__tests__/cancel-show-dialog.test.tsx`

**Interfaces:**
- Produces: `useCancellationTier(studioId): { tier: 'manager' | 'duty_manager' | null; isLoading: boolean }` — client-side mirror of the backend's tier check (Manager role wins; else compares the current user's `id` against `useDutyManager`'s result). This is a UI-only convenience for which fields to render — the backend re-derives and enforces the real tier independently (Task 9), so a stale/wrong client guess only affects what the dialog *shows*, never what's allowed to execute.
- `CancelShowDialog({ studioId, show }: { studioId: string; show: StudioShowDetail })` — renders the reason form; shows the outcome picker only when `tier === 'manager'`; disables submit and shows a tier-unavailable message when `tier === null`.

- [ ] **Step 1: Write the failing hook test**

```typescript
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/use-studio-access', () => ({
  useStudioAccess: vi.fn(),
}));
vi.mock('@/lib/hooks/use-user', () => ({
  useUserProfile: vi.fn(),
}));
vi.mock('@/features/studio-shifts/hooks/use-studio-shifts', () => ({
  useDutyManager: vi.fn(),
}));

import { useCancellationTier } from '../use-cancellation-tier';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import { useUserProfile } from '@/lib/hooks/use-user';
import { useDutyManager } from '@/features/studio-shifts/hooks/use-studio-shifts';

describe('useCancellationTier', () => {
  it('returns manager when the role is ADMIN or MANAGER, without needing the duty-manager query', () => {
    vi.mocked(useStudioAccess).mockReturnValue({ role: 'admin', isLoading: false } as any);
    vi.mocked(useUserProfile).mockReturnValue({ data: { id: 'user_self' }, isLoading: false } as any);
    vi.mocked(useDutyManager).mockReturnValue({ data: null, isLoading: false } as any);

    const result = useCancellationTier('studio_1');

    expect(result.tier).toBe('manager');
  });

  it('returns duty_manager when the current user matches the active duty manager', () => {
    vi.mocked(useStudioAccess).mockReturnValue({ role: 'member', isLoading: false } as any);
    vi.mocked(useUserProfile).mockReturnValue({ data: { id: 'user_self' }, isLoading: false } as any);
    vi.mocked(useDutyManager).mockReturnValue({ data: { user: { uid: 'user_self' } }, isLoading: false } as any);

    const result = useCancellationTier('studio_1');

    expect(result.tier).toBe('duty_manager');
  });

  it('returns null when the user is neither a manager nor the active duty manager', () => {
    vi.mocked(useStudioAccess).mockReturnValue({ role: 'member', isLoading: false } as any);
    vi.mocked(useUserProfile).mockReturnValue({ data: { id: 'user_self' }, isLoading: false } as any);
    vi.mocked(useDutyManager).mockReturnValue({ data: { user: { uid: 'user_other' } }, isLoading: false } as any);

    const result = useCancellationTier('studio_1');

    expect(result.tier).toBeNull();
  });

  it('is loading while any of the three underlying queries are loading', () => {
    vi.mocked(useStudioAccess).mockReturnValue({ role: 'member', isLoading: true } as any);
    vi.mocked(useUserProfile).mockReturnValue({ data: undefined, isLoading: true } as any);
    vi.mocked(useDutyManager).mockReturnValue({ data: undefined, isLoading: true } as any);

    const result = useCancellationTier('studio_1');

    expect(result.isLoading).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- use-cancellation-tier.test.ts`
Expected: FAIL — cannot find module `../use-cancellation-tier`

- [ ] **Step 3: Create the hook**

```typescript
import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { useDutyManager } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import { useUserProfile } from '@/lib/hooks/use-user';

export type CancellationTier = 'manager' | 'duty_manager' | null;

export function useCancellationTier(studioId: string): { tier: CancellationTier; isLoading: boolean } {
  const { role, isLoading: isRoleLoading } = useStudioAccess(studioId);
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const { data: dutyManager, isLoading: isDutyManagerLoading } = useDutyManager(studioId);

  const isLoading = isRoleLoading || isProfileLoading || isDutyManagerLoading;

  if (role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER) {
    return { tier: 'manager', isLoading };
  }

  if (profile?.id && dutyManager?.user.uid === profile.id) {
    return { tier: 'duty_manager', isLoading };
  }

  return { tier: null, isLoading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_studios test -- use-cancellation-tier.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing dialog test**

Per the established convention in this codebase for testing forms that use `@eridu/ui`'s `Select` (confirmed in `apps/erify_studios/src/features/clients/components/__tests__/client-dialogs.test.tsx`), mock the `Select` family down to plain DOM elements rather than driving the real Radix popover — `SelectItem` becomes a native `<option>` so `userEvent.selectOptions` works directly against the (mocked) `SelectTrigger`'s child `<select>`-shaped structure. This needs a literal native `<select>` wrapper, not a `<div>`, for `selectOptions` to target it:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StudioShowDetail } from '@eridu/api-types/shows';

import { CancelShowDialog } from '../cancel-show-dialog';

const useCancellationTierMock = vi.hoisted(() => vi.fn());
const mutateMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/use-cancellation-tier', () => ({
  useCancellationTier: useCancellationTierMock,
}));
vi.mock('../../api/cancel-studio-show', () => ({
  useCancelShowWithResolution: () => ({ mutate: mutateMock, isPending: false }),
}));
vi.mock('@/components/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, title, children, footer }: any) =>
    open ? <div role="dialog"><h1>{title}</h1>{children}{footer}</div> : null,
}));
vi.mock('@eridu/ui', async () => {
  const actual = await vi.importActual<typeof import('@eridu/ui')>('@eridu/ui');
  return {
    ...actual,
    Select: ({ children, value, onValueChange, 'aria-label': ariaLabel }: any) => (
      <select aria-label={ariaLabel} value={value} onChange={(e) => onValueChange(e.target.value)}>
        {children}
      </select>
    ),
    SelectTrigger: ({ children, id, 'aria-label': ariaLabel }: any) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  };
});
```

`Select`'s mock needs `aria-label`/`id` forwarded from the real component's props — adjust `CancelShowDialog`'s `<Select>` usage (Step 7 below) to pass `aria-label` directly on `<Select>` itself (not only on `<SelectTrigger>`) so the mock's native `<select aria-label>` is queryable by `getByLabelText`.

```typescript
function makeShow(): StudioShowDetail {
  return {
    id: 'show_1',
    name: 'Test Show',
    show_status_system_key: 'CONFIRMED',
  } as StudioShowDetail;
}

describe('cancelShowDialog', () => {
  beforeEach(() => {
    mutateMock.mockReset();
  });

  it('renders only the reason fields for a Duty Manager tier (no outcome picker)', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'duty_manager', isLoading: false });
    const user = userEvent.setup();

    render(<CancelShowDialog studioId="studio_1" show={makeShow()} />);
    await user.click(screen.getByRole('button', { name: /cancel show/i }));

    expect(screen.queryByLabelText(/^outcome$/i)).not.toBeInTheDocument();
  });

  it('renders the outcome picker for a Manager tier', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager', isLoading: false });
    const user = userEvent.setup();

    render(<CancelShowDialog studioId="studio_1" show={makeShow()} />);
    await user.click(screen.getByRole('button', { name: /cancel show/i }));

    expect(screen.getByLabelText(/^outcome$/i)).toBeInTheDocument();
  });

  it('disables the trigger when the tier resolves to null', () => {
    useCancellationTierMock.mockReturnValue({ tier: null, isLoading: false });

    render(<CancelShowDialog studioId="studio_1" show={makeShow()} />);

    expect(screen.getByRole('button', { name: /cancel show/i })).toBeDisabled();
  });

  it('submits without an outcome field for Duty Manager tier', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'duty_manager', isLoading: false });
    const user = userEvent.setup();

    render(<CancelShowDialog studioId="studio_1" show={makeShow()} />);
    await user.click(screen.getByRole('button', { name: /cancel show/i }));
    await user.selectOptions(screen.getByLabelText(/reason category/i), 'EQUIPMENT_FAILURE');
    await user.type(screen.getByLabelText(/^reason$/i), 'Camera failed mid-show');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mutateMock).toHaveBeenCalledWith({
      showId: 'show_1',
      data: { reason_category: 'EQUIPMENT_FAILURE', reason_note: 'Camera failed mid-show' },
    }, expect.anything());
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- cancel-show-dialog.test.tsx`
Expected: FAIL — cannot find module `../cancel-show-dialog`

- [ ] **Step 7: Create the dialog component**

```typescript
import { useState } from 'react';

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import type { GateOutcome } from '@eridu/api-types/shows';
import { CANCELLATION_GATE_CONFIG } from '@eridu/api-types/shows';
import type { StudioShowDetail } from '@eridu/api-types/shows';

import { useCancelShowWithResolution } from '../api/cancel-studio-show';
import { useCancellationTier } from '../hooks/use-cancellation-tier';
import { ResponsiveDialog } from '@/components/responsive-dialog';

const REASON_OPTIONS = CANCELLATION_GATE_CONFIG.show_cancellation.reasonOptions;
const OUTCOME_OPTIONS = CANCELLATION_GATE_CONFIG.show_cancellation.allowedOutcomes;

type CancelShowDialogProps = {
  studioId: string;
  show: StudioShowDetail;
};

export function CancelShowDialog({ studioId, show }: CancelShowDialogProps) {
  const { tier } = useCancellationTier(studioId);
  const [open, setOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [outcome, setOutcome] = useState<GateOutcome | ''>('');
  const cancelMutation = useCancelShowWithResolution(studioId);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReasonCategory('');
      setReasonNote('');
      setOutcome('');
    }
    setOpen(nextOpen);
  };

  const canSubmit = reasonCategory.length > 0
    && reasonNote.trim().length > 0
    && (tier === 'duty_manager' || (tier === 'manager' && outcome !== ''));

  return (
    <>
      <Button type="button" disabled={!tier} onClick={() => handleOpenChange(true)}>
        Cancel Show
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Cancel Show"
        footer={(
          <Button
            type="button"
            disabled={!canSubmit || cancelMutation.isPending}
            onClick={() => {
              cancelMutation.mutate({
                showId: show.id,
                data: {
                  reason_category: reasonCategory,
                  reason_note: reasonNote.trim(),
                  ...(tier === 'manager' && outcome !== '' && { outcome }),
                },
              }, { onSuccess: () => handleOpenChange(false) });
            }}
          >
            {cancelMutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        )}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="reason-category">Reason category</Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory} aria-label="Reason category">
              <SelectTrigger id="reason-category" aria-label="Reason category">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="reason-note">Reason</Label>
            <Textarea
              id="reason-note"
              aria-label="Reason"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
            />
          </div>
          {tier === 'manager'
            ? (
                <div className="space-y-1">
                  <Label htmlFor="outcome">Outcome</Label>
                  <Select value={outcome} onValueChange={(value) => setOutcome(value as GateOutcome)} aria-label="Outcome">
                    <SelectTrigger id="outcome" aria-label="Outcome">
                      <SelectValue placeholder="Select an outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOME_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            : (
                <p className="rounded-md bg-muted p-2 text-sm text-muted-foreground">
                  As Duty Manager, you flag this for a Manager to sign off — you don't choose the final outcome.
                </p>
              )}
        </div>
      </ResponsiveDialog>
    </>
  );
}
```

Confirmed `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Label`, and `Textarea` are all real named exports of `@eridu/ui` (`packages/ui/src/index.ts`) — the import list above is exact, no adjustment needed.

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter erify_studios test -- cancel-show-dialog.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/erify_studios/src/features/studio-shows/hooks/use-cancellation-tier.ts apps/erify_studios/src/features/studio-shows/hooks/__tests__/use-cancellation-tier.test.ts apps/erify_studios/src/features/studio-shows/components/cancel-show-dialog.tsx apps/erify_studios/src/features/studio-shows/components/__tests__/cancel-show-dialog.test.tsx
git commit -m "feat(erify_studios): add cancellation dialog with tier-conditional outcome picker"
```

---

### Task 15: Resolve dialog and Gate History

**Files:**
- Create: `apps/erify_studios/src/features/studio-shows/components/resolve-cancellation-dialog.tsx`
- Test: `apps/erify_studios/src/features/studio-shows/components/__tests__/resolve-cancellation-dialog.test.tsx`
- Create: `apps/erify_studios/src/features/studio-shows/components/gate-history.tsx`
- Test: `apps/erify_studios/src/features/studio-shows/components/__tests__/gate-history.test.tsx`

**Interfaces:**
- Produces: `ResolveCancellationDialog({ studioId, show, status }: { studioId: string; show: StudioShowDetail; status: CancellationStatusResponse })` — renders only when `status.is_pending`; outcome picker options come from `status.allowed_outcomes` (not a hardcoded list — `schedule_publish_removal`'s `RESTORE_PREVIOUS` renders as "Resume Show"); shows the active-task-count + link UX on an `ACTIVE_TASKS_REMAIN` error; includes the Duty-Manager note-amendment field when the current tier is `duty_manager`.
- `GateHistory({ history }: { history: CancellationHistoryEntry[] })` — read-only chronological list, used inside the dialog and standalone on the show detail page.

- [ ] **Step 1: Write the failing `GateHistory` test (simpler component, do this first)**

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GateHistory } from '../gate-history';

describe('gateHistory', () => {
  it('renders nothing when history is empty', () => {
    const { container } = render(<GateHistory history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each entry with its event, actor, and note', () => {
    render(
      <GateHistory
        history={[
          { event: 'opened', actor: { uid: 'user_1', name: 'Jane Duty' }, at: '2026-06-25T16:14:30.201Z', note: 'Camera failed', outcome: null },
          { event: 'resolved', actor: { uid: 'user_2', name: 'Bob Manager' }, at: '2026-06-25T17:00:00.000Z', note: 'Confirmed', outcome: 'CANCELLED' },
        ]}
      />,
    );

    expect(screen.getByText('Opened')).toBeInTheDocument();
    expect(screen.getByText('Jane Duty')).toBeInTheDocument();
    expect(screen.getByText('Camera failed')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Bob Manager')).toBeInTheDocument();
    expect(screen.getByText(/CANCELLED/)).toBeInTheDocument();
  });

  it('renders "System" for a null actor (schedule-publish-triggered gate)', () => {
    render(
      <GateHistory
        history={[
          { event: 'opened', actor: null, at: '2026-06-25T16:14:30.201Z', note: 'Removed from republished schedule', outcome: null },
        ]}
      />,
    );

    expect(screen.getByText('System')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- gate-history.test.tsx`
Expected: FAIL — cannot find module `../gate-history`

- [ ] **Step 3: Create `GateHistory`**

```typescript
import type { CancellationHistoryEntry } from '@eridu/api-types/shows';

const EVENT_LABEL: Record<CancellationHistoryEntry['event'], string> = {
  opened: 'Opened',
  note_updated: 'Note updated',
  resolved: 'Resolved',
};

type GateHistoryProps = {
  history: CancellationHistoryEntry[];
};

export function GateHistory({ history }: GateHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2 text-sm">
      {history.map((entry, index) => (
        <li key={`${entry.event}-${entry.at}-${index}`} className="border-l-2 pl-2">
          <p className="font-medium">
            {EVENT_LABEL[entry.event]}
            {entry.outcome ? ` — ${entry.outcome}` : ''}
          </p>
          <p className="text-muted-foreground">
            {entry.actor?.name ?? 'System'}
            {' · '}
            {new Date(entry.at).toLocaleString()}
          </p>
          {entry.note ? <p>{entry.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_studios test -- gate-history.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the failing `ResolveCancellationDialog` test**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CancellationStatusResponse, StudioShowDetail } from '@eridu/api-types/shows';

import { ResolveCancellationDialog } from '../resolve-cancellation-dialog';

const useCancellationTierMock = vi.hoisted(() => vi.fn());
const resolveMutateMock = vi.hoisted(() => vi.fn());
const amendMutateMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/use-cancellation-tier', () => ({
  useCancellationTier: useCancellationTierMock,
}));
vi.mock('../../api/cancel-studio-show', () => ({
  useResolveShowCancellation: () => ({ mutate: resolveMutateMock, isPending: false }),
  useAmendCancellationNote: () => ({ mutate: amendMutateMock, isPending: false }),
  getGateErrorCode: (error: AxiosError) => {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    return message?.split(':')[0] ?? null;
  },
  getGateActiveTaskCount: (error: AxiosError) =>
    (error.response?.data as { details?: { activeTaskCount?: number } } | undefined)?.details?.activeTaskCount ?? null,
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to?: string }) => <a href={to}>{children}</a>,
}));
vi.mock('@/components/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, title, children, footer }: any) =>
    open ? <div role="dialog"><h1>{title}</h1>{children}{footer}</div> : null,
}));
// Same Select-mocking convention as cancel-show-dialog.test.tsx (Task 14) —
// @eridu/ui has no RadioGroup primitive, so the outcome picker uses Select.
vi.mock('@eridu/ui', async () => {
  const actual = await vi.importActual<typeof import('@eridu/ui')>('@eridu/ui');
  return {
    ...actual,
    Select: ({ children, value, onValueChange, 'aria-label': ariaLabel }: any) => (
      <select aria-label={ariaLabel} value={value} onChange={(e) => onValueChange(e.target.value)}>
        {children}
      </select>
    ),
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  };
});

function axiosErrorWith(data: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = { data, status: 400, statusText: 'Bad Request', headers: {}, config: { headers: new AxiosHeaders() } };
  return error;
}

const show = { id: 'show_1', name: 'Test Show' } as StudioShowDetail;
const pendingStatus: CancellationStatusResponse = {
  is_pending: true,
  gate_kind: 'show_cancellation',
  from_status: 'CONFIRMED',
  reason_category: 'EQUIPMENT_FAILURE',
  reason_note: 'Camera failed',
  opened_by: { uid: 'user_1', name: 'Jane Duty' },
  opened_at: '2026-06-25T16:14:30.201Z',
  allowed_outcomes: ['CANCELLED', 'COMPLETED'],
  history: [],
};

describe('resolveCancellationDialog', () => {
  beforeEach(() => {
    resolveMutateMock.mockReset();
    amendMutateMock.mockReset();
  });

  it('renders nothing when status.is_pending is false', () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager' });
    const { container } = render(
      <ResolveCancellationDialog studioId="studio_1" show={show} status={{ ...pendingStatus, is_pending: false }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an outcome option per status.allowed_outcomes, with RESTORE_PREVIOUS labeled "Resume Show"', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager' });
    const user = userEvent.setup();

    render(
      <ResolveCancellationDialog
        studioId="studio_1"
        show={show}
        status={{ ...pendingStatus, allowed_outcomes: ['CANCELLED', 'RESTORE_PREVIOUS'] }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /resolve/i }));

    const outcomeSelect = screen.getByLabelText(/^outcome$/i);
    expect(screen.getByText('Resume Show')).toBeInTheDocument();
    await user.selectOptions(outcomeSelect, 'RESTORE_PREVIOUS');
    expect((outcomeSelect as HTMLSelectElement).value).toBe('RESTORE_PREVIOUS');
  });

  it('does not render the note-amendment field for a Manager tier', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager' });
    const user = userEvent.setup();

    render(<ResolveCancellationDialog studioId="studio_1" show={show} status={pendingStatus} />);
    await user.click(screen.getByRole('button', { name: /resolve/i }));

    expect(screen.queryByLabelText(/update note/i)).not.toBeInTheDocument();
  });

  it('renders the note-amendment field for a Duty Manager tier', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'duty_manager' });
    const user = userEvent.setup();

    render(<ResolveCancellationDialog studioId="studio_1" show={show} status={pendingStatus} />);
    await user.click(screen.getByRole('button', { name: /resolve/i }));

    expect(screen.getByLabelText(/update note/i)).toBeInTheDocument();
  });

  it('renders the active-task count and a link to the show task list on ACTIVE_TASKS_REMAIN', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager' });
    const user = userEvent.setup();
    resolveMutateMock.mockImplementation((_input, options) => {
      options?.onError?.(axiosErrorWith({ message: 'ACTIVE_TASKS_REMAIN:show_1', details: { activeTaskCount: 3 } }));
    });

    render(<ResolveCancellationDialog studioId="studio_1" show={show} status={pendingStatus} />);
    await user.click(screen.getByRole('button', { name: /resolve/i }));
    await user.selectOptions(screen.getByLabelText(/^outcome$/i), 'CANCELLED');
    await user.type(screen.getByLabelText(/resolution notes/i), 'Confirmed no production happened');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(screen.getByText(/3 active tasks? are still attached/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view show tasks/i })).toHaveAttribute(
      'href',
      '/studios/$studioId/shows/$showId/tasks',
    );
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- resolve-cancellation-dialog.test.tsx`
Expected: FAIL — cannot find module `../resolve-cancellation-dialog`

- [ ] **Step 7: Create `ResolveCancellationDialog`**

```typescript
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import type { CancellationStatusResponse, StudioShowDetail } from '@eridu/api-types/shows';

import {
  getGateActiveTaskCount,
  getGateErrorCode,
  useAmendCancellationNote,
  useResolveShowCancellation,
} from '../api/cancel-studio-show';
import { useCancellationTier } from '../hooks/use-cancellation-tier';
import { ResponsiveDialog } from '@/components/responsive-dialog';

const OUTCOME_LABEL: Record<string, string> = {
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  RESTORE_PREVIOUS: 'Resume Show',
};

type ResolveCancellationDialogProps = {
  studioId: string;
  show: StudioShowDetail;
  status: CancellationStatusResponse;
};

export function ResolveCancellationDialog({ studioId, show, status }: ResolveCancellationDialogProps) {
  const { tier } = useCancellationTier(studioId);
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updatedNote, setUpdatedNote] = useState('');
  const [activeTaskBlockerCount, setActiveTaskBlockerCount] = useState<number | null>(null);
  const resolveMutation = useResolveShowCancellation(studioId);
  const amendMutation = useAmendCancellationNote(studioId);

  if (!status.is_pending) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setOutcome('');
      setResolutionNotes('');
      setUpdatedNote('');
      setActiveTaskBlockerCount(null);
    }
    setOpen(nextOpen);
  };

  return (
    <>
      <Button type="button" onClick={() => handleOpenChange(true)}>Resolve</Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Resolve Cancellation"
        footer={(
          <Button
            type="button"
            disabled={!outcome || resolutionNotes.trim().length === 0 || resolveMutation.isPending}
            onClick={() => {
              setActiveTaskBlockerCount(null);
              resolveMutation.mutate({
                showId: show.id,
                data: { outcome: outcome as any, resolution_notes: resolutionNotes.trim() },
              }, {
                onSuccess: () => handleOpenChange(false),
                onError: (error: unknown) => {
                  if (getGateErrorCode(error) === 'ACTIVE_TASKS_REMAIN') {
                    setActiveTaskBlockerCount(getGateActiveTaskCount(error));
                  }
                },
              });
            }}
          >
            {resolveMutation.isPending ? 'Saving...' : 'Confirm'}
          </Button>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Flagged by
            {' '}
            {status.opened_by?.name ?? 'System'}
            {' — '}
            {status.reason_category}
            {': '}
            {status.reason_note}
          </p>
          {tier === 'duty_manager'
            ? (
                <div className="space-y-1">
                  <Label htmlFor="update-note">Update note</Label>
                  <Textarea id="update-note" aria-label="Update note" value={updatedNote} onChange={(e) => setUpdatedNote(e.target.value)} />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={updatedNote.trim().length === 0 || amendMutation.isPending}
                    onClick={() => amendMutation.mutate({ showId: show.id, data: { reason_note: updatedNote.trim() } })}
                  >
                    Update note
                  </Button>
                </div>
              )
            : null}
          <div className="space-y-1">
            <Label htmlFor="outcome">Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome} aria-label="Outcome">
              <SelectTrigger id="outcome" aria-label="Outcome">
                <SelectValue placeholder="Select an outcome" />
              </SelectTrigger>
              <SelectContent>
                {status.allowed_outcomes.map((value) => (
                  <SelectItem key={value} value={value}>{OUTCOME_LABEL[value] ?? value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="resolution-notes">Resolution notes</Label>
            <Textarea
              id="resolution-notes"
              aria-label="Resolution notes"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
          </div>
          {activeTaskBlockerCount !== null
            ? (
                <div className="space-y-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                  <p>
                    {activeTaskBlockerCount}
                    {' '}
                    active
                    {' '}
                    {activeTaskBlockerCount === 1 ? 'task is' : 'tasks are'}
                    {' '}
                    still attached to this show. Close or reassign
                    {' '}
                    {activeTaskBlockerCount === 1 ? 'it' : 'them'}
                    {' '}
                    before confirming.
                  </p>
                  <Link
                    to="/studios/$studioId/shows/$showId/tasks"
                    params={{ studioId, showId: show.id }}
                    search={{ page: 1, limit: 10 }}
                    className="font-medium underline underline-offset-2"
                  >
                    View show tasks
                  </Link>
                </div>
              )
            : null}
        </div>
      </ResponsiveDialog>
    </>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter erify_studios test -- resolve-cancellation-dialog.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/erify_studios/src/features/studio-shows/components/gate-history.tsx apps/erify_studios/src/features/studio-shows/components/__tests__/gate-history.test.tsx apps/erify_studios/src/features/studio-shows/components/resolve-cancellation-dialog.tsx apps/erify_studios/src/features/studio-shows/components/__tests__/resolve-cancellation-dialog.test.tsx
git commit -m "feat(erify_studios): add resolve dialog and gate history"
```

---

### Task 16: Wire the dialogs into the show detail route

**Files:**
- Modify: `apps/erify_studios/src/routes/studios/$studioId/shows/$showId/index.tsx`

**Interfaces:**
- Consumes: `useCancellationStatus` (Task 13), `CancelShowDialog` (Task 14), `ResolveCancellationDialog`, `GateHistory` (Task 15).
- No new test file — this route already renders via `StudioShowDetailsTab`, and the new card's behavior (tier-gating, outcome picker, active-task guard) is already covered by Tasks 14/15's component tests. This task is pure composition; verify it by running the app (Step 4 below), not a new unit test.

- [ ] **Step 1: Add a Cancellation Resolution card to the route**

In `index.tsx`, add a `CancellationResolutionCard` component and render it above the existing `StudioShowDetailsForm`:

```typescript
import { CancelShowDialog } from '@/features/studio-shows/components/cancel-show-dialog';
import { GateHistory } from '@/features/studio-shows/components/gate-history';
import { ResolveCancellationDialog } from '@/features/studio-shows/components/resolve-cancellation-dialog';
import { useCancellationStatus } from '@/features/studio-shows/api/cancel-studio-show';
```

```typescript
function CancellationResolutionCard({ studioId, show }: { studioId: string; show: StudioShowDetail }) {
  const { data: status } = useCancellationStatus(studioId, show.id);

  if (!status) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4 space-y-3">
      <h2 className="text-sm font-semibold">Cancellation Resolution</h2>
      {status.is_pending
        ? <ResolveCancellationDialog studioId={studioId} show={show} status={status} />
        : <CancelShowDialog studioId={studioId} show={show} />}
      <GateHistory history={status.history} />
    </div>
  );
}
```

Update `StudioShowDetailsTab` to render it above the existing form:

```typescript
function StudioShowDetailsTab() {
  const { studioId, showId } = Route.useParams();
  const { data: show } = useStudioShow({ studioId, showId });
  const [resetNonce, setResetNonce] = useState(0);
  const { role } = useStudioAccess(studioId);

  if (!show) {
    return null;
  }

  const isReadOnly = role === STUDIO_ROLE.ACCOUNT_MANAGER;

  return (
    <div className="space-y-3">
      <CancellationResolutionCard studioId={studioId} show={show} />
      <div className="rounded-md border bg-background p-3 sm:p-4">
        <StudioShowDetailsForm
          key={`${show.id}:${show.updated_at}:${resetNonce}`}
          studioId={studioId}
          show={show}
          isReadOnly={isReadOnly}
          onCancel={() => setResetNonce((nonce) => nonce + 1)}
        />
      </div>
    </div>
  );
}
```

(Only the `return` statement's wrapper changes — wrap the existing `<div className="rounded-md border...">...</div>` block in a `<div className="space-y-3">` alongside the new card, rather than replacing it.)

- [ ] **Step 2: Run the existing route/component test suite**

```bash
pnpm --filter erify_studios test
```
Expected: PASS — no existing test renders `StudioShowDetailsTab` in a way that would break from this addition (confirm by running the suite; if a snapshot or route test does fail, it's almost certainly asserting on the exact DOM structure of this route and needs updating to include the new card, not a sign the wiring is wrong).

- [ ] **Step 3: Run full erify_studios verification**

```bash
pnpm --filter erify_studios lint
pnpm --filter erify_studios typecheck
pnpm --filter erify_studios test
pnpm --filter erify_studios build
```
Expected: all pass.

- [ ] **Step 4: Manually verify in the running app**

```bash
pnpm dev:studios
```
Navigate to a studio show in `CONFIRMED` status as a Manager/Admin: confirm "Cancel Show" opens the dialog with an outcome picker, submitting moves the show to the chosen outcome with no pending interval. Then, with a different show and logged in as the active Duty Manager (or temporarily flip a `STudioShift.isDutyManager` row to test), confirm the dialog has no outcome picker and the show lands on "Cancelled Pending Resolution"; confirm a Manager/Admin can then open "Resolve" on that show, see the Gate History, and sign off.

- [ ] **Step 5: Commit**

```bash
git add apps/erify_studios/src/routes/studios/\$studioId/shows/\$showId/index.tsx
git commit -m "feat(erify_studios): wire cancellation gate dialogs into the show detail route"
```

---

## Self-Review

**Spec coverage** — every section of `docs/superpowers/specs/2026-06-26-show-state-gate-v2-design.md` maps to a task:
- "Two actor tiers" → Tasks 6 (`resolveActorTier`), 14 (`useCancellationTier`).
- "Manager and Duty Manager paths" (atomic vs. defer) → Tasks 7, 9, 14.
- "No Task at all" / Audit-derived snapshot → Tasks 6, 7, 11.
- "How a Manager finds a pending-resolution show" (Shows-list filter, not Task Review) → no code task needed; `show_status_name` filtering already exists in `get-studio-shows.ts` today, confirmed during design review — nothing to build.
- "Notification seam" → Tasks 5, 11.
- "The bypass fix" → Task 9.
- "Data model changes" (no `Task`/`TaskTarget`, no migration) → reflected by the absence of any such task; Task 2's `countActiveByShowId` and Task 12 are the only `TaskTarget` touches, both read-only counts.
- Concurrency guard (no `version` column) → Task 3, exercised in Tasks 7 and 9.
- Manual cancellation (`show_cancellation`) → Tasks 9, 10, 13, 14, 15, 16.
- `schedule_publish_removal` unification → Task 12.

**Placeholder scan** — no "TBD"/"TODO" remain; every code block is complete. Two genuine open investigations from the first draft (the `@ZodResponse` Date/snake_case handling in Task 10, and the `RadioGroup` primitive that turned out not to exist in `@eridu/ui`) were resolved by reading the actual source and rewriting the affected steps with concrete, verified code — not left as "check this" notes.

**Type consistency** — `CancellationStatusResult`/`GateAuditMetadata`/`GateKind`/`GateOutcome` are defined once (Task 6, retrofitted in Task 11) and referenced by the same names in every later task (9, 10, 12). `ShowCancellationGateService`'s method signatures (`openPending`, `resolveAtomic`, `amendPendingNote`, `resolvePending`) are introduced in Task 7 and consumed with matching parameter shapes in Tasks 9 and 12 — checked by re-reading each call site against Task 7's definitions while writing this plan.

**Scope check** — this is one coherent feature (the cancellation gate), but it's large: 16 tasks across two apps and a shared package. Tasks 1–12 (backend) are independently testable and shippable before any frontend task starts: Task 12 finishes one full backend `build`, in working order. If a narrower first PR is wanted, Tasks 1–12 alone are a complete, correct backend with no UI — split here if the review prefers smaller PRs.
