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
  CreateStudioRoomDto,
  studioRoomWithStudioDto,
  UpdateStudioRoomDto,
} from '@/models/studio-room/schemas/studio-room.schema';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';

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
  // TODO: add idempotency check
  createStudioRoom(@Body() body: CreateStudioRoomDto) {
    return this.studioRoomService.createStudioRoomFromDto(body, {
      studio: true,
    });
  }

  @Get()
  @AdminPaginatedResponse(
    studioRoomWithStudioDto,
    'List of studio rooms with pagination',
  )
  // TODO: filter by studio id
  async getStudioRooms(@Query() query: PaginationQueryDto) {
    const data = await this.studioRoomService.getStudioRooms(
      { skip: query.skip, take: query.take },
      { studio: true },
    );
    const total = await this.studioRoomService.countStudioRooms();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(studioRoomWithStudioDto, HttpStatus.OK, 'Studio room details')
  getStudioRoom(
    @Param(
      'id',
      new UidValidationPipe(StudioRoomService.UID_PREFIX, 'Studio Room'),
    )
    id: string,
  ) {
    return this.studioRoomService.getStudioRoomById(id, { studio: true });
  }

  @Patch(':id')
  @AdminResponse(
    studioRoomWithStudioDto,
    HttpStatus.OK,
    'Studio room updated successfully',
  )
  updateStudioRoom(
    @Param(
      'id',
      new UidValidationPipe(StudioRoomService.UID_PREFIX, 'Studio Room'),
    )
    id: string,
    @Body() body: UpdateStudioRoomDto,
  ) {
    return this.studioRoomService.updateStudioRoomFromDto(id, body, {
      studio: true,
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
    await this.studioRoomService.deleteStudioRoom(id);
  }
}
