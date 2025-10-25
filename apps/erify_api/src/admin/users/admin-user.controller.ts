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
import { UidValidationPipe } from '../../common/pipes/uid-validation.pipe';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  userDto,
} from '../../user/schemas/user.schema';
import { UserService } from '../../user/user.service';
import { UtilityService } from '../../utility/utility.service';
import { BaseAdminController } from '../base-admin.controller';

@Controller('admin/users')
export class AdminUserController extends BaseAdminController {
  constructor(
    private readonly userService: UserService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(UserDto)
  createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(createPaginatedResponseSchema(userDto))
  async getUsers(@Query() query: PaginationQueryDto) {
    const data = await this.userService.getUsers({
      skip: query.skip,
      take: query.take,
    });
    const total = await this.userService.countUsers();

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(UserDto)
  getUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    return this.userService.getUserById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(UserDto)
  updateUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
  ) {
    await this.userService.deleteUser(id);
  }
}
