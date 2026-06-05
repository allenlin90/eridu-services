import { createZodDto } from 'nestjs-zod';

import {
  performanceQuerySchema,
  performanceShowsQuerySchema,
} from '@eridu/api-types/performance';

export class PerformanceQueryDto extends createZodDto(performanceQuerySchema) {}
export class PerformanceShowsQueryDto extends createZodDto(performanceShowsQuerySchema) {}
