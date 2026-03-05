import { Controller, Get, Param, Query } from '@nestjs/common';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import {
  shiftAlignmentDto,
  ShiftAlignmentQueryDto,
  shiftCalendarDto,
  ShiftCalendarQueryDto,
} from '@/models/studio-shift/schemas/studio-shift.schema';
import { ShiftAlignmentService } from '@/orchestration/shift-alignment/shift-alignment.service';
import { ShiftCalendarService } from '@/orchestration/shift-calendar/shift-calendar.service';

@StudioProtected()
@Controller('studios/:studioId')
export class ShiftCalendarController extends BaseStudioController {
  constructor(
    private readonly shiftCalendarService: ShiftCalendarService,
    private readonly shiftAlignmentService: ShiftAlignmentService,
  ) {
    super();
  }

  @Get('shift-calendar')
  @ZodResponse(shiftCalendarDto)
  async showCalendar(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ShiftCalendarQueryDto,
  ) {
    return this.shiftCalendarService.getCalendar(studioId, query);
  }

  @Get('shift-alignment')
  @ZodResponse(shiftAlignmentDto)
  async showAlignment(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ShiftAlignmentQueryDto,
  ) {
    return this.shiftAlignmentService.getAlignment(studioId, query);
  }
}
