import { z } from 'zod';

/**
 * Show Standard API Response Schema (snake_case - matches backend API output)
 */
export const showStandardApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Create Show Standard Input Schema
 */
export const createShowStandardInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update Show Standard Input Schema
 */
export const updateShowStandardInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ShowStandardApiResponse = z.infer<typeof showStandardApiResponseSchema>;
export type CreateShowStandardInput = z.infer<typeof createShowStandardInputSchema>;
export type UpdateShowStandardInput = z.infer<typeof updateShowStandardInputSchema>;
