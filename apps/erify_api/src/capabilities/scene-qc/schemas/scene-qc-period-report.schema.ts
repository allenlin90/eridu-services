import { createZodDto } from 'nestjs-zod';

import { sceneQcPeriodReportQuerySchema } from '@eridu/api-types/scene-qc';

export const sceneQcPeriodReportQueryDtoSchema = sceneQcPeriodReportQuerySchema.transform((data) => ({
  dateFrom: data.date_from,
  dateTo: data.date_to,
}));

export class SceneQcPeriodReportQueryDto extends createZodDto(sceneQcPeriodReportQueryDtoSchema) {}
