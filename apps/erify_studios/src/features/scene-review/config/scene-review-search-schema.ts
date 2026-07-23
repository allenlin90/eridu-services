import { z } from 'zod';

import { SCENE_REVIEW_MODE } from '@eridu/api-types/task-management';

const dateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const sceneReviewSearchSchema = z.object({
  mode: z.nativeEnum(SCENE_REVIEW_MODE).catch(SCENE_REVIEW_MODE.ANALYSIS),
  date_from: dateInputSchema.optional().catch(undefined),
  date_to: dateInputSchema.optional().catch(undefined),
  client_id: z.string().startsWith('client_').optional().catch(undefined),
  platform_id: z.string().startsWith('plt_').optional().catch(undefined),
  search: z.string().trim().min(1).max(100).optional().catch(undefined),
  task_id: z.string().startsWith('task_').optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(20),
});

export type SceneReviewSearch = z.infer<typeof sceneReviewSearchSchema>;
