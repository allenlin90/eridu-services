import {
  Controller,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { AuthService } from '@/lib/auth/auth.service';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';

const refreshJwksResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  keysCount: z.number(),
  lastFetchedTime: z.string().nullable(),
});

/**
 * Backdoor Auth Controller
 *
 * Service-to-service API key authenticated endpoints for authentication management.
 * These endpoints allow manual control over JWKS caching and refresh operations.
 *
 * Endpoints:
 * - POST /backdoor/auth/jwks/refresh - Manually refresh JWKS cache (API key required)
 */
@Controller('backdoor/auth')
@UseGuards(BackdoorApiKeyGuard)
export class BackdoorAuthController {
  private readonly logger = new Logger(BackdoorAuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('jwks/refresh')
  @ZodResponse(
    refreshJwksResponseSchema,
    HttpStatus.OK,
    'JWKS cache refreshed successfully',
  )
  async refreshJwks(): Promise<z.infer<typeof refreshJwksResponseSchema>> {
    try {
      await this.authService.getJwksService().refreshJwks();

      const keysCount = this.authService.getJwksService().getKeysCount();
      const lastFetchedTime = this.authService
        .getJwksService()
        .getLastFetchedTime();

      return {
        success: true,
        message: 'JWKS refreshed successfully',
        keysCount,
        lastFetchedTime: lastFetchedTime?.toISOString() ?? null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh JWKS: ${errorMessage}`, error);

      // Check if it's a network/connection error
      if (
        error instanceof Error &&
        (errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND'))
      ) {
        throw HttpError.badRequest(
          `Failed to connect to auth service at ${this.authService.getJwksService().getJwksUrl()}. Please ensure the auth service is running and accessible.`,
        );
      }

      // Check if it's an HTTP error response
      if (
        error instanceof Error &&
        (errorMessage.includes('status') || errorMessage.includes('HTTP'))
      ) {
        throw HttpError.badRequest(
          `Failed to fetch JWKS from auth service: ${errorMessage}`,
        );
      }

      // Generic error
      throw HttpError.internalServerError(
        `Failed to refresh JWKS: ${errorMessage}`,
      );
    }
  }
}
