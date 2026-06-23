# Show State Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable "State Gate" primitive on top of the existing `Task` model (no new Prisma model) that backs two show-lifecycle workflows — manual studio cancellation and schedule-publish-triggered auto-cancellation — with ownership, claim/handover, traceable history, and operational safety guards (active-task block, LIVE safeguard).

**Architecture:** A single new `TaskType.STATE_GATE` enum value plus a `GATE_CONFIG` lookup (code, not data) drive three generic service primitives (`openGate`, `claimGate`, `resolveGate`) added to a new `ShowStateGateService` in `apps/erify_api/src/show-orchestration/`. Two callers wire into it: `StudioShowManagementService` (manual cancel, built fresh — PR #229 was never merged to `master`) and `publishing.service.ts`'s schedule-republish remove-flow (modified in place). Frontend adds a cancellation-resolution panel on the show detail page and a Claim action + Gate History view in `task-review`.

**Tech Stack:** NestJS + Prisma (erify_api), Zod schemas in `@eridu/api-types`, React + TanStack Query/Router (erify_studios), `@eridu/ui` components.

**Source spec:** `docs/superpowers/specs/2026-06-23-show-state-gate-design.md` — read it before starting; this plan implements it task-by-task and does not repeat its rationale.

## Global Constraints

- No new Prisma model. The only schema change across this entire plan is adding `STATE_GATE` to the `TaskType` enum.
- `Task.assigneeId` is a plain `User` id, not `StudioMembership` — no membership-role validation on who can be assigned, by design (deferred).
- `resolveGate` must run its 5 guards in this exact order: (1) Show/Task consistency, (2) ownership, (3) outcome validity, (4) active-task policy, (5) LIVE safeguard.
- The active-task-count definition (`taskTarget.deletedAt = null`, `task.deletedAt = null`, `task.status NOT IN ('COMPLETED', 'CLOSED')`) must be implemented exactly once and reused by both `resolveGate` and `publishing.service.ts` — never reimplemented inline a second time.
- `claimGate`/`resolveGate` concurrency safety rides on `Task.version` via `TaskRepository.updateWithVersionCheck` — no ad hoc `WHERE assignee_id IS NULL` raw queries.
- `openGate`/`claimGate`/`resolveGate` endpoints are `@StudioProtected([ADMIN, MANAGER])` — same as existing show-management routes. No wider role gets access.
- `Task.content.history` entries are `{ event: 'opened' | 'claimed' | 'reassigned' | 'resolved', actor_id: string | null, at: string, note?: string }` — every gate lifecycle action appends one entry, never overwrites prior entries.
- Every backend task that changes business logic ends with `pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test` passing. Every frontend task ends with `pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test` passing.
- Follow `AGENTS.md`'s Three-Tier Schema Architecture: API layer snake_case (Zod, `@eridu/api-types`), service layer camelCase, DB layer camelCase mapped to snake_case columns.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `apps/erify_api/prisma/schema.prisma` | Modify | Add `STATE_GATE` to `TaskType` enum |
| `packages/api-types/src/task-management/task.schema.ts` | Modify | Add `STATE_GATE` to `TASK_TYPE` constant |
| `apps/erify_api/src/models/show-status/show-status.repository.ts` | Modify | Add `findBySystemKey` |
| `apps/erify_api/src/models/show-status/show-status.service.ts` | Modify | Add `getShowStatusBySystemKey` |
| `apps/erify_api/src/models/task-target/task-target.repository.ts` | Modify | Add canonical `countActiveByShowId` |
| `apps/erify_api/src/models/task-target/task-target.service.ts` | Modify | Expose `countActiveByShowId` |
| `apps/erify_api/src/schedule-planning/publishing.service.ts` | Modify | Use canonical active-task count instead of inline `findFirst` |
| `apps/erify_api/src/show-orchestration/show-state-gate.config.ts` | Create | `GATE_CONFIG`, `GateKind`, `GateOutcome` types |
| `apps/erify_api/src/show-orchestration/show-state-gate.service.ts` | Create | `openGate`, `claimGate`, `resolveGate` |
| `apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts` | Create | Unit tests for the three primitives |
| `apps/erify_api/src/show-orchestration/show-orchestration.module.ts` | Modify | Register `ShowStateGateService`, import `AuditModule`/`ShowStatusModule` |
| `packages/api-types/src/shows/schemas.ts` | Modify | Cancel/resolve request+response schemas, reason/outcome enums |
| `packages/api-types/src/shows/types.ts` | Modify | Export inferred types for the new schemas |
| `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts` | Modify | `cancelShowWithResolution`, `resolveShowCancellation` |
| `apps/erify_api/src/studios/studio-show/studio-show.controller.ts` | Modify | `POST :id/cancel-with-resolution`, `POST :id/resolve-cancellation` |
| `apps/erify_api/src/studios/studio-show/studio-show-management.service.spec.ts` | Modify | Tests for the two new methods |
| `apps/erify_api/src/studios/studio-show/studio-show.controller.spec.ts` | Modify | Controller-level tests for the two new routes |
| `packages/api-types/src/task-management/task.schema.ts` | Modify | Add optional `note` to `ReassignTaskRequest` |
| `apps/erify_api/src/task-orchestration/task-assignment.service.ts` | Modify | `reassignTask` appends gate history when applicable |
| `apps/erify_api/src/studios/studio-task/studio-task.controller.ts` | Modify | `PATCH :id/claim` route |
| `apps/erify_api/src/studios/studio-task/studio-task.controller.spec.ts` | Modify | Test for the claim route |
| `apps/erify_api/src/task-orchestration/task-orchestration.service.ts` | Modify | `claimTask` delegating to `ShowStateGateService.claimGate` |
| `apps/erify_studios/src/features/studio-shows/api/cancel-studio-show.ts` | Create | `useCancelStudioShowWithResolution`, `useResolveStudioShowCancellation` |
| `apps/erify_studios/src/features/studio-shows/components/show-cancellation-resolution-panel.tsx` | Create | Show-detail cancel/resolve UI |
| `apps/erify_studios/src/routes/studios/$studioId/shows/$showId/index.tsx` | Modify | Mount the panel |
| `apps/erify_studios/src/features/tasks/hooks/use-claim-task.ts` | Create | `useClaimTask` mutation |
| `apps/erify_studios/src/features/tasks/components/gate-history.tsx` | Create | Read-only `content.history` timeline renderer |
| `apps/erify_studios/src/routes/studios/$studioId/task-review/index.tsx` | Modify | Claim action + Gate History expand for `STATE_GATE` rows |
| `.agent/skills/show-production-lifecycle/SKILL.md` | Modify | State Gate pattern subsection |
| `.agent/skills/show-production-lifecycle/references/state-gates.md` | Modify | Update cancellation rows |
| `.agent/skills/show-cancellation-resolution/SKILL.md` | Create | Tier 2 skill |
| `.agent/skills/schedule-publish-removal-resolution/SKILL.md` | Create | Tier 2 skill |
| `AGENTS.md` | Modify | Skill routing map entries |

---

### Task 1: Add `STATE_GATE` to the `TaskType` enum

**Files:**
- Modify: `apps/erify_api/prisma/schema.prisma:730-737`
- Modify: `packages/api-types/src/task-management/task.schema.ts:31-39`
- Create: `apps/erify_api/prisma/migrations/<timestamp>_add_task_state_gate_type/migration.sql` (generated, not hand-written)

**Interfaces:**
- Produces: Prisma `TaskType.STATE_GATE` enum member; `@eridu/api-types/task-management`'s `TASK_TYPE.STATE_GATE` constant, used by every later task.

- [ ] **Step 1: Add the enum value to the Prisma schema**

Edit `apps/erify_api/prisma/schema.prisma:730-737`:

```prisma
enum TaskType {
  SETUP // Pre-production
  ACTIVE // During show
  CLOSURE // Post-production
  ADMIN // Administrative
  ROUTINE // Regular maintenance
  OTHER
  STATE_GATE // System/manager-driven lifecycle gate (see show-state-gate.config.ts)
}
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter erify_api db:generate` (this repo's wrapper for `prisma migrate dev --create-only` per `AGENTS.md`'s migration rule — never hand-write migration SQL)

Expected: a new directory under `apps/erify_api/prisma/migrations/` containing `migration.sql` with `ALTER TYPE "TaskType" ADD VALUE 'STATE_GATE';`. Name the migration `add_task_state_gate_type` when prompted (purpose-only, no PR/phase reference per `AGENTS.md`'s migration-naming rule).

- [ ] **Step 3: Add the constant to `@eridu/api-types`**

Edit `packages/api-types/src/task-management/task.schema.ts:31-39`:

```ts
export const TASK_TYPE = {
  SETUP: 'SETUP',
  ACTIVE: 'ACTIVE',
  CLOSURE: 'CLOSURE',
  ADMIN: 'ADMIN',
  ROUTINE: 'ROUTINE',
  OTHER: 'OTHER',
  STATE_GATE: 'STATE_GATE',
} as const;
```

- [ ] **Step 4: Verify the package builds and the enum round-trips**

Run: `pnpm --filter @eridu/api-types build && pnpm --filter @eridu/api-types typecheck`
Expected: PASS, no errors.

Confirm the generated Prisma client recognizes the new member:
```bash
cd apps/erify_api && node -e "const {TaskType} = require('@prisma/client'); console.log(TaskType.STATE_GATE)"
```
Expected output: `STATE_GATE`

- [ ] **Step 5: Commit**

```bash
git add apps/erify_api/prisma/schema.prisma apps/erify_api/prisma/migrations packages/api-types/src/task-management/task.schema.ts
git commit -m "feat(erify_api): add STATE_GATE task type for show lifecycle gates"
```

---

### Task 2: Add `ShowStatus` lookup by `systemKey`

Both gate callers need to resolve a `ShowStatus` row by its `systemKey` (e.g. `'CANCELLED_PENDING_RESOLUTION'`) rather than by `uid`. This doesn't exist yet — `ShowStatusRepository` only has `findByUid`/`findByName`.

**Files:**
- Modify: `apps/erify_api/src/models/show-status/show-status.repository.ts`
- Modify: `apps/erify_api/src/models/show-status/show-status.service.ts`
- Test: `apps/erify_api/src/models/show-status/show-status.service.spec.ts` (create if it doesn't exist)

**Interfaces:**
- Produces: `ShowStatusService.getShowStatusBySystemKey(systemKey: string): Promise<ShowStatus | null>` — consumed by Task 5 (`openGate`) and Task 9 (manual cancellation wrapper).

- [ ] **Step 1: Write the failing test**

Create or append to `apps/erify_api/src/models/show-status/show-status.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { ShowStatusRepository } from './show-status.repository';
import { ShowStatusService } from './show-status.service';

describe('ShowStatusService', () => {
  let service: ShowStatusService;
  let repository: jest.Mocked<ShowStatusRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowStatusService,
        {
          provide: ShowStatusRepository,
          useValue: { findBySystemKey: jest.fn() },
        },
        { provide: 'UtilityService', useValue: {} },
      ],
    })
      .overrideProvider(ShowStatusService)
      .useFactory({
        factory: (repo: ShowStatusRepository) => new ShowStatusService(repo, {} as any),
        inject: [ShowStatusRepository],
      })
      .compile();

    service = module.get<ShowStatusService>(ShowStatusService);
    repository = module.get(ShowStatusRepository);
  });

  describe('getShowStatusBySystemKey', () => {
    it('delegates to the repository with the given systemKey', async () => {
      const status = { id: 1n, uid: 'shst_abc', systemKey: 'CANCELLED_PENDING_RESOLUTION' } as any;
      repository.findBySystemKey.mockResolvedValue(status);

      const result = await service.getShowStatusBySystemKey('CANCELLED_PENDING_RESOLUTION');

      expect(repository.findBySystemKey).toHaveBeenCalledWith('CANCELLED_PENDING_RESOLUTION');
      expect(result).toBe(status);
    });

    it('returns null when no status matches', async () => {
      repository.findBySystemKey.mockResolvedValue(null);
      const result = await service.getShowStatusBySystemKey('NOT_A_REAL_KEY');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter erify_api test -- show-status.service.spec`
Expected: FAIL with `service.getShowStatusBySystemKey is not a function` or `repository.findBySystemKey` undefined.

- [ ] **Step 3: Add `findBySystemKey` to the repository**

Edit `apps/erify_api/src/models/show-status/show-status.repository.ts`, add after `findByUid` (around line 31):

```ts
  async findBySystemKey(systemKey: string): Promise<ShowStatus | null> {
    return this.model.findFirst({
      where: { systemKey, deletedAt: null },
    });
  }
```

- [ ] **Step 4: Add `getShowStatusBySystemKey` to the service**

Edit `apps/erify_api/src/models/show-status/show-status.service.ts`, add after `getShowStatusById` (around line 35):

```ts
  async getShowStatusBySystemKey(systemKey: string): Promise<ReturnType<ShowStatusRepository['findBySystemKey']>> {
    return this.showStatusRepository.findBySystemKey(systemKey);
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter erify_api test -- show-status.service.spec`
Expected: PASS

- [ ] **Step 6: Run full verification and commit**

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test
git add apps/erify_api/src/models/show-status
git commit -m "feat(erify_api): add ShowStatus lookup by systemKey"
```

---

### Task 3: Canonical active-task count, shared by `publishing.service.ts` and the gate service

**Important finding:** `publishing.service.ts`'s current `hasActiveTaskTarget` check (lines 408-418) only filters `taskTarget.deletedAt = null` and `task.deletedAt = null` — it does **not** exclude `COMPLETED`/`CLOSED` tasks. This means a show whose only attached tasks are already completed is today incorrectly routed to `CANCELLED_PENDING_RESOLUTION` instead of straight to `CANCELLED`. This task fixes that bug while extracting the (corrected) logic into one canonical, reusable place — exactly the "Publish-Service Prerequisite" the old `IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md` flagged as needed but never landed.

**Files:**
- Modify: `apps/erify_api/src/models/task-target/task-target.repository.ts`
- Modify: `apps/erify_api/src/models/task-target/task-target.service.ts`
- Modify: `apps/erify_api/src/schedule-planning/publishing.service.ts:407-438`
- Modify: `apps/erify_api/src/schedule-planning/schedule-planning.module.ts` (import `TaskTargetModule`)
- Test: `apps/erify_api/src/models/task-target/task-target.service.spec.ts` (create if absent)
- Modify: `apps/erify_api/src/schedule-planning/publishing.service.spec.ts:23-37,344-346` (mock shape + assertions)

**Interfaces:**
- Produces: `TaskTargetService.countActiveByShowId(showId: bigint): Promise<number>` — consumed by Task 7 (`resolveGate`'s active-task guard) and this task's `publishing.service.ts` refactor.

- [ ] **Step 1: Write the failing test for the repository/service**

Create `apps/erify_api/src/models/task-target/task-target.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { TaskTargetRepository } from './task-target.repository';
import { TaskTargetService } from './task-target.service';

describe('TaskTargetService', () => {
  let service: TaskTargetService;
  let repository: jest.Mocked<TaskTargetRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskTargetService,
        { provide: TaskTargetRepository, useValue: { countActiveByShowId: jest.fn() } },
        { provide: 'UtilityService', useValue: {} },
      ],
    })
      .overrideProvider(TaskTargetService)
      .useFactory({
        factory: (repo: TaskTargetRepository) => new TaskTargetService(repo, {} as any),
        inject: [TaskTargetRepository],
      })
      .compile();

    service = module.get<TaskTargetService>(TaskTargetService);
    repository = module.get(TaskTargetRepository);
  });

  describe('countActiveByShowId', () => {
    it('delegates to the repository', async () => {
      repository.countActiveByShowId.mockResolvedValue(3);
      const result = await service.countActiveByShowId(42n);
      expect(repository.countActiveByShowId).toHaveBeenCalledWith(42n);
      expect(result).toBe(3);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter erify_api test -- task-target.service.spec`
Expected: FAIL — `countActiveByShowId is not a function`.

- [ ] **Step 3: Implement the repository method**

Edit `apps/erify_api/src/models/task-target/task-target.repository.ts`, add after `findByShowIds` (the existing comment there already names this exact requirement — "Engineering decision: cross-model join filter... cannot be expressed as a flat where clause"):

```ts
  // Canonical "active task" definition, shared by publishing.service.ts's
  // schedule-republish remove-flow and ShowStateGateService.resolveGate's
  // active-task guard. Both callers must use this method, not reimplement
  // the filter, so the definition of "active" can never drift between them.
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

- [ ] **Step 4: Implement the service wrapper**

Edit `apps/erify_api/src/models/task-target/task-target.service.ts`, add after `findByTaskIds`:

```ts
  async countActiveByShowId(...args: Parameters<TaskTargetRepository['countActiveByShowId']>): ReturnType<TaskTargetRepository['countActiveByShowId']> {
    return this.taskTargetRepository.countActiveByShowId(...args);
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter erify_api test -- task-target.service.spec`
Expected: PASS

- [ ] **Step 6: Refactor `publishing.service.ts` to use the canonical count**

Edit `apps/erify_api/src/schedule-planning/publishing.service.ts:407-438`, replace:

```ts
    for (const removed of toRemove) {
      const hasActiveTaskTarget = await tx.taskTarget.findFirst({
        where: {
          showId: removed.id,
          deletedAt: null,
          task: {
            deletedAt: null,
          },
        },
        select: {
          id: true,
        },
      });

      const targetStatusId = hasActiveTaskTarget
        ? statusIds.cancelledPendingResolution
        : statusIds.cancelled;

      if (removed.showStatusId !== targetStatusId) {
        await tx.show.update({
          where: { id: removed.id },
          data: {
            showStatusId: targetStatusId,
          },
        });
      }

      if (hasActiveTaskTarget) {
        publishSummary.shows_pending_resolution += 1;
      } else {
        publishSummary.shows_cancelled += 1;
      }
    }
```

with:

```ts
    for (const removed of toRemove) {
      const activeTaskCount = await this.taskTargetService.countActiveByShowId(removed.id);
      const hasActiveTaskTarget = activeTaskCount > 0;

      const targetStatusId = hasActiveTaskTarget
        ? statusIds.cancelledPendingResolution
        : statusIds.cancelled;

      if (removed.showStatusId !== targetStatusId) {
        await tx.show.update({
          where: { id: removed.id },
          data: {
            showStatusId: targetStatusId,
          },
        });
      }

      if (hasActiveTaskTarget) {
        publishSummary.shows_pending_resolution += 1;
      } else {
        publishSummary.shows_cancelled += 1;
      }
    }
```

Add the constructor dependency at `apps/erify_api/src/schedule-planning/publishing.service.ts:31-37`:

```ts
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly scheduleService: ScheduleService,
    private readonly showService: ShowService,
    private readonly relationSyncService: PublishingRelationSyncService,
    private readonly validationService: ValidationService,
    private readonly utilityService: UtilityService,
    private readonly taskTargetService: TaskTargetService,
```

Add the import at the top of the file:

```ts
import { TaskTargetService } from '@/models/task-target/task-target.service';
```

- [ ] **Step 7: Wire `TaskTargetModule` into `SchedulePlanningModule`**

Edit `apps/erify_api/src/schedule-planning/schedule-planning.module.ts`:

```ts
import { TaskTargetModule } from '@/models/task-target/task-target.module';
```

Add `TaskTargetModule` to the `imports` array alongside `ShowPlatformModule`.

- [ ] **Step 8: Update the existing `publishing.service.spec.ts` mocks**

Edit `apps/erify_api/src/schedule-planning/publishing.service.spec.ts:29` — add `count` to the `taskTarget` mock shape:

```ts
  taskTarget: { findFirst: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock; count: jest.Mock };
```

Edit line ~195 (the `mockTransactionClient` object literal) to add `count: jest.fn()` alongside the existing `taskTarget` mock methods.

Edit lines 344-346 (the existing test that asserts on `findFirst`), replace:

```ts
      mockTransactionClient.taskTarget.findFirst.mockResolvedValue(null);
```

with:

```ts
      mockTransactionClient.taskTarget.count.mockResolvedValue(0);
```

Search the rest of `publishing.service.spec.ts` for any other `taskTarget.findFirst.mockResolvedValue(...)` calls in remove-flow test cases and convert each to `taskTarget.count.mockResolvedValue(<n>)` where `<n>` is `0` for "no active tasks" cases and a positive integer (e.g. `2`) for "has active tasks" cases — `TaskTargetService` resolves through the same `txHost.tx.taskTarget` mock via `TaskTargetRepository`, so no provider-level mock is needed, only the transaction-client-level `count` stub.

Add one new test case confirming the bug fix:

```ts
    it('cancels straight to CANCELLED (not pending resolution) when only completed/closed tasks remain', async () => {
      // ... existing test setup for a `toRemove` show ...
      mockTransactionClient.taskTarget.count.mockResolvedValue(0); // canonical filter already excludes COMPLETED/CLOSED
      // ... act ...
      // assert show.update was called with statusIds.cancelled, and publishSummary.shows_cancelled incremented
    });
```

- [ ] **Step 9: Run the full publishing test suite**

Run: `pnpm --filter erify_api test -- publishing.service.spec`
Expected: PASS — all existing remove-flow tests pass with the new `count`-based mock, plus the new completed-tasks-only case.

- [ ] **Step 10: Full verification and commit**

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test
git add apps/erify_api/src/models/task-target apps/erify_api/src/schedule-planning
git commit -m "fix(erify_api): exclude completed/closed tasks from active-task count

Schedule-republish remove-flow incorrectly routed shows with only
completed tasks to CANCELLED_PENDING_RESOLUTION instead of CANCELLED.
Extracts the corrected definition into TaskTargetService.countActiveByShowId
so the gate service's active-task guard (added later) can never drift
from this definition."
```

---

### Task 4: `GATE_CONFIG` and gate types

**Files:**
- Create: `apps/erify_api/src/show-orchestration/show-state-gate.config.ts`
- Test: `apps/erify_api/src/show-orchestration/show-state-gate.config.spec.ts`

**Interfaces:**
- Produces: `GATE_CONFIG` object, `GateKind` type (`'show_cancellation' | 'schedule_publish_removal'`), `GateOutcome` type, `GateHistoryEntry` type, `getGateConfig(gateKind: GateKind): GateConfigEntry` helper that throws `HttpError.badRequest` on an unknown kind. Consumed by Task 5, 6, 7 (`ShowStateGateService`).

- [ ] **Step 1: Write the failing test**

Create `apps/erify_api/src/show-orchestration/show-state-gate.config.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';

import { GATE_CONFIG, getGateConfig } from './show-state-gate.config';

describe('show-state-gate.config', () => {
  it('exposes show_cancellation with CANCELLED and COMPLETED outcomes', () => {
    expect(GATE_CONFIG.show_cancellation.allowedOutcomes).toEqual(['CANCELLED', 'COMPLETED']);
    expect(GATE_CONFIG.show_cancellation.outcomesRequiringNoActiveTasks).toEqual(['CANCELLED']);
    expect(GATE_CONFIG.show_cancellation.requiresOwner).toBe(true);
  });

  it('exposes schedule_publish_removal with CANCELLED and RESTORE_PREVIOUS outcomes, unassigned by default', () => {
    expect(GATE_CONFIG.schedule_publish_removal.allowedOutcomes).toEqual(['CANCELLED', 'RESTORE_PREVIOUS']);
    expect(GATE_CONFIG.schedule_publish_removal.outcomesRequiringNoActiveTasks).toEqual(['CANCELLED']);
    expect(GATE_CONFIG.schedule_publish_removal.requiresOwner).toBe(false);
  });

  describe('getGateConfig', () => {
    it('returns the config entry for a known gate kind', () => {
      expect(getGateConfig('show_cancellation')).toBe(GATE_CONFIG.show_cancellation);
    });

    it('throws a BadRequestException for an unknown gate kind', () => {
      expect(() => getGateConfig('not_a_real_kind' as any)).toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter erify_api test -- show-state-gate.config.spec`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the config module**

Create `apps/erify_api/src/show-orchestration/show-state-gate.config.ts`:

```ts
import { HttpError } from '@/lib/errors/http-error.util';

/**
 * Sentinel outcome meaning "revert Show.status to the from_status captured
 * when the gate opened" instead of a fixed mapped status. Generic across
 * gate kinds — not specific to schedule_publish_removal.
 */
export const RESTORE_PREVIOUS_OUTCOME = 'RESTORE_PREVIOUS' as const;

export type GateOutcome = 'CANCELLED' | 'COMPLETED' | typeof RESTORE_PREVIOUS_OUTCOME;

export type GateHistoryEvent = 'opened' | 'claimed' | 'reassigned' | 'resolved';

export type GateHistoryEntry = {
  event: GateHistoryEvent;
  actor_id: string | null;
  at: string;
  note?: string;
};

export type GateConfigEntry = {
  /** ShowStatus.systemKey the show moves to when the gate opens. */
  pendingStatus: string;
  /** Outcomes resolveGate accepts for this gate kind. */
  allowedOutcomes: readonly GateOutcome[];
  /** Subset of allowedOutcomes that require zero active tasks on the show. */
  outcomesRequiringNoActiveTasks: readonly GateOutcome[];
  /** Reason codes valid for this gate kind's content.reason_category. */
  reasonOptions: readonly string[];
  /** Whether openGate requires a non-null ownerId for this kind. */
  requiresOwner: boolean;
};

export const GATE_CONFIG = {
  show_cancellation: {
    pendingStatus: 'CANCELLED_PENDING_RESOLUTION',
    allowedOutcomes: ['CANCELLED', 'COMPLETED'],
    outcomesRequiringNoActiveTasks: ['CANCELLED'],
    reasonOptions: [
      'CREATOR_UNAVAILABLE',
      'ROOM_UNAVAILABLE',
      'EQUIPMENT_FAILURE',
      'UTILITY_OUTAGE',
      'PLATFORM_ISSUE',
      'CLIENT_REQUEST',
      'OTHER',
    ],
    requiresOwner: true,
  },
  schedule_publish_removal: {
    pendingStatus: 'CANCELLED_PENDING_RESOLUTION',
    allowedOutcomes: ['CANCELLED', RESTORE_PREVIOUS_OUTCOME],
    outcomesRequiringNoActiveTasks: ['CANCELLED'],
    reasonOptions: ['REMOVED_FROM_REPUBLISHED_SCHEDULE'],
    requiresOwner: false,
  },
} as const satisfies Record<string, GateConfigEntry>;

export type GateKind = keyof typeof GATE_CONFIG;

export function getGateConfig(gateKind: GateKind): GateConfigEntry {
  const config = GATE_CONFIG[gateKind];
  if (!config) {
    throw HttpError.badRequest(`UNKNOWN_GATE_KIND:${gateKind}`);
  }
  return config;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter erify_api test -- show-state-gate.config.spec`
Expected: PASS

- [ ] **Step 5: Full verification and commit**

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test
git add apps/erify_api/src/show-orchestration/show-state-gate.config.ts apps/erify_api/src/show-orchestration/show-state-gate.config.spec.ts
git commit -m "feat(erify_api): add GATE_CONFIG for show state gates"
```

---

### Task 5: `ShowStateGateService.openGate`

**Design note carried into this task:** `Task.content.history`'s `actor_id` is the acting user's **`User.uid` string** (not the internal bigint id) — so the Gate History UI never has to reverse-resolve a bigint into a display identity at render time, and the JSON blob is self-describing. Every primitive in this service therefore takes actors as a `GateActor = { id: bigint; uid: string }` pair: `id` for FK columns (`assigneeId`, `Audit.actorId`), `uid` for the history log.

**Files:**
- Create: `apps/erify_api/src/show-orchestration/show-state-gate.service.ts`
- Create: `apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts`

**Interfaces:**
- Consumes: `TaskService.generateTaskUid()`, `TaskService.create(data: Prisma.TaskCreateInput, include?)`, `ShowRepository.update(where, data, include?)`, `ShowStatusService.getShowStatusBySystemKey(systemKey)`, `AuditService.create(payload)`, `getGateConfig(gateKind)` from Task 4.
- Produces: `GateActor` type; `ShowStateGateService.openGate(showId: bigint, gateKind: GateKind, params: OpenGateParams): Promise<Task>` — consumed by Task 9 and Task 10.

- [ ] **Step 1: Write the failing tests**

Create `apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { TaskType } from '@prisma/client';

import { ShowStateGateService } from './show-state-gate.service';

import { AuditService } from '@/models/audit/audit.service';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { TaskRepository } from '@/models/task/task.repository';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';

describe('ShowStateGateService.openGate', () => {
  let service: ShowStateGateService;
  let taskService: jest.Mocked<TaskService>;
  let showRepository: jest.Mocked<ShowRepository>;
  let showStatusService: jest.Mocked<ShowStatusService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowStateGateService,
        { provide: TaskService, useValue: { generateTaskUid: jest.fn(), create: jest.fn() } },
        { provide: TaskRepository, useValue: { findByUid: jest.fn(), updateWithVersionCheck: jest.fn() } },
        { provide: TaskTargetService, useValue: { countActiveByShowId: jest.fn() } },
        { provide: ShowRepository, useValue: { update: jest.fn(), findByUid: jest.fn() } },
        { provide: ShowStatusService, useValue: { getShowStatusBySystemKey: jest.fn() } },
        { provide: AuditService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShowStateGateService);
    taskService = module.get(TaskService);
    showRepository = module.get(ShowRepository);
    showStatusService = module.get(ShowStatusService);
    auditService = module.get(AuditService);
  });

  const owner = { id: 7n, uid: 'user_owner' };

  it('creates a STATE_GATE task targeting the show, moves Show.status, and writes an opened history entry + Audit row', async () => {
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({ id: 99n, uid: 'shst_pending', systemKey: 'CANCELLED_PENDING_RESOLUTION' } as any);
    taskService.generateTaskUid.mockReturnValue('task_abc123');
    taskService.create.mockResolvedValue({ id: 1n, uid: 'task_abc123' } as any);

    const result = await service.openGate(55n, 'show_cancellation', {
      owner,
      fromStatusSystemKey: 'LIVE',
      dueDate: null,
      content: { reason_category: 'ROOM_UNAVAILABLE', reason_note: 'Flooding in studio B' },
    });

    expect(showRepository.update).toHaveBeenCalledWith({ id: 55n }, { showStatusId: 99n });
    expect(taskService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'task_abc123',
        type: TaskType.STATE_GATE,
        assigneeId: 7n,
        content: expect.objectContaining({
          reason_category: 'ROOM_UNAVAILABLE',
          reason_note: 'Flooding in studio B',
          history: [
            expect.objectContaining({ event: 'opened', actor_id: 'user_owner', note: 'Flooding in studio B' }),
          ],
        }),
        metadata: expect.objectContaining({
          gate_kind: 'show_cancellation',
          from_status: 'LIVE',
          pending_status: 'CANCELLED_PENDING_RESOLUTION',
        }),
        targets: { create: [{ targetType: 'SHOW', targetId: 55n, showId: 55n }] },
      }),
    );
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OVERRIDE',
        actorId: 7n,
        metadata: expect.objectContaining({ field: 'show_status', old_value: 'LIVE', new_value: 'CANCELLED_PENDING_RESOLUTION', gate_task_uid: 'task_abc123' }),
        targets: [{ targetType: 'SHOW', targetId: 55n }],
      }),
    );
    expect(result.uid).toBe('task_abc123');
  });

  it('throws GATE_OWNER_REQUIRED when the gate kind requires an owner and none is given', async () => {
    await expect(
      service.openGate(55n, 'show_cancellation', {
        owner: null,
        fromStatusSystemKey: 'LIVE',
        content: { reason_category: 'OTHER' },
      }),
    ).rejects.toThrow('GATE_OWNER_REQUIRED:show_cancellation');
    expect(showRepository.update).not.toHaveBeenCalled();
  });

  it('allows a null owner for schedule_publish_removal (requiresOwner: false)', async () => {
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({ id: 99n } as any);
    taskService.generateTaskUid.mockReturnValue('task_def456');
    taskService.create.mockResolvedValue({ id: 2n, uid: 'task_def456' } as any);

    await service.openGate(55n, 'schedule_publish_removal', {
      owner: null,
      fromStatusSystemKey: 'CONFIRMED',
      content: { reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE', reason_note: 'Removed from republished schedule; 2 active task(s) still attached' },
    });

    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: null }));
  });

  it('throws SHOW_STATUS_NOT_CONFIGURED when the pending status lookup returns null', async () => {
    showStatusService.getShowStatusBySystemKey.mockResolvedValue(null);

    await expect(
      service.openGate(55n, 'show_cancellation', {
        owner,
        fromStatusSystemKey: 'LIVE',
        content: { reason_category: 'OTHER' },
      }),
    ).rejects.toThrow('SHOW_STATUS_NOT_CONFIGURED:CANCELLED_PENDING_RESOLUTION');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter erify_api test -- show-state-gate.service.spec`
Expected: FAIL — `show-state-gate.service.ts` does not exist.

- [ ] **Step 3: Write the service**

Create `apps/erify_api/src/show-orchestration/show-state-gate.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Prisma, Task } from '@prisma/client';
import { TaskType } from '@prisma/client';

import type { GateHistoryEntry, GateKind, GateOutcome } from './show-state-gate.config';
import { getGateConfig } from './show-state-gate.config';

import { HttpError } from '@/lib/errors/http-error.util';
import { AuditService } from '@/models/audit/audit.service';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { TaskRepository } from '@/models/task/task.repository';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';

export type GateActor = { id: bigint; uid: string };

export type OpenGateParams = {
  owner: GateActor | null;
  fromStatusSystemKey: string;
  dueDate?: Date | null;
  content: Record<string, unknown>;
  createdBy?: GateActor | null;
};

@Injectable()
export class ShowStateGateService {
  constructor(
    private readonly taskService: TaskService,
    private readonly taskRepository: TaskRepository,
    private readonly taskTargetService: TaskTargetService,
    private readonly showRepository: ShowRepository,
    private readonly showStatusService: ShowStatusService,
    private readonly auditService: AuditService,
  ) {}

  @Transactional()
  async openGate(showId: bigint, gateKind: GateKind, params: OpenGateParams): Promise<Task> {
    const config = getGateConfig(gateKind);
    if (config.requiresOwner && params.owner == null) {
      throw HttpError.badRequest(`GATE_OWNER_REQUIRED:${gateKind}`);
    }

    const pendingStatus = await this.showStatusService.getShowStatusBySystemKey(config.pendingStatus);
    if (!pendingStatus) {
      throw HttpError.badRequest(`SHOW_STATUS_NOT_CONFIGURED:${config.pendingStatus}`);
    }

    await this.showRepository.update({ id: showId }, { showStatusId: pendingStatus.id });

    const reasonNote = params.content.reason_note;
    const historyEntry: GateHistoryEntry = {
      event: 'opened',
      actor_id: params.owner?.uid ?? params.createdBy?.uid ?? null,
      at: new Date().toISOString(),
      ...(typeof reasonNote === 'string' && { note: reasonNote }),
    };

    const task = await this.taskService.create({
      uid: this.taskService.generateTaskUid(),
      description: `Show lifecycle gate: ${gateKind}`,
      type: TaskType.STATE_GATE,
      assigneeId: params.owner?.id ?? null,
      dueDate: params.dueDate ?? null,
      content: {
        ...params.content,
        history: [historyEntry],
      } as Prisma.InputJsonValue,
      metadata: {
        gate_kind: gateKind,
        from_status: params.fromStatusSystemKey,
        pending_status: config.pendingStatus,
      } as Prisma.InputJsonValue,
      targets: {
        create: [{ targetType: 'SHOW', targetId: showId, showId }],
      },
    } as Prisma.TaskCreateInput);

    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: params.createdBy?.id ?? params.owner?.id ?? null,
      reason: typeof reasonNote === 'string' ? reasonNote : undefined,
      metadata: {
        field: 'show_status',
        old_value: params.fromStatusSystemKey,
        new_value: config.pendingStatus,
        gate_task_uid: task.uid,
        gate_kind: gateKind,
      },
      targets: [{ targetType: 'SHOW', targetId: showId }],
    });

    return task;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter erify_api test -- show-state-gate.service.spec`
Expected: PASS (all 4 `openGate` tests)

- [ ] **Step 5: Full verification and commit**

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test
git add apps/erify_api/src/show-orchestration/show-state-gate.service.ts apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts
git commit -m "feat(erify_api): add ShowStateGateService.openGate"
```

---

### Task 6: `ShowStateGateService.claimGate`

**Files:**
- Modify: `apps/erify_api/src/show-orchestration/show-state-gate.service.ts`
- Modify: `apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts`

**Interfaces:**
- Consumes: `TaskRepository.findByUid(uid, include?)`, `TaskRepository.updateWithVersionCheck(where, data, include?)` (throws `VersionConflictError` from `@/lib/errors/version-conflict.error` on a stale version).
- Produces: `ShowStateGateService.claimGate(taskUid: string, claimant: GateActor): Promise<Task>` — consumed by Task 11 (claim controller endpoint).

- [ ] **Step 1: Write the failing tests**

Append to `apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts`:

```ts
describe('ShowStateGateService.claimGate', () => {
  let service: ShowStateGateService;
  let taskRepository: jest.Mocked<TaskRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowStateGateService,
        { provide: TaskService, useValue: { generateTaskUid: jest.fn(), create: jest.fn() } },
        { provide: TaskRepository, useValue: { findByUid: jest.fn(), updateWithVersionCheck: jest.fn() } },
        { provide: TaskTargetService, useValue: { countActiveByShowId: jest.fn() } },
        { provide: ShowRepository, useValue: { update: jest.fn(), findByUid: jest.fn() } },
        { provide: ShowStatusService, useValue: { getShowStatusBySystemKey: jest.fn() } },
        { provide: AuditService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShowStateGateService);
    taskRepository = module.get(TaskRepository);
  });

  const claimant = { id: 9n, uid: 'user_claimant' };

  it('sets assigneeId and appends a claimed history entry when the gate is unowned', async () => {
    taskRepository.findByUid.mockResolvedValue({
      id: 3n,
      uid: 'task_xyz',
      version: 1,
      assigneeId: null,
      content: { history: [{ event: 'opened', actor_id: null, at: '2026-06-23T00:00:00.000Z' }] },
    } as any);
    taskRepository.updateWithVersionCheck.mockResolvedValue({ id: 3n, uid: 'task_xyz', assigneeId: 9n } as any);

    await service.claimGate('task_xyz', claimant);

    expect(taskRepository.updateWithVersionCheck).toHaveBeenCalledWith(
      { uid: 'task_xyz', version: 1 },
      expect.objectContaining({
        assigneeId: 9n,
        version: { increment: 1 },
        content: expect.objectContaining({
          history: [
            expect.objectContaining({ event: 'opened' }),
            expect.objectContaining({ event: 'claimed', actor_id: 'user_claimant' }),
          ],
        }),
      }),
    );
  });

  it('throws GATE_ALREADY_CLAIMED when the gate already has an owner', async () => {
    taskRepository.findByUid.mockResolvedValue({ id: 3n, uid: 'task_xyz', version: 1, assigneeId: 5n, content: { history: [] } } as any);

    await expect(service.claimGate('task_xyz', claimant)).rejects.toThrow('GATE_ALREADY_CLAIMED:task_xyz');
    expect(taskRepository.updateWithVersionCheck).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the task does not exist', async () => {
    taskRepository.findByUid.mockResolvedValue(null);
    await expect(service.claimGate('task_missing', claimant)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter erify_api test -- show-state-gate.service.spec -t claimGate`
Expected: FAIL — `claimGate is not a function`.

- [ ] **Step 3: Implement `claimGate`**

Add to `apps/erify_api/src/show-orchestration/show-state-gate.service.ts`, inside the `ShowStateGateService` class, after `openGate`:

```ts
  @Transactional()
  async claimGate(taskUid: string, claimant: GateActor): Promise<Task> {
    const task = await this.taskRepository.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task', taskUid);
    }
    if (task.assigneeId != null) {
      throw HttpError.badRequest(`GATE_ALREADY_CLAIMED:${taskUid}`);
    }

    const history = Array.isArray((task.content as Record<string, unknown>)?.history)
      ? ((task.content as Record<string, unknown>).history as GateHistoryEntry[])
      : [];
    const claimedEntry: GateHistoryEntry = {
      event: 'claimed',
      actor_id: claimant.uid,
      at: new Date().toISOString(),
    };

    return this.taskRepository.updateWithVersionCheck(
      { uid: taskUid, version: task.version },
      {
        assigneeId: claimant.id,
        version: { increment: 1 },
        content: {
          ...(task.content as Record<string, unknown>),
          history: [...history, claimedEntry],
        } as Prisma.InputJsonValue,
      },
    );
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter erify_api test -- show-state-gate.service.spec -t claimGate`
Expected: PASS

- [ ] **Step 5: Full verification and commit**

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test
git add apps/erify_api/src/show-orchestration/show-state-gate.service.ts apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts
git commit -m "feat(erify_api): add ShowStateGateService.claimGate"
```

---

### Task 7: `ShowStateGateService.resolveGate` (all 5 guards)

`resolveGate` only has a `taskUid`, not a `showUid` — the show is found via the task's `TaskTarget`. This task also adds `ShowRepository.findById` (the repository currently only looks up shows by `uid`, never by internal `id`).

**Convention carried into this task:** `from_status` (in `Task.metadata`) and outcome keys are always `ShowStatus.systemKey` values — uppercase, e.g. `'LIVE'`, `'CANCELLED_PENDING_RESOLUTION'`, `'CANCELLED'` — never the lowercase display name. `Task 5`'s test already used `'LIVE'`; this task is consistent with it.

**Files:**
- Modify: `apps/erify_api/src/models/show/show.repository.ts` (add `findById`)
- Modify: `apps/erify_api/src/show-orchestration/show-state-gate.service.ts`
- Modify: `apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts`

**Interfaces:**
- Consumes: `ShowRepository.findById(id, include?)` (new), `TaskTargetService.findByTaskId(taskId)`, `TaskTargetService.countActiveByShowId(showId)` (Task 3), `ShowStatusService.getShowStatusBySystemKey` (Task 2).
- Produces: `ShowStateGateService.resolveGate(taskUid: string, outcome: GateOutcome, notes: string, actor: GateActor): Promise<Task>` — consumed by Task 9 and Task 10.

- [ ] **Step 1: Add `ShowRepository.findById`**

Edit `apps/erify_api/src/models/show/show.repository.ts`, add after `findByUid` (around line 53):

```ts
  async findById(id: bigint, include?: Prisma.ShowInclude): Promise<Show | null> {
    return this.delegate.findFirst({
      where: { id, deletedAt: null },
      ...(include && { include }),
    });
  }
```

- [ ] **Step 2: Write the failing tests**

Append to `apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts`:

```ts
describe('ShowStateGateService.resolveGate', () => {
  let service: ShowStateGateService;
  let taskRepository: jest.Mocked<TaskRepository>;
  let taskTargetService: jest.Mocked<TaskTargetService>;
  let showRepository: jest.Mocked<ShowRepository>;
  let showStatusService: jest.Mocked<ShowStatusService>;
  let auditService: jest.Mocked<AuditService>;

  const actor = { id: 11n, uid: 'user_resolver' };
  // from_status is CONFIRMED (not LIVE) by default so the generic success/guard
  // tests below aren't accidentally tripped by the LIVE safeguard (Guard 5) —
  // the two tests that specifically exercise that guard override metadata.from_status
  // to 'LIVE' on a per-test basis instead.
  const baseTask = {
    id: 4n,
    uid: 'task_gate1',
    version: 2,
    assigneeId: 11n,
    metadata: { gate_kind: 'show_cancellation', from_status: 'CONFIRMED', pending_status: 'CANCELLED_PENDING_RESOLUTION' },
    content: { history: [{ event: 'opened', actor_id: 'user_owner', at: '2026-06-23T00:00:00.000Z' }] },
  };
  const showTarget = { id: 1n, taskId: 4n, targetType: 'SHOW', targetId: 200n, showId: 200n };
  const pendingShow = { id: 200n, showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowStateGateService,
        { provide: TaskService, useValue: { generateTaskUid: jest.fn(), create: jest.fn() } },
        { provide: TaskRepository, useValue: { findByUid: jest.fn(), updateWithVersionCheck: jest.fn() } },
        { provide: TaskTargetService, useValue: { findByTaskId: jest.fn(), countActiveByShowId: jest.fn() } },
        { provide: ShowRepository, useValue: { update: jest.fn(), findById: jest.fn(), findByUid: jest.fn() } },
        { provide: ShowStatusService, useValue: { getShowStatusBySystemKey: jest.fn() } },
        { provide: AuditService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShowStateGateService);
    taskRepository = module.get(TaskRepository);
    taskTargetService = module.get(TaskTargetService);
    showRepository = module.get(ShowRepository);
    showStatusService = module.get(ShowStatusService);
    auditService = module.get(AuditService);

    taskRepository.findByUid.mockResolvedValue(baseTask as any);
    taskTargetService.findByTaskId.mockResolvedValue([showTarget] as any);
    showRepository.findById.mockResolvedValue(pendingShow as any);
    taskTargetService.countActiveByShowId.mockResolvedValue(0);
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({ id: 50n, systemKey: 'CANCELLED' } as any);
    taskRepository.updateWithVersionCheck.mockResolvedValue({ ...baseTask, status: 'COMPLETED' } as any);
  });

  it('resolves to a concrete outcome: updates Show.status, completes the Task, appends resolved history, writes Audit', async () => {
    await service.resolveGate('task_gate1', 'CANCELLED', 'Confirmed cancellation', actor);

    expect(showRepository.update).toHaveBeenCalledWith({ id: 200n }, { showStatusId: 50n });
    expect(taskRepository.updateWithVersionCheck).toHaveBeenCalledWith(
      { uid: 'task_gate1', version: 2 },
      expect.objectContaining({
        status: 'COMPLETED',
        content: expect.objectContaining({
          resolution_notes: 'Confirmed cancellation',
          history: [
            expect.objectContaining({ event: 'opened' }),
            expect.objectContaining({ event: 'resolved', actor_id: 'user_resolver', note: 'Confirmed cancellation' }),
          ],
        }),
      }),
    );
    expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({ actorId: 11n, reason: 'Confirmed cancellation' }));
  });

  it('resolves RESTORE_PREVIOUS by reverting Show.status to metadata.from_status', async () => {
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({ id: 60n, systemKey: 'CONFIRMED' } as any);

    await service.resolveGate('task_gate1', 'RESTORE_PREVIOUS', 'Schedule sync was wrong', actor);

    expect(showStatusService.getShowStatusBySystemKey).toHaveBeenCalledWith('CONFIRMED');
    expect(showRepository.update).toHaveBeenCalledWith({ id: 200n }, { showStatusId: 60n });
  });

  it('throws GATE_STATE_STALE when Show.status no longer matches the gate pendingStatus', async () => {
    showRepository.findById.mockResolvedValue({ id: 200n, showStatus: { systemKey: 'CANCELLED' } } as any);

    await expect(service.resolveGate('task_gate1', 'CANCELLED', 'note', actor)).rejects.toThrow('GATE_STATE_STALE:task_gate1');
    expect(taskRepository.updateWithVersionCheck).not.toHaveBeenCalled();
  });

  it('throws GATE_NOT_CLAIMED when the task has no assignee', async () => {
    taskRepository.findByUid.mockResolvedValue({ ...baseTask, assigneeId: null } as any);

    await expect(service.resolveGate('task_gate1', 'CANCELLED', 'note', actor)).rejects.toThrow('GATE_NOT_CLAIMED:task_gate1');
  });

  it('throws GATE_OUTCOME_NOT_ALLOWED for an outcome not in allowedOutcomes', async () => {
    await expect(service.resolveGate('task_gate1', 'BOGUS' as any, 'note', actor)).rejects.toThrow('GATE_OUTCOME_NOT_ALLOWED:BOGUS');
  });

  it('throws ACTIVE_TASKS_REMAIN with the count when CANCELLED is requested while active tasks exist', async () => {
    taskTargetService.countActiveByShowId.mockResolvedValue(3);

    await expect(service.resolveGate('task_gate1', 'CANCELLED', 'note', actor)).rejects.toThrow('ACTIVE_TASKS_REMAIN:task_gate1');
  });

  it('throws LIVE_CANCELLATION_REQUIRES_OVERRIDE when from_status is LIVE and outcome is CANCELLED', async () => {
    taskRepository.findByUid.mockResolvedValue({
      ...baseTask,
      metadata: { ...baseTask.metadata, from_status: 'LIVE' },
    } as any);

    await expect(service.resolveGate('task_gate1', 'CANCELLED', 'note', actor)).rejects.toThrow('LIVE_CANCELLATION_REQUIRES_OVERRIDE:task_gate1');
  });

  it('does NOT apply the LIVE safeguard to COMPLETED', async () => {
    taskRepository.findByUid.mockResolvedValue({
      ...baseTask,
      metadata: { ...baseTask.metadata, from_status: 'LIVE' },
    } as any);
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({ id: 70n, systemKey: 'COMPLETED' } as any);
    await service.resolveGate('task_gate1', 'COMPLETED', 'Show partially ran', actor);
    expect(showRepository.update).toHaveBeenCalledWith({ id: 200n }, { showStatusId: 70n });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter erify_api test -- show-state-gate.service.spec -t resolveGate`
Expected: FAIL — `resolveGate is not a function`.

- [ ] **Step 4: Implement `resolveGate`**

Add to `apps/erify_api/src/show-orchestration/show-state-gate.service.ts`. First update the imports:

```ts
import { TaskStatus, TaskType } from '@prisma/client';

import { type GateHistoryEntry, type GateKind, type GateOutcome, getGateConfig, RESTORE_PREVIOUS_OUTCOME } from './show-state-gate.config';
```

Then add the method, after `claimGate`:

```ts
  @Transactional()
  async resolveGate(taskUid: string, outcome: GateOutcome, notes: string, actor: GateActor): Promise<Task> {
    const task = await this.taskRepository.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task', taskUid);
    }

    const metadata = task.metadata as { gate_kind?: GateKind; from_status?: string; pending_status?: string };
    const gateKind = metadata.gate_kind;
    if (!gateKind) {
      throw HttpError.badRequest(`NOT_A_GATE_TASK:${taskUid}`);
    }
    const config = getGateConfig(gateKind);

    const targets = await this.taskTargetService.findByTaskId(task.id);
    const showTarget = targets.find((target) => target.showId != null);
    if (!showTarget?.showId) {
      throw HttpError.badRequest(`GATE_HAS_NO_SHOW_TARGET:${taskUid}`);
    }

    // Guard 1: Show/Task consistency
    const show = await this.showRepository.findById(showTarget.showId, { showStatus: true });
    if (!show || (show as any).showStatus?.systemKey !== config.pendingStatus) {
      throw HttpError.conflict(`GATE_STATE_STALE:${taskUid}`);
    }

    // Guard 2: Ownership
    if (task.assigneeId == null) {
      throw HttpError.badRequest(`GATE_NOT_CLAIMED:${taskUid}`);
    }

    // Guard 3: Outcome validity
    if (!(config.allowedOutcomes as readonly string[]).includes(outcome)) {
      throw HttpError.badRequest(`GATE_OUTCOME_NOT_ALLOWED:${outcome}`);
    }

    // Guard 4: Active-task policy
    if ((config.outcomesRequiringNoActiveTasks as readonly string[]).includes(outcome)) {
      const activeTaskCount = await this.taskTargetService.countActiveByShowId(showTarget.showId);
      if (activeTaskCount > 0) {
        throw HttpError.badRequestWithDetails(`ACTIVE_TASKS_REMAIN:${taskUid}`, { activeTaskCount });
      }
    }

    // Guard 5: LIVE safeguard — universal across gate kinds, not GATE_CONFIG-driven.
    if (outcome === 'CANCELLED' && metadata.from_status === 'LIVE') {
      throw HttpError.badRequest(`LIVE_CANCELLATION_REQUIRES_OVERRIDE:${taskUid}`);
    }

    const targetStatusSystemKey = outcome === RESTORE_PREVIOUS_OUTCOME ? metadata.from_status! : outcome;
    const targetStatus = await this.showStatusService.getShowStatusBySystemKey(targetStatusSystemKey);
    if (!targetStatus) {
      throw HttpError.badRequest(`SHOW_STATUS_NOT_CONFIGURED:${targetStatusSystemKey}`);
    }
    await this.showRepository.update({ id: showTarget.showId }, { showStatusId: targetStatus.id });

    const history = Array.isArray((task.content as Record<string, unknown>)?.history)
      ? ((task.content as Record<string, unknown>).history as GateHistoryEntry[])
      : [];
    const resolvedEntry: GateHistoryEntry = {
      event: 'resolved',
      actor_id: actor.uid,
      at: new Date().toISOString(),
      ...(notes && { note: notes }),
    };

    const resolvedTask = await this.taskRepository.updateWithVersionCheck(
      { uid: taskUid, version: task.version },
      {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        version: { increment: 1 },
        content: {
          ...(task.content as Record<string, unknown>),
          resolution_notes: notes,
          history: [...history, resolvedEntry],
        } as Prisma.InputJsonValue,
      },
    );

    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: actor.id,
      reason: notes,
      metadata: {
        field: 'show_status',
        old_value: config.pendingStatus,
        new_value: targetStatusSystemKey,
        gate_task_uid: taskUid,
        gate_kind: gateKind,
      },
      targets: [{ targetType: 'SHOW', targetId: showTarget.showId }],
    });

    return resolvedTask;
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter erify_api test -- show-state-gate.service.spec`
Expected: PASS (all `openGate`, `claimGate`, `resolveGate` tests — 15 total)

- [ ] **Step 6: Full verification and commit**

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test
git add apps/erify_api/src/models/show/show.repository.ts apps/erify_api/src/show-orchestration/show-state-gate.service.ts apps/erify_api/src/show-orchestration/show-state-gate.service.spec.ts
git commit -m "feat(erify_api): add ShowStateGateService.resolveGate with ownership, active-task, and LIVE guards"
```

- [ ] **Step 7: Register the new service in `ShowOrchestrationModule`**

Edit `apps/erify_api/src/show-orchestration/show-orchestration.module.ts`:

```ts
import { ShowStateGateService } from './show-state-gate.service';

import { AuditModule } from '@/models/audit/audit.module';
import { ShowStatusModule } from '@/models/show-status/show-status.module';
```

Add `AuditModule` and `ShowStatusModule` to `imports`, add `ShowStateGateService` to both `providers` and `exports`:

```ts
@Module({
  imports: [
    PrismaModule,
    CompensationLineItemModule,
    ShowModule,
    ShowCreatorModule,
    ShowPlatformModule,
    CreatorModule,
    PlatformModule,
    StudioModule,
    StudioCreatorModelModule,
    TaskModule,
    TaskTargetModule,
    AuditModule,
    ShowStatusModule,
  ],
  providers: [
    ShowOrchestrationService,
    ShowRunReviewService,
    CreatorCompensationService,
    ShowPlatformAssignmentService,
    ShowCreatorAssignmentService,
    ShowStateGateService,
  ],
  exports: [ShowOrchestrationService, ShowRunReviewService, CreatorCompensationService, ShowStateGateService],
})
export class ShowOrchestrationModule {}
```

- [ ] **Step 8: Verify the module wiring compiles and commit**

```bash
pnpm --filter erify_api typecheck
git add apps/erify_api/src/show-orchestration/show-orchestration.module.ts
git commit -m "chore(erify_api): register ShowStateGateService in ShowOrchestrationModule"
```

---

### Task 8: API contracts — cancel/resolve/gate schemas in `@eridu/api-types`

**API surface this plan adds** (decided here, not in the design doc, since it's an implementation detail): a dedicated `GET /studios/:studioId/shows/:showId/state-gate` endpoint returns the show's current open gate task (or `null`) — kept separate from the existing show-detail payload/query rather than embedding it there, so this feature doesn't touch the heavily-used existing show-detail include.

**Files:**
- Modify: `packages/api-types/src/shows/schemas.ts`
- Modify: `packages/api-types/src/shows/types.ts`
- Test: `packages/api-types/src/shows/schemas.spec.ts` (create if absent)

**Interfaces:**
- Produces: `cancelStudioShowRequestSchema`, `resolveStudioShowCancellationRequestSchema`, `studioShowStateGateSchema`, `gateOutcomeSchema`, `showCancellationReasonCategorySchema`, and inferred types `CancelStudioShowInput`, `ResolveStudioShowCancellationInput`, `StudioShowStateGate`, `GateOutcome` — consumed by Task 9 (backend DTOs) and Task 12 (frontend).

- [ ] **Step 1: Write the failing test**

Create `packages/api-types/src/shows/schemas.spec.ts` (or append if the file exists):

```ts
import { describe, expect, it } from 'vitest';

import {
  cancelStudioShowRequestSchema,
  resolveStudioShowCancellationRequestSchema,
  studioShowStateGateSchema,
} from './schemas.js';

describe('show state gate schemas', () => {
  it('accepts a valid cancel-with-resolution request', () => {
    const result = cancelStudioShowRequestSchema.safeParse({
      reason_category: 'ROOM_UNAVAILABLE',
      reason_note: 'Flooding in studio B',
      resolution_owner_membership_id: 'stdmem_abc',
      follow_up_due_at: null,
      follow_up_notes: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown reason_category', () => {
    const result = cancelStudioShowRequestSchema.safeParse({
      reason_category: 'NOT_A_REASON',
      reason_note: 'x',
      resolution_owner_membership_id: 'stdmem_abc',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a resolve request with a valid outcome', () => {
    const result = resolveStudioShowCancellationRequestSchema.safeParse({
      outcome: 'RESTORE_PREVIOUS',
      resolution_notes: 'Schedule sync was wrong',
    });
    expect(result.success).toBe(true);
  });

  it('parses a null state gate (no open gate for the show)', () => {
    expect(studioShowStateGateSchema.safeParse(null).success).toBe(true);
  });

  it('parses a populated state gate with history', () => {
    const result = studioShowStateGateSchema.safeParse({
      id: 'task_abc123',
      gate_kind: 'show_cancellation',
      reason_category: 'ROOM_UNAVAILABLE',
      reason_note: 'Flooding',
      follow_up_notes: null,
      resolution_notes: null,
      assignee_id: 'user_owner',
      assignee_name: 'Jane Doe',
      from_status: 'LIVE',
      allowed_outcomes: ['CANCELLED', 'COMPLETED'],
      history: [{ event: 'opened', actor_id: 'user_owner', at: '2026-06-23T00:00:00.000Z', note: 'Flooding' }],
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @eridu/api-types test -- schemas.spec`
Expected: FAIL — the schemas don't exist yet.

- [ ] **Step 3: Add the schemas**

Append to `packages/api-types/src/shows/schemas.ts`:

```ts
export const showCancellationReasonCategorySchema = z.enum([
  'CREATOR_UNAVAILABLE',
  'ROOM_UNAVAILABLE',
  'EQUIPMENT_FAILURE',
  'UTILITY_OUTAGE',
  'PLATFORM_ISSUE',
  'CLIENT_REQUEST',
  'OTHER',
]);

export const scheduleRemovalReasonCategorySchema = z.literal('REMOVED_FROM_REPUBLISHED_SCHEDULE');

export const gateOutcomeSchema = z.enum(['CANCELLED', 'COMPLETED', 'RESTORE_PREVIOUS']);

export const cancelStudioShowRequestSchema = z.object({
  reason_category: showCancellationReasonCategorySchema,
  reason_note: z.string().min(1).max(1000),
  resolution_owner_membership_id: z.string(),
  follow_up_due_at: z.string().datetime().nullable().optional(),
  follow_up_notes: z.string().max(1000).nullable().optional(),
});

export const resolveStudioShowCancellationRequestSchema = z.object({
  outcome: gateOutcomeSchema,
  resolution_notes: z.string().min(1).max(1000),
});

export const gateHistoryEntrySchema = z.object({
  event: z.enum(['opened', 'claimed', 'reassigned', 'resolved']),
  actor_id: z.string().nullable(),
  at: z.string(),
  note: z.string().optional(),
});

export const studioShowStateGateSchema = z.object({
  id: z.string(),
  gate_kind: z.string(),
  reason_category: z.string().nullable(),
  reason_note: z.string().nullable(),
  follow_up_notes: z.string().nullable(),
  resolution_notes: z.string().nullable(),
  assignee_id: z.string().nullable(),
  assignee_name: z.string().nullable(),
  from_status: z.string(),
  allowed_outcomes: z.array(gateOutcomeSchema),
  history: z.array(gateHistoryEntrySchema),
  created_at: z.string(),
  updated_at: z.string(),
}).nullable();
```

- [ ] **Step 4: Export inferred types**

Append to `packages/api-types/src/shows/types.ts`:

```ts
import type {
  cancelStudioShowRequestSchema,
  gateOutcomeSchema,
  resolveStudioShowCancellationRequestSchema,
  studioShowStateGateSchema,
} from './schemas.js';

export type CancelStudioShowInput = import('zod').z.infer<typeof cancelStudioShowRequestSchema>;
export type ResolveStudioShowCancellationInput = import('zod').z.infer<typeof resolveStudioShowCancellationRequestSchema>;
export type StudioShowStateGate = import('zod').z.infer<typeof studioShowStateGateSchema>;
export type GateOutcome = import('zod').z.infer<typeof gateOutcomeSchema>;
```

(Match the existing import style at the top of `types.ts` if it already imports `z` directly — use a plain `import type { z } from 'zod';` plus `z.infer<...>` instead of the inline `import('zod')` form if that's what the file already does; check the top of the file before writing this step.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @eridu/api-types test -- schemas.spec`
Expected: PASS

- [ ] **Step 6: Full verification and commit**

```bash
pnpm --filter @eridu/api-types lint && pnpm --filter @eridu/api-types typecheck && pnpm --filter @eridu/api-types build && pnpm --filter @eridu/api-types test
git add packages/api-types/src/shows
git commit -m "feat(api-types): add show cancellation and state-gate schemas"
```

---

### Task 9: Manual cancellation feature — `show_cancellation` gate kind, first caller

Builds `cancelShowWithResolution`, `resolveShowCancellation`, and `getOpenStateGateForShow` on `StudioShowManagementService`, backed entirely by `ShowStateGateService` from Tasks 5-7. Nothing here pre-existed on `master` — this is a fresh feature, not a PR #229 port.

**Files:**
- Create: `apps/erify_api/src/studios/studio-show/schemas/studio-show-cancellation.schema.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show.controller.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show.module.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show-management.service.spec.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show.controller.spec.ts`

**Interfaces:**
- Consumes: `ShowStateGateService.openGate`/`resolveGate` (Tasks 5, 7), `StudioMembershipService.findStudioMemberByUidAndStudio(membershipUid, studioUid): Promise<StudioMemberWithUser | null>`, `UserService.getUserByExtId(extId): Promise<User | null>`, `TaskRepository.findByUid(uid, include?)`, `TaskTargetService.findByShowIds`.
- Produces: `POST /studios/:studioId/shows/:id/cancel-with-resolution`, `POST /studios/:studioId/shows/:id/resolve-cancellation`, `GET /studios/:studioId/shows/:id/state-gate` — consumed by Task 12 (frontend).

- [ ] **Step 1: Write the schema/DTO file**

Create `apps/erify_api/src/studios/studio-show/schemas/studio-show-cancellation.schema.ts`:

```ts
import { createZodDto } from 'nestjs-zod';
import type { Task } from '@prisma/client';

import {
  cancelStudioShowRequestSchema,
  resolveStudioShowCancellationRequestSchema,
  studioShowStateGateSchema,
} from '@eridu/api-types/shows';

import type { GateHistoryEntry } from '@/show-orchestration/show-state-gate.config';

// Matches the established snake_case-input -> camelCase-DTO transform pattern
// already used by createStudioShowTransformSchema in show.schema.ts — without
// this, `dto.reasonCategory` etc. would not exist; the DTO would only expose
// the raw snake_case schema field names.
const cancelStudioShowTransformSchema = cancelStudioShowRequestSchema.transform((data) => ({
  reasonCategory: data.reason_category,
  reasonNote: data.reason_note,
  resolutionOwnerMembershipId: data.resolution_owner_membership_id,
  followUpDueAt: data.follow_up_due_at,
  followUpNotes: data.follow_up_notes,
}));

const resolveStudioShowCancellationTransformSchema = resolveStudioShowCancellationRequestSchema.transform((data) => ({
  outcome: data.outcome,
  resolutionNotes: data.resolution_notes,
}));

export class CancelStudioShowDto extends createZodDto(cancelStudioShowTransformSchema) {}
export class ResolveStudioShowCancellationDto extends createZodDto(resolveStudioShowCancellationTransformSchema) {}

export type GateTaskWithAssignee = Task & {
  assignee: { uid: string; name: string } | null;
};

/** Maps a STATE_GATE Task (with its assignee relation loaded) to the API response shape, or null if no task is given. */
export function toStudioShowStateGateDto(task: GateTaskWithAssignee | null, allowedOutcomes: readonly string[]) {
  if (!task) {
    return studioShowStateGateSchema.parse(null);
  }
  const content = task.content as Record<string, unknown>;
  const metadata = task.metadata as Record<string, unknown>;
  return studioShowStateGateSchema.parse({
    id: task.uid,
    gate_kind: metadata.gate_kind,
    reason_category: (content.reason_category as string) ?? null,
    reason_note: (content.reason_note as string) ?? null,
    follow_up_notes: (content.follow_up_notes as string) ?? null,
    resolution_notes: (content.resolution_notes as string) ?? null,
    assignee_id: task.assignee?.uid ?? null,
    assignee_name: task.assignee?.name ?? null,
    from_status: metadata.from_status,
    allowed_outcomes: allowedOutcomes,
    history: (content.history as GateHistoryEntry[]) ?? [],
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
  });
}
```

- [ ] **Step 2: Write the failing service tests**

Append to `apps/erify_api/src/studios/studio-show/studio-show-management.service.spec.ts` (read the file's existing `beforeEach`/mock setup first and match its provider-mocking style — it already mocks `ShowRepository`, `ShowService`, etc. for the constructor):

```ts
describe('cancelShowWithResolution', () => {
  it('resolves the owner membership to a User, opens a show_cancellation gate, and returns the updated show', async () => {
    showRepository.findByUidAndStudioUid.mockResolvedValue({
      id: 10n, uid: 'show_abc', showStatus: { systemKey: 'LIVE' },
    } as any);
    studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue({
      userId: 5n, user: { uid: 'user_owner', name: 'Jane' },
    } as any);
    userService.getUserByExtId.mockResolvedValue({ id: 1n, uid: 'user_caller' } as any);
    showStateGateService.openGate.mockResolvedValue({ uid: 'task_gate1' } as any);
    showService.getShowById.mockResolvedValue({ id: 10n, uid: 'show_abc' } as any);

    await service.cancelShowWithResolution('studio_1', 'show_abc', {
      reasonCategory: 'ROOM_UNAVAILABLE',
      reasonNote: 'Flooding',
      resolutionOwnerMembershipId: 'stdmem_1',
      followUpDueAt: null,
      followUpNotes: null,
    }, 'ext_caller_1');

    expect(showStateGateService.openGate).toHaveBeenCalledWith(10n, 'show_cancellation', {
      owner: { id: 5n, uid: 'user_owner' },
      fromStatusSystemKey: 'LIVE',
      dueDate: null,
      content: { reason_category: 'ROOM_UNAVAILABLE', reason_note: 'Flooding', follow_up_notes: null },
      createdBy: { id: 1n, uid: 'user_caller' },
    });
  });

  it('throws SHOW_CANCELLATION_NOT_ALLOWED for a DRAFT show', async () => {
    showRepository.findByUidAndStudioUid.mockResolvedValue({ id: 10n, showStatus: { systemKey: 'DRAFT' } } as any);
    await expect(
      service.cancelShowWithResolution('studio_1', 'show_abc', {} as any, 'ext_caller_1'),
    ).rejects.toThrow('SHOW_CANCELLATION_NOT_ALLOWED');
    expect(showStateGateService.openGate).not.toHaveBeenCalled();
  });

  it('throws RESOLUTION_OWNER_NOT_FOUND when the membership does not resolve', async () => {
    showRepository.findByUidAndStudioUid.mockResolvedValue({ id: 10n, showStatus: { systemKey: 'LIVE' } } as any);
    studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(null);
    await expect(
      service.cancelShowWithResolution('studio_1', 'show_abc', { resolutionOwnerMembershipId: 'stdmem_missing' } as any, 'ext_caller_1'),
    ).rejects.toThrow('RESOLUTION_OWNER_NOT_FOUND');
  });
});

describe('resolveShowCancellation', () => {
  it('finds the open gate task and calls resolveGate with the actor', async () => {
    showRepository.findByUidAndStudioUid.mockResolvedValue({ id: 10n, uid: 'show_abc', showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' } } as any);
    userService.getUserByExtId.mockResolvedValue({ id: 1n, uid: 'user_caller' } as any);
    taskTargetService.findByShowIds.mockResolvedValue([{ taskId: 4n, showId: 10n }] as any);
    taskRepository.findByUid.mockResolvedValue(null); // not used directly here; service finds by target+status
    showStateGateService.resolveGate.mockResolvedValue({ uid: 'task_gate1' } as any);
    showService.getShowById.mockResolvedValue({ id: 10n, uid: 'show_abc' } as any);

    // Implementation detail covered in Step 3: resolveShowCancellation looks up the
    // open STATE_GATE task for the show by querying tasks targeting it via TaskTargetService,
    // not by re-deriving from the gate primitives — see Step 3 below.
  });

  it('throws SHOW_CANCELLATION_NOT_PENDING when the show is not currently pending resolution', async () => {
    showRepository.findByUidAndStudioUid.mockResolvedValue({ id: 10n, showStatus: { systemKey: 'LIVE' } } as any);
    await expect(
      service.resolveShowCancellation('studio_1', 'show_abc', {} as any, 'ext_caller_1'),
    ).rejects.toThrow('SHOW_CANCELLATION_NOT_PENDING');
  });
});
```

(The first `resolveShowCancellation` test above is a placeholder for *test structure only* and is completed concretely in Step 4 below once the lookup mechanism is fixed — flesh it out with the exact `taskRepository`/`taskTargetService` calls the implementation in Step 3 actually makes before running it; do not leave it as written here, it is illustrative of the mocks needed, not a final assertion.)

- [ ] **Step 3: Decide and implement the "find the open gate task for a show" lookup**

Add a small helper to `TaskTargetService` (it already has `findByShowId`) — no new method needed, reuse `findByShowId(showId): Promise<TaskTarget[]>`, then in the management service filter the resulting targets' tasks by `type: STATE_GATE` and `status` not `COMPLETED`/`CLOSED` via a `TaskRepository.findMany` call. Add this repository method:

Edit `apps/erify_api/src/models/task/task.repository.ts`, add near `findByUid`:

```ts
  async findOpenStateGateForShow(showId: bigint): Promise<Task | null> {
    return this.delegate.findFirst({
      where: {
        type: 'STATE_GATE',
        status: { notIn: ['COMPLETED', 'CLOSED'] },
        deletedAt: null,
        targets: { some: { showId, deletedAt: null } },
      },
      include: { assignee: { select: { uid: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
```

Add the matching service wrapper to `apps/erify_api/src/models/task/task.service.ts`:

```ts
  async findOpenStateGateForShow(...args: Parameters<TaskRepository['findOpenStateGateForShow']>): ReturnType<TaskRepository['findOpenStateGateForShow']> {
    return this.taskRepository.findOpenStateGateForShow(...args);
  }
```

- [ ] **Step 4: Implement `StudioShowManagementService`'s three new methods**

Edit `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts`. Update imports:

```ts
import {
  CancelStudioShowDto,
  ResolveStudioShowCancellationDto,
  toStudioShowStateGateDto,
} from './schemas/studio-show-cancellation.schema';

import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { TaskService } from '@/models/task/task.service';
import { UserService } from '@/models/user/user.service';
import { getGateConfig } from '@/show-orchestration/show-state-gate.config';
import { ShowStateGateService } from '@/show-orchestration/show-state-gate.service';
```

Add to the constructor:

```ts
    private readonly showStateGateService: ShowStateGateService,
    private readonly taskService: TaskService,
    private readonly studioMembershipService: StudioMembershipService,
    private readonly userService: UserService,
```

Add the three methods (anywhere after `getShowDetail`):

```ts
  @Transactional()
  async cancelShowWithResolution(studioUid: string, showUid: string, dto: CancelStudioShowDto, actorExtId: string) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const currentStatus = show.showStatus?.systemKey ?? null;
    if (currentStatus === null || ['DRAFT', 'CANCELLED_PENDING_RESOLUTION', 'CANCELLED'].includes(currentStatus)) {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_ALLOWED');
    }

    const [ownerMembership, actor] = await Promise.all([
      this.studioMembershipService.findStudioMemberByUidAndStudio(dto.resolutionOwnerMembershipId, studioUid),
      this.userService.getUserByExtId(actorExtId),
    ]);
    if (!ownerMembership) {
      throw HttpError.badRequest('RESOLUTION_OWNER_NOT_FOUND');
    }

    await this.showStateGateService.openGate(show.id, 'show_cancellation', {
      owner: { id: ownerMembership.userId, uid: ownerMembership.user.uid },
      fromStatusSystemKey: currentStatus,
      dueDate: dto.followUpDueAt ? new Date(dto.followUpDueAt) : null,
      content: {
        reason_category: dto.reasonCategory,
        reason_note: dto.reasonNote,
        follow_up_notes: dto.followUpNotes ?? null,
      },
      createdBy: actor ? { id: actor.id, uid: actor.uid } : null,
    });

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  @Transactional()
  async resolveShowCancellation(studioUid: string, showUid: string, dto: ResolveStudioShowCancellationDto, actorExtId: string) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    if (show.showStatus?.systemKey !== 'CANCELLED_PENDING_RESOLUTION') {
      throw HttpError.badRequest('SHOW_CANCELLATION_NOT_PENDING');
    }

    const [gateTask, actor] = await Promise.all([
      this.taskService.findOpenStateGateForShow(show.id),
      this.userService.getUserByExtId(actorExtId),
    ]);
    if (!gateTask) {
      throw HttpError.notFound('ShowStateGate', showUid);
    }
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }

    await this.showStateGateService.resolveGate(gateTask.uid, dto.outcome, dto.resolutionNotes, { id: actor.id, uid: actor.uid });

    return this.showService.getShowById(showUid, studioShowDetailInclude);
  }

  async getOpenStateGateForShow(studioUid: string, showUid: string) {
    const show = await this.findStudioShowOrThrow(studioUid, showUid);
    const gateTask = await this.taskService.findOpenStateGateForShow(show.id);
    const gateKind = (gateTask?.metadata as Record<string, unknown> | undefined)?.gate_kind as
      | 'show_cancellation'
      | 'schedule_publish_removal'
      | undefined;
    const allowedOutcomes = gateKind ? getGateConfig(gateKind).allowedOutcomes : [];
    return toStudioShowStateGateDto(gateTask as any, allowedOutcomes);
  }
```

- [ ] **Step 5: Finish Step 2's `resolveShowCancellation` test now that the lookup is concrete**

Go back and replace the placeholder test body in Step 2 with:

```ts
  it('finds the open gate task and calls resolveGate with the actor', async () => {
    showRepository.findByUidAndStudioUid.mockResolvedValue({ id: 10n, uid: 'show_abc', showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' } } as any);
    userService.getUserByExtId.mockResolvedValue({ id: 1n, uid: 'user_caller' } as any);
    taskService.findOpenStateGateForShow.mockResolvedValue({ uid: 'task_gate1' } as any);
    showStateGateService.resolveGate.mockResolvedValue({ uid: 'task_gate1' } as any);
    showService.getShowById.mockResolvedValue({ id: 10n, uid: 'show_abc' } as any);

    await service.resolveShowCancellation('studio_1', 'show_abc', { outcome: 'CANCELLED', resolutionNotes: 'Confirmed' } as any, 'ext_caller_1');

    expect(showStateGateService.resolveGate).toHaveBeenCalledWith('task_gate1', 'CANCELLED', 'Confirmed', { id: 1n, uid: 'user_caller' });
  });
```

Add `taskService: { findOpenStateGateForShow: jest.fn() }` and `showStateGateService: { openGate: jest.fn(), resolveGate: jest.fn() }` and `studioMembershipService: { findStudioMemberByUidAndStudio: jest.fn() }` and `userService: { getUserByExtId: jest.fn() }` to the spec file's existing provider-mock setup (`beforeEach`), matching whatever mocking pattern (`useValue` vs `useClass`) the file already uses for its other constructor dependencies.

- [ ] **Step 6: Run the service tests to verify they pass**

Run: `pnpm --filter erify_api test -- studio-show-management.service.spec`
Expected: PASS

- [ ] **Step 7: Add the controller routes**

Edit `apps/erify_api/src/studios/studio-show/studio-show.controller.ts`. Add imports:

```ts
import {
  CancelStudioShowDto,
  ResolveStudioShowCancellationDto,
} from './schemas/studio-show-cancellation.schema';
import { studioShowStateGateSchema } from '@eridu/api-types/shows';
```

Add three routes after the existing `update`/`delete` routes:

```ts
  @Post(':id/cancel-with-resolution')
  @StudioProtected(STUDIO_SHOW_WRITE_ACCESS_ROLES)
  @ZodResponse(studioShowDetailDto)
  async cancelWithResolution(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Body() body: CancelStudioShowDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studioShowManagementService.cancelShowWithResolution(studioId, id, body, user.ext_id);
  }

  @Post(':id/resolve-cancellation')
  @StudioProtected(STUDIO_SHOW_WRITE_ACCESS_ROLES)
  @ZodResponse(studioShowDetailDto)
  async resolveCancellation(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
    @Body() body: ResolveStudioShowCancellationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studioShowManagementService.resolveShowCancellation(studioId, id, body, user.ext_id);
  }

  @Get(':id/state-gate')
  @StudioProtected(STUDIO_SHOW_WRITE_ACCESS_ROLES)
  @ZodResponse(studioShowStateGateSchema)
  async getStateGate(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) id: string,
  ) {
    return this.studioShowManagementService.getOpenStateGateForShow(studioId, id);
  }
```

- [ ] **Step 8: Add controller tests**

Append to `apps/erify_api/src/studios/studio-show/studio-show.controller.spec.ts`, matching the file's existing pattern (mocked `StudioShowManagementService` provider):

```ts
  describe('cancelWithResolution', () => {
    it('delegates to the service with the caller ext_id', async () => {
      const dto = { reasonCategory: 'OTHER', reasonNote: 'x', resolutionOwnerMembershipId: 'stdmem_1' } as any;
      const user = { ext_id: 'ext_1' } as any;
      await controller.cancelWithResolution('studio_1', 'show_1', dto, user);
      expect(service.cancelShowWithResolution).toHaveBeenCalledWith('studio_1', 'show_1', dto, 'ext_1');
    });
  });

  describe('resolveCancellation', () => {
    it('delegates to the service with the caller ext_id', async () => {
      const dto = { outcome: 'CANCELLED', resolutionNotes: 'x' } as any;
      const user = { ext_id: 'ext_1' } as any;
      await controller.resolveCancellation('studio_1', 'show_1', dto, user);
      expect(service.resolveShowCancellation).toHaveBeenCalledWith('studio_1', 'show_1', dto, 'ext_1');
    });
  });

  describe('getStateGate', () => {
    it('delegates to the service', async () => {
      await controller.getStateGate('studio_1', 'show_1');
      expect(service.getOpenStateGateForShow).toHaveBeenCalledWith('studio_1', 'show_1');
    });
  });
```

- [ ] **Step 9: Wire `MembershipModule`, `UserModule`, and `ShowStateGateService`'s module into `StudioShowModule`**

Edit `apps/erify_api/src/studios/studio-show/studio-show.module.ts`, add to imports:

```ts
import { MembershipModule } from '@/models/membership/membership.module';
import { TaskModule } from '@/models/task/task.module';
import { UserModule } from '@/models/user/user.module';
```

Add `MembershipModule`, `TaskModule`, `UserModule` to the `imports` array (`ShowOrchestrationModule` — which now exports `ShowStateGateService` per Task 7 Step 7 — is already imported).

- [ ] **Step 10: Run the controller tests and full verification**

```bash
pnpm --filter erify_api test -- studio-show.controller.spec
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test
```
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add apps/erify_api/src/studios/studio-show apps/erify_api/src/models/task
git commit -m "feat(erify_api): add manual show cancellation/resolution endpoints on the show_cancellation gate"
```

---

### Task 10: Schedule-publish removal — `schedule_publish_removal` gate kind, second caller + planner notice

`removed` shows in `publishing.service.ts`'s remove-flow already carry `showStatus: { systemKey: string | null }` (see `ExistingShow` in `publishing.types.ts:23-41`) — `removed.showStatus.systemKey` is the `fromStatusSystemKey` `openGate` needs, no extra fetch required.

**Files:**
- Modify: `apps/erify_api/src/schedule-planning/publishing.service.ts`
- Modify: `apps/erify_api/src/schedule-planning/schedule-planning.module.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts` (`resolveShowCancellation` sets the planner notice for this gate kind)
- Modify: `apps/erify_api/src/schedule-planning/publishing.service.spec.ts`
- Modify: `apps/erify_api/src/studios/studio-show/studio-show-management.service.spec.ts`

**Interfaces:**
- Consumes: `ShowStateGateService.openGate` (Task 5).
- Produces: schedule-publish-removed shows with active tasks now open a real, traceable gate instead of a bare status flip; `Show.metadata.schedule_resume_notice` set on `RESTORE_PREVIOUS` resolution, cleared when the show reappears in a later publish.

- [ ] **Step 1: Replace the remove-flow's direct status flip with `openGate`**

Edit `apps/erify_api/src/schedule-planning/publishing.service.ts:407-438` (already refactored once in Task 3 to use `countActiveByShowId` — this step changes what happens in the `hasActiveTaskTarget` branch, not the count itself):

Replace:

```ts
    for (const removed of toRemove) {
      const activeTaskCount = await this.taskTargetService.countActiveByShowId(removed.id);
      const hasActiveTaskTarget = activeTaskCount > 0;

      const targetStatusId = hasActiveTaskTarget
        ? statusIds.cancelledPendingResolution
        : statusIds.cancelled;

      if (removed.showStatusId !== targetStatusId) {
        await tx.show.update({
          where: { id: removed.id },
          data: {
            showStatusId: targetStatusId,
          },
        });
      }

      if (hasActiveTaskTarget) {
        publishSummary.shows_pending_resolution += 1;
      } else {
        publishSummary.shows_cancelled += 1;
      }
    }
```

with:

```ts
    for (const removed of toRemove) {
      const activeTaskCount = await this.taskTargetService.countActiveByShowId(removed.id);

      if (activeTaskCount > 0) {
        if (removed.showStatusId !== statusIds.cancelledPendingResolution) {
          await this.showStateGateService.openGate(removed.id, 'schedule_publish_removal', {
            owner: null,
            fromStatusSystemKey: removed.showStatus.systemKey ?? 'CONFIRMED',
            content: {
              reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
              reason_note: `Removed from republished schedule; ${activeTaskCount} active task(s) still attached`,
            },
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

Add the constructor dependency and import:

```ts
import { ShowStateGateService } from '@/show-orchestration/show-state-gate.service';
```

```ts
    private readonly taskTargetService: TaskTargetService,
    private readonly showStateGateService: ShowStateGateService,
```

- [ ] **Step 2: Clear `schedule_resume_notice` when a show reappears (is kept, not removed)**

Edit `apps/erify_api/src/schedule-planning/publishing.service.ts:370-373` (the existing metadata-diff block inside the "existing show kept" loop), replace:

```ts
      const incomingMetadata = incoming.source.metadata || {};
      if (JSON.stringify(existing.metadata || {}) !== JSON.stringify(incomingMetadata)) {
        updateData.metadata = incomingMetadata;
      }
```

with:

```ts
      const existingMetadata = (existing.metadata as Record<string, unknown>) || {};
      const incomingMetadata = { ...(incoming.source.metadata || {}) };
      // schedule_resume_notice is a passive display hint set when a manager manually
      // resumes a schedule_publish_removal gate (see ShowStateGateService.resolveGate
      // caller in studio-show-management.service.ts). incomingMetadata never carries it
      // (the import source has no concept of it), so any wholesale metadata replacement
      // clears it — but force the update even when nothing else changed, so the notice
      // doesn't linger on a show whose only metadata difference was the notice itself.
      const hadResumeNotice = 'schedule_resume_notice' in existingMetadata;
      if (hadResumeNotice || JSON.stringify(existingMetadata) !== JSON.stringify(incomingMetadata)) {
        updateData.metadata = incomingMetadata;
      }
```

- [ ] **Step 3: Wire `ShowOrchestrationModule` into `SchedulePlanningModule`**

Edit `apps/erify_api/src/schedule-planning/schedule-planning.module.ts`, add:

```ts
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
```

Add `ShowOrchestrationModule` to `imports` (alongside `TaskTargetModule` added in Task 3).

- [ ] **Step 4: Update `publishing.service.spec.ts`**

The existing remove-flow tests (updated in Task 3 to mock `taskTarget.count`) now also need a mocked `ShowStateGateService` provider. Add to the test module's providers:

```ts
{ provide: ShowStateGateService, useValue: { openGate: jest.fn() } },
```

For any existing test where `mockTransactionClient.taskTarget.count.mockResolvedValue(<n>)` with `<n> > 0` (the "has active tasks" case), add an assertion that `showStateGateService.openGate` was called instead of asserting a direct `tx.show.update` call for that show. Add one new test:

```ts
  it('does not re-open a gate for a show already in CANCELLED_PENDING_RESOLUTION', async () => {
    // ... existing remove-flow setup with a `removed` show whose showStatusId already equals statusIds.cancelledPendingResolution ...
    mockTransactionClient.taskTarget.count.mockResolvedValue(2);
    // ... act ...
    expect(showStateGateService.openGate).not.toHaveBeenCalled();
  });
```

- [ ] **Step 5: Run the publishing test suite**

Run: `pnpm --filter erify_api test -- publishing.service.spec`
Expected: PASS

- [ ] **Step 6: Set the planner notice in `resolveShowCancellation` for `RESTORE_PREVIOUS`**

Edit `apps/erify_api/src/studios/studio-show/studio-show-management.service.ts`'s `resolveShowCancellation` (added in Task 9), insert before the final `return this.showService.getShowById(...)`:

```ts
    const gateMetadata = gateTask.metadata as Record<string, unknown>;
    if (gateMetadata.gate_kind === 'schedule_publish_removal' && dto.outcome === 'RESTORE_PREVIOUS') {
      await this.showRepository.update({ id: show.id }, {
        metadata: {
          ...(show.metadata as Record<string, unknown>),
          schedule_resume_notice: { resumed_by: actor.uid, resumed_at: new Date().toISOString(), gate_task_uid: gateTask.uid },
        } as Prisma.InputJsonValue,
      });
    }
```

Add `import type { Prisma } from '@prisma/client';` to the file's imports if not already present.

- [ ] **Step 7: Add a test for the planner notice**

Append to `apps/erify_api/src/studios/studio-show/studio-show-management.service.spec.ts`:

```ts
  it('sets schedule_resume_notice when resolving a schedule_publish_removal gate to RESTORE_PREVIOUS', async () => {
    showRepository.findByUidAndStudioUid.mockResolvedValue({ id: 10n, uid: 'show_abc', metadata: {}, showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' } } as any);
    userService.getUserByExtId.mockResolvedValue({ id: 1n, uid: 'user_caller' } as any);
    taskService.findOpenStateGateForShow.mockResolvedValue({ uid: 'task_gate2', metadata: { gate_kind: 'schedule_publish_removal' } } as any);
    showStateGateService.resolveGate.mockResolvedValue({ uid: 'task_gate2' } as any);
    showService.getShowById.mockResolvedValue({ id: 10n, uid: 'show_abc' } as any);

    await service.resolveShowCancellation('studio_1', 'show_abc', { outcome: 'RESTORE_PREVIOUS', resolutionNotes: 'Schedule sync was wrong' } as any, 'ext_caller_1');

    expect(showRepository.update).toHaveBeenCalledWith({ id: 10n }, {
      metadata: expect.objectContaining({
        schedule_resume_notice: expect.objectContaining({ resumed_by: 'user_caller', gate_task_uid: 'task_gate2' }),
      }),
    });
  });

  it('does not set schedule_resume_notice for a show_cancellation gate resolved to CANCELLED', async () => {
    showRepository.findByUidAndStudioUid.mockResolvedValue({ id: 10n, uid: 'show_abc', metadata: {}, showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' } } as any);
    userService.getUserByExtId.mockResolvedValue({ id: 1n, uid: 'user_caller' } as any);
    taskService.findOpenStateGateForShow.mockResolvedValue({ uid: 'task_gate1', metadata: { gate_kind: 'show_cancellation' } } as any);
    showStateGateService.resolveGate.mockResolvedValue({ uid: 'task_gate1' } as any);
    showService.getShowById.mockResolvedValue({ id: 10n, uid: 'show_abc' } as any);

    await service.resolveShowCancellation('studio_1', 'show_abc', { outcome: 'CANCELLED', resolutionNotes: 'Confirmed' } as any, 'ext_caller_1');

    expect(showRepository.update).not.toHaveBeenCalled();
  });
```

- [ ] **Step 8: Full verification and commit**

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test
git add apps/erify_api/src/schedule-planning apps/erify_api/src/studios/studio-show
git commit -m "feat(erify_api): open a real gate (not a bare status flip) for schedule-publish removals with active tasks

Also adds the schedule_resume_notice planner-notice hint when a manager
resumes a schedule_publish_removal gate, cleared automatically the next
time the show reappears in a publish diff."
```

---

### Task 11: Reassign-with-note for `STATE_GATE` tasks, and the claim endpoint

`GateHistoryEntry` has no separate "from/to assignee" fields — composing that context into the entry's free-text `note` (alongside any caller-supplied note) keeps the shape from Task 4 unchanged rather than adding fields only this one event type would use.

**Files:**
- Modify: `packages/api-types/src/task-management/task.schema.ts:303-307`
- Modify: `apps/erify_api/src/task-orchestration/task-assignment.service.ts`
- Modify: `apps/erify_api/src/task-orchestration/task-orchestration.service.ts`
- Modify: `apps/erify_api/src/studios/studio-task/studio-task.controller.ts`
- Modify: `apps/erify_api/src/task-orchestration/task-assignment.service.spec.ts`
- Modify: `apps/erify_api/src/studios/studio-task/studio-task.controller.spec.ts`

**Interfaces:**
- Produces: `ReassignTaskRequest.note?: string`; `TaskOrchestrationService.claimTask(studioUid, taskUid, claimant): Promise<Task>`; `PATCH /studios/:studioId/tasks/:id/claim`.

- [ ] **Step 1: Add the optional `note` field**

Edit `packages/api-types/src/task-management/task.schema.ts:303-307`:

```ts
export const reassignTaskRequestSchema = z.object({
  assignee_uid: z.string().nullable(),
  note: z.string().max(1000).optional(),
});

export type ReassignTaskRequest = z.infer<typeof reassignTaskRequestSchema>;
```

- [ ] **Step 2: Write the failing test for gate-aware reassignment**

Append to `apps/erify_api/src/task-orchestration/task-assignment.service.spec.ts` (match its existing mock-provider style for `TaskService`, `StudioService`, `UserService`):

```ts
describe('reassignTask — STATE_GATE history', () => {
  it('appends a reassigned history entry with the note and from/to assignee when the task is a STATE_GATE', async () => {
    taskService.findByUid.mockResolvedValue({
      id: 4n, uid: 'task_gate1', studioId: 1n, type: 'STATE_GATE', assigneeId: 5n, version: 2,
      content: { history: [{ event: 'opened', actor_id: 'user_owner', at: '2026-06-23T00:00:00.000Z' }] },
    } as any);
    studioService.findByUid.mockResolvedValue({ id: 1n } as any);
    userService.getUserByExtId.mockResolvedValue({ uid: 'user_caller' } as any);
    jest.spyOn(service, 'resolveStudioMember' as any).mockResolvedValue({ userId: 9n, user: { uid: 'user_new_owner' } });

    await service.reassignTask('studio_1', 'task_gate1', 'stdmem_new', 'ext_caller_1', 'heads up, handing this off');

    expect(taskRepository.updateWithVersionCheck).toHaveBeenCalledWith(
      { uid: 'task_gate1', version: 2 },
      expect.objectContaining({
        assigneeId: 9n,
        version: { increment: 1 },
        content: expect.objectContaining({
          history: [
            expect.objectContaining({ event: 'opened' }),
            expect.objectContaining({
              event: 'reassigned',
              actor_id: 'user_caller',
              note: expect.stringContaining('heads up, handing this off'),
            }),
          ],
        }),
      }),
    );
  });

  it('falls back to setAssignee (no history) for a non-gate task type', async () => {
    taskService.findByUid.mockResolvedValue({ id: 4n, uid: 'task_normal', studioId: 1n, type: 'ROUTINE' } as any);
    studioService.findByUid.mockResolvedValue({ id: 1n } as any);
    jest.spyOn(service, 'resolveStudioMember' as any).mockResolvedValue({ userId: 9n, user: { uid: 'user_new' } });

    await service.reassignTask('studio_1', 'task_normal', 'stdmem_new', 'ext_caller_1');

    expect(taskService.setAssignee).toHaveBeenCalledWith('task_normal', 9n, { assignee: true, template: true });
    expect(taskRepository.updateWithVersionCheck).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter erify_api test -- task-assignment.service.spec -t STATE_GATE`
Expected: FAIL — `reassignTask` doesn't accept the new `actorExtId`/`note` params and never branches on task type.

- [ ] **Step 4: Implement gate-aware reassignment**

Edit `apps/erify_api/src/task-orchestration/task-assignment.service.ts`. Add imports/deps:

```ts
import type { Prisma } from '@prisma/client';

import type { GateHistoryEntry } from '@/show-orchestration/show-state-gate.config';
import { TaskRepository } from '@/models/task/task.repository';
import { UserService } from '@/models/user/user.service';
```

Add `private readonly taskRepository: TaskRepository` and `private readonly userService: UserService` to the constructor.

Replace `reassignTask`:

```ts
  async reassignTask(studioUid: string, taskUid: string, assigneeUid: string | null, actorExtId: string, note?: string) {
    const task = await this.taskService.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task', taskUid);
    }

    const studio = await this.studioService.findByUid(studioUid);
    if (!studio || task.studioId !== studio.id) {
      throw HttpError.forbidden('Task does not belong to this studio');
    }

    let assigneeUserId: bigint | null = null;
    let assigneeUserUid: string | null = null;
    if (assigneeUid) {
      const assigneeMembership = await this.resolveStudioMember(studioUid, assigneeUid);
      assigneeUserId = assigneeMembership.userId;
      assigneeUserUid = assigneeMembership.user.uid;
    }

    if (task.type !== 'STATE_GATE') {
      return this.taskService.setAssignee(taskUid, assigneeUserId, { assignee: true, template: true });
    }

    const actor = await this.userService.getUserByExtId(actorExtId);
    const previousAssigneeUid = (task as any).assigneeId != null ? 'previous owner' : 'unassigned';
    const history = Array.isArray((task.content as Record<string, unknown>)?.history)
      ? ((task.content as Record<string, unknown>).history as GateHistoryEntry[])
      : [];
    const composedNote = `Reassigned from ${previousAssigneeUid} to ${assigneeUserUid ?? 'unassigned'}${note ? ` — ${note}` : ''}`;
    const reassignedEntry: GateHistoryEntry = {
      event: 'reassigned',
      actor_id: actor?.uid ?? null,
      at: new Date().toISOString(),
      note: composedNote,
    };

    return this.taskRepository.updateWithVersionCheck(
      { uid: taskUid, version: task.version },
      {
        assigneeId: assigneeUserId,
        version: { increment: 1 },
        content: {
          ...(task.content as Record<string, unknown>),
          history: [...history, reassignedEntry],
        } as Prisma.InputJsonValue,
      },
    );
  }
```

(The exact phrasing of "previous owner" vs the previous assignee's uid is a minor UX nicety, not load-bearing — if `TaskService.findByUid`'s include already loads the previous assignee's `uid`, use that directly instead of the generic phrase; check what include `findByUid` defaults to and adjust the test's expectation to match exactly what the implementation produces.)

- [ ] **Step 5: Update the orchestration service and controller to pass the actor + note through**

Edit `apps/erify_api/src/task-orchestration/task-orchestration.service.ts:75` (the existing thin `reassignTask` wrapper):

```ts
  reassignTask(studioUid: string, taskUid: string, assigneeUid: string | null, actorExtId: string, note?: string) {
    return this.assignment.reassignTask(studioUid, taskUid, assigneeUid, actorExtId, note);
  }
```

Edit `apps/erify_api/src/studios/studio-task/studio-task.controller.ts:92-100`, add `@CurrentUser() user: AuthenticatedUser` and pass it through:

```ts
  @ApiOperation({ summary: 'Reassign a single task to a different studio member' })
  @Patch(':id/assign')
  @ZodResponse(taskDto)
  async reassign(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
    @Body() dto: ReassignTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taskOrchestrationService.reassignTask(studioId, id, dto.assignee_uid, user.ext_id, dto.note);
  }
```

Add the `CurrentUser`/`AuthenticatedUser` imports at the top of the controller file if not already present (check first — other controllers in this codebase already import these from the same paths used in Task 9).

- [ ] **Step 6: Add `claimTask` and the claim endpoint**

Edit `apps/erify_api/src/task-orchestration/task-orchestration.service.ts`, add the dependency and method:

```ts
  constructor(
    // ...existing deps...
    private readonly showStateGateService: ShowStateGateService,
  ) {}

  claimTask(taskUid: string, claimant: { id: bigint; uid: string }) {
    return this.showStateGateService.claimGate(taskUid, claimant);
  }
```

Add the import: `import { ShowStateGateService } from '@/show-orchestration/show-state-gate.service';`

Edit `apps/erify_api/src/studios/studio-task/studio-task.controller.ts`, add after the `reassign` route:

```ts
  @ApiOperation({ summary: 'Claim an unowned state-gate task' })
  @Patch(':id/claim')
  @ZodResponse(taskDto)
  async claim(
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const actor = await this.userService.getUserByExtId(user.ext_id);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }
    return this.taskOrchestrationService.claimTask(id, { id: actor.id, uid: actor.uid });
  }
```

Add `UserService` as a controller constructor dependency and the `HttpError` import if not already present.

- [ ] **Step 7: Add controller and orchestration tests**

Append to `apps/erify_api/src/studios/studio-task/studio-task.controller.spec.ts`:

```ts
  describe('claim', () => {
    it('resolves the actor and delegates to taskOrchestrationService.claimTask', async () => {
      userService.getUserByExtId.mockResolvedValue({ id: 1n, uid: 'user_caller' } as any);
      await controller.claim('task_gate1', { ext_id: 'ext_1' } as any);
      expect(service.claimTask).toHaveBeenCalledWith('task_gate1', { id: 1n, uid: 'user_caller' });
    });
  });
```

(Add `UserService` to the controller spec's mocked providers if not already present.)

- [ ] **Step 8: Run the full test suite and verify**

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test
```
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/api-types/src/task-management apps/erify_api/src/task-orchestration apps/erify_api/src/studios/studio-task
git commit -m "feat(erify_api): record gate history on reassignment, add claim endpoint"
```

---

### Task 12: Frontend — show-detail cancellation/resolution panel

**Files:**
- Create: `apps/erify_studios/src/features/studio-shows/api/cancel-studio-show.ts`
- Create: `apps/erify_studios/src/features/studio-shows/api/get-studio-show-state-gate.ts`
- Create: `apps/erify_studios/src/features/tasks/components/gate-history.tsx`
- Create: `apps/erify_studios/src/features/studio-shows/components/show-cancellation-resolution-panel.tsx`
- Modify: `apps/erify_studios/src/routes/studios/$studioId/shows/$showId/index.tsx`
- Test: `apps/erify_studios/src/features/studio-shows/components/__tests__/show-cancellation-resolution-panel.test.tsx`

**Interfaces:**
- Consumes: `studioShowKeys` (existing), `getMutationErrorMessage`, `invalidateStudioTaskQueries` (existing utilities), `apiClient` (existing), `@eridu/api-types/shows`'s `CancelStudioShowInput`, `ResolveStudioShowCancellationInput`, `StudioShowStateGate`, `GateOutcome` (Task 8).
- Produces: `useCancelStudioShowWithResolution(studioId)`, `useResolveStudioShowCancellation(studioId)`, `useStudioShowStateGate(studioId, showId)`, `GateHistory` component — consumed by Task 13 (shared `GateHistory`) and the show-detail route.

- [ ] **Step 1: Write the API functions and hooks**

Create `apps/erify_studios/src/features/studio-shows/api/get-studio-show-state-gate.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import type { StudioShowStateGate } from '@eridu/api-types/shows';

import { apiClient } from '@/lib/api/client';

export const studioShowStateGateKeys = {
  all: ['studio-show-state-gate'] as const,
  detail: (studioId: string, showId: string) => [...studioShowStateGateKeys.all, studioId, showId] as const,
};

export async function getStudioShowStateGate(
  studioId: string,
  showId: string,
  options?: { signal?: AbortSignal },
): Promise<StudioShowStateGate> {
  const response = await apiClient.get<StudioShowStateGate>(
    `/studios/${studioId}/shows/${showId}/state-gate`,
    { signal: options?.signal },
  );
  return response.data;
}

export function useStudioShowStateGate(studioId: string, showId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: studioShowStateGateKeys.detail(studioId, showId),
    queryFn: ({ signal }) => getStudioShowStateGate(studioId, showId, { signal }),
    enabled: options?.enabled ?? true,
  });
}
```

Create `apps/erify_studios/src/features/studio-shows/api/cancel-studio-show.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { CancelStudioShowInput, ResolveStudioShowCancellationInput, StudioShowDetail } from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';
import { studioShowStateGateKeys } from './get-studio-show-state-gate';
import { studioShowsKeys } from './get-studio-shows';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { apiClient } from '@/lib/api/client';

const CANCELLATION_ERROR_MESSAGES: Record<string, string> = {
  SHOW_CANCELLATION_NOT_ALLOWED: 'This show cannot be cancelled for resolution in its current status.',
  RESOLUTION_OWNER_NOT_FOUND: 'The selected resolution owner could not be found in this studio.',
  SHOW_CANCELLATION_NOT_PENDING: 'This show is not currently pending resolution.',
  GATE_NOT_CLAIMED: 'Claim this gate before resolving it.',
  ACTIVE_TASKS_REMAIN: 'This show still has active tasks. Close or reassign them before confirming cancellation.',
  LIVE_CANCELLATION_REQUIRES_OVERRIDE: 'This show was live when interrupted — resume it or mark it completed instead of cancelling outright.',
};

export async function cancelStudioShowWithResolution(
  studioId: string,
  showId: string,
  data: CancelStudioShowInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}/cancel-with-resolution`,
    data,
  );
  return response.data;
}

export async function resolveStudioShowCancellation(
  studioId: string,
  showId: string,
  data: ResolveStudioShowCancellationInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}/resolve-cancellation`,
    data,
  );
  return response.data;
}

function invalidateAfterGateChange(queryClient: ReturnType<typeof useQueryClient>, studioId: string, showId: string) {
  queryClient.invalidateQueries({ queryKey: studioShowKeys.detail(studioId, showId) });
  queryClient.invalidateQueries({ queryKey: studioShowStateGateKeys.detail(studioId, showId) });
  queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });
}

export function useCancelStudioShowWithResolution(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: CancelStudioShowInput }) =>
      cancelStudioShowWithResolution(studioId, showId, data),
    onSuccess: (_, { showId }) => {
      invalidateAfterGateChange(queryClient, studioId, showId);
      toast.success('Show moved to pending resolution');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to cancel show', CANCELLATION_ERROR_MESSAGES));
    },
  });
}

export function useResolveStudioShowCancellation(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ showId, data }: { showId: string; data: ResolveStudioShowCancellationInput }) =>
      resolveStudioShowCancellation(studioId, showId, data),
    onSuccess: (_, { showId }) => {
      invalidateAfterGateChange(queryClient, studioId, showId);
      toast.success('Cancellation resolved');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to resolve cancellation', CANCELLATION_ERROR_MESSAGES));
    },
  });
}
```

(Check `getMutationErrorMessage`'s exact signature before writing this — it may already accept a map of error-code-to-message as a third argument, matching `DELETE_ERROR_MESSAGES` usage seen in `delete-studio-show.ts`; if its signature differs, adapt the call sites above to match exactly rather than guessing.)

- [ ] **Step 2: Write the `GateHistory` component**

Create `apps/erify_studios/src/features/tasks/components/gate-history.tsx`:

```tsx
import type { StudioShowStateGate } from '@eridu/api-types/shows';

const EVENT_LABEL: Record<string, string> = {
  opened: 'Opened',
  claimed: 'Claimed',
  reassigned: 'Reassigned',
  resolved: 'Resolved',
};

type GateHistoryProps = {
  history: NonNullable<StudioShowStateGate>['history'];
};

export function GateHistory({ history }: GateHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
      <h3 className="font-medium">Gate History</h3>
      <ol className="space-y-1.5">
        {history.map((entry, index) => (
          <li key={`${entry.event}-${entry.at}-${index}`} className="text-muted-foreground">
            <span className="font-medium text-foreground">{EVENT_LABEL[entry.event] ?? entry.event}</span>
            {' · '}
            {new Date(entry.at).toLocaleString()}
            {entry.actor_id ? ` · ${entry.actor_id}` : ''}
            {entry.note ? <p className="mt-0.5 text-foreground">{entry.note}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 3: Write the cancellation/resolution panel**

Create `apps/erify_studios/src/features/studio-shows/components/show-cancellation-resolution-panel.tsx`:

```tsx
import { Ban, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CancelStudioShowInput, GateOutcome, StudioShowDetail } from '@eridu/api-types/shows';
import {
  AsyncCombobox,
  Badge,
  Button,
  Label,
  ResponsiveDateTimePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import {
  useCancelStudioShowWithResolution,
  useResolveStudioShowCancellation,
} from '../api/cancel-studio-show';
import { useStudioShowStateGate } from '../api/get-studio-show-state-gate';

import { ResponsiveDialog } from '@/components/responsive-dialog';
import { useStudioMembers } from '@/features/studio-members/api/members';
import { GateHistory } from '@/features/tasks/components/gate-history';

const REASON_OPTIONS: Array<{ value: CancelStudioShowInput['reason_category']; label: string }> = [
  { value: 'CREATOR_UNAVAILABLE', label: 'Creator unavailable' },
  { value: 'ROOM_UNAVAILABLE', label: 'Room unavailable' },
  { value: 'EQUIPMENT_FAILURE', label: 'Equipment failure' },
  { value: 'UTILITY_OUTAGE', label: 'Utility outage' },
  { value: 'PLATFORM_ISSUE', label: 'Platform issue' },
  { value: 'CLIENT_REQUEST', label: 'Client request' },
  { value: 'OTHER', label: 'Other' },
];

const OUTCOME_LABEL: Record<GateOutcome, string> = {
  CANCELLED: 'Confirm Cancellation',
  COMPLETED: 'Mark Completed',
  RESTORE_PREVIOUS: 'Resume Show',
};

type ShowCancellationResolutionPanelProps = {
  studioId: string;
  show: StudioShowDetail;
  isReadOnly?: boolean;
};

function getStatusKey(show: StudioShowDetail) {
  return show.show_status_system_key ?? show.show_status_name?.toUpperCase() ?? null;
}

export function ShowCancellationResolutionPanel({ studioId, show, isReadOnly = false }: ShowCancellationResolutionPanelProps) {
  const statusKey = getStatusKey(show);
  const isPendingResolution = statusKey === 'CANCELLED_PENDING_RESOLUTION';
  const canCancel = !isReadOnly
    && statusKey !== null
    && statusKey !== 'DRAFT'
    && statusKey !== 'CANCELLED_PENDING_RESOLUTION'
    && statusKey !== 'CANCELLED';

  const { data: stateGate } = useStudioShowStateGate(studioId, show.id, { enabled: isPendingResolution });

  if (isReadOnly || (!canCancel && !isPendingResolution)) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Cancellation Resolution</h2>
            {isPendingResolution ? <Badge variant="secondary">Pending resolution</Badge> : null}
          </div>
          {stateGate
            ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{stateGate.reason_note}</p>
                  <p>
                    Owner:
                    {' '}
                    {stateGate.assignee_name ?? 'Unassigned'}
                  </p>
                </div>
              )
            : (
                <p className="text-sm text-muted-foreground">
                  Move this show into a manager-owned cancellation follow-up workflow.
                </p>
              )}
        </div>

        {isPendingResolution && stateGate
          ? <ResolveCancellationDialog studioId={studioId} show={show} stateGate={stateGate} />
          : <CancelShowDialog studioId={studioId} show={show} />}
      </div>

      {stateGate ? <GateHistory history={stateGate.history} /> : null}
    </div>
  );
}

function CancelShowDialog({ studioId, show }: { studioId: string; show: StudioShowDetail }) {
  const [open, setOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState<CancelStudioShowInput['reason_category']>('CREATOR_UNAVAILABLE');
  const [reasonNote, setReasonNote] = useState('');
  const [ownerMembershipId, setOwnerMembershipId] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const cancelMutation = useCancelStudioShowWithResolution(studioId);

  const { data: membersResponse, isLoading: isLoadingMembers } = useStudioMembers(
    studioId,
    { limit: 50, search: ownerSearch || undefined },
    { enabled: open },
  );

  const memberOptions = useMemo(() => {
    return (membersResponse?.data ?? []).map((member) => ({
      value: member.membership_id,
      label: `${member.user_name} (${member.user_email})`,
    }));
  }, [membersResponse?.data]);

  const reset = () => {
    setReasonCategory('CREATOR_UNAVAILABLE');
    setReasonNote('');
    setOwnerMembershipId('');
    setOwnerSearch('');
    setFollowUpDueAt('');
    setFollowUpNotes('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen)
      reset();
    setOpen(nextOpen);
  };

  const canSubmit = reasonNote.trim().length > 0 && ownerMembershipId.length > 0;
  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
      <Button
        type="button"
        disabled={!canSubmit || cancelMutation.isPending}
        onClick={() => {
          cancelMutation.mutate({
            showId: show.id,
            data: {
              reason_category: reasonCategory,
              reason_note: reasonNote.trim(),
              resolution_owner_membership_id: ownerMembershipId,
              follow_up_due_at: followUpDueAt || null,
              follow_up_notes: followUpNotes.trim() || null,
            },
          }, { onSuccess: () => handleOpenChange(false) });
        }}
      >
        {cancelMutation.isPending ? 'Saving...' : 'Move to Pending'}
      </Button>
    </>
  );

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" />
        Cancel for Resolution
      </Button>
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange} title="Cancel for Resolution" description="Capture the cancellation reason, owner, and follow-up record." contentClassName="sm:max-w-[520px]" footer={footer}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason Category</Label>
            <Select value={reasonCategory} onValueChange={(value) => setReasonCategory(value as CancelStudioShowInput['reason_category'])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Resolution Owner</Label>
            <AsyncCombobox value={ownerMembershipId} onChange={setOwnerMembershipId} onSearch={setOwnerSearch} options={memberOptions} isLoading={isLoadingMembers} placeholder="Search a studio member..." />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={reasonNote} onChange={(event) => setReasonNote(event.target.value)} rows={3} maxLength={1000} />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Due</Label>
            <ResponsiveDateTimePicker value={followUpDueAt} onChange={setFollowUpDueAt} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Notes</Label>
            <Textarea value={followUpNotes} onChange={(event) => setFollowUpNotes(event.target.value)} rows={3} maxLength={1000} />
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}

function ResolveCancellationDialog({
  studioId,
  show,
  stateGate,
}: {
  studioId: string;
  show: StudioShowDetail;
  stateGate: NonNullable<import('@eridu/api-types/shows').StudioShowStateGate>;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<GateOutcome>(stateGate.allowed_outcomes[0]);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const resolveMutation = useResolveStudioShowCancellation(studioId);
  const isClaimed = stateGate.assignee_id != null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setOutcome(stateGate.allowed_outcomes[0]);
      setResolutionNotes('');
    }
    setOpen(nextOpen);
  };

  // LIVE safeguard, surfaced client-side: the backend enforces this; disabling here
  // avoids a round-trip just to learn it's blocked.
  const isOutcomeDisabled = (candidate: GateOutcome) => candidate === 'CANCELLED' && stateGate.from_status === 'LIVE';

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
      <Button
        type="button"
        disabled={!isClaimed || resolutionNotes.trim().length === 0 || resolveMutation.isPending}
        onClick={() => {
          resolveMutation.mutate({
            showId: show.id,
            data: { outcome, resolution_notes: resolutionNotes.trim() },
          }, { onSuccess: () => handleOpenChange(false) });
        }}
      >
        {resolveMutation.isPending ? 'Saving...' : (OUTCOME_LABEL[outcome] ?? 'Resolve')}
      </Button>
    </>
  );

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="h-4 w-4" />
        Resolve
      </Button>
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange} title="Resolve Cancellation" description="Close the pending cancellation gate." contentClassName="sm:max-w-[480px]" footer={footer}>
        <div className="space-y-4">
          {!isClaimed
            ? <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">Claim this gate from the task list before resolving it.</p>
            : null}
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={(value) => setOutcome(value as GateOutcome)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {stateGate.allowed_outcomes.map((candidate) => (
                  <SelectItem key={candidate} value={candidate} disabled={isOutcomeDisabled(candidate)}>
                    {OUTCOME_LABEL[candidate] ?? candidate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Resolution Notes</Label>
            <Textarea value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} rows={4} maxLength={1000} />
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
```

- [ ] **Step 4: Mount the panel on the show-detail route**

Edit `apps/erify_studios/src/routes/studios/$studioId/shows/$showId/index.tsx` — read the file first to find where other show-detail panels are rendered (e.g. wherever the existing show summary/header panels sit), then add:

```tsx
<ShowCancellationResolutionPanel studioId={studioId} show={show} />
```

with the matching import:

```ts
import { ShowCancellationResolutionPanel } from '@/features/studio-shows/components/show-cancellation-resolution-panel';
```

- [ ] **Step 5: Write component tests**

Create `apps/erify_studios/src/features/studio-shows/components/__tests__/show-cancellation-resolution-panel.test.tsx` following this codebase's existing component test setup (check an existing test under `apps/erify_studios/src/features/studio-shows/components/__tests__/` or similar for the exact `QueryClientProvider`/render-with-providers helper used elsewhere, and mock `apiClient` the same way):

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ShowCancellationResolutionPanel } from '../show-cancellation-resolution-panel';

// Mock the state-gate query and mutations per this file's existing query-mocking convention.
vi.mock('../../api/get-studio-show-state-gate', () => ({
  useStudioShowStateGate: () => ({ data: null }),
}));
vi.mock('../../api/cancel-studio-show', () => ({
  useCancelStudioShowWithResolution: () => ({ mutate: vi.fn(), isPending: false }),
  useResolveStudioShowCancellation: () => ({ mutate: vi.fn(), isPending: false }),
}));

const baseShow = { id: 'show_1', show_status_system_key: 'LIVE' } as any;

describe('ShowCancellationResolutionPanel', () => {
  it('renders the Cancel for Resolution action for a cancellable show', () => {
    render(<ShowCancellationResolutionPanel studioId="studio_1" show={baseShow} />);
    expect(screen.getByRole('button', { name: /cancel for resolution/i })).toBeInTheDocument();
  });

  it('renders nothing for a DRAFT show', () => {
    const { container } = render(
      <ShowCancellationResolutionPanel studioId="studio_1" show={{ ...baseShow, show_status_system_key: 'DRAFT' }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when isReadOnly is true', () => {
    const { container } = render(<ShowCancellationResolutionPanel studioId="studio_1" show={baseShow} isReadOnly />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

(Adapt the mocking approach to match whatever this repo's existing component tests actually use for TanStack Query hooks — `vi.mock` of the hook module as shown, or a `QueryClientProvider` wrapper with `apiClient` mocked via MSW/axios-mock — check one existing test file before writing this one for real, rather than guessing the convention.)

- [ ] **Step 6: Run the frontend test suite and verify**

```bash
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/erify_studios/src/features/studio-shows apps/erify_studios/src/features/tasks/components/gate-history.tsx apps/erify_studios/src/routes/studios/\$studioId/shows/\$showId/index.tsx
git commit -m "feat(erify_studios): add show cancellation/resolution panel backed by the state gate"
```

---

### Task 13: Frontend — claim action, Gate History in task surfaces, planner notice banner

**Scope decision made here:** this codebase's task-detail/reassignment UI is split across at least two real surfaces — `SystemTaskDetailsDialog` (`apps/erify_studios/src/features/tasks/components/system-task-details-dialog.tsx`, confirmed: has a "Reassign User" field, used from `/system/tasks/`) and a separate, not-yet-read reassignment path used from `/studios/$studioId/task-review/`. Rather than fabricate integration code for the unread surface, **Step 1 of this task is to read it** before editing — the rest of the task gives complete, real code for everything else (the hook, the Gate History reuse, the banner).

**Files:**
- Create: `apps/erify_studios/src/features/tasks/hooks/use-claim-task.ts`
- Modify: `apps/erify_studios/src/features/tasks/components/system-task-details-dialog.tsx`
- Modify: `apps/erify_studios/src/routes/studios/$studioId/task-review/index.tsx` (exact integration point determined in Step 1)
- Create: `apps/erify_studios/src/features/studio-shows/components/schedule-resume-notice-banner.tsx`
- Modify: `apps/erify_studios/src/routes/studios/$studioId/shows/$showId/index.tsx`
- Test: `apps/erify_studios/src/features/tasks/hooks/__tests__/use-claim-task.test.tsx`

**Interfaces:**
- Consumes: `GateHistory` (Task 12), `TaskWithRelationsDto` (existing, from `@eridu/api-types/task-management`), `StudioShowDetail.metadata` (existing generic `Record<string, any>` field).
- Produces: `useClaimTask(studioId)` mutation hook.

- [ ] **Step 1: Read the task-review reassignment surface before touching it**

Read `apps/erify_studios/src/routes/studios/$studioId/task-review/index.tsx` in full, and `apps/erify_studios/src/features/tasks/components/studio-task-action-sheet.tsx`'s row-action / per-row menu section (search for where a reassign or "more actions" affordance renders per row — likely near wherever `tableProps.columns` or a row-actions cell is defined). Identify: (a) the exact component/file that renders a per-row action menu for `task-review`, (b) whether it already has access to the full `TaskWithRelationsDto` (including `type` and `content`) for each row so a `type === 'STATE_GATE'` check is possible, (c) the existing pattern for adding a new per-row action (button vs. dropdown item) and its mutation-loading/disabled-state convention. Write down the exact file and line range you'll edit in Step 4 before proceeding — do not guess.

- [ ] **Step 2: Write the failing test for `useClaimTask`**

Create `apps/erify_studios/src/features/tasks/hooks/__tests__/use-claim-task.test.tsx` (mirror whatever existing hook test in this directory, e.g. for `useAssignTask`, sets up its `QueryClientProvider`/`apiClient` mock — read that file first and match it exactly):

```tsx
import { describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api/client';

import { useClaimTask } from '../use-claim-task';

vi.mock('@/lib/api/client');

describe('useClaimTask', () => {
  it('PATCHes /studios/:studioId/tasks/:taskId/claim', async () => {
    (apiClient.patch as any).mockResolvedValue({ data: { id: 'task_gate1' } });
    // Render the hook with the test harness this directory's other hook tests use
    // (renderHook + QueryClientProvider wrapper), call mutateAsync({ taskId: 'task_gate1' }),
    // then assert:
    expect(apiClient.patch).toHaveBeenCalledWith('/studios/studio_1/tasks/task_gate1/claim');
  });
});
```

(Complete this test using the exact `renderHook`/wrapper helper already used by `use-assign-task.test.ts` or its neighbor in this directory — read that file first; do not invent a different test harness.)

- [ ] **Step 3: Implement `useClaimTask`**

Create `apps/erify_studios/src/features/tasks/hooks/use-claim-task.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskDto } from '@eridu/api-types/task-management';

import { studioTasksKeys } from '../api/get-studio-tasks';
import { myTasksKeys } from '../api/get-my-tasks';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { apiClient } from '@/lib/api/client';

const CLAIM_ERROR_MESSAGES: Record<string, string> = {
  GATE_ALREADY_CLAIMED: 'Someone already claimed this gate — refresh to see who.',
};

export async function claimTask(studioId: string, taskId: string): Promise<TaskDto> {
  const response = await apiClient.patch<TaskDto>(`/studios/${studioId}/tasks/${taskId}/claim`);
  return response.data;
}

export function useClaimTask({ studioId }: { studioId: string }) {
  const queryClient = useQueryClient();
  return useMutation<TaskDto, Error, { taskId: string }>({
    mutationFn: ({ taskId }) => claimTask(studioId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioTasksKeys.all(studioId) });
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
      toast.success('Gate claimed');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to claim gate', CLAIM_ERROR_MESSAGES));
    },
  });
}
```

(Verify `studioTasksKeys`/`myTasksKeys` are exported from the exact paths used elsewhere — `use-studio-task.ts` from Task 12's research already confirmed `studioTasksKeys.all(studioId)` and `myTasksKeys.all` as the invalidation targets used by `useUpdateStudioTask`; reuse the same two keys here rather than inventing new ones, so claiming a gate refreshes both the task-review queue and the assignee's my-tasks list.)

- [ ] **Step 4: Run the test to verify it fails, then passes**

Run: `pnpm --filter erify_studios test -- use-claim-task`
Expected: FAIL (module doesn't exist) → implement → PASS.

- [ ] **Step 5: Add the Claim action and Gate History to `SystemTaskDetailsDialog`**

Edit `apps/erify_studios/src/features/tasks/components/system-task-details-dialog.tsx`. Add the import:

```ts
import { GateHistory } from '@/features/tasks/components/gate-history';
```

Add a new prop and render block — insert after the existing "Reassign User" block (around line 168, just before the "Move to Show" block):

```tsx
{task.type === 'STATE_GATE' && (
  <div className="rounded-md border p-3 space-y-2">
    <Label>State Gate</Label>
    {task.assignee
      ? <div className="text-xs text-muted-foreground">Owned by {task.assignee.name}</div>
      : (
          <Button type="button" size="sm" onClick={onClaim} disabled={isClaiming}>
            {isClaiming ? 'Claiming...' : 'Claim'}
          </Button>
        )}
    <GateHistory history={(task.content as Record<string, unknown>)?.history as any ?? []} />
  </div>
)}
```

Add `onClaim: () => Promise<void>` and `isClaiming?: boolean` to `SystemTaskDetailsDialogProps` and the destructured props.

- [ ] **Step 6: Wire `onClaim` from wherever `SystemTaskDetailsDialog` is rendered**

Find the parent component that renders `<SystemTaskDetailsDialog ... onAssign={...} />` (search for that exact JSX usage) and add:

```tsx
const claimMutation = useClaimTask({ studioId });
// ...
<SystemTaskDetailsDialog
  // ...existing props...
  onClaim={async () => { await claimMutation.mutateAsync({ taskId: task.id }); }}
  isClaiming={claimMutation.isPending}
/>
```

with `import { useClaimTask } from '@/features/tasks/hooks/use-claim-task';`.

- [ ] **Step 7: Apply the same Claim + Gate History treatment to the task-review surface identified in Step 1**

Using the exact file/location written down in Step 1, add the same `useClaimTask` call and a Claim button rendered when the row's `task.type === 'STATE_GATE' && task.assignee == null`, following that surface's existing per-row action pattern exactly (button vs. dropdown item, loading-state convention) rather than the dialog-based approach used in Step 5 — these are two different UI surfaces and should each match their own existing idioms.

- [ ] **Step 7a: Fix the Task Type label/filter for `STATE_GATE`**

**Bug found in self-review:** `apps/erify_studios/src/lib/constants/task-type-labels.ts`'s `getTaskTypeLabel` has no branch for `STATE_GATE` — it falls through to `m.task_type_other()`, so every gate task would render as "Other" in `task-review`'s Task Type filter and anywhere else this label is shown, instead of "State Gate". `getTaskTypeOptions()` (used to populate the filter dropdown) derives its list from `Object.values(TASK_TYPE)`, so the dropdown *option* already exists once Task 1 adds the enum value — only the label is wrong.

Edit `apps/erify_studios/src/i18n/messages/en.json:11-16`, add a new key:

```json
  "task_type_setup": "Pre-production",
  "task_type_active": "On-air",
  "task_type_closure": "Post-production",
  "task_type_admin": "Admin",
  "task_type_routine": "Routine",
  "task_type_state_gate": "State Gate",
  "task_type_other": "Other"
```

Edit `apps/erify_studios/src/lib/constants/task-type-labels.ts`, add a branch in `getTaskTypeLabel` before the final fallback:

```ts
  if (taskType === TASK_TYPE.ROUTINE) {
    return m.task_type_routine();
  }
  if (taskType === TASK_TYPE.STATE_GATE) {
    return m.task_type_state_gate();
  }
  return m.task_type_other();
```

Run `pnpm --filter erify_studios paraglide:compile` (or this repo's equivalent message-compilation script — check `package.json` for the exact command name) to regenerate `m.task_type_state_gate()` before typechecking.

Run: `pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck`
Expected: PASS.

- [ ] **Step 8: Write the planner notice banner**

Create `apps/erify_studios/src/features/studio-shows/components/schedule-resume-notice-banner.tsx`:

```tsx
import type { StudioShowDetail } from '@eridu/api-types/shows';

type ScheduleResumeNotice = { resumed_by: string; resumed_at: string; gate_task_uid: string };

function getScheduleResumeNotice(show: StudioShowDetail): ScheduleResumeNotice | null {
  const metadata = show.metadata as Record<string, unknown> | undefined;
  const notice = metadata?.schedule_resume_notice;
  return notice && typeof notice === 'object' ? (notice as ScheduleResumeNotice) : null;
}

export function ScheduleResumeNoticeBanner({ show }: { show: StudioShowDetail }) {
  const notice = getScheduleResumeNotice(show);
  if (!notice) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      Manually resumed after a schedule removal on
      {' '}
      {new Date(notice.resumed_at).toLocaleString()}
      {' '}
      — this show will be removed again on the next republish unless the source schedule is updated.
    </div>
  );
}
```

- [ ] **Step 9: Mount the banner on the show-detail route**

Edit `apps/erify_studios/src/routes/studios/$studioId/shows/$showId/index.tsx` (same file touched in Task 12 Step 4), add above or below `<ShowCancellationResolutionPanel ... />`:

```tsx
<ScheduleResumeNoticeBanner show={show} />
```

with `import { ScheduleResumeNoticeBanner } from '@/features/studio-shows/components/schedule-resume-notice-banner';`.

(The schedule-continuity view mention from the design doc — surfacing the same banner where planners review publish diffs — is deferred to a follow-up: locating and instrumenting that view requires the same read-first treatment as Step 1, and is lower-value than the show-detail placement since a planner investigating a specific show's resume will land on show-detail first. Note this explicitly as a known gap, not a silent drop, when this plan's PR is reviewed.)

- [ ] **Step 10: Full verification and commit**

```bash
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test
git add apps/erify_studios/src/features/tasks apps/erify_studios/src/features/studio-shows/components/schedule-resume-notice-banner.tsx apps/erify_studios/src/routes/studios/\$studioId
git commit -m "feat(erify_studios): add claim action, gate history, and planner resume notice"
```

---

### Task 14: Documentation — Tier 1 generic pattern, Tier 2 gate-kind skills, skill routing

Per the design's "Documentation Requirements (do not skip)" section and `AGENTS.md`'s Knowledge and Doc Lifecycle rule, this lands in the same PR as the code, not a follow-up.

**Files:**
- Modify: `.agent/skills/show-production-lifecycle/references/state-gates.md`
- Modify: `.agent/skills/show-production-lifecycle/SKILL.md`
- Create: `.agent/skills/show-cancellation-resolution/SKILL.md`
- Create: `.agent/skills/schedule-publish-removal-resolution/SKILL.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update `state-gates.md`'s cancellation transition rows**

Edit `.agent/skills/show-production-lifecycle/references/state-gates.md`, replace the `## Transition: any → cancelled_pending_resolution` and `## Transition: cancelled_pending_resolution → cancelled or completed` sections (currently lines ~70-87) with:

```markdown
## Transition: any → cancelled_pending_resolution

Show cannot proceed but has operational consequences that need resolution.

| Condition | Where checked today | Enforcement | Notes |
|---|---|---|---|
| Reason category | `Task.content.reason_category` on the `STATE_GATE` task (`gate_kind: show_cancellation` or `schedule_publish_removal`) | Required by action schema for manual cancellation; system-generated for schedule-publish removal | See `GATE_CONFIG` in `show-state-gate.config.ts` for the per-gate-kind reason taxonomy |
| Resolution owner assigned | `Task.assigneeId` | Required at open time for `show_cancellation`; for `schedule_publish_removal` the gate opens unassigned and a manager must claim it (`claimGate`) before it can be resolved | Stored as a plain `User`, not a studio membership |
| Affected records identified | Not tracked | Not enforced | Which tasks, creators, shifts are affected |

## Transition: cancelled_pending_resolution → cancelled or completed

Final disposition after resolution.

| Condition | Where checked today | Enforcement | Notes |
|---|---|---|---|
| All follow-up actions resolved | `Task.content.history` on the `STATE_GATE` task | Enforced via `ShowStateGateService.resolveGate`'s guard chain (Show/Task consistency, ownership, outcome validity, active-task count, LIVE safeguard) | No longer advisory — closes the gap this row used to flag |
| Final disposition chosen | `resolveGate` writes the final outcome and Show.status | Required by action schema | `CANCELLED`/`COMPLETED` map directly to a `ShowStatus.systemKey`; `RESTORE_PREVIOUS` reverts to `Task.metadata.from_status` instead |
```

- [ ] **Step 2: Update `SKILL.md` §4 and add the State Gate pattern subsection**

Edit `.agent/skills/show-production-lifecycle/SKILL.md`, replace the `### 4. Cancellation and Resolution` section (currently lines ~109-120) with:

```markdown
### 4. Cancellation and Resolution

**Cancellation paths**:
- `draft → cancelled` or `confirmed → cancelled`: Direct cancellation.
- `live → cancelled_pending_resolution`: Show interrupted during production.
- `cancelled_pending_resolution → cancelled`: Resolution complete, no production.
- `cancelled_pending_resolution → completed`: Resolution complete, partial production counts.

**Current behavior**: Both manual and automatic cancellation-into-pending-resolution are backed by a `Task` with `type: STATE_GATE` (see the **State Gate pattern** subsection below) — not a dedicated table. Studio Admins and Managers use `POST /studios/:studioId/shows/:showId/cancel-with-resolution` to move eligible non-draft, non-cancelled shows into pending resolution with an owner, reason, and optional follow-up due date. Schedule republish auto-opens the same kind of gate (unassigned) when a removed show still has active tasks attached. Either kind resolves through `POST /studios/:studioId/shows/:showId/resolve-cancellation` to `cancelled`, `completed`, or (schedule-publish removals only) back to its prior status (`RESTORE_PREVIOUS`). All transitions write show-targeted Audit rows.

**Remaining gap (Phase 5)**: cancellation resolution does not enforce the broader lifecycle state machine, affected-record identification, or readiness/completion gates. Those remain item 14/15 scope.

### State Gate pattern

A **State Gate** is the reusable primitive backing any "this entity needs an owner + (optionally) a deadline + a chosen outcome before it can leave a middle status" requirement — built for show cancellation, designed to be reused for the next one without a new table or service.

- **Where it lives**: `apps/erify_api/src/show-orchestration/show-state-gate.config.ts` (the `GATE_CONFIG` lookup — pending status, allowed outcomes, which outcomes require zero active tasks, reason taxonomy, whether an owner is required at open time) and `show-state-gate.service.ts` (`openGate`, `claimGate`, `resolveGate`).
- **No new Prisma model, ever, for a new gate kind.** A gate is a `Task` with `type: STATE_GATE` and `metadata.gate_kind` set to a free string. Adding a gate kind means adding a `GATE_CONFIG` entry plus the calling code for that transition.
- **Ownership is a precondition for resolving, not necessarily for opening.** `resolveGate` rejects an unclaimed gate regardless of `GATE_CONFIG[kind].requiresOwner` — a gate opened unassigned (no human present, e.g. a schedule-publish trigger) must still be claimed before anyone can close it.
- **Every gate action is traced.** `Task.content.history` accumulates `{event, actor_id, at, note?}` entries for `opened`/`claimed`/`reassigned`/`resolved` — rendered as a read-only timeline, not a general comment thread.
- **If you're adding a new gate kind**, you must also add a dedicated Tier 2 skill for it (see `show-cancellation-resolution` and `schedule-publish-removal-resolution` as the template) and register it in `AGENTS.md`'s Skill Routing map — a gate kind's business rules (who can own it, what outcomes mean downstream) are critical and need to surface to unrelated future feature work via skill routing, not just to someone already reading this skill.
```

- [ ] **Step 3: Create the `show-cancellation-resolution` Tier 2 skill**

Create `.agent/skills/show-cancellation-resolution/SKILL.md`:

```markdown
---
name: show-cancellation-resolution
description: Critical business rules for the manual show-cancellation State Gate (gate_kind show_cancellation) — reason taxonomy, ownership, allowed outcomes, and what each outcome means for downstream compensation/reporting. Read before changing show-status transitions, task orchestration for STATE_GATE tasks, or cancelled-show compensation/reporting logic.
---

# Show Cancellation Resolution

Manual studio cancellation (`POST /studios/:studioId/shows/:showId/cancel-with-resolution`) opens a `STATE_GATE` task with `gate_kind: 'show_cancellation'`, backed by `ShowStateGateService` (see the State Gate pattern in `show-production-lifecycle/SKILL.md`).

## Reason taxonomy

`CREATOR_UNAVAILABLE`, `ROOM_UNAVAILABLE`, `EQUIPMENT_FAILURE`, `UTILITY_OUTAGE`, `PLATFORM_ISSUE`, `CLIENT_REQUEST`, `OTHER` (defined in `GATE_CONFIG.show_cancellation.reasonOptions`, `show-state-gate.config.ts`).

## Ownership

An owner (any studio member, resolved from a `StudioMembership` to its underlying `User`) is required at the moment a manager clicks "Cancel for Resolution" — `requiresOwner: true`. Unlike `schedule_publish_removal`, this gate kind is never created unassigned.

## Allowed outcomes and what they mean downstream

| Outcome | Meaning | Downstream implication |
|---|---|---|
| `CANCELLED` | No production happened | No production credit. Blocked while active tasks remain on the show, and blocked outright if the show's `from_status` was `live` (see the LIVE safeguard below) — confirm exact compensation/reporting implications with the team that owns those numbers before changing this. |
| `COMPLETED` | Show partially or fully ran despite the interruption | Counts partial production credit — same downstream path as a normally-completed show. |

## Active-task guard

Resolving to `CANCELLED` requires zero active `TaskTarget`s on the show (`taskTarget.deletedAt = null`, `task.deletedAt = null`, `task.status NOT IN ('COMPLETED', 'CLOSED')` — the canonical definition lives in `TaskTargetRepository.countActiveByShowId`, shared with `publishing.service.ts`). The resolve dialog surfaces the count and links to the show's task list.

## LIVE safeguard

If the gate's `Task.metadata.from_status` is `'LIVE'`, `resolveGate` rejects a `CANCELLED` outcome outright (`LIVE_CANCELLATION_REQUIRES_OVERRIDE`) — a show that was actually live did not have "zero production." `COMPLETED` remains available. No override path exists yet (deferred); bypassing this requires a direct system-admin status edit outside the gate flow.

## Read this before changing

Any feature touching show-status transitions, `STATE_GATE` task orchestration, compensation/credit calculation for cancelled shows, or cancellation reporting must read this skill and, if behavior changes, update it in the same PR.
```

- [ ] **Step 4: Create the `schedule-publish-removal-resolution` Tier 2 skill**

Create `.agent/skills/schedule-publish-removal-resolution/SKILL.md`:

```markdown
---
name: schedule-publish-removal-resolution
description: Critical business rules for the schedule-publish-triggered State Gate (gate_kind schedule_publish_removal) — why it's unassigned, why CANCELLED is blocked for live shows, the resume path, and the planner-notice mechanism. Read before changing publishing.service.ts's remove-flow, show-status transitions, or schedule-continuity views.
---

# Schedule-Publish Removal Resolution

When a schedule republish diff drops a show that still has active tasks attached, `publishing.service.ts`'s remove-flow opens a `STATE_GATE` task with `gate_kind: 'schedule_publish_removal'` instead of flipping the show straight to `CANCELLED` — see the State Gate pattern in `show-production-lifecycle/SKILL.md`.

## Why unassigned

No human is present at the moment a schedule sync runs — `GATE_CONFIG.schedule_publish_removal.requiresOwner` is `false`. Any studio manager can claim it from `task-review` (filtered to unassigned `State Gate` tasks). `resolveGate` still requires a claimed owner before it can be resolved — ownership is a precondition for *closing* the gate, not for *opening* it.

## Allowed outcomes

| Outcome | Meaning |
|---|---|
| `CANCELLED` | Confirms the removal was correct — the show is not happening. |
| `RESTORE_PREVIOUS` | Reverts `Show.status` to whatever it actually was (`Task.metadata.from_status`) before the republish removed it — the expected default when `from_status` is `LIVE` (see below), and generally the fix when the schedule sync was wrong rather than the show genuinely ending. |

There is no `COMPLETED` outcome for this gate kind — the show, if it ran, should be confirmed via `RESTORE_PREVIOUS` and let its normal lifecycle (`live → completed`) play out, not closed directly from this gate.

## LIVE safeguard

Same universal rule as `show_cancellation`: `CANCELLED` is blocked when `from_status === 'LIVE'`. For this gate kind specifically, that makes `RESTORE_PREVIOUS` the expected path — a schedule resync dropping a currently-live show is far more likely to be bad sync data than an intentional production stop.

## Planner notice (`schedule_resume_notice`)

Resuming a show via `RESTORE_PREVIOUS` is a manual override of what the source schedule currently says. `resolveShowCancellation` (in `studio-show-management.service.ts`) writes a passive, non-critical `Show.metadata.schedule_resume_notice` hint (`{resumed_by, resumed_at, gate_task_uid}`) when this happens. It is display-only — no workflow logic reads it back. `publishing.service.ts`'s "existing show kept" path clears it the next time that show is *not* in `toRemove` for a republish (i.e. the planner fixed the source schedule). If a future republish drops the same show again before that happens, a new gate opens — the notice and the gate are independent signals, both pointing at the same underlying "source schedule doesn't match reality" problem.

## Read this before changing

Any feature touching `publishing.service.ts`'s remove-flow or "existing show kept" path, show-status transitions, or schedule-continuity views must read this skill and, if behavior changes, update it in the same PR.
```

- [ ] **Step 5: Register both Tier 2 skills in `AGENTS.md`'s Skill Routing map**

Edit `AGENTS.md`'s "Skill Routing (Use Before Editing)" section — under the **Feature-specific** bullet (currently reads: "admin/studio list patterns, task templates, schedule continuity, shift schedules, show production lifecycle, file uploads, spreadsheets, and more"), add the two new skill names explicitly so they're named rather than folded into "and more":

```markdown
- **Feature-specific** — admin/studio list patterns, task templates, schedule continuity, shift schedules, show production lifecycle, show-cancellation-resolution, schedule-publish-removal-resolution, file uploads, spreadsheets, and more
```

- [ ] **Step 6: Run the knowledge-sync workflow checklist**

Per `AGENTS.md`'s Knowledge and Doc Lifecycle rule, run through `.agent/workflows/knowledge-sync.md`'s checklist manually against this PR's diff (it's a workflow doc, not a script) — confirm: skills updated (this task), feature docs current (check whether `apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md` or equivalent needs a section on the cancellation/resolution endpoints — add one if it documents other show-management endpoints already), roadmap status updated if this closes a tracked Phase 5 item.

- [ ] **Step 7: Commit**

```bash
git add .agent/skills/show-production-lifecycle .agent/skills/show-cancellation-resolution .agent/skills/schedule-publish-removal-resolution AGENTS.md
git commit -m "docs: document the show state gate pattern and its two gate kinds

Tier 1 (generic State Gate pattern) lives in show-production-lifecycle;
Tier 2 (per-gate-kind business rules) gets its own routable skill per
gate kind, per the design's documentation requirements."
```

---

## Final Notes for the Executing Agent

- Tasks 1-7 (schema, lookups, the generic primitive) are the highest-risk, most novel part of this plan — get those fully green before starting Task 8.
- Tasks 9 and 10 both modify code the other doesn't touch but share `ShowStateGateService`; they can run in either order once Task 7 is done, but Task 10 depends on Task 9's `resolveShowCancellation` existing (Task 10 Step 6 edits it) — so do Task 9 before Task 10.
- Task 13 Step 1 (read before edit) is not optional — do not skip ahead to Step 5 without it, or the task-review integration in Step 7 will be guesswork.
- After Task 14, re-read `docs/superpowers/specs/2026-06-23-show-state-gate-design.md` once more end to end and confirm every section has a corresponding task — if anything was missed, add a Task 15 rather than leaving it silently undone.

