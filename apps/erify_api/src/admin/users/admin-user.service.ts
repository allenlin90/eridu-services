import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PaginatedResponse } from '../../common/pagination/schema/pagination.schema';
import { CreateUserDto } from '../../user/schemas/user.schema';
import { UserService } from '../../user/user.service';

@Injectable()
export class AdminUserService {
  constructor(private readonly userService: UserService) {}

  createUser(body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  async getUsers(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }): Promise<PaginatedResponse<User>> {
    const page: number = params.page;
    const limit: number = params.limit;
    const skip: number = params.skip;
    const take: number = params.take;

    const users: User[] = await this.userService.getUsers({
      skip,
      take,
    });

    const total = await this.userService.countUsers();
    const totalPages = Math.ceil(total / limit);
    const meta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return { data: users, meta };
  }
}
