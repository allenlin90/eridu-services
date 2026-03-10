import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const mcAvailabilityPayloadSchema = z.object({
  windows: z
    .array(
      z
        .object({
          date_from: z.iso.datetime().transform((value) => new Date(value)),
          date_to: z.iso.datetime().transform((value) => new Date(value)),
        })
        .refine((data) => data.date_to > data.date_from, {
          message: 'date_to must be after date_from',
          path: ['date_to'],
        }),
    )
    .min(1, 'At least one time window is required')
    .max(100, 'Cannot check more than 100 time windows at once'),
});

export class McAvailabilityPayloadDto extends createZodDto(mcAvailabilityPayloadSchema) {
  declare windows: {
    date_from: Date;
    date_to: Date;
  }[];
}
