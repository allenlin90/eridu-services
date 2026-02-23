import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Show, TaskTemplate, TaskTemplateSnapshot } from '@prisma/client';
import { TaskStatus, TaskType } from '@prisma/client';

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

      const type = this.inferTaskType(template.name);

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
          version: existingTask.version + 1,
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
        status: TaskStatus.PENDING,
        studio: { connect: { id: show.studioId! } },
        template: { connect: { id: template.id } },
        snapshot: { connect: { id: latestSnapshot.id } },
        content: {},
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

  private inferTaskType(name: string): TaskType {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pre') || lowerName.includes('setup'))
      return TaskType.SETUP;
    if (lowerName.includes('live') || lowerName.includes('active'))
      return TaskType.ACTIVE;
    if (lowerName.includes('post') || lowerName.includes('closure') || lowerName.includes('closing'))
      return TaskType.CLOSURE;
    if (lowerName.includes('admin'))
      return TaskType.ADMIN;
    if (lowerName.includes('routine'))
      return TaskType.ROUTINE;
    return TaskType.OTHER;
  }
}
