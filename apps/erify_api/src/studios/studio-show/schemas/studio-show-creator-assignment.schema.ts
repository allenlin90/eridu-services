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
      metadata: creator.metadata, // undefined when omitted — service defaults per branch (new vs restore)
    })),
  })),
) {
  declare creators: Array<{
    creatorId: string;
    note: string | null | undefined;
    metadata: Record<string, unknown> | undefined;
  }>;
}
