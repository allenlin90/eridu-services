import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { BaseApiKeyGuard } from './base-api-key.guard';

import { Env } from '@/config/env.schema';
import { IS_GOOGLE_SHEETS_KEY } from '@/lib/decorators/google-sheets.decorator';

/**
 * Google Sheets API Key Guard
 *
 * Validates API keys specifically for Google Sheets integration.
 * Uses GOOGLE_SHEETS_API_KEY environment variable.
 *
 * Usage:
 * ```typescript
 * @UseGuards(GoogleSheetsApiKeyGuard)
 * async googleSheetsEndpoint(@Request() req) {
 *   // req.service.serviceName will be 'google-sheets'
 * }
 * ```
 */
@Injectable()
export class GoogleSheetsApiKeyGuard extends BaseApiKeyGuard {
  constructor(
    configService: ConfigService<Env>,
    private readonly reflector: Reflector,
  ) {
    super(configService, 'google-sheets');
  }

  protected getApiKeyFromConfig(): string | undefined {
    return this.configService.get('GOOGLE_SHEETS_API_KEY');
  }

  protected getEnvKeyName(): string {
    return 'GOOGLE_SHEETS_API_KEY';
  }

  canActivate(context: ExecutionContext): boolean {
    // Only run on routes marked with @GoogleSheets() decorator
    const isGoogleSheets = this.reflector.getAllAndOverride<boolean>(
      IS_GOOGLE_SHEETS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isGoogleSheets) {
      // Skip this guard if route is not marked as google-sheets
      return true;
    }

    return super.canActivate(context);
  }
}
