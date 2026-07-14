# Orchestration Service Examples

Detailed code examples for the orchestration-service-nestjs skill.

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

  @Transactional()
  async processShow(show: any, templates: any[]) {
    // Advisory lock prevents race conditions on concurrent calls for same show
    await this.prisma.$executeRaw`SELECT pg_advisory_xact_lock(${show.id})`;

    let tasksCreated = 0;
    let tasksSkipped = 0;

    for (const template of templates) {
      const latestSnapshot = template.snapshots?.[0];
      if (!latestSnapshot) { tasksSkipped++; continue; }

      const existing = await this.taskService.findByShowAndTemplate(show.id, template.id, {
        includeDeleted: true,
      });

      if (!existing) {
        const task = await this.taskService.create({ uid: this.taskService.generateTaskUid(), ... });
        await this.taskTargetService.create({ task: { connect: { id: task.id } }, ... });
        tasksCreated++;
      } else if (existing.deletedAt !== null) {
        await this.taskService.resumeTask(existing.id, {
          snapshotId: latestSnapshot.id,
          status: TaskStatus.PENDING,
          version: existing.version + 1,
        });
        await this.taskTargetService.undeleteByTaskId(existing.id);
        tasksCreated++;
      } else {
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

## Idempotency Pattern (Three-Case Resume)

```typescript
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
  await this.taskService.resumeTask(existing.id, { ... });
  await this.taskTargetService.undeleteByTaskId(existing.id);
  tasksCreated++;
} else {
  // Case 1: Active task exists — SKIP
  tasksSkipped++;
}
```

**Key properties:**
1. Done inside the transaction (with advisory lock) to prevent race conditions
2. Uses natural key (show × template), not the generated UID
3. `includeDeleted: true` enables soft-delete recovery
4. Returns `skipped` status (not an error) when all pairs are active already

## Cross-Domain Validation Pattern

```typescript
type MembershipWithUser = StudioMembership & { user: User };

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

async assignShowsToUser(studioUid: string, showUids: string[], assigneeUid: string) {
  const assigneeMembership = await this.resolveStudioMember(studioUid, assigneeUid);
  const shows = await this.showService.findMany({ where: { uid: { in: showUids }, ... } });
  const tasks = await this.taskService.findTasksByShowIds(shows.map(s => s.id));
  const taskIds = tasks.map(t => t.id);
  await this.taskService.updateAssigneeByTaskIds(taskIds, assigneeMembership.userId);
}
```

## Module Setup

```typescript
@Module({
  imports: [
    PrismaModule, // Required by Processor for advisory lock
    UtilityModule,
    TaskModule,
    TaskTargetModule,
    TaskTemplateModule,
    ShowModule,
    MembershipModule,
    StudioModule,
  ],
  providers: [TaskOrchestrationService, TaskGenerationProcessor],
  exports: [TaskOrchestrationService], // Export Orchestration, NOT Processor
})
export class TaskOrchestrationModule {}
```
