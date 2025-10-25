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
  CreateShowDto,
  ShowDto,
  showDto,
  UpdateShowDto,
} from '../../show/schemas/show.schema';
import { ShowService } from '../../show/show.service';
import { UtilityService } from '../../utility/utility.service';
import { BaseAdminController } from '../base-admin.controller';

@Controller('admin/shows')
export class AdminShowController extends BaseAdminController {
  constructor(
    private readonly showService: ShowService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(ShowDto)
  async createShow(@Body() body: CreateShowDto) {
    const show = await this.showService.createShowFromDto(body);
    // Fetch with relations for proper serialization
    return this.showService.getShowById(show.uid, {
      client: true,
      studioRoom: true,
      showType: true,
      showStatus: true,
      showStandard: true,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(showDto))
  async getShows(@Query() query: PaginationQueryDto) {
    const data = await this.showService.getActiveShows({
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        studioRoom: true,
        showType: true,
        showStatus: true,
        showStandard: true,
      },
    });
    const total = await this.showService.countShows();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowDto)
  getShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
  ) {
    return this.showService.getShowById(id, {
      client: true,
      studioRoom: true,
      showType: true,
      showStatus: true,
      showStandard: true,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowDto)
  async updateShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: UpdateShowDto,
  ) {
    const show = await this.showService.updateShowFromDto(id, body);
    // Fetch with relations for proper serialization
    return this.showService.getShowById(show.uid, {
      client: true,
      studioRoom: true,
      showType: true,
      showStatus: true,
      showStandard: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
  ) {
    await this.showService.deleteShow(id);
  }
}
