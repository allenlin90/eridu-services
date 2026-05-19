import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { studioCreatorCompensationResponseSchema } from '@eridu/api-types/studio-creators';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { MeShowCompensationsQueryDto } from './schemas/me-compensations.schema';
import { MeShowCompensationsService } from './me-show-compensations.service';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { BaseController } from '@/lib/controllers/base.controller';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { studioCreatorCompensationDto } from '@/studios/studio-creator/schemas/studio-creator-compensation.schema';

@ApiTags('Me')
@Controller('me/show-compensations')
export class MeShowCompensationsController extends BaseController {
  constructor(private readonly meShowCompensationsService: MeShowCompensationsService) {
    super();
  }

  @ApiOperation({ summary: 'List the caller\'s own per-show compensation in a studio over a date range' })
  @Get()
  @ReadBurstThrottle()
  @ZodResponse(studioCreatorCompensationResponseSchema)
  async listSelfShowCompensations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MeShowCompensationsQueryDto,
  ) {
    const compensation = await this.meShowCompensationsService.listSelfShowCompensations(user.ext_id, {
      studioId: query.studioId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    return studioCreatorCompensationDto.parse(compensation);
  }
}
