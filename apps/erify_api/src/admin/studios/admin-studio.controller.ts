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
  createStudio(@Body() body: CreateStudioDto) {
    return this.studioService.createStudio(body);
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
    const data = await this.studioRoomService.getStudioRooms(
      { skip: query.skip, take: query.take, studioId: id },
      { studio: true },
    );
    const total = await this.studioRoomService.countStudioRooms({
      studioId: id,
    });
    return this.createPaginatedResponse(data, total, query);
  }

  @Get()
  @AdminPaginatedResponse(studioDto, 'List of studios with pagination')
  async getStudios(@Query() query: PaginationQueryDto) {
    const { data, total } = await this.studioService.listStudios({
      skip: query.skip,
      take: query.take,
    });

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
