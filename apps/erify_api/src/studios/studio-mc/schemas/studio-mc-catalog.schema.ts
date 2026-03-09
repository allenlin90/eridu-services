import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const studioMcCatalogQuerySchema = z.object({
  search: z.string().optional(),
  include_rostered: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => (typeof value === 'string' ? value === 'true' : value))
    .optional()
    .default(false),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export class StudioMcCatalogQueryDto extends createZodDto(studioMcCatalogQuerySchema) {
  declare search?: string;
  declare include_rostered: boolean;
  declare limit: number;
}
