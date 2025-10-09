import { Injectable } from '@nestjs/common';

import { CreateUserDto } from '../../user/schemas/user.schema';
import { UserService } from '../../user/user.service';

@Injectable()
export class AdminUserService {
  constructor(private readonly userService: UserService) {}

  createUser(body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  getUsers(page: number = 1, limit: number = 10) {
    return {
      data: [],
      currentPage: page,
      limit,
    };
  }
}
