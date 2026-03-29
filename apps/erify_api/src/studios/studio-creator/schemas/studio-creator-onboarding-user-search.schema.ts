import { createZodDto } from 'nestjs-zod';

import { studioCreatorOnboardingUserSearchQuerySchema } from '@eridu/api-types/studio-creators';

export class StudioCreatorOnboardingUserSearchQueryDto extends createZodDto(
  studioCreatorOnboardingUserSearchQuerySchema.transform((data) => ({
    search: data.search,
    limit: data.limit,
  })),
) {
  declare search: string;
  declare limit: number;
}
