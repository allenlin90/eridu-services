import { Injectable } from '@nestjs/common';
import type { Platform, Prisma } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

class PlatformModelWrapper
  implements
    IBaseModel<
      Platform,
      Prisma.PlatformCreateInput,
      Prisma.PlatformUpdateInput,
      Prisma.PlatformWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async create(args: { data: Prisma.PlatformCreateInput }): Promise<Platform> {
    return this.prisma.platform.create(args);
  }

  async findFirst(args: {
    where: Prisma.PlatformWhereInput;
  }): Promise<Platform | null> {
    return this.prisma.platform.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.PlatformWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Platform[]> {
    return this.prisma.platform.findMany(args);
  }

  async update(args: {
    where: Prisma.PlatformWhereUniqueInput;
    data: Prisma.PlatformUpdateInput;
  }): Promise<Platform> {
    return this.prisma.platform.update(args);
  }

  async delete(args: {
    where: Prisma.PlatformWhereUniqueInput;
  }): Promise<Platform> {
    return this.prisma.platform.delete(args);
  }

  async count(args: { where: Prisma.PlatformWhereInput }): Promise<number> {
    return this.prisma.platform.count(args);
  }
}

@Injectable()
export class PlatformRepository extends BaseRepository<
  Platform,
  Prisma.PlatformCreateInput,
  Prisma.PlatformUpdateInput,
  Prisma.PlatformWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PlatformModelWrapper(prisma));
  }

  // Override update and delete methods to use unique where input
  async update(
    where: Prisma.PlatformWhereUniqueInput,
    data: Prisma.PlatformUpdateInput,
  ): Promise<Platform> {
    return this.prisma.platform.update({
      where,
      data,
    });
  }

  async softDelete(where: Prisma.PlatformWhereUniqueInput): Promise<Platform> {
    return this.prisma.platform.update({
      where,
      data: { deletedAt: new Date() },
    });
  }
}
