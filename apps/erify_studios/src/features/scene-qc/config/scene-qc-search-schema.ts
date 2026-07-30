import { z } from 'zod';

import { sceneQcDailySearchSchema } from './scene-qc-daily-search-schema';

/**
 * Records-tab-exclusive search fields, composed onto the shared daily schema
 * so the whole `/scene-review/` route owns one search contract. See
 * "Tabs and URL state" in apps/erify_studios/docs/SCENE_QC.md.
 */
export const sceneQcRecordsSearchFields = {
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  result: z.enum(['PASS', 'MINOR', 'FAIL']).optional().catch(undefined),
  record_id: z.string().startsWith('scqcr_').optional().catch(undefined),
};

/**
 * The whole route's search contract: daily fields + records fields.
 * `scene-qc-daily-search-schema.ts` stays intact so `use-scene-qc-daily.ts`
 * and its shipped tests keep their exact typing.
 */
export const sceneQcSearchSchema = sceneQcDailySearchSchema.extend(sceneQcRecordsSearchFields);

export type SceneQcSearch = z.infer<typeof sceneQcSearchSchema>;
