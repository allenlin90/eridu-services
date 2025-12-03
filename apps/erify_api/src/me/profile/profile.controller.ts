import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import {
  ProfileResponseDto,
  profileResponseSchema,
} from './schemas/profile.schema';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { ApiZodResponse } from '@/lib/openapi/decorators';

/**
 * Profile Controller
 *
 * User-scoped endpoint for authenticated users to access their own profile information.
 * This endpoint validates JWT tokens and returns the authenticated user's information
 * extracted from the JWT payload.
 *
 * The endpoint `/me` represents the current authenticated user's profile, following
 * RESTful conventions where `/me` is a common pattern for "current user" endpoints.
 *
 * Endpoints:
 * - GET /me - Get authenticated user profile information from JWT payload
 */
@Controller('me')
export class ProfileController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    profileResponseSchema,
    'User profile information extracted from JWT token. The user.id from better-auth is mapped to ext_id, which corresponds to User.ext_id in the database.',
  )
  @ZodSerializerDto(profileResponseSchema)
  getProfile(@CurrentUser() user: AuthenticatedUser): ProfileResponseDto {
    return {
      ext_id: user.ext_id,
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      payload: user.payload,
    };
  }
}
