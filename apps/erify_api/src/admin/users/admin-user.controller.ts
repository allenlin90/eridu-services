import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import { PaginationQueryDto } from '../../common/schemas/pagination-query.dto';
import { CreateUserDto } from '../../user/schemas/user.schema';
import { UserDto } from '../../user/schemas/user.schema';
import { AdminUserService } from './admin-user.service';

@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Post()
  @ZodSerializerDto(UserDto)
  async createUser(@Body() body: CreateUserDto) {
    const user = await this.adminUserService.createUser(body);
    return user;
  }

  @Get()
  getUsers(@Query() query: PaginationQueryDto) {
    return this.adminUserService.getUsers(query.page, query.limit);
  }
}
