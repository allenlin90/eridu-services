import { createZodDto } from 'nestjs-zod';

import {
  amendCancellationNoteSchema,
  cancellationStatusResponseSchema,
  cancelShowWithResolutionSchema,
  requestCancellationResolutionSchema,
  resolveShowCancellationSchema,
} from '@eridu/api-types/shows';

export class CancelShowWithResolutionDto extends createZodDto(cancelShowWithResolutionSchema) {}
export class RequestCancellationResolutionDto extends createZodDto(requestCancellationResolutionSchema) {}
export class ResolveShowCancellationDto extends createZodDto(resolveShowCancellationSchema) {}
export class AmendCancellationNoteDto extends createZodDto(amendCancellationNoteSchema) {}
export const cancellationStatusResponseDto = cancellationStatusResponseSchema;
