import { z } from 'zod';

export const studioTaskTemplateSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  template_kind: z.string().optional().catch(undefined),
  task_type: z.string().optional().catch(undefined),
  is_active: z.string().optional().catch(undefined),
});
