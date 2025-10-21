import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PaginatedResponse } from '../../common/pagination/schema/pagination.schema';
import { CreateUserDto, UpdateUserDto } from '../../user/schemas/user.schema';
import { UserService } from '../../user/user.service';
import { UtilityService } from '../../utility/utility.service';

@Injectable()
export class AdminUserService {
  constructor(
    private readonly userService: UserService,
    private readonly utilityService: UtilityService,
  ) {}

  createUser(data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  getUserById(uid: string) {
    return this.userService.getUserById(uid);
  }

  updateUser(uid: string, data: UpdateUserDto) {
    return this.userService.updateUser(uid, data);
  }

  deleteUser(uid: string) {
    return this.userService.deleteUser(uid);
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
    const meta = this.utilityService.createPaginationMeta(page, limit, total);

    return { data: users, meta };
  }
}
