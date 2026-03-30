import { createZodDto } from 'nestjs-zod';

import { onboardCreatorInputSchema } from '@eridu/api-types/studio-creators';

export class OnboardStudioCreatorDto extends createZodDto(
  onboardCreatorInputSchema.transform((data) => ({
    creator: {
      name: data.creator.name,
      aliasName: data.creator.alias_name,
      userId: data.creator.user_id,
      metadata: data.creator.metadata,
    },
    roster: {
      defaultRate: data.roster.default_rate,
      defaultRateType: data.roster.default_rate_type,
      defaultCommissionRate: data.roster.default_commission_rate,
      metadata: data.roster.metadata,
    },
  })),
) {
  declare creator: {
    name: string;
    aliasName: string;
    userId: string | null | undefined;
    metadata: Record<string, unknown> | undefined;
  };

  declare roster: {
    defaultRate: number | null | undefined;
    defaultRateType: string | null | undefined;
    defaultCommissionRate: number | null | undefined;
    metadata: Record<string, unknown> | undefined;
  };
}
