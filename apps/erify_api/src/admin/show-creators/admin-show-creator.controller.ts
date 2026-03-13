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
  @AdminResponse(showCreatorDto, HttpStatus.CREATED, 'Show creator assignment created successfully')
  async createShowCreator(@Body() body: CreateShowCreatorDto) {
    const {
      showId,
      creatorId,
      note,
      agreedRate,
      compensationType,
      commissionRate,
      metadata,
    } = body;

    const showCreator = await this.showCreatorService.create({
      showId,
      creatorId,
      note,
      agreedRate,
      compensationType,
      commissionRate,
      metadata,
    });

    return this.showCreatorService.findOne(showCreator.uid, {
      show: true,
      creator: true,
    });
  }

  @Get()
  @AdminPaginatedResponse(showCreatorDto, 'List of show creator assignments with pagination')
  async getShowCreators(@Query() query: PaginationQueryDto) {
    const { data, total } = await this.showCreatorService.findPaginated({
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: query.sort === 'asc' ? 'asc' : 'desc' },
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(showCreatorDto, HttpStatus.OK, 'Show creator assignment details')
  async getShowCreator(
    @Param('id', new UidValidationPipe(ShowCreatorService.UID_PREFIX, 'Show creator assignment'))
    id: string,
  ) {
    const showCreator = await this.showCreatorService.findOne(id, {
      show: true,
      creator: true,
    });
    this.ensureResourceExists(showCreator, 'ShowCreator', id);
    return showCreator;
  }

  @Patch(':id')
  @AdminResponse(showCreatorDto, HttpStatus.OK, 'Show creator assignment updated successfully')
  async updateShowCreator(
    @Param('id', new UidValidationPipe(ShowCreatorService.UID_PREFIX, 'Show creator assignment'))
    id: string,
    @Body() body: UpdateShowCreatorDto,
  ) {
    const existing = await this.showCreatorService.findOne(id);
    this.ensureResourceExists(existing, 'ShowCreator', id);

    const {
      showId,
      creatorId,
      note,
      agreedRate,
      compensationType,
      commissionRate,
      metadata,
    } = body;

    const showCreator = await this.showCreatorService.update(id, {
      showId,
      creatorId,
      note,
      agreedRate,
      compensationType,
      commissionRate,
      metadata,
    });

    return this.showCreatorService.findOne(showCreator.uid, {
      show: true,
      creator: true,
    });
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteShowCreator(
    @Param('id', new UidValidationPipe(ShowCreatorService.UID_PREFIX, 'Show creator assignment'))
    id: string,
  ) {
    const showCreator = await this.showCreatorService.findOne(id);
    this.ensureResourceExists(showCreator, 'ShowCreator', id);
    await this.showCreatorService.softDelete(id);
  }
}
