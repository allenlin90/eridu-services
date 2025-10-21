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
  CreateShowStandardDto,
  ShowStandardDto,
  showStandardDto,
  UpdateShowStandardDto,
} from '../../show-standard/schemas/show-standard.schema';
import { AdminShowStandardService } from './admin-show-standard.service';

@Controller('admin/show-standards')
export class AdminShowStandardController {
  constructor(
    private readonly adminShowStandardService: AdminShowStandardService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(ShowStandardDto)
  async createShowStandard(@Body() body: CreateShowStandardDto) {
    const showStandard =
      await this.adminShowStandardService.createShowStandard(body);
    return showStandard;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(showStandardDto))
  getShowStandards(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminShowStandardService.getShowStandards(paginationQuery);
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowStandardDto)
  getShowStandard(@Param('uid') uid: string) {
    return this.adminShowStandardService.getShowStandardById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(ShowStandardDto)
  updateShowStandard(
    @Param('uid') uid: string,
    @Body() body: UpdateShowStandardDto,
  ) {
    return this.adminShowStandardService.updateShowStandard(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShowStandard(@Param('uid') uid: string) {
    await this.adminShowStandardService.deleteShowStandard(uid);
  }
}
