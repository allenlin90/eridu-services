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
// import { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateShowTypeDto,
  ListShowTypesQueryDto,
  showTypeDto,
  UpdateShowTypeDto,
} from '@/models/show-type/schemas/show-type.schema';
import { ShowTypeService } from '@/models/show-type/show-type.service';

@Controller('admin/show-types')
export class AdminShowTypeController extends BaseAdminController {
  constructor(private readonly showTypeService: ShowTypeService) {
    super();
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
  async getShowTypes(@Query() query: ListShowTypesQueryDto) {
    const { data, total } = await this.showTypeService.listShowTypes({
      skip: query.skip,
      take: query.take,
      name: query.name,
      uid: query.uid,
      include_deleted: query.include_deleted,
    });

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
