import type { z } from 'zod';

import type {
  compensationLineItemApiResponseSchema,
  createAdminCompensationLineItemInputSchema,
  createTargetCompensationLineItemInputSchema,
  listCompensationLineItemsQuerySchema,
  updateCompensationLineItemInputSchema,
} from './schemas.js';

export type CompensationLineItemApiResponse = z.infer<
  typeof compensationLineItemApiResponseSchema
>;
export type CreateAdminCompensationLineItemInput = z.infer<
  typeof createAdminCompensationLineItemInputSchema
>;
export type CreateTargetCompensationLineItemInput = z.infer<
  typeof createTargetCompensationLineItemInputSchema
>;
export type UpdateCompensationLineItemInput = z.infer<
  typeof updateCompensationLineItemInputSchema
>;
export type ListCompensationLineItemsQuery = z.infer<
  typeof listCompensationLineItemsQuerySchema
>;
