import { createZodDto } from 'nestjs-zod';

import { studioCreatorOnboardingUserSearchQuerySchema } from '@eridu/api-types/studio-creators';

export class StudioCreatorOnboardingUserSearchQueryDto extends createZodDto(
  studioCreatorOnboardingUserSearchQuerySchema,
) {
  declare search: string;
  declare limit: number;
}
