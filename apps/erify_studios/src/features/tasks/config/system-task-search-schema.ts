import { z } from 'zod';

export const systemTaskSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(10),
  description: z.string().optional().catch(undefined),
  studio_name: z.string().optional().catch(undefined),
  client_name: z.string().optional().catch(undefined),
  assignee_name: z.string().optional().catch(undefined),
  show_name: z.string().optional().catch(undefined),
  has_assignee: z.string().optional().catch(undefined),
  has_due_date: z.string().optional().catch(undefined),
  status: z.string().optional().catch(undefined),
  task_type: z.string().optional().catch(undefined),
  due_date_from: z.string().optional().catch(undefined),
  due_date_to: z.string().optional().catch(undefined),
});
