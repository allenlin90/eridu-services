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
  CreateShowTypeDto,
  ShowTypeDto,
  showTypeDto,
  UpdateShowTypeDto,
} from '@/models/show-type/schemas/show-type.schema';
import { ShowTypeService } from '@/models/show-type/show-type.service';
import { UtilityService } from '@/utility/utility.service';

@Controller('admin/show-types')
export class AdminShowTypeController extends BaseAdminController {
  constructor(
    private readonly showTypeService: ShowTypeService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiZodResponse(showTypeDto, 'Show type created successfully')
  @ZodSerializerDto(ShowTypeDto)
  createShowType(@Body() body: CreateShowTypeDto) {
    return this.showTypeService.createShowType(body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(showTypeDto),
    'List of show types with pagination',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(showTypeDto))
  async getShowTypes(@Query() query: PaginationQueryDto) {
    const data = await this.showTypeService.getShowTypes({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.showTypeService.countShowTypes();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showTypeDto, 'Show type details')
  @ZodSerializerDto(ShowTypeDto)
  getShowType(
    @Param('id', new UidValidationPipe(ShowTypeService.UID_PREFIX, 'Show Type'))
    id: string,
  ) {
    return this.showTypeService.getShowTypeById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showTypeDto, 'Show type updated successfully')
  @ZodSerializerDto(ShowTypeDto)
  updateShowType(
    @Param('id', new UidValidationPipe(ShowTypeService.UID_PREFIX, 'Show Type'))
    id: string,
    @Body() body: UpdateShowTypeDto,
  ) {
    return this.showTypeService.updateShowType(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShowType(
    @Param('id', new UidValidationPipe(ShowTypeService.UID_PREFIX, 'Show Type'))
    id: string,
  ) {
    await this.showTypeService.deleteShowType(id);
  }
}
