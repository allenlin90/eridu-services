---
name: orchestration-service-nestjs
description: Patterns for implementing Orchestration Services in NestJS. Use when coordinating multiple model services for complex workflows like bulk task generation, show assignment, or any operation spanning multiple domain models.
metadata:
  priority: 3
  applies_to: [backend, nestjs, services, orchestration]
  supersedes: []
---

# Orchestration Service Pattern - NestJS

Orchestration Services coordinate multiple Model Services for workflows that span multiple domain models. They sit between Controllers and Model Services, handling cross-domain business logic.

## Canonical Examples

### Complex (with Processor Service)
Use when the orchestration service calls `@Transactional()` internally from the same class.
- **Orchestration Service**: [task-orchestration.service.ts](../../../apps/erify_api/src/task-orchestration/task-orchestration.service.ts)
- **Processor Service**: [task-generation-processor.service.ts](../../../apps/erify_api/src/task-orchestration/task-generation-processor.service.ts)
- **Module**: [task-orchestration.module.ts](../../../apps/erify_api/src/task-orchestration/task-orchestration.module.ts)

### Simple (no Processor Service)
Use when the public method IS the transaction boundary, called directly by a controller.
- **Bulk assignment**: [studio-show-mc.orchestration.service.ts](../../../apps/erify_api/src/studios/studio-show/studio-show-mc.orchestration.service.ts)

---

## When to Use an Orchestration Service

Use an Orchestration Service (not a Model Service) when:
- The operation spans **2+ domain models** (e.g., Show + Task + TaskTarget)
- **Bulk operations** with per-item logic (generate tasks for N shows)
- **Cross-domain validation** (verify user is a studio member before assigning a task)
- **Idempotent processing** (skip already-created task-template pairs)
- The operation requires **scoped advisory locking** or transactions wrapping multiple model creates

Do NOT use an Orchestration Service for:
- Simple CRUD on a single model → use the Model Service directly
- Thin delegation → controller can call the Model Service directly

---

## Architecture

```
Controller
    ↓
OrchestrationService  ← Coordinates workflow, cross-domain validation
    ├─→ ModelService A (TaskService)
    ├─→ ModelService B (ShowService)
    ├─→ ModelService C (StudioMembershipService)
    └─→ ProcessorService  ← Extracts @Transactional() boundary
            ├─→ ModelService A
            └─→ ModelService D (TaskTargetService)
```

### When to Use a Separate Processor Service

`@Transactional()` works via NestJS DI proxy interception. It **cannot** be applied to a method in the same class that calls it — only extract to a Processor when this applies.

**No Processor needed**: if the transactional method is `public` and only called from a controller (never self-called), apply `@Transactional()` directly on the orchestration service method.

```typescript
// ✅ Simple case: controller calls bulkAssign → @Transactional() works directly
@Injectable()
export class StudioShowMcOrchestrationService {
  @Transactional()
  async bulkAssignMcsToShows(studioUid, showUids, mcUids) { ... }
}
```

**Processor needed**: when the orchestration service calls `@Transactional()` internally from a private method:

```typescript
// ❌ BAD: @Transactional() on a method called from the same service
@Injectable()
export class TaskOrchestrationService {
  @Transactional()
  private async processOne(show, templates) { ... } // proxy won't intercept

  async processAll(shows, templates) {
    for (const show of shows) {
      await this.processOne(show, templates); // bypass: direct call, not via proxy
    }
  }
}

// ✅ GOOD: Extract to separate service so DI proxy can intercept
@Injectable()
export class TaskGenerationProcessor {
  @Transactional()
  async processShow(show, templates) { ... } // proxy intercepts correctly
}

@Injectable()
export class TaskOrchestrationService {
  constructor(private readonly processor: TaskGenerationProcessor) {}

  async generateTasksForShows(...) {
    for (const show of shows) {
      await this.processor.processShow(show, templates); // proxy intercepts ✓
    }
  }
}
```

---

## Orchestration Service Structure

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { TaskGenerationProcessor } from './task-generation-processor.service';
import { HttpError } from '@/lib/errors/http-error.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { ShowService } from '@/models/show/show.service';
import { TaskService } from '@/models/task/task.service';

@Injectable()
export class TaskOrchestrationService {
  private readonly logger = new Logger(TaskOrchestrationService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly showService: ShowService,
    private readonly studioMembershipService: StudioMembershipService,
    private readonly taskGenerationProcessor: TaskGenerationProcessor,
  ) {}

  /**
   * Generates tasks for multiple shows based on a set of templates.
   * Idempotent per show-template pair.
   */
  async generateTasksForShows(
    studioUid: string,
    showUids: string[],
    templateUids: string[],
  ) {
    // 1. Resolve & validate inputs upfront (fail fast)
    const templates = await this.taskTemplateService.findAll({ ... });
    if (templates.length === 0) {
      throw HttpError.badRequest('No valid active templates found');
    }

    const shows = await this.showService.findMany({ ... });
    if (shows.length === 0) {
      throw HttpError.badRequest('No valid shows found');
    }

    // 2. Process each item — catch per-item errors to allow partial success
    const results = [];
    for (const show of shows) {
      try {
        const result = await this.taskGenerationProcessor.processShow(show, templates);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed for show ${show.uid}`, error);
        results.push({ show_uid: show.uid, status: 'error', error: error.message });
      }
    }

    return { results, summary: { ... } };
  }
}
```

---

## Processor Service Structure (Transactional Boundary)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TaskGenerationProcessor {
  private readonly logger = new Logger(TaskGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskService: TaskService,
    private readonly taskTargetService: TaskTargetService,
  ) {}

  /**
   * Processes one show within a transaction.
   * Idempotent: skips existing task-template pairs.
   */
  @Transactional()
  async processShow(show: any, templates: any[]) {
    // Advisory lock prevents race conditions on concurrent calls for same show
    await this.prisma.$executeRaw`SELECT pg_advisory_xact_lock(${show.id})`;

    let tasksCreated = 0;
    let tasksSkipped = 0;

    for (const template of templates) {
      const latestSnapshot = template.snapshots?.[0];
      if (!latestSnapshot) { tasksSkipped++; continue; }

      // includeDeleted: true enables soft-delete recovery (resume)
      const existing = await this.taskService.findByShowAndTemplate(show.id, template.id, {
        includeDeleted: true,
      });

      if (!existing) {
        // Case 3: No task — CREATE NEW
        const task = await this.taskService.create({ uid: this.taskService.generateTaskUid(), ... });
        await this.taskTargetService.create({ task: { connect: { id: task.id } }, ... });
        tasksCreated++;
      } else if (existing.deletedAt !== null) {
        // Case 2: Soft-deleted — RESUME
        await this.taskService.resumeTask(existing.id, {
          snapshotId: latestSnapshot.id,
          status: TaskStatus.PENDING,
          version: existing.version + 1,
        });
        await this.taskTargetService.undeleteByTaskId(existing.id);
        tasksCreated++;
      } else {
        // Case 1: Active task exists — SKIP
        tasksSkipped++;
      }
    }

    return {
      show_uid: show.uid,
      status: tasksCreated === 0 && tasksSkipped > 0 ? 'skipped' : 'success',
      tasks_created: tasksCreated,
      tasks_skipped: tasksSkipped,
    };
  }
}
```

---

## Idempotency Pattern (Three-Case Resume)

The processor must handle three cases for each item:

```typescript
// findByShowAndTemplate accepts includeDeleted to support resume
const existing = await this.taskService.findByShowAndTemplate(show.id, template.id, {
  includeDeleted: true,
});

if (!existing) {
  // Case 3: No task — CREATE NEW
  const task = await this.taskService.create({ ... });
  await this.taskTargetService.create({ ... });
  tasksCreated++;
} else if (existing.deletedAt !== null) {
  // Case 2: Soft-deleted — RESUME (restore, reset to PENDING, update snapshot)
  await this.taskService.resumeTask(existing.id, {
    snapshotId: latestSnapshot.id,
    status: TaskStatus.PENDING,
    version: existing.version + 1,
  });
  await this.taskTargetService.undeleteByTaskId(existing.id);
  tasksCreated++;
} else {
  // Case 1: Active task exists — SKIP
  tasksSkipped++;
}
```

**Key properties:**
1. Done **inside the transaction** (with advisory lock) to prevent race conditions
2. Uses **natural key** (show × template), not the generated UID
3. `includeDeleted: true` enables soft-delete recovery
4. Returns `skipped` status (not an error) when all pairs are active already

---

## Cross-Domain Validation Pattern

Extract repeated cross-domain lookups into a **private helper** to keep operation methods clean:

```typescript
type MembershipWithUser = StudioMembership & { user: User };

// ✅ Private helper — encapsulates the member lookup + 404 throw
private async resolveStudioMember(
  studioUid: string,
  assigneeUid: string,
): Promise<MembershipWithUser> {
  const { data: memberships } = await this.studioMembershipService.listStudioMemberships(
    { studioId: studioUid },
    { user: true },
  );
  const membership = (memberships as MembershipWithUser[]).find(
    (m) => m.user?.uid === assigneeUid,
  );
  if (!membership) {
    throw HttpError.badRequest(`User ${assigneeUid} is not a member of studio ${studioUid}`);
  }
  return membership;
}

// ✅ Operation method stays readable — just calls the helper
async assignShowsToUser(studioUid: string, showUids: string[], assigneeUid: string) {
  // 1. Resolve + validate assignee
  const assigneeMembership = await this.resolveStudioMember(studioUid, assigneeUid);

  // 2. Resolve shows (scoped to studio)
  const shows = await this.showService.findMany({ where: { uid: { in: showUids }, ... } });

  // 3. Find task IDs linked to those shows
  const tasks = await this.taskService.findTasksByShowIds(shows.map(s => s.id));
  const taskIds = tasks.map(t => t.id);

  // 4. Bulk update assignee (uses internal DB userId, not UID)
  await this.taskService.updateAssigneeByTaskIds(taskIds, assigneeMembership.userId);
}

// The same helper works for nullable assignee (unassign case)
async reassignTask(studioUid: string, taskUid: string, assigneeUid: string | null) {
  let membershipId: bigint | null = null;
  if (assigneeUid) {
    const membership = await this.resolveStudioMember(studioUid, assigneeUid);
    membershipId = membership.userId;
  }
  return this.taskService.setAssignee(taskUid, membershipId, { assignee: true });
}
```

---

## Module Setup

```typescript
@Module({
  imports: [
    PrismaModule,     // Required by Processor for advisory lock
    UtilityModule,
    TaskModule,
    TaskTargetModule,
    TaskTemplateModule,
    ShowModule,
    MembershipModule,
    StudioModule,
  ],
  providers: [TaskOrchestrationService, TaskGenerationProcessor],
  exports: [TaskOrchestrationService],  // Export Orchestration, NOT Processor
})
export class TaskOrchestrationModule {}
```

**Rules:**
- Export the Orchestration Service — controllers import it
- Do NOT export the Processor — it's an internal implementation detail
- Import `PrismaModule` if the Processor uses advisory locks

---

## Error Handling

| Scenario | Approach |
|----------|----------|
| Validation failure (bad input) | `throw HttpError.badRequest(...)` |
| Cross-domain constraint violation | `throw HttpError.forbidden(...)` or `throw HttpError.badRequest(...)` |
| Per-item processing failure | Catch per-item, push `{ status: 'error' }`, continue loop |
| Transaction failure | Let it propagate (CLS rolls back automatically) |

**Partial success pattern** — when bulk operations should not fail entirely on one item:

```typescript
for (const item of items) {
  try {
    results.push(await this.processor.processItem(item));
  } catch (error) {
    this.logger.error(`Failed for item ${item.uid}`, error);
    results.push({ id: item.uid, status: 'error', error: error.message });
  }
}
```

---

## Naming Conventions

| Type | Naming Pattern | Example |
|------|----------------|---------|
| Orchestration Service | `{Domain}OrchestrationService` | `TaskOrchestrationService` |
| Processor Service | `{Domain}{Action}Processor` | `TaskGenerationProcessor` |
| Module | `{Domain}OrchestrationModule` | `TaskOrchestrationModule` |
| Directory | `{domain}-orchestration/` | `task-orchestration/` |

---

## Checklist

- [ ] OrchestrationService injects Model Services; **Repository injection is acceptable only for bulk cross-product pre-fetching** (avoids N+1 that a Model Service loop cannot avoid)
- [ ] `@Transactional()` placement: on the **Processor Service** if the orchestration calls it internally; directly on the **public orchestration method** if it is only called from a controller
- [ ] Processor is NOT exported from the module
- [ ] Idempotency check uses `{ includeDeleted: true }` to catch soft-deleted records
- [ ] Processor handles three cases: active→skip, soft-deleted→resume, missing→create
- [ ] Advisory lock used if concurrent calls are possible for same entity
- [ ] Per-item errors caught in the loop (allow partial success)
- [ ] Cross-domain validation happens before the mutation loop
- [ ] Repeated member lookups extracted to a private `resolveStudioMember()` helper
- [ ] Logger used for per-item errors

---

## Related Skills

- **[Service Pattern NestJS](../service-pattern-nestjs/SKILL.md)** - Model Service patterns
- **[Database Patterns](../database-patterns/SKILL.md)** - `@Transactional()`, advisory locks
- **[Backend Controller Pattern NestJS](../backend-controller-pattern-nestjs/SKILL.md)** - Controller patterns
