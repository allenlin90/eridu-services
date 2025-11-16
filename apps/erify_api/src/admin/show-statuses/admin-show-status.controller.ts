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

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import {
  CreateShowStatusDto,
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
  @AdminResponse(
    showStatusDto,
    HttpStatus.CREATED,
    'Show status created successfully',
  )
  createShowStatus(@Body() body: CreateShowStatusDto) {
    return this.showStatusService.createShowStatus(body);
  }

  @Get()
  @AdminPaginatedResponse(
    showStatusDto,
    'List of show statuses with pagination',
  )
  async getShowStatuses(@Query() query: PaginationQueryDto) {
    const data = await this.showStatusService.getShowStatuses({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.showStatusService.countShowStatuses();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(showStatusDto, HttpStatus.OK, 'Show status details')
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
  @AdminResponse(
    showStatusDto,
    HttpStatus.OK,
    'Show status updated successfully',
  )
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
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
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
