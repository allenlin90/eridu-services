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

import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '../../common/pagination/schema/pagination.schema';
import {
  CreateShowStatusDto,
  ShowStatusDto,
  showStatusDto,
  UpdateShowStatusDto,
} from '../../show-status/schemas/show-status.schema';
import { AdminShowStatusService } from './admin-show-status.service';

@Controller('admin/show-statuses')
export class AdminShowStatusController {
  constructor(
    private readonly adminShowStatusService: AdminShowStatusService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(ShowStatusDto)
  async createShowStatus(@Body() body: CreateShowStatusDto) {
    const showStatus = await this.adminShowStatusService.createShowStatus(body);
    return showStatus;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(showStatusDto))
  getShowStatuses(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminShowStatusService.getShowStatuses(paginationQuery);
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowStatusDto)
  getShowStatus(@Param('uid') uid: string) {
    return this.adminShowStatusService.getShowStatusById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowStatusDto)
  updateShowStatus(
    @Param('uid') uid: string,
    @Body() body: UpdateShowStatusDto,
  ) {
    return this.adminShowStatusService.updateShowStatus(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShowStatus(@Param('uid') uid: string) {
    await this.adminShowStatusService.deleteShowStatus(uid);
  }
}
