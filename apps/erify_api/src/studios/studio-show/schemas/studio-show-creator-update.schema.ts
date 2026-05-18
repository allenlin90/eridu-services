import { createZodDto } from 'nestjs-zod';

import { updateStudioShowCreatorInputSchema } from '@eridu/api-types/studio-creators';

function decimalInputToString(value: number | null | undefined): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  return String(value);
}

export class UpdateStudioShowCreatorDto extends createZodDto(
  updateStudioShowCreatorInputSchema.transform((data) => ({
    note: data.note,
    agreedRate: decimalInputToString(data.agreed_rate),
    compensationType: data.compensation_type,
    commissionRate: decimalInputToString(data.commission_rate),
    overrideReason: data.override_reason,
    metadata: data.metadata,
  })),
) {
  declare note: string | null | undefined;
  declare agreed_rate: number | null | undefined;
  declare compensation_type: string | null | undefined;
  declare commission_rate: number | null | undefined;
  declare override_reason: string | undefined;
  declare metadata: Record<string, unknown> | undefined;

  declare agreedRate: string | null | undefined;
  declare compensationType: string | null | undefined;
  declare commissionRate: string | null | undefined;
  declare overrideReason: string | undefined;
}
