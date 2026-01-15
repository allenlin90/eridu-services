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
import { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateShowStandardDto,
  showStandardDto,
  UpdateShowStandardDto,
} from '@/models/show-standard/schemas/show-standard.schema';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';

@Controller('admin/show-standards')
export class AdminShowStandardController extends BaseAdminController {
  constructor(private readonly showStandardService: ShowStandardService) {
    super();
  }

  @Post()
  @AdminResponse(
    showStandardDto,
    HttpStatus.CREATED,
    'Show standard created successfully',
  )
  createShowStandard(@Body() body: CreateShowStandardDto) {
    return this.showStandardService.createShowStandard(body);
  }

  @Get()
  @AdminPaginatedResponse(
    showStandardDto,
    'List of show standards with pagination',
  )
  async getShowStandards(@Query() query: PaginationQueryDto) {
    const { data, total } = await this.showStandardService.listShowStandards({
      skip: query.skip,
      take: query.take,
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(showStandardDto, HttpStatus.OK, 'Show standard details')
  getShowStandard(
    @Param(
      'id',
      new UidValidationPipe(ShowStandardService.UID_PREFIX, 'Show Standard'),
    )
    id: string,
  ) {
    return this.showStandardService.getShowStandardById(id);
  }

  @Patch(':id')
  @AdminResponse(
    showStandardDto,
    HttpStatus.OK,
    'Show standard updated successfully',
  )
  updateShowStandard(
    @Param(
      'id',
      new UidValidationPipe(ShowStandardService.UID_PREFIX, 'Show Standard'),
    )
    id: string,
    @Body() body: UpdateShowStandardDto,
  ) {
    return this.showStandardService.updateShowStandard(id, body);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteShowStandard(
    @Param(
      'id',
      new UidValidationPipe(ShowStandardService.UID_PREFIX, 'Show Standard'),
    )
    id: string,
  ) {
    await this.showStandardService.deleteShowStandard(id);
  }
}
