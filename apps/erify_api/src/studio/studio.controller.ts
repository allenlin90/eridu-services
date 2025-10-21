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
} from '../common/pagination/schema/pagination.schema';
import {
  CreateStudioDto,
  StudioDto,
  studioDto,
  UpdateStudioDto,
} from './schemas/studio.schema';
import { StudioService } from './studio.service';

@Controller('studios')
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(StudioDto)
  async createStudio(@Body() body: CreateStudioDto) {
    const studio = await this.studioService.createStudio(body);
    return studio;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(studioDto))
  getStudios(@Query() paginationQuery: PaginationQueryDto) {
    return this.studioService.getStudios({
      skip: paginationQuery.skip,
      take: paginationQuery.take,
    });
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioDto)
  getStudio(@Param('uid') uid: string) {
    return this.studioService.getStudioById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioDto)
  updateStudio(@Param('uid') uid: string, @Body() body: UpdateStudioDto) {
    return this.studioService.updateStudio(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStudio(@Param('uid') uid: string) {
    await this.studioService.deleteStudio(uid);
  }
}
