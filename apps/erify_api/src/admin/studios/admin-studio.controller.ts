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
import { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateStudioDto,
  studioDto,
  UpdateStudioDto,
} from '@/models/studio/schemas/studio.schema';
import { StudioService } from '@/models/studio/studio.service';

@Controller('admin/studios')
export class AdminStudioController extends BaseAdminController {
  constructor(private readonly studioService: StudioService) {
    super();
  }

  @Post()
  @AdminResponse(studioDto, HttpStatus.CREATED, 'Studio created successfully')
  createStudio(@Body() body: CreateStudioDto) {
    return this.studioService.createStudio(body);
  }

  @Get()
  @AdminPaginatedResponse(studioDto, 'List of studios with pagination')
  async getStudios(@Query() query: PaginationQueryDto) {
    const data = await this.studioService.getStudios({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.studioService.countStudios();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(studioDto, HttpStatus.OK, 'Studio details')
  getStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
  ) {
    return this.studioService.getStudioById(id);
  }

  @Patch(':id')
  @AdminResponse(studioDto, HttpStatus.OK, 'Studio updated successfully')
  updateStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
    @Body() body: UpdateStudioDto,
  ) {
    return this.studioService.updateStudio(id, body);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
  ) {
    await this.studioService.deleteStudio(id);
  }
}
