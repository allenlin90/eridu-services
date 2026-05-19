import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { studioMemberCompensationResponseSchema } from '@eridu/api-types/memberships';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { MeShiftCompensationsQueryDto } from './schemas/me-compensations.schema';
import { MeShiftCompensationsService } from './me-shift-compensations.service';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { BaseController } from '@/lib/controllers/base.controller';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { studioMemberCompensationDto } from '@/models/membership/schemas/studio-membership.schema';

@ApiTags('Me')
@Controller('me/shift-compensations')
export class MeShiftCompensationsController extends BaseController {
  constructor(private readonly meShiftCompensationsService: MeShiftCompensationsService) {
    super();
  }

  @ApiOperation({ summary: 'List the caller\'s own shift compensation in a studio over a date range' })
  @Get()
  @ReadBurstThrottle()
  @ZodResponse(studioMemberCompensationResponseSchema)
  async listSelfShiftCompensations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MeShiftCompensationsQueryDto,
  ) {
    const result = await this.meShiftCompensationsService.listSelfShiftCompensations(user.ext_id, {
      studioId: query.studioId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    return studioMemberCompensationDto.parse(result);
  }
}
