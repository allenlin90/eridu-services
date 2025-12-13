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
import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  BulkCreateUserDto,
  CreateUserDto,
  UpdateUserDto,
  userDto,
  userWithMcDto,
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
  @ZodResponse(userWithMcDto, HttpStatus.CREATED, 'User created successfully')
  createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @Post('bulk')
  @ZodResponse(z.array(userWithMcDto), HttpStatus.CREATED, 'Users created successfully')
  createUsersBulk(@Body() body: BulkCreateUserDto) {
    return this.userService.createUsersBulk(body.data);
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
