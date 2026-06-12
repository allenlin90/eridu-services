import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';
import { TaskService } from '@/models/task/task.service';

/** Task deletion: studio-scoped bulk soft delete. */
@Injectable()
export class TaskDeletionService {
  constructor(
    private readonly taskService: TaskService,
    private readonly studioService: StudioService,
  ) {}

  /**
   * Soft-deletes multiple tasks (must belong to the studio).
   */
  async bulkDeleteTasks(studioUid: string, taskUids: string[]) {
    // 1. Resolve studio
    const studio = await this.studioService.findByUid(studioUid);
    if (!studio) {
      throw HttpError.notFound('Studio', studioUid);
    }

    // 2. Perform bulk soft delete
    const result = await this.taskService.bulkSoftDelete(studio.id, taskUids);

    if (result.count === 0) {
      throw HttpError.notFound('Tasks', taskUids.join(', '));
    }

    return {
      deleted_count: result.count,
    };
  }
}
