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
  CreateStudioRoomDto,
  StudioRoomWithStudioDto,
  studioRoomWithStudioDto,
  UpdateStudioRoomDto,
} from '../../studio-room/schemas/studio-room.schema';
import { AdminStudioRoomService } from './admin-studio-room.service';

@Controller('admin/studio-rooms')
export class AdminStudioRoomController {
  constructor(
    private readonly adminStudioRoomService: AdminStudioRoomService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(StudioRoomWithStudioDto)
  async createStudioRoom(@Body() body: CreateStudioRoomDto) {
    const studioRoom = await this.adminStudioRoomService.createStudioRoom(body);
    return studioRoom;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(studioRoomWithStudioDto))
  getStudioRooms(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminStudioRoomService.getStudioRooms(paginationQuery);
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioRoomWithStudioDto)
  getStudioRoom(@Param('uid') uid: string) {
    return this.adminStudioRoomService.getStudioRoomById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(StudioRoomWithStudioDto)
  updateStudioRoom(
    @Param('uid') uid: string,
    @Body() body: UpdateStudioRoomDto,
  ) {
    return this.adminStudioRoomService.updateStudioRoom(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStudioRoom(@Param('uid') uid: string) {
    await this.adminStudioRoomService.deleteStudioRoom(uid);
  }
}
