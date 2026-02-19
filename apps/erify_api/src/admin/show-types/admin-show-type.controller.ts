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
// import { HttpError } from '@/lib/errors/http-error.util';
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
    const { name, metadata } = body;
    return this.showTypeService.createShowType({ name, metadata });
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
  async getShowType(
    @Param('id', new UidValidationPipe(ShowTypeService.UID_PREFIX, 'Show Type'))
    id: string,
  ) {
    const showType = await this.showTypeService.getShowTypeById(id);
    this.ensureResourceExists(showType, 'Show Type', id);
    return showType;
  }

  @Patch(':id')
  @AdminResponse(showTypeDto, HttpStatus.OK, 'Show type updated successfully')
  async updateShowType(
    @Param('id', new UidValidationPipe(ShowTypeService.UID_PREFIX, 'Show Type'))
    id: string,
    @Body() body: UpdateShowTypeDto,
  ) {
    const showType = await this.showTypeService.getShowTypeById(id);
    this.ensureResourceExists(showType, 'Show Type', id);

    const { name, metadata } = body;
    return this.showTypeService.updateShowType(id, { name, metadata });
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteShowType(
    @Param('id', new UidValidationPipe(ShowTypeService.UID_PREFIX, 'Show Type'))
    id: string,
  ) {
    const showType = await this.showTypeService.getShowTypeById(id);
    this.ensureResourceExists(showType, 'Show Type', id);

    await this.showTypeService.deleteShowType({ uid: id });
  }
}
