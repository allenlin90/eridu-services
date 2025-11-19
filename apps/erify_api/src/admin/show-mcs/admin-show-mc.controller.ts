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
    const showMc = await this.showMcService.createShowMcFromDto(body);
    return this.showMcService.getShowMcById(showMc.uid, {
      show: true,
      mc: true,
    });
  }

  @Get()
  @AdminPaginatedResponse(showMcDto, 'List of show MCs with pagination')
  async getShowMcs(@Query() query: PaginationQueryDto) {
    const data = await this.showMcService.getActiveShowMcs({
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: 'desc' },
      include: {
        show: true,
        mc: true,
      },
    });
    const total = await this.showMcService.countShowMcs();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(showMcDto, HttpStatus.OK, 'Show MC details')
  getShowMc(
    @Param('id', new UidValidationPipe(ShowMcService.UID_PREFIX, 'Show MC'))
    id: string,
  ) {
    return this.showMcService.getShowMcById(id, {
      show: true,
      mc: true,
    });
  }

  @Patch(':id')
  @AdminResponse(showMcDto, HttpStatus.OK, 'Show MC updated successfully')
  async updateShowMc(
    @Param('id', new UidValidationPipe(ShowMcService.UID_PREFIX, 'Show MC'))
    id: string,
    @Body() body: UpdateShowMcDto,
  ) {
    const showMc = await this.showMcService.updateShowMcFromDto(id, body);
    // Fetch with relations for proper serialization
    return this.showMcService.getShowMcById(showMc.uid, {
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
    await this.showMcService.deleteShowMc(id);
  }
}
