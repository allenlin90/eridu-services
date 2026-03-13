import { createZodDto } from 'nestjs-zod';

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
      metadata: creator.metadata, // undefined when omitted — service defaults per branch (new vs restore)
    })),
  })),
) {
  declare creators: Array<{
    creatorId: string;
    note: string | null | undefined;
    agreedRate: string | null | undefined;
    compensationType: string | null | undefined;
    commissionRate: string | null | undefined;
    metadata: Record<string, unknown> | undefined;
  }>;
}
