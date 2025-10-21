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
import {
  CreateShowTypeDto,
  ShowTypeDto,
  showTypeDto,
  UpdateShowTypeDto,
} from '../../show-type/schemas/show-type.schema';
import { AdminShowTypeService } from './admin-show-type.service';

@Controller('admin/show-types')
export class AdminShowTypeController {
  constructor(private readonly adminShowTypeService: AdminShowTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(ShowTypeDto)
  async createShowType(@Body() body: CreateShowTypeDto) {
    const showType = await this.adminShowTypeService.createShowType(body);
    return showType;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(showTypeDto))
  getShowTypes(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminShowTypeService.getShowTypes(paginationQuery);
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowTypeDto)
  getShowType(@Param('uid') uid: string) {
    return this.adminShowTypeService.getShowTypeById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowTypeDto)
  updateShowType(@Param('uid') uid: string, @Body() body: UpdateShowTypeDto) {
    return this.adminShowTypeService.updateShowType(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShowType(@Param('uid') uid: string) {
    await this.adminShowTypeService.deleteShowType(uid);
  }
}
