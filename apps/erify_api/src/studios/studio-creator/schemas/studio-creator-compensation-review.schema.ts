import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import * as studioCreatorsApi from '@eridu/api-types/studio-creators';

export class StudioCreatorCompensationReviewQueryDto extends createZodDto(
  studioCreatorsApi.studioCreatorCompensationReviewQuerySchema.transform((data) => ({
    dateFrom: new Date(data.date_from),
    dateTo: new Date(data.date_to),
  })),
) {
  declare date_from: string;
  declare date_to: string;
  declare dateFrom: Date;
  declare dateTo: Date;
}

const studioCreatorCompensationReviewInternalSchema = z.object({
  creatorId: z.string(),
  creatorName: z.string(),
  creatorAliasName: z.string(),
  dateFrom: z.date(),
  dateTo: z.date(),
  shows: z.array(z.object({
    showId: z.string(),
    showName: z.string(),
    showStartTime: z.date(),
    showEndTime: z.date(),
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

export const studioCreatorCompensationReviewDto = studioCreatorCompensationReviewInternalSchema
  .transform((review) => ({
    creator_id: review.creatorId,
    creator_name: review.creatorName,
    creator_alias_name: review.creatorAliasName,
    date_from: review.dateFrom.toISOString(),
    date_to: review.dateTo.toISOString(),
    shows: review.shows.map((show) => ({
      show_id: show.showId,
      show_name: show.showName,
      show_start_time: show.showStartTime.toISOString(),
      show_end_time: show.showEndTime.toISOString(),
      show_creator_id: show.showCreatorId,
      creator_id: show.creatorId,
      creator_name: show.creatorName,
      creator_alias_name: show.creatorAliasName,
      compensation_type: show.compensationType,
      agreed_rate: show.agreedRate,
      commission_rate: show.commissionRate,
      base_amount: show.baseAmount,
      adjustment_total: show.adjustmentTotal,
      total_amount: show.totalAmount,
      unresolved_reason: show.unresolvedReason,
    })),
    total_amount: review.totalAmount,
    unresolved_count: review.unresolvedCount,
  }))
  .pipe(studioCreatorsApi.studioCreatorCompensationReviewSchema);
