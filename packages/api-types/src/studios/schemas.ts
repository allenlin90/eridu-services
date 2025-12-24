import { z } from 'zod';

/**
 * Studio API Response Schema (snake_case - matches backend API output)
 */
export const studioApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Create Studio Input Schema
 */
export const createStudioInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update Studio Input Schema
 */
export const updateStudioInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  address: z.string().min(1, 'Address is required').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type StudioApiResponse = z.infer<typeof studioApiResponseSchema>;
export type CreateStudioInput = z.infer<typeof createStudioInputSchema>;
export type UpdateStudioInput = z.infer<typeof updateStudioInputSchema>;
