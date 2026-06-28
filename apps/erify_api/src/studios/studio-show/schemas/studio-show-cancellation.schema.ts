import { createZodDto } from 'nestjs-zod';

import {
  cancellationStatusResponseSchema,
  cancelShowWithResolutionSchema,
  requestCancellationResolutionSchema,
  resolveShowCancellationSchema,
} from '@eridu/api-types/shows';

export class CancelShowWithResolutionDto extends createZodDto(cancelShowWithResolutionSchema) {}
export class RequestCancellationResolutionDto extends createZodDto(requestCancellationResolutionSchema) {}
export class ResolveShowCancellationDto extends createZodDto(resolveShowCancellationSchema) {}
export const cancellationStatusResponseDto = cancellationStatusResponseSchema;
