import { Injectable } from '@nestjs/common';
import type { Prisma, StudioRoom } from '@prisma/client';

import { UtilityService } from '../utility/utility.service';
import { StudioRoomRepository } from './studio-room.repository';

type StudioRoomWithIncludes<T extends Prisma.StudioRoomInclude> =
  Prisma.StudioRoomGetPayload<{
    include: T;
  }>;

@Injectable()
export class StudioRoomService {
  static readonly UID_PREFIX = 'srm_';

  constructor(
    private readonly studioRoomRepository: StudioRoomRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createStudioRoom<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    data: Omit<Prisma.StudioRoomCreateInput, 'uid'>,
    include?: T,
  ): Promise<StudioRoom | StudioRoomWithIncludes<T>> {
    const uid = this.utilityService.generateBrandedId(
      StudioRoomService.UID_PREFIX,
    );
    const studioRoomData = { ...data, uid };

    return this.studioRoomRepository.create(studioRoomData, include);
  }

  async getStudioRoomById<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<StudioRoom | StudioRoomWithIncludes<T> | null> {
    return this.studioRoomRepository.findByUid(uid, include);
  }

  async getStudioRooms<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    params: {
      skip?: number;
      take?: number;
      orderBy?: Record<string, 'asc' | 'desc'>;
    },
    include?: T,
  ): Promise<StudioRoom[] | StudioRoomWithIncludes<T>[]> {
    return this.studioRoomRepository.findActiveStudioRooms(
      {
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy,
      },
      include,
    );
  }

  async getStudioRoomsByStudioId(studioId: bigint): Promise<StudioRoom[]> {
    return this.studioRoomRepository.findByStudioId(studioId);
  }

  async updateStudioRoom<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    uid: string,
    data: Prisma.StudioRoomUpdateInput,
    include?: T,
  ): Promise<StudioRoom | StudioRoomWithIncludes<T>> {
    return this.studioRoomRepository.update({ uid }, data, include);
  }

  async deleteStudioRoom(uid: string): Promise<StudioRoom> {
    return this.studioRoomRepository.softDelete({ uid });
  }

  async countStudioRooms(): Promise<number> {
    return this.studioRoomRepository.count({});
  }

  async countStudioRoomsByStudioId(studioId: bigint): Promise<number> {
    return this.studioRoomRepository.count({ studioId });
  }
}
