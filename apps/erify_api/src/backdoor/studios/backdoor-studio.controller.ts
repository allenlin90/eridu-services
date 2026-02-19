import {
  Body,
  Controller,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { BaseBackdoorController } from '@/backdoor/base-backdoor.controller';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateStudioDto,
  studioDto,
  UpdateStudioDto,
} from '@/models/studio/schemas/studio.schema';
import { StudioService } from '@/models/studio/studio.service';

/**
 * Backdoor Studio Controller
 *
 * Service-to-service API key authenticated endpoints for studio management.
 * These endpoints are separate from standard controllers to allow for:
 * - Different authentication mechanism (API key vs JWT)
 * - Clear separation of concerns
 *
 * Endpoints:
 * - POST /backdoor/studios - Create studio (API key required)
 * - PATCH /backdoor/studios/:id - Update studio (API key required)
 */
@Controller('backdoor/studios')
@UseGuards(BackdoorApiKeyGuard)
export class BackdoorStudioController extends BaseBackdoorController {
  constructor(private readonly studioService: StudioService) {
    super();
  }

  @Post()
  @ZodResponse(studioDto, HttpStatus.CREATED, 'Studio created successfully')
  async createStudio(@Body() body: CreateStudioDto) {
    const { name, address, metadata } = body;
    return this.studioService.createStudio({ name, address, metadata });
  }

  @Patch(':id')
  @ZodResponse(studioDto, HttpStatus.OK, 'Studio updated successfully')
  async updateStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
    @Body() body: UpdateStudioDto,
  ) {
    const studio = await this.studioService.getStudioById(id);
    if (!studio) {
      throw HttpError.notFound('Studio', id);
    }

    const { name, address, metadata } = body;
    return this.studioService.updateStudio(id, { name, address, metadata });
  }
}
