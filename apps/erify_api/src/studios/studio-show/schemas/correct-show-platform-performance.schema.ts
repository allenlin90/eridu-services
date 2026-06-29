import { createZodDto } from 'nestjs-zod';

import { correctShowPlatformPerformanceInputSchema } from '@eridu/api-types/shows';

export class CorrectShowPlatformPerformanceDto extends createZodDto(correctShowPlatformPerformanceInputSchema) {}
