import { createZodDto } from 'nestjs-zod';

import type { CreateStudioCompensationLineItemInput } from '@eridu/api-types/compensation-line-items';
import {
  bulkAssignStudioShowCreatorsInputSchema,
  bulkAssignStudioShowCreatorsResponseSchema,
} from '@eridu/api-types/studio-creators';

export const bulkAssignStudioShowCreatorsResultSchema
  = bulkAssignStudioShowCreatorsResponseSchema;

export class BulkAssignStudioShowCreatorsDto extends createZodDto(
  bulkAssignStudioShowCreatorsInputSchema.transform((data) => ({
    creators: data.creators.map((creator) => ({
      creatorId: creator.creator_id,
      note: creator.note,
      agreedRate:
        creator.agreed_rate === undefined
          ? undefined
          : creator.agreed_rate === null
            ? null
            : creator.agreed_rate.toFixed(2),
      compensationType: creator.compensation_type,
      commissionRate:
        creator.commission_rate === undefined
          ? undefined
          : creator.commission_rate === null
            ? null
            : creator.commission_rate.toFixed(2),
      ...(creator.override_reason !== undefined && { overrideReason: creator.override_reason }),
      metadata: creator.metadata, // undefined when omitted — service defaults per branch (new vs restore)
      compensationLineItems: creator.compensation_line_items?.map((lineItem) => ({
        amount: lineItem.amount,
        itemType: lineItem.item_type,
        reason: lineItem.reason,
        metadata: lineItem.metadata,
      })),
    })),
  })),
) {
  declare creators: Array<{
    creatorId: string;
    note: string | null | undefined;
    agreedRate: string | null | undefined;
    compensationType: string | null | undefined;
    commissionRate: string | null | undefined;
    overrideReason?: string;
    metadata: Record<string, unknown> | undefined;
    compensationLineItems: Array<{
      amount: string;
      itemType: CreateStudioCompensationLineItemInput['item_type'];
      reason: string;
      metadata: Record<string, unknown>;
    }> | undefined;
  }>;
}
