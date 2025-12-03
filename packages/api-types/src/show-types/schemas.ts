import { z } from 'zod';

/**
 * Show Type API Response Schema (snake_case - matches backend API output)
 */
export const showTypeApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});
