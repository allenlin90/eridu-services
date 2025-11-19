import { Injectable } from '@nestjs/common';
import type { Prisma, ShowType } from '@prisma/client';

import { BaseRepository, IBaseModel } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

class ShowTypeModelWrapper
  implements
    IBaseModel<
      ShowType,
      Prisma.ShowTypeCreateInput,
      Prisma.ShowTypeUpdateInput,
      Prisma.ShowTypeWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async create(args: {
    data: Prisma.ShowTypeCreateInput;
    include?: Record<string, any>;
  }): Promise<ShowType> {
    return this.prisma.showType.create(args);
  }

  async findFirst(args: {
    where: Prisma.ShowTypeWhereInput;
    include?: Record<string, any>;
  }): Promise<ShowType | null> {
    return this.prisma.showType.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.ShowTypeWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<ShowType[]> {
    return this.prisma.showType.findMany(args);
  }

  async update(args: {
    where: Prisma.ShowTypeWhereUniqueInput;
    data: Prisma.ShowTypeUpdateInput;
    include?: Record<string, any>;
  }): Promise<ShowType> {
    return this.prisma.showType.update(args);
  }

  async delete(args: {
    where: Prisma.ShowTypeWhereUniqueInput;
  }): Promise<ShowType> {
    return this.prisma.showType.delete(args);
  }

  async count(args: { where: Prisma.ShowTypeWhereInput }): Promise<number> {
    return this.prisma.showType.count({ where: args.where });
  }
}

@Injectable()
export class ShowTypeRepository extends BaseRepository<
  ShowType,
  Prisma.ShowTypeCreateInput,
  Prisma.ShowTypeUpdateInput,
  Prisma.ShowTypeWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new ShowTypeModelWrapper(prisma));
  }

  async findByUid(uid: string): Promise<ShowType | null> {
    return this.model.findFirst({
      where: { uid, deletedAt: null },
    });
  }

  async findByName(name: string): Promise<ShowType | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }
}
