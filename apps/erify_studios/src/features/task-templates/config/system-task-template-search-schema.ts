import { z } from 'zod';

export const systemTaskTemplateSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  studio_name: z.string().optional().catch(undefined),
  task_type: z.string().optional().catch(undefined),
  is_active: z.string().optional().catch(undefined),
});
