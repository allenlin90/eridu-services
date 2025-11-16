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
import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import {
  CreateShowTypeDto,
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
  @AdminResponse(
    showTypeDto,
    HttpStatus.CREATED,
    'Show type created successfully',
  )
  createShowType(@Body() body: CreateShowTypeDto) {
    return this.showTypeService.createShowType(body);
  }

  @Get()
  @AdminPaginatedResponse(showTypeDto, 'List of show types with pagination')
  async getShowTypes(@Query() query: PaginationQueryDto) {
    const data = await this.showTypeService.getShowTypes({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.showTypeService.countShowTypes();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(showTypeDto, HttpStatus.OK, 'Show type details')
  getShowType(
    @Param('id', new UidValidationPipe(ShowTypeService.UID_PREFIX, 'Show Type'))
    id: string,
  ) {
    return this.showTypeService.getShowTypeById(id);
  }

  @Patch(':id')
  @AdminResponse(showTypeDto, HttpStatus.OK, 'Show type updated successfully')
  updateShowType(
    @Param('id', new UidValidationPipe(ShowTypeService.UID_PREFIX, 'Show Type'))
    id: string,
    @Body() body: UpdateShowTypeDto,
  ) {
    return this.showTypeService.updateShowType(id, body);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteShowType(
    @Param('id', new UidValidationPipe(ShowTypeService.UID_PREFIX, 'Show Type'))
    id: string,
  ) {
    await this.showTypeService.deleteShowType(id);
  }
}
