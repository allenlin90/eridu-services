import { z } from 'zod';

import { showCreatorCompensationSummarySchema as showCreatorCompensationSummaryApiSchema } from '@eridu/api-types/studio-creators';

const showCreatorCompensationSummaryInternalSchema = z.object({
  showId: z.string(),
  creators: z.array(z.object({
    showCreatorId: z.string(),
    creatorId: z.string(),
    creatorName: z.string(),
    creatorAliasName: z.string(),
    compensationType: z.string().nullable(),
    agreedRate: z.string().nullable(),
    commissionRate: z.string().nullable(),
    baseAmount: z.string().nullable(),
    adjustmentTotal: z.string(),
    totalAmount: z.string().nullable(),
    unresolvedReason: z.string().nullable(),
  })),
  totalAmount: z.string(),
  unresolvedCount: z.number().int().nonnegative(),
});

export const showCreatorCompensationSummaryDto = showCreatorCompensationSummaryInternalSchema
  .transform((summary) => ({
    show_id: summary.showId,
    creators: summary.creators.map((creator) => ({
      show_creator_id: creator.showCreatorId,
      creator_id: creator.creatorId,
      creator_name: creator.creatorName,
      creator_alias_name: creator.creatorAliasName,
      compensation_type: creator.compensationType,
      agreed_rate: creator.agreedRate,
      commission_rate: creator.commissionRate,
      base_amount: creator.baseAmount,
      adjustment_total: creator.adjustmentTotal,
      total_amount: creator.totalAmount,
      unresolved_reason: creator.unresolvedReason,
    })),
    total_amount: summary.totalAmount,
    unresolved_count: summary.unresolvedCount,
  }))
  .pipe(showCreatorCompensationSummaryApiSchema);
