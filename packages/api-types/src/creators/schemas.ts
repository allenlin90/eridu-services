import { z } from 'zod';

export const CREATOR_COMPENSATION_TYPE = {
  FIXED: 'FIXED',
  COMMISSION: 'COMMISSION',
  HYBRID: 'HYBRID',
} as const;

export type CreatorCompensationType = (typeof CREATOR_COMPENSATION_TYPE)[keyof typeof CREATOR_COMPENSATION_TYPE];

/**
 * Creator API Response Schema (snake_case - matches backend API output)
 */
export const creatorApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  alias_name: z.string(),
  is_banned: z.boolean(),
  user_id: z.string().nullable(),
  default_rate: z.string().nullable(),
  default_rate_type: z.string().nullable(),
  default_commission_rate: z.string().nullable(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createCreatorInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  alias_name: z.string().min(1, 'Alias name is required'),
  user_id: z.string().optional(),
  default_rate: z.coerce.number().positive().optional(),
  default_rate_type: z.enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]]).optional(),
  default_commission_rate: z.coerce.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateCreatorInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  alias_name: z.string().min(1, 'Alias name is required').optional(),
  is_banned: z.boolean().optional(),
  user_id: z.string().optional(),
  default_rate: z.coerce.number().positive().nullable().optional(),
  default_rate_type: z.enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]]).nullable().optional(),
  default_commission_rate: z.coerce.number().min(0).max(100).nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreatorApiResponse = z.infer<typeof creatorApiResponseSchema>;
export type CreateCreatorInput = z.infer<typeof createCreatorInputSchema>;
export type UpdateCreatorInput = z.infer<typeof updateCreatorInputSchema>;
