import { Body, Controller, HttpStatus, Post } from '@nestjs/common';

import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import {
  PresignUploadRequestDto,
  presignUploadResponseSchema,
} from './schemas/upload.schema';
import { UploadService } from './upload.service';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presign')
  @ZodResponse(
    presignUploadResponseSchema,
    HttpStatus.CREATED,
    'Generate a short-lived presigned upload URL for Cloudflare R2',
  )
  createPresignedUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PresignUploadRequestDto,
  ) {
    return this.uploadService.createPresignedUpload({
      ...body,
      actorId: user.ext_id,
    });
  }
}
