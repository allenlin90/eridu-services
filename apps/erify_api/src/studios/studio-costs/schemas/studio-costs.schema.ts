import { createZodDto } from 'nestjs-zod';

import {
  costsQuerySchema,
  costsShiftsQuerySchema,
  costsShowsQuerySchema,
} from '@eridu/api-types/costs';

export class CostsQueryDto extends createZodDto(costsQuerySchema) {}
export class CostsShowsQueryDto extends createZodDto(costsShowsQuerySchema) {}
export class CostsShiftsQueryDto extends createZodDto(costsShiftsQuerySchema) {}
