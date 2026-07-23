import type { Prisma } from '@prisma/client';
import { TaskStatus } from '@prisma/client';

import {
  SCENE_REVIEW_MODE,
  type SceneReviewQueryTransformed,
} from '@eridu/api-types/task-management';

export function buildSceneReviewCandidateWhere(
  studioUid: string,
  query: SceneReviewQueryTransformed,
): Prisma.TaskWhereInput {
  const showCriteria: Prisma.ShowWhereInput = {
    deletedAt: null,
    startTime: {
      gte: new Date(query.show_start_from),
      lte: new Date(query.show_start_to),
    },
    ...(query.client_id ? { client: { uid: query.client_id } } : {}),
    ...(query.platform_id
      ? {
          showPlatforms: {
            some: {
              deletedAt: null,
              platform: { uid: query.platform_id },
            },
          },
        }
      : {}),
  };

  return {
    deletedAt: null,
    studio: { uid: studioUid },
    ...(query.mode === SCENE_REVIEW_MODE.QC_INBOX ? { status: TaskStatus.REVIEW } : {}),
    AND: [
      {
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: showCriteria,
          },
        },
      },
      ...(query.search
        ? [{
            OR: [
              { description: { contains: query.search, mode: 'insensitive' as const } },
              {
                targets: {
                  some: {
                    targetType: 'SHOW',
                    deletedAt: null,
                    show: { name: { contains: query.search, mode: 'insensitive' as const } },
                  },
                },
              },
            ],
          }]
        : []),
    ],
  };
}
