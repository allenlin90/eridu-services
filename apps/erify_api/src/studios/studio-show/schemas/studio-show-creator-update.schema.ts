import { createZodDto } from 'nestjs-zod';

import { updateStudioShowCreatorInputSchema } from '@eridu/api-types/studio-creators';

export class UpdateStudioShowCreatorDto extends createZodDto(
  updateStudioShowCreatorInputSchema.transform((data) => ({
    note: data.note,
    agreedRate: data.agreed_rate,
    compensationType: data.compensation_type,
    commissionRate: data.commission_rate,
    overrideReason: data.override_reason,
    metadata: data.metadata,
  })),
) {
  declare note: string | null | undefined;
  declare agreed_rate: string | null | undefined;
  declare compensation_type: string | null | undefined;
  declare commission_rate: string | null | undefined;
  declare override_reason: string | undefined;
  declare metadata: Record<string, unknown> | undefined;

  declare agreedRate: string | null | undefined;
  declare compensationType: string | null | undefined;
  declare commissionRate: string | null | undefined;
  declare overrideReason: string | undefined;
}
