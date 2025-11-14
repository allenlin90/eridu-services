import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from '@/config/env.schema';

import { BaseApiKeyGuard } from './base-api-key.guard';

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
  constructor(configService: ConfigService<Env>) {
    super(configService, 'google-sheets');
  }

  protected getApiKeyFromConfig(): string | undefined {
    return this.configService.get('GOOGLE_SHEETS_API_KEY');
  }

  protected getEnvKeyName(): string {
    return 'GOOGLE_SHEETS_API_KEY';
  }
}
