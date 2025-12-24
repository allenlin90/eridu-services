import { z } from 'zod';

/**
 * MC API Response Schema (snake_case - matches backend API output)
 */
export const mcApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  alias_name: z.string(),
  is_banned: z.boolean(),
  user_id: z.string().nullable(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Create MC Input Schema
 */
export const createMcInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  alias_name: z.string().min(1, 'Alias name is required'),
  user_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update MC Input Schema
 */
export const updateMcInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  alias_name: z.string().min(1, 'Alias name is required').optional(),
  is_banned: z.boolean().optional(),
  user_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type McApiResponse = z.infer<typeof mcApiResponseSchema>;
export type CreateMcInput = z.infer<typeof createMcInputSchema>;
export type UpdateMcInput = z.infer<typeof updateMcInputSchema>;
