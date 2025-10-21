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
  CreateStudioDto,
  StudioDto,
  studioDto,
  UpdateStudioDto,
} from '../../studio/schemas/studio.schema';
import { AdminStudioService } from './admin-studio.service';

@Controller('admin/studios')
export class AdminStudioController {
  constructor(private readonly adminStudioService: AdminStudioService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(StudioDto)
  async createStudio(@Body() body: CreateStudioDto) {
    const studio = await this.adminStudioService.createStudio(body);
    return studio;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(studioDto))
  getStudios(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminStudioService.getStudios(paginationQuery);
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioDto)
  getStudio(@Param('uid') uid: string) {
    return this.adminStudioService.getStudioById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioDto)
  updateStudio(@Param('uid') uid: string, @Body() body: UpdateStudioDto) {
    return this.adminStudioService.updateStudio(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStudio(@Param('uid') uid: string) {
    await this.adminStudioService.deleteStudio(uid);
  }
}
