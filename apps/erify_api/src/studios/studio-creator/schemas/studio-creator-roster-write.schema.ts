import { createZodDto } from 'nestjs-zod';

import {
  createStudioCreatorRosterInputSchema,
  updateStudioCreatorRosterInputSchema,
} from '@eridu/api-types/studio-creators';

export class CreateStudioCreatorRosterDto extends createZodDto(
  createStudioCreatorRosterInputSchema.transform((data) => ({
    creatorId: data.creator_id,
    defaultRate: data.default_rate,
    defaultRateType: data.default_rate_type,
    defaultCommissionRate: data.default_commission_rate,
    metadata: data.metadata,
  })),
) {
  declare creator_id: string;
  declare default_rate: number | null | undefined;
  declare default_rate_type: string | null | undefined;
  declare default_commission_rate: number | null | undefined;
  declare metadata: Record<string, unknown> | undefined;

  declare creatorId: string;
  declare defaultRate: number | null | undefined;
  declare defaultRateType: string | null | undefined;
  declare defaultCommissionRate: number | null | undefined;
}

export class UpdateStudioCreatorRosterDto extends createZodDto(
  updateStudioCreatorRosterInputSchema.transform((data) => ({
    version: data.version,
    defaultRate: data.default_rate,
    defaultRateType: data.default_rate_type,
    defaultCommissionRate: data.default_commission_rate,
    isActive: data.is_active,
    metadata: data.metadata,
  })),
) {
  declare version: number;
  declare default_rate: number | null | undefined;
  declare default_rate_type: string | null | undefined;
  declare default_commission_rate: number | null | undefined;
  declare is_active: boolean | undefined;
  declare metadata: Record<string, unknown> | undefined;

  declare defaultRate: number | null | undefined;
  declare defaultRateType: string | null | undefined;
  declare defaultCommissionRate: number | null | undefined;
  declare isActive: boolean | undefined;
}
