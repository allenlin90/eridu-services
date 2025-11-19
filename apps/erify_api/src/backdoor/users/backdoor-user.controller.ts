import {
  Body,
  Controller,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { BaseAdminController } from '@/admin/base-admin.controller';
import { AdminResponse } from '@/admin/decorators/admin-response.decorator';
import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import {
  CreateUserDto,
  UpdateUserDto,
  userDto,
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
export class BackdoorUserController extends BaseAdminController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Post()
  @AdminResponse(userDto, HttpStatus.CREATED, 'User created successfully')
  createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @Patch(':id')
  @AdminResponse(userDto, HttpStatus.OK, 'User updated successfully')
  updateUser(
    @Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
    id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, body);
  }
}
