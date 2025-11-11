import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import { BaseAdminController } from '@/admin/base-admin.controller';
import { ApiZodResponse } from '@/common/openapi/decorators';
import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import {
  CreateShowStatusDto,
  ShowStatusDto,
  showStatusDto,
  UpdateShowStatusDto,
} from '@/models/show-status/schemas/show-status.schema';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { UtilityService } from '@/utility/utility.service';

@Controller('admin/show-statuses')
export class AdminShowStatusController extends BaseAdminController {
  constructor(
    private readonly showStatusService: ShowStatusService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiZodResponse(showStatusDto, 'Show status created successfully')
  @ZodSerializerDto(ShowStatusDto)
  createShowStatus(@Body() body: CreateShowStatusDto) {
    return this.showStatusService.createShowStatus(body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(showStatusDto),
    'List of show statuses with pagination',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(showStatusDto))
  async getShowStatuses(@Query() query: PaginationQueryDto) {
    const data = await this.showStatusService.getShowStatuses({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.showStatusService.countShowStatuses();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showStatusDto, 'Show status details')
  @ZodSerializerDto(ShowStatusDto)
  getShowStatus(
    @Param(
      'id',
      new UidValidationPipe(ShowStatusService.UID_PREFIX, 'Show Status'),
    )
    id: string,
  ) {
    return this.showStatusService.getShowStatusById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showStatusDto, 'Show status updated successfully')
  @ZodSerializerDto(ShowStatusDto)
  updateShowStatus(
    @Param(
      'id',
      new UidValidationPipe(ShowStatusService.UID_PREFIX, 'Show Status'),
    )
    id: string,
    @Body() body: UpdateShowStatusDto,
  ) {
    return this.showStatusService.updateShowStatus(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShowStatus(
    @Param(
      'id',
      new UidValidationPipe(ShowStatusService.UID_PREFIX, 'Show Status'),
    )
    id: string,
  ) {
    await this.showStatusService.deleteShowStatus(id);
  }
}
