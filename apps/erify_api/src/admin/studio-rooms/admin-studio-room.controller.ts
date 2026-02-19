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
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import {
  createPaginatedQuerySchema,
} from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateStudioRoomDto,
  studioRoomWithStudioDto,
  UpdateStudioRoomDto,
} from '@/models/studio-room/schemas/studio-room.schema';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';

const studioRoomListQuerySchema = createPaginatedQuerySchema(
  z.object({
    name: z.string().optional(),
    studioId: z.string().optional(),
    studio_id: z.string().optional(),
    id: z.string().optional(),
  }),
).transform((data) => ({
  ...data,
  studioId: data.studioId || data.studio_id,
}));

class StudioRoomListQueryDto extends createZodDto(studioRoomListQuerySchema) {}

@Controller('admin/studio-rooms')
export class AdminStudioRoomController extends BaseAdminController {
  constructor(private readonly studioRoomService: StudioRoomService) {
    super();
  }

  @Post()
  @AdminResponse(
    studioRoomWithStudioDto,
    HttpStatus.CREATED,
    'Studio room created successfully',
  )
  createStudioRoom(@Body() body: CreateStudioRoomDto) {
    const { name, capacity, metadata, studioId } = body;

    if (!studioId) {
      throw HttpError.badRequest('Studio ID is required');
    }

    return this.studioRoomService.create({
      name,
      capacity,
      metadata,
      studioId: studioId as string,
      includeStudio: true,
    });
  }

  @Get()
  @AdminPaginatedResponse(
    studioRoomWithStudioDto,
    'List of studio rooms with pagination',
  )
  async getStudioRooms(@Query() query: StudioRoomListQueryDto) {
    const { data, total } = await this.studioRoomService.getStudioRooms({
      skip: query.skip,
      take: query.take,
      studioUid: query.studioId,
      name: query.name,
      uid: query.id,
      includeStudio: true,
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(studioRoomWithStudioDto, HttpStatus.OK, 'Studio room details')
  async getStudioRoom(
    @Param(
      'id',
      new UidValidationPipe(StudioRoomService.UID_PREFIX, 'Studio Room'),
    )
    id: string,
  ) {
    const studioRoom = await this.studioRoomService.findOne(
      { uid: id },
      { studio: true },
    );

    this.ensureResourceExists(studioRoom, 'Studio Room', id);

    return studioRoom;
  }

  @Patch(':id')
  @AdminResponse(
    studioRoomWithStudioDto,
    HttpStatus.OK,
    'Studio room updated successfully',
  )
  async updateStudioRoom(
    @Param(
      'id',
      new UidValidationPipe(StudioRoomService.UID_PREFIX, 'Studio Room'),
    )
    id: string,
    @Body() body: UpdateStudioRoomDto,
  ) {
    // 1. Verify existence
    const existing = await this.studioRoomService.findOne({ uid: id });
    this.ensureResourceExists(existing, 'Studio Room', id);

    // 2. Perform update
    const { name, capacity, metadata, studioId } = body;
    return this.studioRoomService.update(id, {
      name,
      capacity,
      metadata,
      studioId,
      includeStudio: true,
    });
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteStudioRoom(
    @Param(
      'id',
      new UidValidationPipe(StudioRoomService.UID_PREFIX, 'Studio Room'),
    )
    id: string,
  ) {
    // 1. Verify existence
    const existing = await this.studioRoomService.findOne({ uid: id });
    this.ensureResourceExists(existing, 'Studio Room', id);

    // 2. Perform soft delete
    await this.studioRoomService.softDelete({ uid: id });
  }
}
