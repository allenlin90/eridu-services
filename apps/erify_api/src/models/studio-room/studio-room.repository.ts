import { Injectable } from '@nestjs/common';
import type { Prisma, StudioRoom } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '@/common/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

class StudioRoomModelWrapper
  implements
    IBaseModel<
      StudioRoom,
      Prisma.StudioRoomCreateInput,
      Prisma.StudioRoomUpdateInput,
      Prisma.StudioRoomWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async create(args: {
    data: Prisma.StudioRoomCreateInput;
    include?: Record<string, any>;
  }): Promise<StudioRoom> {
    return this.prisma.studioRoom.create(args);
  }

  async findFirst(args: {
    where: Prisma.StudioRoomWhereInput;
    include?: Record<string, any>;
  }): Promise<StudioRoom | null> {
    return this.prisma.studioRoom.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.StudioRoomWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<StudioRoom[]> {
    return this.prisma.studioRoom.findMany(args);
  }

  async update(args: {
    where: Prisma.StudioRoomWhereUniqueInput;
    data: Prisma.StudioRoomUpdateInput;
    include?: Record<string, any>;
  }): Promise<StudioRoom> {
    return this.prisma.studioRoom.update(args);
  }

  async delete(args: {
    where: Prisma.StudioRoomWhereUniqueInput;
  }): Promise<StudioRoom> {
    return this.prisma.studioRoom.delete(args);
  }

  async count(args: { where: Prisma.StudioRoomWhereInput }): Promise<number> {
    return this.prisma.studioRoom.count(args);
  }
}

@Injectable()
export class StudioRoomRepository extends BaseRepository<
  StudioRoom,
  Prisma.StudioRoomCreateInput,
  Prisma.StudioRoomUpdateInput,
  Prisma.StudioRoomWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new StudioRoomModelWrapper(prisma));
  }

  async findByUid<T extends Prisma.StudioRoomInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<StudioRoom | Prisma.StudioRoomGetPayload<{ include: T }> | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  async findByStudioId(studioId: bigint): Promise<StudioRoom[]> {
    return this.model.findMany({
      where: { studioId, deletedAt: null },
    });
  }

  async findByNameAndStudioId(
    name: string,
    studioId: bigint,
  ): Promise<StudioRoom | null> {
    return this.model.findFirst({
      where: { name, studioId, deletedAt: null },
    });
  }

  async findActiveStudioRooms<
    T extends Prisma.StudioRoomInclude = Record<string, never>,
  >(
    params: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.StudioRoomOrderByWithRelationInput;
    },
    include?: T,
  ): Promise<StudioRoom[] | Prisma.StudioRoomGetPayload<{ include: T }>[]> {
    const { skip, take, orderBy } = params;
    return this.model.findMany({
      where: { deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }
}
