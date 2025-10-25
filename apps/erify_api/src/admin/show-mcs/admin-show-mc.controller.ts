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
import { UidValidationPipe } from '../../common/pipes/uid-validation.pipe';
import {
  CreateShowMcDto,
  ShowMcDto,
  showMcDto,
  UpdateShowMcDto,
} from '../../show-mc/schemas/show-mc.schema';
import { ShowMcService } from '../../show-mc/show-mc.service';
import { UtilityService } from '../../utility/utility.service';
import { BaseAdminController } from '../base-admin.controller';

@Controller('admin/show-mcs')
export class AdminShowMcController extends BaseAdminController {
  constructor(
    private readonly showMcService: ShowMcService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(ShowMcDto)
  async createShowMc(@Body() body: CreateShowMcDto) {
    const showMc = await this.showMcService.createShowMcFromDto(body);
    return this.showMcService.getShowMcById(showMc.uid, {
      show: true,
      mc: true,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(showMcDto))
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
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowMcDto)
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
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowMcDto)
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShowMc(
    @Param('id', new UidValidationPipe(ShowMcService.UID_PREFIX, 'Show MC'))
    id: string,
  ) {
    await this.showMcService.deleteShowMc(id);
  }
}
