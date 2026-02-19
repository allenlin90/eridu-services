import { Injectable } from '@nestjs/common';

import type {
  CreateStudioRoomPayload,
  UpdateStudioRoomPayload,
} from './schemas/studio-room.schema';
import { StudioRoomRepository } from './studio-room.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class StudioRoomService extends BaseModelService {
  static readonly UID_PREFIX = 'srm';
  protected readonly uidPrefix = StudioRoomService.UID_PREFIX;

  constructor(
    private readonly studioRoomRepository: StudioRoomRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async create(payload: CreateStudioRoomPayload): ReturnType<StudioRoomRepository['create']> {
    const data = {
      name: payload.name,
      capacity: payload.capacity,
      metadata: payload.metadata ?? {},
      studio: { connect: { uid: payload.studioId } },
      uid: payload.uid ?? this.generateUid(),
    };

    if (payload.includeStudio) {
      return this.studioRoomRepository.create(data, {
        studio: true,
      });
    }

    return this.studioRoomRepository.create(data);
  }

  async findOne(...args: Parameters<StudioRoomRepository['findOne']>): ReturnType<StudioRoomRepository['findOne']> {
    return this.studioRoomRepository.findOne(...args);
  }

  async getStudioRooms(...args: Parameters<StudioRoomRepository['findPaginated']>): ReturnType<StudioRoomRepository['findPaginated']> {
    return this.studioRoomRepository.findPaginated(...args);
  }

  async softDelete(...args: Parameters<StudioRoomRepository['softDelete']>): ReturnType<StudioRoomRepository['softDelete']> {
    return this.studioRoomRepository.softDelete(...args);
  }

  async update(
    uid: string,
    payload: UpdateStudioRoomPayload,
  ): ReturnType<StudioRoomRepository['update']> {
    // Build repository data with relationship syntax
    const data: Record<string, any> = {};

    if (payload.name !== undefined)
      data.name = payload.name;
    if (payload.capacity !== undefined)
      data.capacity = payload.capacity;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;

    if (payload.studioId !== undefined) {
      data.studio = { connect: { uid: payload.studioId } };
    }

    if (payload.includeStudio) {
      return this.studioRoomRepository.update(
        { uid },
        data,
        { studio: true },
      );
    }

    return this.studioRoomRepository.update({ uid }, data);
  }
}
