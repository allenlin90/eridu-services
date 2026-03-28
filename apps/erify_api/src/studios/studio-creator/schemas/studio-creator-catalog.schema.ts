import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  STUDIO_CREATOR_ROSTER_STATE,
  studioCreatorCatalogItemSchema as studioCreatorCatalogItemApiSchema,
  studioCreatorCatalogQuerySchema,
} from '@eridu/api-types/studio-creators';

export const studioCreatorCatalogItemSchema = z.object({
  uid: z.string(),
  name: z.string(),
  aliasName: z.string(),
  isRostered: z.boolean(),
  rosterState: z.enum(Object.values(STUDIO_CREATOR_ROSTER_STATE) as [string, ...string[]]),
});

export const studioCreatorCatalogItemDto = studioCreatorCatalogItemSchema
  .transform((item) => ({
    id: item.uid,
    name: item.name,
    alias_name: item.aliasName,
    is_rostered: item.isRostered,
    roster_state: item.rosterState,
  }))
  .pipe(studioCreatorCatalogItemApiSchema);

export class StudioCreatorCatalogQueryDto extends createZodDto(
  studioCreatorCatalogQuerySchema.transform((data) => ({
    search: data.search,
    includeRostered: data.include_rostered,
    limit: data.limit,
  })),
) {
  declare search: string | undefined;
  declare includeRostered: boolean;
  declare limit: number;
}
