import { z } from 'zod';

import { studioShowCreatorListItemSchema as studioShowCreatorListItemApiSchema } from '@eridu/api-types/studio-creators';

import { decimalToString } from '@/lib/utils/decimal-to-string.util';

const studioShowCreatorListItemSchema = z.object({
  creatorId: z.string(),
  creatorName: z.string(),
  creatorAliasName: z.string(),
  note: z.string().nullable(),
  agreedRate: z.unknown().nullable(),
  compensationType: z.string().nullable(),
  commissionRate: z.unknown().nullable(),
  metadata: z.record(z.string(), z.any()),
});

export const studioShowCreatorListItemDto = studioShowCreatorListItemSchema
  .transform((item) => ({
    creator_id: item.creatorId,
    creator_name: item.creatorName,
    creator_alias_name: item.creatorAliasName,
    note: item.note,
    agreed_rate: decimalToString(item.agreedRate),
    compensation_type: item.compensationType,
    commission_rate: decimalToString(item.commissionRate),
    metadata: item.metadata,
  }))
  .pipe(studioShowCreatorListItemApiSchema);
