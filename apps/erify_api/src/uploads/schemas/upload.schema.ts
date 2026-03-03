import { createZodDto } from 'nestjs-zod';

import {
  FILE_UPLOAD_USE_CASE,
  presignUploadRequestSchema,
  presignUploadResponseSchema,
} from '@eridu/api-types/uploads';

export {
  FILE_UPLOAD_USE_CASE,
  presignUploadRequestSchema,
  presignUploadResponseSchema,
};

export class PresignUploadRequestDto extends createZodDto(presignUploadRequestSchema) {}
