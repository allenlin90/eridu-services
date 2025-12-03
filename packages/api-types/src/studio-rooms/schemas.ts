import { z } from 'zod';

/**
 * Studio Room API Response Schema (snake_case - matches backend API output)
 */
export const studioRoomApiResponseSchema = z.object({
  id: z.string(),
  studio_id: z.string().nullable(),
  name: z.string(),
  capacity: z.number().int().positive(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});
