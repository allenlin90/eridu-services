import { Injectable, Logger } from '@nestjs/common';
import type { TaskTemplate, TaskTemplateSnapshot } from '@prisma/client';

import { TaskGenerationProcessor } from './task-generation-processor.service';
import type { ShowGenerationResult } from './task-orchestration.types';

import { HttpError } from '@/lib/errors/http-error.util';
import { ShowService } from '@/models/show/show.service';
import { TaskTemplateService } from '@/models/task-template/task-template.service';

/** Generates tasks for shows from a set of templates (idempotent per pair). */
@Injectable()
export class TaskGenerationService {
  private readonly logger = new Logger(TaskGenerationService.name);

  constructor(
    private readonly taskTemplateService: TaskTemplateService,
    private readonly showService: ShowService,
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
    dueDates?: Record<string, string>,
  ) {
    // 1. Resolve studio and validate templates
    const templates = await this.taskTemplateService.findAll({
      where: {
        uid: { in: templateUids },
        studio: { uid: studioUid },
        isActive: true,
      },
      include: {
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    }) as (TaskTemplate & { snapshots: TaskTemplateSnapshot[] })[];

    if (templates.length === 0) {
      throw HttpError.badRequest('No valid active templates found for the provided UIDs');
    }

    // 2. Resolve shows and validate they belong to the studio
    const shows = await this.showService.findMany({
      where: {
        uid: { in: showUids },
        studio: { uid: studioUid },
        deletedAt: null,
      },
    });

    if (shows.length === 0) {
      throw HttpError.badRequest('No valid shows found for the provided UIDs');
    }

    const results: ShowGenerationResult[] = [];
    let totalTasksCreated = 0;
    let totalSkipped = 0;

    // 3. Process shows
    for (const show of shows) {
      try {
        const showResult = await this.taskGenerationProcessor.processShow(show, templates, dueDates);
        results.push(showResult);

        if (showResult.status === 'success' || showResult.status === 'skipped') {
          totalTasksCreated += showResult.tasks_created;
          totalSkipped += showResult.tasks_skipped;
        }
      } catch (error) {
        this.logger.error(`Failed to generate tasks for show ${show.uid}`, error);
        results.push({
          show_id: show.uid,
          status: 'error',
          tasks_created: 0,
          tasks_skipped: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      results,
      summary: {
        shows_processed: shows.length,
        total_tasks_created: totalTasksCreated,
        total_skipped: totalSkipped,
      },
    };
  }
}
