import { Injectable } from '@nestjs/common';
import { Prisma, StudioRoom } from '@prisma/client';

import {
  CreateStudioRoomDto,
  UpdateStudioRoomDto,
} from './schemas/studio-room.schema';
import { StudioRoomRepository } from './studio-room.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

type StudioRoomWithIncludes<T extends Prisma.StudioRoomInclude> =
  Prisma.StudioRoomGetPayload<{
    include: T;
  }>;

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

  async createStudioRoomFromDto<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    dto: CreateStudioRoomDto,
    include?: T,
  ): Promise<StudioRoom | StudioRoomWithIncludes<T>> {
    const data = this.buildCreatePayload(dto);
    return this.createStudioRoom(data, include);
  }

  async createStudioRoom<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    data: Omit<Prisma.StudioRoomCreateInput, 'uid'>,
    include?: T,
  ): Promise<StudioRoom | StudioRoomWithIncludes<T>> {
    const uid = this.generateUid();
    return this.studioRoomRepository.create({ ...data, uid }, include);
  }

  async getStudioRoomById<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(uid: string,
    include?: T,
  ): Promise<StudioRoom | StudioRoomWithIncludes<T>> {
    return this.findStudioRoomOrThrow(uid, include);
  }

  async getStudioRooms<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    params: {
      skip?: number;
      take?: number;
      orderBy?: Record<string, 'asc' | 'desc'>;
      studioId?: string;
    },
    include?: T,
  ): Promise<StudioRoom[] | StudioRoomWithIncludes<T>[]> {
    const { studioId, ...rest } = params;
    return this.studioRoomRepository.findActiveStudioRooms(
      {
        ...rest,
        studioUid: studioId,
      },
      include,
    );
  }

  async getStudioRoomsByStudioId(studioId: bigint): Promise<StudioRoom[]> {
    return this.studioRoomRepository.findByStudioId(studioId);
  }

  async countStudioRooms(params?: { studioId?: string }): Promise<number> {
    return this.studioRoomRepository.count({
      ...(params?.studioId && { studio: { uid: params.studioId } }),
    });
  }

  async countStudioRoomsByStudioId(studioId: bigint): Promise<number> {
    return this.studioRoomRepository.count({ studioId });
  }

  async updateStudioRoomFromDto<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    uid: string,
    dto: UpdateStudioRoomDto,
    include?: T,
  ): Promise<StudioRoom | StudioRoomWithIncludes<T>> {
    const data = this.buildUpdatePayload(dto);
    await this.findStudioRoomOrThrow(uid, include);
    return this.studioRoomRepository.update({ uid }, data, include);
  }

  async updateStudioRoom<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    uid: string,
    data: Prisma.StudioRoomUpdateInput,
    include?: T,
  ): Promise<StudioRoom | StudioRoomWithIncludes<T>> {
    await this.findStudioRoomOrThrow(uid, include);
    return this.studioRoomRepository.update({ uid }, data, include);
  }

  async deleteStudioRoom(uid: string): Promise<StudioRoom> {
    await this.findStudioRoomOrThrow(uid);
    return this.studioRoomRepository.softDelete({ uid });
  }

  private buildCreatePayload(
    dto: CreateStudioRoomDto,
  ): Omit<Prisma.StudioRoomCreateInput, 'uid'> {
    return {
      name: dto.name,
      capacity: dto.capacity,
      metadata: dto.metadata ?? {},
      studio: { connect: { uid: dto.studioId } },
    };
  }

  private buildUpdatePayload(
    dto: UpdateStudioRoomDto,
  ): Prisma.StudioRoomUpdateInput {
    const payload: Prisma.StudioRoomUpdateInput = {};

    if (dto.name !== undefined)
      payload.name = dto.name;
    if (dto.capacity !== undefined)
      payload.capacity = dto.capacity;
    if (dto.metadata !== undefined)
      payload.metadata = dto.metadata;

    if (dto.studioId !== undefined) {
      payload.studio = { connect: { uid: dto.studioId } };
    }

    return payload;
  }

  private async findStudioRoomOrThrow<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(uid: string,
    include?: T,
  ): Promise<StudioRoom | StudioRoomWithIncludes<T>> {
    const studioRoom = await this.studioRoomRepository.findByUid(uid, include);
    if (!studioRoom) {
      throw HttpError.notFound('Studio Room', uid);
    }
    return studioRoom;
  }
}
