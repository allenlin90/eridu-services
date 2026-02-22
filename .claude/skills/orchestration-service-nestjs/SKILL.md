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

Study these real implementations as the source of truth:
- **Orchestration Service**: [task-orchestration.service.ts](../../../apps/erify_api/src/task-orchestration/task-orchestration.service.ts)
- **Processor Service**: [task-generation-processor.service.ts](../../../apps/erify_api/src/task-orchestration/task-generation-processor.service.ts)
- **Module**: [task-orchestration.module.ts](../../../apps/erify_api/src/task-orchestration/task-orchestration.module.ts)

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

### Why a Separate Processor Service?

`@Transactional()` works via NestJS DI proxy interception. It **cannot** be applied to a method in the same class that calls it. Extract the transactional boundary to a dedicated `*Processor` or `*Writer` service:

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
      // Idempotency check
      const existing = await this.taskService.findByShowAndTemplate(show.id, template.id);
      if (existing) {
        tasksSkipped++;
        continue;
      }

      const task = await this.taskService.create({ uid: this.taskService.generateTaskUid(), ... });
      await this.taskTargetService.create({ task: { connect: { id: task.id } }, ... });

      tasksCreated++;
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

## Idempotency Pattern

Idempotency prevents duplicate data when operations are retried or run concurrently.

```typescript
// Check before create — at the processor level
const existing = await this.taskService.findByShowAndTemplate(show.id, template.id);
if (existing) {
  tasksSkipped++;
  continue; // Skip without error
}
```

**Key properties of the idempotency check:**
1. Done **inside the transaction** (with advisory lock) to prevent race conditions
2. Uses **natural key** (show × template), not the generated UID
3. Returns `skipped` status (not an error) when all pairs already exist

---

## Cross-Domain Validation Pattern

Orchestration services are the right place for cross-domain validation:

```typescript
async assignShowsToUser(studioUid: string, showUids: string[], assigneeUid: string) {
  // 1. Validate assignee is a studio member (cross-domain: Studio + User)
  const { data: memberships } = await this.studioMembershipService.listStudioMemberships(...);
  const membership = memberships.find((m) => m.user?.uid === assigneeUid);

  if (!membership) {
    throw HttpError.badRequest(`User ${assigneeUid} is not a member of studio ${studioUid}`);
  }

  // 2. Now proceed with the operation
  const shows = await this.showService.findMany({ where: { uid: { in: showUids } } });
  const taskIds = (await this.taskService.findTasksByShowIds(shows.map(s => s.id))).map(t => t.id);

  await this.taskService.updateAssigneeByTaskIds(taskIds, membership.userId);
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

- [ ] OrchestrationService injects only Model Services (no Repository imports)
- [ ] `@Transactional()` is on the Processor Service, not the Orchestration Service
- [ ] Processor is NOT exported from the module
- [ ] Idempotency check is inside the transaction
- [ ] Advisory lock used if concurrent calls are possible for same entity
- [ ] Per-item errors caught in the loop (allow partial success)
- [ ] Cross-domain validation happens before the mutation loop
- [ ] Logger used for per-item errors

---

## Related Skills

- **[Service Pattern NestJS](../service-pattern-nestjs/SKILL.md)** - Model Service patterns
- **[Database Patterns](../database-patterns/SKILL.md)** - `@Transactional()`, advisory locks
- **[Backend Controller Pattern NestJS](../backend-controller-pattern-nestjs/SKILL.md)** - Controller patterns
