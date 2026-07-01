import { createZodDto } from 'nestjs-zod';

import { correctShowPlatformPerformanceInputSchema } from '@eridu/api-types/shows';

export const correctShowPlatformPerformanceTransformSchema = correctShowPlatformPerformanceInputSchema.transform(
  (data) => ({
    gmv: data.gmv,
    viewerCount: data.viewer_count,
    ctr: data.ctr,
    cto: data.cto,
    reason: data.reason,
  }),
);

export class CorrectShowPlatformPerformanceDto extends createZodDto(correctShowPlatformPerformanceTransformSchema) {
  declare gmv: string | null | undefined;
  declare viewerCount: number | undefined;
  declare ctr: string | null | undefined;
  declare cto: string | null | undefined;
  declare reason: string;
}
