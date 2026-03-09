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
  CreateShowCreatorDto,
  showCreatorDto,
  UpdateShowCreatorDto,
} from '@/models/show-creator/schemas/show-creator.schema';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';

@Controller('admin/show-creators')
export class AdminShowCreatorController extends BaseAdminController {
  constructor(private readonly showCreatorService: ShowCreatorService) {
    super();
  }

  @Post()
  @AdminResponse(showCreatorDto, HttpStatus.CREATED, 'Show creator created successfully')
  async createShowCreator(@Body() body: CreateShowCreatorDto) {
    const { showId, mcId, note, metadata } = body;
    const showCreator = await this.showCreatorService.create({
      showId,
      mcId,
      note,
      metadata,
    });
    return this.showCreatorService.findOne(showCreator.uid, {
      show: true,
      mc: true,
    });
  }

  @Get()
  @AdminPaginatedResponse(showCreatorDto, 'List of show creators with pagination')
  async getShowCreators(@Query() query: PaginationQueryDto) {
    const { data, total } = await this.showCreatorService.findPaginated({
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: query.sort === 'asc' ? 'asc' : 'desc' },
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(showCreatorDto, HttpStatus.OK, 'Show creator details')
  async getShowCreator(
    @Param('id', new UidValidationPipe(ShowCreatorService.UID_PREFIX, 'Show creator'))
    id: string,
  ) {
    const showCreator = await this.showCreatorService.findOne(id, {
      show: true,
      mc: true,
    });
    this.ensureResourceExists(showCreator, 'ShowCreator', id);
    return showCreator;
  }

  @Patch(':id')
  @AdminResponse(showCreatorDto, HttpStatus.OK, 'Show creator updated successfully')
  async updateShowCreator(
    @Param('id', new UidValidationPipe(ShowCreatorService.UID_PREFIX, 'Show creator'))
    id: string,
    @Body() body: UpdateShowCreatorDto,
  ) {
    const existing = await this.showCreatorService.findOne(id);
    this.ensureResourceExists(existing, 'ShowCreator', id);

    const { showId, mcId, note, metadata } = body;
    const showCreator = await this.showCreatorService.update(id, {
      showId,
      mcId,
      note,
      metadata,
    });
    // Fetch with relations for proper serialization
    return this.showCreatorService.findOne(showCreator.uid, {
      show: true,
      mc: true,
    });
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteShowCreator(
    @Param('id', new UidValidationPipe(ShowCreatorService.UID_PREFIX, 'Show creator'))
    id: string,
  ) {
    const showCreator = await this.showCreatorService.findOne(id);
    this.ensureResourceExists(showCreator, 'ShowCreator', id);
    await this.showCreatorService.softDelete(id);
  }
}
