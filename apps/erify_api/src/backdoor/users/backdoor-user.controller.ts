import {
  Body,
  Controller,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import z from 'zod';

import { BaseBackdoorController } from '@/backdoor/base-backdoor.controller';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  BulkCreateUserDto,
  CreateUserDto,
  UpdateUserDto,
  userDto,
  userWithCreatorDto,
} from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

/**
 * Backdoor User Controller
 *
 * Service-to-service API key authenticated endpoints for user management.
 * These endpoints are separate from admin controllers to allow for:
 * - Different authentication mechanism (API key vs JWT)
 * - Future IP whitelisting
 * - Clear separation of concerns
 *
 * Endpoints:
 * - POST /backdoor/users - Create user (API key required)
 * - PATCH /backdoor/users/:id - Update user (API key required)
 */
@Controller('backdoor/users')
@UseGuards(BackdoorApiKeyGuard)
export class BackdoorUserController extends BaseBackdoorController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Post()
  @ZodResponse(userWithCreatorDto, HttpStatus.CREATED, 'User created successfully')
  async createUser(@Body() body: CreateUserDto) {
    const createdUser = await this.userService.createUser(body);
    const userWithCreator = await this.userService.findUserById(createdUser.uid, { creator: true });

    if (!userWithCreator) {
      throw HttpError.notFound('User', createdUser.uid);
    }

    return userWithCreator;
  }

  @Post('bulk')
  @ZodResponse(z.array(userWithCreatorDto), HttpStatus.CREATED, 'Users created successfully')
  async createUsersBulk(@Body() body: BulkCreateUserDto) {
    const createdUsers = await this.userService.createUsersBulk(body.data);
    const hydratedUsers = await Promise.all(
      createdUsers.map(async (user) => {
        const userWithCreator = await this.userService.findUserById(user.uid, { creator: true });
        if (!userWithCreator) {
          throw HttpError.notFound('User', user.uid);
        }
        return userWithCreator;
      }),
    );

    return hydratedUsers;
  }

  @Patch(':id')
  @ZodResponse(userDto, HttpStatus.OK, 'User updated successfully')
  updateUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, body);
  }
}
