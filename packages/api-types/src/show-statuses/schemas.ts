import { z } from 'zod';

/**
 * Show Status API Response Schema (snake_case - matches backend API output)
 */
export const showStatusApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Create Show Status Input Schema
 */
export const createShowStatusInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update Show Status Input Schema
 */
export const updateShowStatusInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ShowStatusApiResponse = z.infer<typeof showStatusApiResponseSchema>;
export type CreateShowStatusInput = z.infer<typeof createShowStatusInputSchema>;
export type UpdateShowStatusInput = z.infer<typeof updateShowStatusInputSchema>;
