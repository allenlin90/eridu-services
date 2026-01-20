import { z } from 'zod';

export const platformsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  id: z.string().optional().catch(undefined),
});

export const platformSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  api_config: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid JSON format').optional().or(z.literal('')),
});
