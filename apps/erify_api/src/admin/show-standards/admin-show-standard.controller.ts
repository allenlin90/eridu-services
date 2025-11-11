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

import { BaseAdminController } from '@/admin/base-admin.controller';
import { ApiZodResponse } from '@/common/openapi/decorators';
import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import {
  CreateShowStandardDto,
  ShowStandardDto,
  showStandardDto,
  UpdateShowStandardDto,
} from '@/models/show-standard/schemas/show-standard.schema';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { UtilityService } from '@/utility/utility.service';

@Controller('admin/show-standards')
export class AdminShowStandardController extends BaseAdminController {
  constructor(
    private readonly showStandardService: ShowStandardService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiZodResponse(showStandardDto, 'Show standard created successfully')
  @ZodSerializerDto(ShowStandardDto)
  createShowStandard(@Body() body: CreateShowStandardDto) {
    return this.showStandardService.createShowStandard(body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(showStandardDto),
    'List of show standards with pagination',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(showStandardDto))
  async getShowStandards(@Query() query: PaginationQueryDto) {
    const data = await this.showStandardService.getShowStandards({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.showStandardService.countShowStandards();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showStandardDto, 'Show standard details')
  @ZodSerializerDto(ShowStandardDto)
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
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showStandardDto, 'Show standard updated successfully')
  @ZodSerializerDto(ShowStandardDto)
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
  @HttpCode(HttpStatus.NO_CONTENT)
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
