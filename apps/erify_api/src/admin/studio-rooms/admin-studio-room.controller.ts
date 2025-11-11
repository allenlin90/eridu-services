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

import { BaseAdminController } from '@/admin/base-admin.controller';
import { ApiZodResponse } from '@/common/openapi/decorators';
import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import {
  CreateStudioRoomDto,
  StudioRoomWithStudioDto,
  studioRoomWithStudioDto,
  UpdateStudioRoomDto,
} from '@/models/studio-room/schemas/studio-room.schema';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';
import { UtilityService } from '@/utility/utility.service';

@Controller('admin/studio-rooms')
export class AdminStudioRoomController extends BaseAdminController {
  constructor(
    private readonly studioRoomService: StudioRoomService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiZodResponse(studioRoomWithStudioDto, 'Studio room created successfully')
  @ZodSerializerDto(StudioRoomWithStudioDto)
  // TODO: add idempotency check
  createStudioRoom(@Body() body: CreateStudioRoomDto) {
    return this.studioRoomService.createStudioRoomFromDto(body, {
      studio: true,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(studioRoomWithStudioDto),
    'List of studio rooms with pagination',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(studioRoomWithStudioDto))
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
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(studioRoomWithStudioDto, 'Studio room details')
  @ZodSerializerDto(StudioRoomWithStudioDto)
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
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(studioRoomWithStudioDto, 'Studio room updated successfully')
  @ZodSerializerDto(StudioRoomWithStudioDto)
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
  @HttpCode(HttpStatus.NO_CONTENT)
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
