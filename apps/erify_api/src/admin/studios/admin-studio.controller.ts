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
  ListStudiosQueryDto,
  studioDto,
  UpdateStudioDto,
} from '@/models/studio/schemas/studio.schema';
import { StudioService } from '@/models/studio/studio.service';
import { studioRoomWithStudioDto } from '@/models/studio-room/schemas/studio-room.schema';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';

@Controller('admin/studios')
export class AdminStudioController extends BaseAdminController {
  constructor(
    private readonly studioService: StudioService,
    private readonly studioRoomService: StudioRoomService,
  ) {
    super();
  }

  @Post()
  @AdminResponse(studioDto, HttpStatus.CREATED, 'Studio created successfully')
  async createStudio(@Body() body: CreateStudioDto) {
    const { name, address, metadata } = body;
    return this.studioService.createStudio({ name, address, metadata });
  }

  @Get(':id/studio-rooms')
  @AdminPaginatedResponse(
    studioRoomWithStudioDto,
    'List of studio rooms for a studio',
  )
  async getStudioRooms(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { data, total } = await this.studioRoomService.getStudioRooms({
      skip: query.skip,
      take: query.take,
      studioUid: id,
      includeStudio: true,
    });
    return this.createPaginatedResponse(data, total, query);
  }

  @Get()
  @AdminPaginatedResponse(studioDto, 'List of studios with pagination')
  async getStudios(@Query() query: ListStudiosQueryDto) {
    const { skip, take, name, uid, include_deleted, sort } = query;
    const { data, total } = await this.studioService.listStudios({
      skip,
      take,
      name,
      uid,
      include_deleted,
      sort,
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(studioDto, HttpStatus.OK, 'Studio details')
  async getStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
  ) {
    const studio = await this.studioService.getStudioById(id);
    this.ensureResourceExists(studio, 'Studio', id);
    return studio;
  }

  @Patch(':id')
  @AdminResponse(studioDto, HttpStatus.OK, 'Studio updated successfully')
  async updateStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
    @Body() body: UpdateStudioDto,
  ) {
    const studio = await this.studioService.getStudioById(id);
    this.ensureResourceExists(studio, 'Studio', id);

    const { name, address, metadata } = body;
    return this.studioService.updateStudio(id, { name, address, metadata });
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteStudio(
    @Param('id', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))
    id: string,
  ) {
    const studio = await this.studioService.getStudioById(id);
    this.ensureResourceExists(studio, 'Studio', id);

    await this.studioService.deleteStudio(id);
  }
}
