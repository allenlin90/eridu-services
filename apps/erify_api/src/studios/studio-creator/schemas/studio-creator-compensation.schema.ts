import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import * as studioCreatorsApi from '@eridu/api-types/studio-creators';

export class StudioCreatorCompensationQueryDto extends createZodDto(
  studioCreatorsApi.studioCreatorCompensationQuerySchema.transform((data) => ({
    dateFrom: new Date(data.date_from),
    dateTo: new Date(data.date_to),
  })),
) {
  declare date_from: string;
  declare date_to: string;
  declare dateFrom: Date;
  declare dateTo: Date;
}

const studioCreatorCompensationInternalSchema = z.object({
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
    note: z.string().nullable(),
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

export const studioCreatorCompensationDto = studioCreatorCompensationInternalSchema
  .transform((compensation) => ({
    creator_id: compensation.creatorId,
    creator_name: compensation.creatorName,
    creator_alias_name: compensation.creatorAliasName,
    date_from: compensation.dateFrom.toISOString(),
    date_to: compensation.dateTo.toISOString(),
    shows: compensation.shows.map((show) => ({
      show_id: show.showId,
      show_name: show.showName,
      show_start_time: show.showStartTime.toISOString(),
      show_end_time: show.showEndTime.toISOString(),
      show_creator_id: show.showCreatorId,
      creator_id: show.creatorId,
      creator_name: show.creatorName,
      creator_alias_name: show.creatorAliasName,
      note: show.note,
      compensation_type: show.compensationType,
      agreed_rate: show.agreedRate,
      commission_rate: show.commissionRate,
      base_amount: show.baseAmount,
      adjustment_total: show.adjustmentTotal,
      total_amount: show.totalAmount,
      unresolved_reason: show.unresolvedReason,
    })),
    total_amount: compensation.totalAmount,
    unresolved_count: compensation.unresolvedCount,
  }))
  .pipe(studioCreatorsApi.studioCreatorCompensationResponseSchema);
