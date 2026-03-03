import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Prisma, Show, TaskTemplate, TaskTemplateSnapshot } from '@prisma/client';
import { TaskStatus, TaskType } from '@prisma/client';

import { TASK_TYPE } from '@eridu/api-types/task-management';

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
   * Process a single show generation in a transaction.
   * Extraction to separate service allows @Transactional to work via NestJS DI proxy.
   */
  @Transactional()
  async processShow(
    show: Show,
    templates: (TaskTemplate & { snapshots: TaskTemplateSnapshot[] })[],
    dueDates: Record<string, string> = {},
  ) {
    let tasksCreatedForShow = 0;
    let tasksSkippedForShow = 0;
    let showStatus: 'success' | 'error' | 'skipped' = 'success';
    let errorMessage: string | undefined;

    // Acquire advisory lock using raw SQL via prisma service
    await this.prisma.$executeRaw`SELECT pg_advisory_xact_lock(${show.id})`;

    for (const template of templates) {
      // Idempotency check using Service - include deleted for resumption logic
      const existingTask = await this.taskService.findByShowAndTemplate(show.id, template.id, {
        includeDeleted: true,
      });

      const latestSnapshot = template.snapshots?.[0];
      if (!latestSnapshot) {
        this.logger.warn(`Template ${template.uid} has no snapshots, skipping`);
        tasksSkippedForShow++;
        continue;
      }

      const type = this.resolveTemplateTaskType(template.currentSchema);
      const dueDate = this.resolveDueDateByType(show, type, dueDates[template.uid]);

      if (existingTask) {
        if (existingTask.deletedAt === null) {
          // Already exists and active, skip
          tasksSkippedForShow++;
          continue;
        }

        // Task exists but is soft-deleted: RESUME
        await this.taskService.resumeTask(existingTask.id, {
          snapshotId: latestSnapshot.id,
          status: TaskStatus.PENDING,
          type,
          version: existingTask.version + 1,
          dueDate,
          metadata: this.buildShowGeneratedTaskMetadata(type),
        });

        // Also undelete targets
        await this.taskTargetService.undeleteByTaskId(existingTask.id);

        tasksCreatedForShow++;
        continue;
      }

      // No existing task: CREATE NEW
      const taskUid = this.taskService.generateTaskUid();

      const task = await this.taskService.create({
        uid: taskUid,
        description: template.name,
        type,
        dueDate,
        status: TaskStatus.PENDING,
        studio: { connect: { id: show.studioId! } },
        template: { connect: { id: template.id } },
        snapshot: { connect: { id: latestSnapshot.id } },
        content: {},
        metadata: this.buildShowGeneratedTaskMetadata(type),
        version: 1,
      });

      // Create TaskTarget via Service
      await this.taskTargetService.create({
        task: { connect: { id: task.id } },
        targetType: 'SHOW',
        targetId: show.id,
        show: { connect: { id: show.id } },
      });

      tasksCreatedForShow++;
    }

    if (tasksCreatedForShow === 0 && tasksSkippedForShow > 0) {
      showStatus = 'skipped';
    }

    return {
      show_uid: show.uid,
      status: showStatus,
      tasks_created: tasksCreatedForShow,
      tasks_skipped: tasksSkippedForShow,
      error: errorMessage,
    };
  }

  private resolveTemplateTaskType(schema: unknown): TaskType {
    const taskType = (schema as { metadata?: { task_type?: string } })?.metadata?.task_type;
    if (taskType && Object.values(TASK_TYPE).includes(taskType as any)) {
      return taskType as TaskType;
    }

    return TaskType.OTHER;
  }

  /**
   * Derive default due date for show-linked tasks until template-level due rules are available.
   */
  private resolveDueDateByType(show: Show, type: TaskType, optionalOverride?: string): Date {
    if ((type === TaskType.ADMIN || type === TaskType.ROUTINE || type === TaskType.OTHER) && optionalOverride) {
      const overrideDate = new Date(optionalOverride);
      if (!Number.isNaN(overrideDate.getTime())) {
        return overrideDate;
      }
    }

    if (type === TaskType.SETUP) {
      return new Date(show.startTime.getTime() - 60 * 60 * 1000);
    }

    if (type === TaskType.ACTIVE) {
      return new Date(show.endTime.getTime() + 60 * 60 * 1000);
    }

    if (type === TaskType.CLOSURE) {
      return new Date(show.endTime.getTime() + 6 * 60 * 60 * 1000);
    }

    return show.startTime;
  }

  private buildShowGeneratedTaskMetadata(type: TaskType): Prisma.InputJsonValue {
    return {
      upload_routing: {
        source: 'show_task_generation',
        scope: 'show',
        material_asset_directory: this.resolveMaterialAssetDirectory(type),
      },
    } as Prisma.InputJsonValue;
  }

  private resolveMaterialAssetDirectory(type: TaskType): string {
    if (type === TaskType.SETUP) {
      return 'pre-production';
    }
    if (type === TaskType.CLOSURE) {
      return 'mc-review';
    }
    return 'show-general';
  }
}
