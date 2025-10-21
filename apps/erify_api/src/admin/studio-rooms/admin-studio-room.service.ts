import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { HttpError } from '../../common/errors/http-error.util';
import { StudioService } from '../../studio/studio.service';
import {
  CreateStudioRoomDto,
  UpdateStudioRoomDto,
} from '../../studio-room/schemas/studio-room.schema';
import { StudioRoomService } from '../../studio-room/studio-room.service';
import { UtilityService } from '../../utility/utility.service';

type StudioRoomWithStudio = Prisma.StudioRoomGetPayload<{
  include: { studio: true };
}>;

@Injectable()
export class AdminStudioRoomService {
  constructor(
    private readonly studioRoomService: StudioRoomService,
    private readonly studioService: StudioService,
    private readonly utilityService: UtilityService,
  ) {}

  async createStudioRoom(data: CreateStudioRoomDto) {
    // Resolve studio UID to internal ID
    const studio = await this.studioService.getStudioById(data.studioId);

    if (!studio) {
      throw HttpError.badRequest(`studio_id: ${data.studioId} not found`);
    }

    const studioRoom = await this.studioRoomService.createStudioRoom(
      {
        studio: { connect: { id: studio.id } },
        name: data.name,
        capacity: data.capacity,
        metadata: data.metadata,
      },
      {
        studio: true,
      },
    );

    return studioRoom;
  }

  async getStudioRoomById(uid: string) {
    const studioRoom = await this.studioRoomService.getStudioRoomById(uid, {
      studio: true,
    });

    return studioRoom;
  }

  async updateStudioRoom(uid: string, data: UpdateStudioRoomDto) {
    let updateData: Prisma.StudioRoomUpdateInput = { ...data };

    // Handle studio relationship if studioId is provided
    if (data.studioId) {
      // Resolve studio UID to internal ID
      const studio = await this.studioService.getStudioById(data.studioId);

      if (!studio) {
        throw HttpError.badRequest(`studio_id: ${data.studioId} not found`);
      }

      // Use destructuring to exclude studioId and add studio relation
      const { studioId: _studioId, ...restData } = data;
      updateData = {
        ...restData,
        studio: { connect: { id: studio.id } },
      };
    }

    return this.studioRoomService.updateStudioRoom(uid, updateData, {
      studio: true,
    });
  }

  deleteStudioRoom(uid: string) {
    return this.studioRoomService.deleteStudioRoom(uid);
  }

  async getStudioRooms(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }) {
    const page = params.page;
    const limit = params.limit;
    const skip = params.skip;
    const take = params.take;

    const studioRooms = await this.studioRoomService.getStudioRooms(
      {
        skip,
        take,
      },
      {
        studio: true,
      },
    );

    const total = await this.studioRoomService.countStudioRooms();
    const meta = this.utilityService.createPaginationMeta(page, limit, total);

    return { data: studioRooms as StudioRoomWithStudio[], meta };
  }
}
