import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { StudioService } from '@/models/studio/studio.service';

const validateStudioUid = z.string().startsWith(StudioService.UID_PREFIX);

const meShiftCompensationsQuerySchema = z.object({
  studio_id: validateStudioUid,
  date_from: z.iso.date(),
  date_to: z.iso.date(),
}).superRefine((data, ctx) => {
  if (new Date(data.date_to).getTime() < new Date(data.date_from).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date_to'],
      message: 'date_to must be on or after date_from',
    });
  }
}).transform((data) => ({
  studioId: data.studio_id,
  dateFrom: new Date(data.date_from),
  dateTo: new Date(data.date_to),
}));

export class MeShiftCompensationsQueryDto extends createZodDto(meShiftCompensationsQuerySchema) {
  declare studioId: string;
  declare dateFrom: Date;
  declare dateTo: Date;
}

const meShowCompensationsQuerySchema = z.object({
  studio_id: validateStudioUid,
  date_from: z.iso.datetime(),
  date_to: z.iso.datetime(),
}).superRefine((data, ctx) => {
  if (new Date(data.date_to).getTime() <= new Date(data.date_from).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date_to'],
      message: 'date_to must be later than date_from',
    });
  }
}).transform((data) => ({
  studioId: data.studio_id,
  dateFrom: new Date(data.date_from),
  dateTo: new Date(data.date_to),
}));

export class MeShowCompensationsQueryDto extends createZodDto(meShowCompensationsQuerySchema) {
  declare studioId: string;
  declare dateFrom: Date;
  declare dateTo: Date;
}
