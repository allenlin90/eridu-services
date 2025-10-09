import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '../../common/pagination/schema/pagination.schema';
import { CreateUserDto } from '../../user/schemas/user.schema';
import { UserDto, userDto } from '../../user/schemas/user.schema';
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
  @ZodSerializerDto(createPaginatedResponseSchema(userDto))
  getUsers(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminUserService.getUsers(paginationQuery);
  }
}
