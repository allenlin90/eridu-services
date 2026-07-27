import { z } from 'zod';

export const sceneProfileSearchSchema = z.object({
  client_id: z.string().startsWith('client_').optional().catch(undefined),
});

export type SceneProfileSearch = z.infer<typeof sceneProfileSearchSchema>;
