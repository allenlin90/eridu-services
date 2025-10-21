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
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(UserDto)
  async createUser(@Body() body: CreateUserDto) {
    const user = await this.adminUserService.createUser(body);
    return user;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(userDto))
  getUsers(@Query() paginationQuery: PaginationQueryDto) {
    return this.adminUserService.getUsers(paginationQuery);
  }

  @Get(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(UserDto)
  getUser(@Param('uid') uid: string) {
    return this.adminUserService.getUserById(uid);
  }

  @Patch(':uid')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(UserDto)
  updateUser(@Param('uid') uid: string, @Body() body: UpdateUserDto) {
    return this.adminUserService.updateUser(uid, body);
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('uid') uid: string) {
    await this.adminUserService.deleteUser(uid);
  }
}
