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
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateShowStandardDto,
  ListShowStandardsQueryDto,
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
    const { name, metadata } = body;
    return this.showStandardService.createShowStandard({ name, metadata });
  }

  @Get()
  @AdminPaginatedResponse(
    showStandardDto,
    'List of show standards with pagination',
  )
  async getShowStandards(@Query() query: ListShowStandardsQueryDto) {
    const { data, total } = await this.showStandardService.listShowStandards({
      skip: query.skip,
      take: query.take,
      name: query.name,
      uid: query.uid,
      include_deleted: query.include_deleted,
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(showStandardDto, HttpStatus.OK, 'Show standard details')
  async getShowStandard(
    @Param(
      'id',
      new UidValidationPipe(ShowStandardService.UID_PREFIX, 'Show Standard'),
    )
    id: string,
  ) {
    const showStandard = await this.showStandardService.getShowStandardById(id);
    this.ensureResourceExists(showStandard, 'Show Standard', id);
    return showStandard;
  }

  @Patch(':id')
  @AdminResponse(
    showStandardDto,
    HttpStatus.OK,
    'Show standard updated successfully',
  )
  async updateShowStandard(
    @Param(
      'id',
      new UidValidationPipe(ShowStandardService.UID_PREFIX, 'Show Standard'),
    )
    id: string,
    @Body() body: UpdateShowStandardDto,
  ) {
    const showStandard = await this.showStandardService.getShowStandardById(id);
    this.ensureResourceExists(showStandard, 'Show Standard', id);

    const { name, metadata } = body;
    return this.showStandardService.updateShowStandard(id, { name, metadata });
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
    const showStandard = await this.showStandardService.getShowStandardById(id);
    this.ensureResourceExists(showStandard, 'Show Standard', id);

    await this.showStandardService.deleteShowStandard({ uid: id });
  }
}
