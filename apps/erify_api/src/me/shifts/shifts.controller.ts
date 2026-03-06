import { Controller, Get, Query } from '@nestjs/common';

import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { MeShiftsService } from './shifts.service';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { BaseController } from '@/lib/controllers/base.controller';
import { ZodPaginatedResponse } from '@/lib/decorators/zod-response.decorator';
import {
  ListMyStudioShiftsQueryDto,
  studioShiftDto,
} from '@/models/studio-shift/schemas/studio-shift.schema';

@Controller('me/shifts')
export class MeShiftsController extends BaseController {
  constructor(private readonly meShiftsService: MeShiftsService) {
    super();
  }

  @Get()
  @ZodPaginatedResponse(studioShiftDto)
  async listShifts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMyStudioShiftsQueryDto,
  ) {
    const { data, total } = await this.meShiftsService.listMyShifts(user.ext_id, query);
    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }
}
