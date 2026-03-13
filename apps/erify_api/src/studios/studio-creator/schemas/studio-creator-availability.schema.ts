import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  studioCreatorAvailabilityItemSchema as studioCreatorAvailabilityItemApiSchema,
  studioCreatorAvailabilityQuerySchema,
} from '@eridu/api-types/studio-creators';

export const studioCreatorAvailabilityItemSchema = z.object({
  uid: z.string(),
  name: z.string(),
  aliasName: z.string(),
});

export const studioCreatorAvailabilityItemDto = studioCreatorAvailabilityItemSchema
  .transform((item) => ({
    id: item.uid,
    name: item.name,
    alias_name: item.aliasName,
  }))
  .pipe(studioCreatorAvailabilityItemApiSchema);

export class StudioCreatorAvailabilityQueryDto extends createZodDto(
  studioCreatorAvailabilityQuerySchema.transform((data) => ({
    date_from: data.date_from,
    date_to: data.date_to,
    search: data.search,
    limit: data.limit,
    dateFrom: new Date(data.date_from),
    dateTo: new Date(data.date_to),
  })),
) {
  declare date_from: string;
  declare date_to: string;
  declare search: string | undefined;
  declare limit: number;
  declare dateFrom: Date;
  declare dateTo: Date;
}
