import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import { studioCreatorRosterItemSchema as studioCreatorRosterItemApiSchema } from '@eridu/api-types/studio-creators';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { decimalToString } from '@/lib/utils/decimal-to-string.util';

const studioCreatorRosterItemSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(`${UID_PREFIXES.STUDIO_CREATOR}_`),
  defaultRate: z.unknown().nullable(),
  defaultRateType: z.string().nullable(),
  defaultCommissionRate: z.unknown().nullable(),
  isActive: z.boolean(),
  version: z.number().int().positive(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  creator: z.object({
    uid: z.string(),
    name: z.string(),
    aliasName: z.string(),
  }),
});

export const studioCreatorRosterItemDto = studioCreatorRosterItemSchema
  .transform((item) => ({
    id: item.uid,
    creator_id: item.creator.uid,
    creator_name: item.creator.name,
    creator_alias_name: item.creator.aliasName,
    default_rate: decimalToString(item.defaultRate),
    default_rate_type: item.defaultRateType,
    default_commission_rate: decimalToString(item.defaultCommissionRate),
    is_active: item.isActive,
    version: item.version,
    metadata: item.metadata,
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString(),
  }))
  .pipe(studioCreatorRosterItemApiSchema);

const studioCreatorRosterListQuerySchema = paginationQuerySchema
  .and(
    z.object({
      search: z.string().optional(),
      is_active: z.coerce.boolean().optional(),
      default_rate_type: z
        .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
        .nullable()
        .optional(),
    }),
  )
  .transform((data) => {
    const search = data.search?.trim();
    return {
      ...data,
      search: search && search.length > 0 ? search : undefined,
      isActive: data.is_active,
      defaultRateType: data.default_rate_type,
    };
  });

// nestjs-zod's createZodDto does not emit property declarations for fields added by .transform().
// Fields present only after transformation (camelCase) must be declared explicitly alongside
// their pre-transform (snake_case) counterparts so NestJS can reflect and bind them correctly.
export class ListStudioCreatorRosterQueryDto extends createZodDto(
  studioCreatorRosterListQuerySchema,
) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
  declare search: string | undefined;
  // snake_case: bound from query string; camelCase: available after transform
  declare is_active: boolean | undefined;
  declare isActive: boolean | undefined;
  // snake_case: bound from query string; camelCase: available after transform
  declare default_rate_type: (typeof CREATOR_COMPENSATION_TYPE)[keyof typeof CREATOR_COMPENSATION_TYPE] | null | undefined;
  declare defaultRateType: string | null | undefined;
}
