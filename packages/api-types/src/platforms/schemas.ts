import { z } from 'zod';

/**
 * Platform API Response Schema (snake_case - matches backend API output)
 */
export const platformApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  api_config: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Create Platform Input Schema
 */
export const createPlatformInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  api_config: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update Platform Input Schema
 */
export const updatePlatformInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  api_config: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type PlatformApiResponse = z.infer<typeof platformApiResponseSchema>;
export type CreatePlatformInput = z.infer<typeof createPlatformInputSchema>;
export type UpdatePlatformInput = z.infer<typeof updatePlatformInputSchema>;
