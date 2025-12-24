import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { BaseApiKeyGuard } from './base-api-key.guard';

import { Env } from '@/config/env.schema';
import { IS_BACKDOOR_KEY } from '@/lib/decorators/backdoor.decorator';

/**
 * Backdoor API Key Guard
 *
 * Validates API keys for service-to-service backdoor operations.
 * Uses BACKDOOR_API_KEY environment variable.
 *
 * This guard is used for privileged operations that require API key authentication:
 * - Creating users
 * - Updating users
 * - Creating studio memberships for admin users
 *
 * Future: Can be extended with IP whitelisting by overriding validateRequest()
 *
 * Usage:
 * ```typescript
 * @UseGuards(BackdoorApiKeyGuard)
 * async backdoorEndpoint(@Request() req) {
 *   // req.service.serviceName will be 'backdoor'
 * }
 * ```
 */
@Injectable()
export class BackdoorApiKeyGuard extends BaseApiKeyGuard {
  constructor(
    configService: ConfigService<Env>,
    private readonly reflector: Reflector,
  ) {
    super(configService, 'backdoor');
  }

  protected getApiKeyFromConfig(): string | undefined {
    return this.configService.get('BACKDOOR_API_KEY');
  }

  protected getEnvKeyName(): string {
    return 'BACKDOOR_API_KEY';
  }

  /**
   * Validate additional request requirements (e.g., IP whitelisting)
   * Override this method to add IP whitelisting or other validations
   *
   * @param _request - Express request object
   * @returns true if request is valid, throws exception otherwise
   */
  protected validateRequest(_request: Request): boolean {
    // TODO: Implement IP whitelisting for backdoor endpoints
    // When BACKDOOR_ALLOWED_IPS is configured, validate that the request IP is in the whitelist
    // Example implementation:
    // const allowedIPs = this.configService.get('BACKDOOR_ALLOWED_IPS')?.split(',') || [];
    // const clientIP = _request.ip || _request.socket.remoteAddress;
    // if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    //   throw new ForbiddenException('IP address not whitelisted');
    // }
    return true;
  }

  canActivate(context: ExecutionContext): boolean {
    // Only run on routes marked with @Backdoor() decorator
    const isBackdoor = this.reflector.getAllAndOverride<boolean>(
      IS_BACKDOOR_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isBackdoor) {
      // Skip this guard if route is not marked as backdoor
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // First validate API key (parent class logic)
    if (!super.canActivate(context)) {
      return false;
    }

    // Then validate additional requirements (IP whitelisting, etc.)
    return this.validateRequest(request);
  }
}
