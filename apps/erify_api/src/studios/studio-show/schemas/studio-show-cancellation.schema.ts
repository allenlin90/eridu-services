import { createZodDto } from 'nestjs-zod';

import {
  amendCancellationNoteSchema,
  cancellationStatusResponseSchema,
  cancelShowWithResolutionSchema,
  resolveShowCancellationSchema,
} from '@eridu/api-types/shows';

export class CancelShowWithResolutionDto extends createZodDto(cancelShowWithResolutionSchema) {}
export class ResolveShowCancellationDto extends createZodDto(resolveShowCancellationSchema) {}
export class AmendCancellationNoteDto extends createZodDto(amendCancellationNoteSchema) {}
export const cancellationStatusResponseDto = cancellationStatusResponseSchema;
