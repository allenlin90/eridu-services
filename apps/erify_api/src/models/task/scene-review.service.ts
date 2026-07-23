import { Injectable } from '@nestjs/common';

import type {
  SceneReviewDetail,
  SceneReviewListItem,
  SceneReviewQueryTransformed,
} from '@eridu/api-types/task-management';

import { mapSceneReviewCandidate, mapSceneReviewDetail } from './scene-review.mapper';
import { TaskRepository } from './task.repository';

@Injectable()
export class SceneReviewService {
  constructor(private readonly taskRepository: TaskRepository) {}

  async list(
    studioUid: string,
    query: SceneReviewQueryTransformed,
  ): Promise<{ items: SceneReviewListItem[]; total: number }> {
    const candidates = await this.taskRepository.findSceneReviewCandidates(studioUid, query);
    const mapped = candidates
      .map(mapSceneReviewCandidate)
      .filter((item): item is SceneReviewListItem => item !== null)
      .sort((left, right) => {
        const showOrder = right.show.start_time.localeCompare(left.show.start_time);
        return showOrder !== 0 ? showOrder : left.task_id.localeCompare(right.task_id);
      });
    return {
      items: mapped.slice(query.skip, query.skip + query.limit),
      total: mapped.length,
    };
  }

  async findDetail(studioUid: string, taskUid: string): Promise<SceneReviewDetail | null> {
    const candidate = await this.taskRepository.findSceneReviewCandidate(studioUid, taskUid);
    return candidate ? mapSceneReviewDetail(candidate) : null;
  }
}
