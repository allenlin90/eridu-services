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

const decimalStringSchema = z
  .string()
  .regex(/^(?:\d+(?:\.\d+)?|\.\d+)$/, 'Must be a non-negative decimal string');

function isPositiveDecimalString(value: string): boolean {
  return /[1-9]/.test(value);
}

function isAtMostOneHundred(value: string): boolean {
  const [wholePart = '0', fractionPart = ''] = value.startsWith('.')
    ? ['0', value.slice(1)]
    : value.split('.');
  const normalizedWhole = wholePart.replace(/^0+/, '') || '0';

  if (normalizedWhole.length > 3) {
    return false;
  }

  if (normalizedWhole.length < 3 || normalizedWhole < '100') {
    return true;
  }

  return normalizedWhole === '100' && /^0*$/.test(fractionPart);
}

const defaultRateInputSchema = decimalStringSchema.refine(isPositiveDecimalString, 'Must be greater than 0');
const defaultCommissionRateInputSchema = decimalStringSchema.refine(isAtMostOneHundred, 'Must be at most 100');

export const createCreatorInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  alias_name: z.string().min(1, 'Alias name is required'),
  user_id: z.string().optional(),
  default_rate: defaultRateInputSchema.optional(),
  default_rate_type: z.enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]]).optional(),
  default_commission_rate: defaultCommissionRateInputSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateCreatorInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  alias_name: z.string().min(1, 'Alias name is required').optional(),
  is_banned: z.boolean().optional(),
  user_id: z.string().optional(),
  default_rate: defaultRateInputSchema.nullable().optional(),
  default_rate_type: z.enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]]).nullable().optional(),
  default_commission_rate: defaultCommissionRateInputSchema.nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreatorApiResponse = z.infer<typeof creatorApiResponseSchema>;
export type CreateCreatorInput = z.infer<typeof createCreatorInputSchema>;
export type UpdateCreatorInput = z.infer<typeof updateCreatorInputSchema>;
