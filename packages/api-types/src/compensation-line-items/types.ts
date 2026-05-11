import type { z } from 'zod';

import type {
  compensationLineItemApiResponseSchema,
  createAdminCompensationLineItemInputSchema,
  createStudioCompensationLineItemInputSchema,
  listCompensationLineItemsQuerySchema,
  listStudioCompensationLineItemsQuerySchema,
  updateCompensationLineItemInputSchema,
} from './schemas.js';

export type CompensationLineItemApiResponse = z.infer<
  typeof compensationLineItemApiResponseSchema
>;
export type CreateAdminCompensationLineItemInput = z.infer<
  typeof createAdminCompensationLineItemInputSchema
>;
export type CreateStudioCompensationLineItemInput = z.infer<
  typeof createStudioCompensationLineItemInputSchema
>;
export type UpdateCompensationLineItemInput = z.infer<
  typeof updateCompensationLineItemInputSchema
>;
export type ListCompensationLineItemsQuery = z.infer<
  typeof listCompensationLineItemsQuerySchema
>;
export type ListStudioCompensationLineItemsQuery = z.infer<
  typeof listStudioCompensationLineItemsQuerySchema
>;
