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
  CreateShowMcDto,
  showMcDto,
  UpdateShowMcDto,
} from '@/models/show-mc/schemas/show-mc.schema';
import { ShowMcService } from '@/models/show-mc/show-mc.service';

@Controller('admin/show-mcs')
export class AdminShowMcController extends BaseAdminController {
  constructor(private readonly showMcService: ShowMcService) {
    super();
  }

  @Post()
  @AdminResponse(showMcDto, HttpStatus.CREATED, 'Show MC created successfully')
  async createShowMc(@Body() body: CreateShowMcDto) {
    const { showId, mcId, note, metadata } = body;
    const showMc = await this.showMcService.create({
      showId,
      mcId,
      note,
      metadata,
    });
    return this.showMcService.findOne(showMc.uid, {
      show: true,
      mc: true,
    });
  }

  @Get()
  @AdminPaginatedResponse(showMcDto, 'List of show MCs with pagination')
  async getShowMcs(@Query() query: PaginationQueryDto) {
    const { data, total } = await this.showMcService.findPaginated({
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: query.sort === 'asc' ? 'asc' : 'desc' },
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(showMcDto, HttpStatus.OK, 'Show MC details')
  async getShowMc(
    @Param('id', new UidValidationPipe(ShowMcService.UID_PREFIX, 'Show MC'))
    id: string,
  ) {
    const showMc = await this.showMcService.findOne(id, {
      show: true,
      mc: true,
    });
    this.ensureResourceExists(showMc, 'ShowMC', id);
    return showMc;
  }

  @Patch(':id')
  @AdminResponse(showMcDto, HttpStatus.OK, 'Show MC updated successfully')
  async updateShowMc(
    @Param('id', new UidValidationPipe(ShowMcService.UID_PREFIX, 'Show MC'))
    id: string,
    @Body() body: UpdateShowMcDto,
  ) {
    const existing = await this.showMcService.findOne(id);
    this.ensureResourceExists(existing, 'ShowMC', id);

    const { showId, mcId, note, metadata } = body;
    const showMc = await this.showMcService.update(id, {
      showId,
      mcId,
      note,
      metadata,
    });
    // Fetch with relations for proper serialization
    return this.showMcService.findOne(showMc.uid, {
      show: true,
      mc: true,
    });
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteShowMc(
    @Param('id', new UidValidationPipe(ShowMcService.UID_PREFIX, 'Show MC'))
    id: string,
  ) {
    const showMc = await this.showMcService.findOne(id);
    this.ensureResourceExists(showMc, 'ShowMC', id);
    await this.showMcService.softDelete(id);
  }
}
