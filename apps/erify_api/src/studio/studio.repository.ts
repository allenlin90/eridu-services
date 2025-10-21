import { Injectable } from '@nestjs/common';
import type { Prisma, Studio } from '@prisma/client';

import {
  BaseRepository,
  IBaseModel,
} from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

class StudioModelWrapper
  implements
    IBaseModel<
      Studio,
      Prisma.StudioCreateInput,
      Prisma.StudioUpdateInput,
      Prisma.StudioWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async create(args: { data: Prisma.StudioCreateInput }): Promise<Studio> {
    return this.prisma.studio.create(args);
  }

  async findFirst(args: {
    where: Prisma.StudioWhereInput;
  }): Promise<Studio | null> {
    return this.prisma.studio.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.StudioWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Studio[]> {
    return this.prisma.studio.findMany(args);
  }

  async update(args: {
    where: Prisma.StudioWhereUniqueInput;
    data: Prisma.StudioUpdateInput;
  }): Promise<Studio> {
    return this.prisma.studio.update(args);
  }

  async delete(args: {
    where: Prisma.StudioWhereUniqueInput;
  }): Promise<Studio> {
    return this.prisma.studio.delete(args);
  }

  async count(args: { where: Prisma.StudioWhereInput }): Promise<number> {
    return this.prisma.studio.count(args);
  }
}

@Injectable()
export class StudioRepository extends BaseRepository<
  Studio,
  Prisma.StudioCreateInput,
  Prisma.StudioUpdateInput,
  Prisma.StudioWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new StudioModelWrapper(prisma));
  }

  // Override update and delete methods to use unique where input
  async update(
    where: Prisma.StudioWhereUniqueInput,
    data: Prisma.StudioUpdateInput,
  ): Promise<Studio> {
    return this.prisma.studio.update({
      where,
      data,
    });
  }

  async softDelete(where: Prisma.StudioWhereUniqueInput): Promise<Studio> {
    return this.prisma.studio.update({
      where,
      data: { deletedAt: new Date() },
    });
  }
}
