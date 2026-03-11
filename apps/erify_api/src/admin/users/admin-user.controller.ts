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
  async createUser(@Body() body: CreateUserDto) {
    const { extId, email, name, profileUrl, metadata, creator } = body;
    return this.userService.createUser({
      extId,
      email,
      name,
      profileUrl,
      metadata,
      creator,
    });
  }

  @Get()
  @AdminPaginatedResponse(adminUserDto, 'List of users with pagination')
  async getUsers(@Query() query: ListUsersQueryDto) {
    const { data, total } = await this.userService.listUsers(query);

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(adminUserDto, HttpStatus.OK, 'User details')
  async getUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    const user = await this.userService.getUserById(id);
    this.ensureResourceExists(user, 'User', id);
    return user;
  }

  @Patch(':id')
  @AdminResponse(adminUserDto, HttpStatus.OK, 'User updated successfully')
  async updateUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
    @Body() body: UpdateUserDto,
  ) {
    const user = await this.userService.getUserById(id);
    this.ensureResourceExists(user, 'User', id);

    const { extId, email, name, profileUrl, metadata, isSystemAdmin } = body;
    return this.userService.updateUser(id, {
      extId,
      email,
      name,
      profileUrl,
      metadata,
      isSystemAdmin,
    });
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    const user = await this.userService.getUserById(id);
    this.ensureResourceExists(user, 'User', id);

    await this.userService.deleteUser(id);
  }
}
