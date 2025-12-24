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

/**
 * Create Studio Room Input Schema
 */
export const createStudioRoomInputSchema = z.object({
  studio_id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  capacity: z.coerce.number().int().positive(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update Studio Room Input Schema
 */
export const updateStudioRoomInputSchema = z.object({
  studio_id: z.string().optional(),
  name: z.string().min(1, 'Name is required').optional(),
  capacity: z.coerce.number().int().positive().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type StudioRoomApiResponse = z.infer<typeof studioRoomApiResponseSchema>;
export type CreateStudioRoomInput = z.infer<typeof createStudioRoomInputSchema>;
export type UpdateStudioRoomInput = z.infer<typeof updateStudioRoomInputSchema>;
