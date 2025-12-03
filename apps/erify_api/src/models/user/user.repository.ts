import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { BaseRepository, IBaseModel } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

// Custom model wrapper that implements IBaseModel with UserWhereInput
class UserModelWrapper
implements
    IBaseModel<
      User,
      Prisma.UserCreateInput,
      Prisma.UserUpdateInput,
      Prisma.UserWhereInput
    > {
  constructor(private readonly prismaModel: Prisma.UserDelegate) {}

  async create(args: {
    data: Prisma.UserCreateInput;
    include?: Record<string, any>;
  }): Promise<User> {
    return this.prismaModel.create(args);
  }

  async findFirst(args: {
    where: Prisma.UserWhereInput;
    include?: Record<string, any>;
  }): Promise<User | null> {
    return this.prismaModel.findFirst(args);
  }

  async findMany(args: {
    where?: Prisma.UserWhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: Record<string, any>;
  }): Promise<User[]> {
    return this.prismaModel.findMany(args);
  }

  async update(args: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
    include?: Record<string, any>;
  }): Promise<User> {
    return this.prismaModel.update(args);
  }

  async delete(args: { where: Prisma.UserWhereUniqueInput }): Promise<User> {
    return this.prismaModel.delete(args);
  }

  async count(args: { where: Prisma.UserWhereInput }): Promise<number> {
    return this.prismaModel.count({ where: args.where });
  }
}

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new UserModelWrapper(prisma.user));
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.model.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.model.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByUid(uid: string): Promise<User | null> {
    return this.model.findFirst({
      where: {
        uid,
        deletedAt: null,
      },
    });
  }

  async findActiveUsers(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, orderBy } = params;

    return this.model.findMany({
      where: {
        deletedAt: null,
      },
      skip,
      take,
      orderBy,
    });
  }
}
