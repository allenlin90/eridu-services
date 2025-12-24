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

/**
 * Create Show Type Input Schema
 */
export const createShowTypeInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update Show Type Input Schema
 */
export const updateShowTypeInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ShowTypeApiResponse = z.infer<typeof showTypeApiResponseSchema>;
export type CreateShowTypeInput = z.infer<typeof createShowTypeInputSchema>;
export type UpdateShowTypeInput = z.infer<typeof updateShowTypeInputSchema>;
