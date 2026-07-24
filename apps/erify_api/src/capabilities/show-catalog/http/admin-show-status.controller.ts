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
// import { HttpError } from '@/lib/errors/http-error.util';
import { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateShowStatusDto,
  showStatusDto,
  UpdateShowStatusDto,
} from '@/models/show-status/schemas/show-status.schema';
import { ShowStatusService } from '@/models/show-status/show-status.service';

@Controller('admin/show-statuses')
export class AdminShowStatusController extends BaseAdminController {
  constructor(private readonly showStatusService: ShowStatusService) {
    super();
  }

  @Post()
  @AdminResponse(
    showStatusDto,
    HttpStatus.CREATED,
    'Show status created successfully',
  )
  createShowStatus(@Body() body: CreateShowStatusDto) {
    const { name, metadata } = body;
    return this.showStatusService.createShowStatus({ name, metadata });
  }

  @Get()
  @AdminPaginatedResponse(
    showStatusDto,
    'List of show statuses with pagination',
  )
  async getShowStatuses(@Query() query: PaginationQueryDto) {
    const { data, total } = await this.showStatusService.getShowStatuses({
      skip: query.skip,
      take: query.take,
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(showStatusDto, HttpStatus.OK, 'Show status details')
  async getShowStatus(
    @Param(
      'id',
      new UidValidationPipe(ShowStatusService.UID_PREFIX, 'Show Status'),
    )
    id: string,
  ) {
    const showStatus = await this.showStatusService.getShowStatusById(id);
    this.ensureResourceExists(showStatus, 'Show Status', id);
    return showStatus;
  }

  @Patch(':id')
  @AdminResponse(
    showStatusDto,
    HttpStatus.OK,
    'Show status updated successfully',
  )
  async updateShowStatus(
    @Param(
      'id',
      new UidValidationPipe(ShowStatusService.UID_PREFIX, 'Show Status'),
    )
    id: string,
    @Body() body: UpdateShowStatusDto,
  ) {
    const showStatus = await this.showStatusService.getShowStatusById(id);
    this.ensureResourceExists(showStatus, 'Show Status', id);

    const { name, metadata } = body;
    return this.showStatusService.updateShowStatus(id, { name, metadata });
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
    const showStatus = await this.showStatusService.getShowStatusById(id);
    this.ensureResourceExists(showStatus, 'Show Status', id);

    await this.showStatusService.deleteShowStatus({ uid: id });
  }
}
