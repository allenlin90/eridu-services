import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import {
  ProfileResponseDto,
  profileResponseSchema,
} from './schemas/profile.schema';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { HttpError } from '@/lib/errors/http-error.util';
import { ApiZodResponse } from '@/lib/openapi/decorators';
import { UserService } from '@/models/user/user.service';

/**
 * Profile Controller
 *
 * User-scoped endpoint for authenticated users to access their own profile information.
 * This endpoint validates JWT tokens and returns the authenticated user's information
 * extracted from the JWT payload.
 *
 * The endpoint `/me` represents the current authenticated user's profile.
 *
 * Endpoints:
 * - GET /me - Get authenticated user profile (plus system admin status)
 */
@Controller('me')
export class ProfileController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    profileResponseSchema,
    'User profile information including system admin status.',
  )
  @ZodSerializerDto(profileResponseSchema)
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<ProfileResponseDto> {
    // Fetch full user to get isSystemAdmin status
    const fullUser = await this.userService.getUserByExtId(user.ext_id);

    if (!fullUser) {
      throw HttpError.notFound('User not found');
    }

    return {
      ext_id: user.ext_id,
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      is_system_admin: fullUser.isSystemAdmin,
      payload: user.payload,
    };
  }
}
