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
  CreateStudioDto,
  StudioDto,
  studioDto,
  UpdateStudioDto,
} from '../../studio/schemas/studio.schema';
import { StudioService } from '../../studio/studio.service';
import { UtilityService } from '../../utility/utility.service';
import { BaseAdminController } from '../base-admin.controller';

@Controller('admin/studios')
export class AdminStudioController extends BaseAdminController {
  constructor(
    private readonly studioService: StudioService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(StudioDto)
  createStudio(@Body() body: CreateStudioDto) {
    return this.studioService.createStudio(body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(studioDto))
  async getStudios(@Query() query: PaginationQueryDto) {
    const data = await this.studioService.getStudios({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.studioService.countStudios();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioDto)
  getStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
  ) {
    return this.studioService.getStudioById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioDto)
  updateStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
    @Body() body: UpdateStudioDto,
  ) {
    return this.studioService.updateStudio(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
  ) {
    await this.studioService.deleteStudio(id);
  }
}
