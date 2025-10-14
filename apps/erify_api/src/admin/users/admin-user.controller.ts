import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '../../common/pagination/schema/pagination.schema';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  userDto,
} from '../../user/schemas/user.schema';
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

  @Get(':id')
  @ZodSerializerDto(UserDto)
  getUser(@Param('id') id: string) {
    return this.adminUserService.getUserById(id);
  }

  @Patch(':id')
  @ZodSerializerDto(UserDto)
  updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.adminUserService.updateUser(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string) {
    await this.adminUserService.deleteUser(id);
  }
}
