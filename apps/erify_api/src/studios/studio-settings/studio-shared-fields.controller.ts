import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  sharedFieldKeySchema,
  sharedFieldsResponseSchema,
} from '@eridu/api-types/task-management';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateSharedFieldDto,
  UpdateSharedFieldDto,
} from '@/models/studio/schemas/studio.schema';
import { StudioService } from '@/models/studio/studio.service';

@ApiTags('Studio Settings')
@StudioProtected([STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/settings/shared-fields')
export class StudioSharedFieldsController extends BaseStudioController {
  constructor(private readonly studioService: StudioService) {
    super();
  }

  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @Get()
  @ZodResponse(sharedFieldsResponseSchema)
  async listSharedFields(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
  ) {
    const sharedFields = await this.studioService.getSharedFields(studioId);
    return { shared_fields: sharedFields };
  }

  @StudioProtected([STUDIO_ROLE.ADMIN])
  @Post()
  @ZodResponse(sharedFieldsResponseSchema)
  async createSharedField(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() dto: CreateSharedFieldDto,
  ) {
    const sharedFields = await this.studioService.createSharedField(studioId, dto);
    return { shared_fields: sharedFields };
  }

  @StudioProtected([STUDIO_ROLE.ADMIN])
  @Patch(':key')
  @ZodResponse(sharedFieldsResponseSchema)
  async updateSharedField(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('key') key: string,
    @Body() dto: UpdateSharedFieldDto,
  ) {
    if (!sharedFieldKeySchema.safeParse(key).success) {
      throw HttpError.badRequest('Shared field key must be snake_case (English)');
    }

    const sharedFields = await this.studioService.updateSharedField(studioId, key, dto);
    return { shared_fields: sharedFields };
  }
}
