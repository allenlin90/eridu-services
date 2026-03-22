import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import {
  AssignDutyManagerDto,
  CreateStudioShiftDto,
  DutyManagerQueryDto,
  ListStudioShiftsQueryDto,
  studioShiftDto,
  UpdateStudioShiftDto,
} from '@/models/studio-shift/schemas/studio-shift.schema';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

@StudioProtected()
@Controller('studios/:studioId/shifts')
export class StudioShiftController extends BaseStudioController {
  constructor(private readonly studioShiftService: StudioShiftService) {
    super();
  }

  @Get()
  @ReadBurstThrottle()
  @ZodPaginatedResponse(studioShiftDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: ListStudioShiftsQueryDto,
  ) {
    const { data, total } = await this.studioShiftService.listStudioShifts(studioId, query);
    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Get('duty-manager')
  @ZodResponse(z.union([studioShiftDto, z.null()]))
  async getDutyManager(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: DutyManagerQueryDto,
  ) {
    const timestamp = query.time ? new Date(query.time) : new Date();
    return this.studioShiftService.findActiveDutyManager(studioId, timestamp);
  }

  @Get(':id')
  @ZodResponse(studioShiftDto)
  async show(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(StudioShiftService.UID_PREFIX, 'StudioShift')) id: string,
  ) {
    const shift = await this.studioShiftService.findByUidInStudio(studioId, id);
    this.ensureResourceExists(shift, 'Studio shift', id);
    return shift;
  }

  @Post()
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ZodResponse(studioShiftDto, HttpStatus.CREATED)
  async create(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() dto: CreateStudioShiftDto,
  ) {
    return this.studioShiftService.createShift(studioId, dto);
  }

  @Patch(':id')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ZodResponse(studioShiftDto)
  async update(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(StudioShiftService.UID_PREFIX, 'StudioShift')) id: string,
    @Body() dto: UpdateStudioShiftDto,
  ) {
    const updated = await this.studioShiftService.updateShift(studioId, id, dto);
    this.ensureResourceExists(updated, 'Studio shift', id);
    return updated;
  }

  @Delete(':id')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ZodResponse(undefined, HttpStatus.NO_CONTENT)
  async delete(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(StudioShiftService.UID_PREFIX, 'StudioShift')) id: string,
  ) {
    const deleted = await this.studioShiftService.deleteShift(studioId, id);
    this.ensureResourceExists(deleted, 'Studio shift', id);
  }

  @Patch(':id/duty-manager')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  @ZodResponse(studioShiftDto)
  async assignDutyManager(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('id', new UidValidationPipe(StudioShiftService.UID_PREFIX, 'StudioShift')) id: string,
    @Body() dto: AssignDutyManagerDto,
  ) {
    const updated = await this.studioShiftService.updateShift(studioId, id, {
      isDutyManager: dto.is_duty_manager,
    });
    this.ensureResourceExists(updated, 'Studio shift', id);
    return updated;
  }
}
