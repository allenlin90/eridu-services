import { z } from 'zod';

/**
 * Creation-time seed default for `Studio.timezone` while every operating
 * Studio is in a single region (Asia/Bangkok). This is NOT an operational-day
 * fallback — every read resolves the persisted, per-Studio `timezone` column,
 * never this constant. Remove this default (and require an explicit value on
 * create) when a second region is onboarded. See
 * docs/tech-debt/scene-qc-studio-timezone-no-write-path.md.
 */
export const DEFAULT_STUDIO_TIMEZONE = 'Asia/Bangkok';

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
