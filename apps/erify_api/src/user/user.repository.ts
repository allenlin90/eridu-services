import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { BaseRepository } from '../common/repositories/base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.user);
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
