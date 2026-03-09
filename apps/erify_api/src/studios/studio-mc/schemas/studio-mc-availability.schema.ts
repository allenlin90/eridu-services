import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const mcAvailabilityQuerySchema = z
  .object({
    date_from: z.iso.datetime().transform((value) => new Date(value)),
    date_to: z.iso.datetime().transform((value) => new Date(value)),
  })
  .refine((data) => data.date_to > data.date_from, {
    message: 'date_to must be after date_from',
    path: ['date_to'],
  });

export class McAvailabilityQueryDto extends createZodDto(mcAvailabilityQuerySchema) {
  declare date_from: Date;
  declare date_to: Date;
}
