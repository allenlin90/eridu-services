import { Injectable } from '@nestjs/common';

import { PaginationQueryDto } from '../../common/pagination/schema/pagination.schema';
import { CreateUserDto } from '../../user/schemas/user.schema';
import { UserService } from '../../user/user.service';

@Injectable()
export class AdminUserService {
  constructor(private readonly userService: UserService) {}

  createUser(body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  getUsers(params: PaginationQueryDto) {
    return this.userService.getUsers(params);
  }
}
