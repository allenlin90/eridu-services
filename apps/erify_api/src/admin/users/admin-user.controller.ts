import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  adminUserDto,
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

@Controller('admin/users')
export class AdminUserController extends BaseAdminController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Post()
  @AdminResponse(adminUserDto, HttpStatus.CREATED, 'User created successfully')
  createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @Get()
  @AdminPaginatedResponse(adminUserDto, 'List of users with pagination')
  async getUsers(@Query() query: ListUsersQueryDto) {
    const { data, total } = await this.userService.listUsers({
      skip: query.skip,
      take: query.take,
      name: query.name,
      email: query.email,
      uid: query.uid,
      extId: query.extId,
      isSystemAdmin: query.isSystemAdmin,
    });

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(adminUserDto, HttpStatus.OK, 'User details')
  getUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    return this.userService.getUserById(id);
  }

  @Patch(':id')
  @AdminResponse(adminUserDto, HttpStatus.OK, 'User updated successfully')
  updateUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, body);
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    await this.userService.deleteUser(id);
  }
}
